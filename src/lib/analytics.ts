import { db } from "./db";
import { chatSessions, chatMessages, chats } from "./schema";
import { eq, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Get or create a chat session for a visitor
 */
export async function getOrCreateSession(
  chatId: string,
  visitorId?: string
): Promise<string> {
  try {
    // Try to find existing active session for this chat and visitor
    if (visitorId) {
      const existingSessions = await db
        .select()
        .from(chatSessions)
        .where(
          sql`${chatSessions.chatId} = ${chatId} AND ${chatSessions.visitorId} = ${visitorId}`
        )
        .orderBy(desc(chatSessions.lastActivityAt))
        .limit(1);

      if (existingSessions.length > 0) {
        const session = existingSessions[0];

        // Update last activity
        await db
          .update(chatSessions)
          .set({ lastActivityAt: new Date() })
          .where(eq(chatSessions.id, session.id));

        return session.id;
      }
    }

    // Create new session
    const sessionId = nanoid();

    await db.insert(chatSessions).values({
      id: sessionId,
      chatId,
      visitorId,
      totalMessages: 0,
      totalUserMessages: 0,
      totalBotMessages: 0,
    });

    return sessionId;
  } catch (error) {
    console.error("Error in getOrCreateSession:", error);
    throw error;
  }
}

/**
 * Log a chat message
 */
export async function logChatMessage(params: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  responseTimeMs?: number;
  modelUsed?: string;
  sourcesUsed?: string[];
  hadError?: boolean;
  errorMessage?: string;
  tokenCountInput?: number;
  tokenCountOutput?: number;
}): Promise<string | null> {
  try {
    const messageId = nanoid();

    await db.insert(chatMessages).values({
      id: messageId,
      sessionId: params.sessionId,
      role: params.role,
      content: params.content,
      responseTimeMs: params.responseTimeMs,
      modelUsed: params.modelUsed,
      sourcesUsed: params.sourcesUsed ? JSON.stringify(params.sourcesUsed) : null,
      hadError: params.hadError ?? false,
      errorMessage: params.errorMessage,
      tokenCountInput: params.tokenCountInput,
      tokenCountOutput: params.tokenCountOutput,
    });

    // Update session stats
    await updateSessionStats(params.sessionId, params.role);

    return messageId;
  } catch (error) {
    console.error("Error in logChatMessage:", error);
    // Don't throw - logging should not break the chat
    return null;
  }
}

/**
 * Update session statistics
 */
async function updateSessionStats(
  sessionId: string,
  role: "user" | "assistant"
): Promise<void> {
  try {
    const session = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (session.length === 0) return;

    const updates: Record<string, unknown> = {
      totalMessages: (session[0].totalMessages || 0) + 1,
      lastActivityAt: new Date(),
    };

    if (role === "user") {
      updates.totalUserMessages = (session[0].totalUserMessages || 0) + 1;
    } else {
      updates.totalBotMessages = (session[0].totalBotMessages || 0) + 1;
    }

    await db
      .update(chatSessions)
      .set(updates)
      .where(eq(chatSessions.id, sessionId));
  } catch (error) {
    console.error("Error in updateSessionStats:", error);
  }
}

/**
 * Get statistics for a specific chat
 */
export async function getChatStats(chatId: string) {
  try {
    // Total sessions for this chat
    const totalSessionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatSessions)
      .where(eq(chatSessions.chatId, chatId));
    const totalSessions = totalSessionsResult[0]?.count || 0;

    // Total messages for this chat (only user questions)
    const totalMessagesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatMessages)
      .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
      .where(
        sql`${chatSessions.chatId} = ${chatId} AND ${chatMessages.role} = 'user'`
      );
    const totalMessages = totalMessagesResult[0]?.count || 0;

    // Average response time
    const avgResponseTimeResult = await db
      .select({
        avg: sql<number>`avg(${chatMessages.responseTimeMs})`,
      })
      .from(chatMessages)
      .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
      .where(
        sql`${chatSessions.chatId} = ${chatId} AND ${chatMessages.role} = 'assistant' AND ${chatMessages.responseTimeMs} IS NOT NULL`
      );
    const avgResponseTime = Math.round(avgResponseTimeResult[0]?.avg || 0);

    return {
      totalSessions,
      totalMessages,
      avgResponseTime,
    };
  } catch (error) {
    console.error("Error in getChatStats:", error);
    return {
      totalSessions: 0,
      totalMessages: 0,
      avgResponseTime: 0,
    };
  }
}

/**
 * Get recent messages for a chat session
 */
export async function getSessionMessages(sessionId: string, limit = 50) {
  try {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt)
      .limit(limit);

    return messages;
  } catch (error) {
    console.error("Error in getSessionMessages:", error);
    return [];
  }
}
