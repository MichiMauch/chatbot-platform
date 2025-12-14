import { NextResponse } from "next/server";

// Force dynamic rendering - skip DB access during build
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { chats, chatSessions, chatMessages, teamMembers } from "@/lib/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { requirePermission, isErrorResponse } from "@/lib/rbac";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Permission check
    const result = await requirePermission("chats:view");
    if (isErrorResponse(result)) return result;

    // Load chat and verify team membership
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, id),
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat nicht gefunden" }, { status: 404 });
    }

    const membership = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, result.userId),
    });

    if (!membership || membership.teamId !== chat.teamId) {
      return NextResponse.json(
        { error: "Keine Berechtigung für diesen Chat" },
        { status: 403 }
      );
    }

    // Get all sessions for this chat
    const sessions = await db.query.chatSessions.findMany({
      where: eq(chatSessions.chatId, id),
      orderBy: [desc(chatSessions.lastActivityAt)],
    });

    // Collect message stats
    let totalMessages = 0;
    let userMessages = 0;
    let botMessages = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let errorCount = 0;
    let positiveFeeback = 0;
    let negativeFeeback = 0;

    // Daily stats for chart (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailyStatsMap = new Map<string, { messages: number; tokens: number }>();

    // Collect all messages for the recent messages list
    const allMessages: {
      id: string;
      sessionId: string;
      role: string;
      content: string;
      feedback: number | null;
      hadError: boolean | null;
      createdAt: Date | null;
    }[] = [];

    for (const session of sessions) {
      const messages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.sessionId, session.id),
      });

      for (const msg of messages) {
        totalMessages++;
        if (msg.role === "user") userMessages++;
        if (msg.role === "assistant") botMessages++;
        totalInputTokens += msg.tokenCountInput || 0;
        totalOutputTokens += msg.tokenCountOutput || 0;
        if (msg.responseTimeMs) {
          totalResponseTime += msg.responseTimeMs;
          responseTimeCount++;
        }
        if (msg.hadError) errorCount++;
        if (msg.feedback === 1) positiveFeeback++;
        if (msg.feedback === -1) negativeFeeback++;

        // Aggregate daily stats
        if (msg.createdAt && msg.createdAt >= thirtyDaysAgo) {
          const dateKey = msg.createdAt.toISOString().split("T")[0];
          const existing = dailyStatsMap.get(dateKey) || { messages: 0, tokens: 0 };
          existing.messages++;
          existing.tokens += (msg.tokenCountInput || 0) + (msg.tokenCountOutput || 0);
          dailyStatsMap.set(dateKey, existing);
        }

        // Add to all messages collection
        allMessages.push({
          id: msg.id,
          sessionId: session.id,
          role: msg.role,
          content: msg.content,
          feedback: msg.feedback,
          hadError: msg.hadError,
          createdAt: msg.createdAt,
        });
      }
    }

    // Calculate averages and rates
    const avgResponseTime = responseTimeCount > 0
      ? Math.round(totalResponseTime / responseTimeCount)
      : 0;

    const errorRate = botMessages > 0
      ? ((errorCount / botMessages) * 100).toFixed(1)
      : "0.0";

    // Calculate estimated cost (Gemini Flash pricing)
    // Input: $0.075 per 1M tokens, Output: $0.30 per 1M tokens
    const estimatedCostCents = Math.round(
      (totalInputTokens * 0.000075 + totalOutputTokens * 0.0003) * 100
    );

    // Convert daily stats map to sorted array
    const dailyStats = Array.from(dailyStatsMap.entries())
      .map(([date, stats]) => ({
        date,
        messages: stats.messages,
        tokens: stats.tokens,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Fill in missing days with zeros
    const filledDailyStats: { date: string; messages: number; tokens: number }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const existing = dailyStatsMap.get(dateKey);
      filledDailyStats.push({
        date: dateKey,
        messages: existing?.messages || 0,
        tokens: existing?.tokens || 0,
      });
    }

    // Recent sessions with duration calculation
    const recentSessions = sessions.slice(0, 20).map((session) => {
      const durationMs = session.lastActivityAt && session.createdAt
        ? session.lastActivityAt.getTime() - session.createdAt.getTime()
        : 0;
      const durationMins = Math.round(durationMs / 60000);

      return {
        id: session.id,
        visitorId: session.visitorId,
        totalMessages: session.totalMessages || 0,
        userMessages: session.totalUserMessages || 0,
        botMessages: session.totalBotMessages || 0,
        durationMins,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
      };
    });

    // Get the 50 most recent messages, sorted by date descending
    const recentMessages = allMessages
      .sort((a, b) => {
        const dateA = a.createdAt?.getTime() || 0;
        const dateB = b.createdAt?.getTime() || 0;
        return dateB - dateA;
      })
      .slice(0, 50);

    return NextResponse.json({
      totalSessions: sessions.length,
      totalMessages,
      userMessages,
      botMessages,
      avgResponseTime,
      errorRate,
      errorCount,
      totalTokensInput: totalInputTokens,
      totalTokensOutput: totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      estimatedCostCents,
      positiveFeeback,
      negativeFeeback,
      dailyStats: filledDailyStats,
      recentSessions,
      recentMessages,
    });
  } catch (error) {
    console.error("[GET /api/chats/[id]/analytics] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Statistiken" },
      { status: 500 }
    );
  }
}
