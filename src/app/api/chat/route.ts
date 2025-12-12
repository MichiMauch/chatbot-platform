import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import { getOrCreateSession, logChatMessage } from "@/lib/analytics";
import { db } from "@/lib/db";
import { chats } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Only use gemini-2.5-flash - required for File Search tool
const MODEL = "gemini-2.5-flash";

// Helper function for exponential backoff retry
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 4,
  baseDelay = 2000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = (error as Error).message || "";
      const errorStatus = (error as { status?: number }).status;

      // Don't retry on quota errors
      const isQuotaError =
        errorMessage.includes("quota") ||
        errorMessage.includes("429") ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorStatus === 429;

      if (isQuotaError) {
        console.log("Quota error detected - skipping retries");
        throw error;
      }

      // Only retry on temporary overload errors
      const shouldRetry =
        errorMessage.includes("overloaded") ||
        errorMessage.includes("503") ||
        errorMessage.includes("UNAVAILABLE") ||
        errorStatus === 503;

      if (!shouldRetry || attempt === maxRetries - 1) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1} after ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Generate content with retry logic
async function generateWithRetry(params: {
  contents: string;
  systemInstruction?: string;
  config: {
    temperature: number;
    maxOutputTokens: number;
    tools?: Array<{
      fileSearch: {
        fileSearchStoreNames: string[];
      };
    }>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Promise<any> {
  if (!ai) {
    throw new Error("Gemini AI is not configured");
  }

  console.log(`Using model: ${MODEL}`);

  // TypeScript needs this assertion after the null check above
  const aiClient = ai;

  try {
    const response = await retryWithBackoff(() =>
      aiClient.models.generateContent({
        ...params,
        model: MODEL,
      })
    );

    console.log(`Success with model: ${MODEL}`);
    return response;
  } catch (error) {
    const errorMessage = (error as Error).message || "Unknown error";
    console.error(`Model ${MODEL} failed after all retries:`, errorMessage);
    throw error;
  }
}

// Convert byte offset to character position
function byteOffsetToCharIndex(text: string, byteOffset: number): number {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const slicedBytes = bytes.slice(0, byteOffset);
  const decoder = new TextDecoder();
  return decoder.decode(slicedBytes).length;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let sessionId: string | undefined;

  try {
    const { message, chatId, visitorId } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Keine Nachricht angegeben" },
        { status: 400 }
      );
    }

    if (!chatId) {
      return NextResponse.json(
        { error: "Keine Chat-ID angegeben" },
        { status: 400 }
      );
    }

    // Load chat configuration
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (!chat) {
      return NextResponse.json(
        { error: "Chat nicht gefunden" },
        { status: 404 }
      );
    }

    // Check if chat is public or requires authentication
    if (!chat.isPublic) {
      // TODO: Check authentication
      return NextResponse.json(
        { error: "Dieser Chat ist nicht öffentlich" },
        { status: 403 }
      );
    }

    // Get or create session for analytics
    try {
      sessionId = await getOrCreateSession(chatId, visitorId);

      // Log user message
      await logChatMessage({
        sessionId,
        role: "user",
        content: message,
      });
    } catch (analyticsError) {
      console.error("Analytics error (non-blocking):", analyticsError);
    }

    let response;

    if (chat.fileSearchStoreName) {
      // Use File Search tool for RAG
      const prompt = `Beantworte die folgende Frage prägnant und auf den Punkt gebracht. Beschränke deine Antwort auf maximal 3-4 kurze Absätze. Schreibe in einem natürlichen, flüssigen Schreibstil mit zusammenhängenden Sätzen. Markiere wichtige Aussagen, Zahlen und Kernpunkte mit Fettdruck (**Text**). Verzichte auf Einleitungen wie "Basierend auf..." oder "Gemäss den Dokumenten...". Wenn die Information nicht verfügbar ist, antworte kurz: "Diese Information ist nicht in den Dokumenten enthalten."\n\n${message}`;

      response = await generateWithRetry({
        contents: prompt,
        systemInstruction: chat.systemInstruction || undefined,
        config: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: [chat.fileSearchStoreName],
              },
            },
          ],
        },
      });
    } else {
      // No File Search Store - regular chat
      response = await generateWithRetry({
        contents: message,
        systemInstruction: chat.systemInstruction || undefined,
        config: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      });
    }

    // Extract text from response
    const text = response.text || "";

    // Extract grounding metadata for citations
    let usedFileUris: string[] | undefined;
    let citations: Array<{
      startIndex: number;
      endIndex: number;
      text: string;
      sourceIndices: number[];
    }> = [];

    if (response.candidates && response.candidates[0]?.groundingMetadata) {
      const groundingMetadata = response.candidates[0].groundingMetadata;
      const extractedFileUris: string[] = [];

      // Extract file URIs from grounding chunks
      if (groundingMetadata.groundingChunks) {
        for (const chunk of groundingMetadata.groundingChunks) {
          if (chunk.web?.uri) {
            continue; // Skip web sources
          }

          if (
            chunk.retrievedContext?.title &&
            chunk.retrievedContext?.fileSearchStore
          ) {
            const uri = `${chunk.retrievedContext.fileSearchStore}/files/${chunk.retrievedContext.title}`;
            if (!extractedFileUris.includes(uri)) {
              extractedFileUris.push(uri);
            }
          } else if (chunk.retrievedContext?.uri) {
            const uri = chunk.retrievedContext.uri;
            if (!extractedFileUris.includes(uri)) {
              extractedFileUris.push(uri);
            }
          }
        }
      }

      if (extractedFileUris.length > 0) {
        usedFileUris = extractedFileUris;
      }

      // Extract grounding supports for inline citations
      if (
        groundingMetadata.groundingSupports &&
        groundingMetadata.groundingSupports.length > 0
      ) {
        for (const support of groundingMetadata.groundingSupports) {
          if (
            support.segment &&
            support.groundingChunkIndices &&
            support.groundingChunkIndices.length > 0
          ) {
            const startIndex =
              support.segment.startIndex !== undefined
                ? byteOffsetToCharIndex(text, support.segment.startIndex)
                : 0;
            const endIndex =
              support.segment.endIndex !== undefined
                ? byteOffsetToCharIndex(text, support.segment.endIndex)
                : text.length;

            const sourceIndices: number[] = [];
            for (const chunkIndex of support.groundingChunkIndices) {
              const chunk = groundingMetadata.groundingChunks?.[chunkIndex];
              if (chunk) {
                let uri = "";
                if (
                  chunk.retrievedContext?.title &&
                  chunk.retrievedContext?.fileSearchStore
                ) {
                  uri = `${chunk.retrievedContext.fileSearchStore}/files/${chunk.retrievedContext.title}`;
                } else if (chunk.retrievedContext?.uri) {
                  uri = chunk.retrievedContext.uri;
                }

                if (uri) {
                  const sourceIndex = extractedFileUris.indexOf(uri);
                  if (sourceIndex !== -1 && !sourceIndices.includes(sourceIndex)) {
                    sourceIndices.push(sourceIndex);
                  }
                }
              }
            }

            if (sourceIndices.length > 0) {
              citations.push({
                startIndex,
                endIndex,
                text: support.segment.text || text.substring(startIndex, endIndex),
                sourceIndices,
              });
            }
          }
        }
      }
    }

    // Log assistant response
    let messageId: string | null = null;
    if (sessionId) {
      try {
        const responseTime = Date.now() - startTime;
        messageId = await logChatMessage({
          sessionId,
          role: "assistant",
          content: text,
          responseTimeMs: responseTime,
          modelUsed: MODEL,
          sourcesUsed: usedFileUris,
          tokenCountInput: response.usageMetadata?.promptTokenCount,
          tokenCountOutput: response.usageMetadata?.candidatesTokenCount,
        });
      } catch (analyticsError) {
        console.error("Analytics error (non-blocking):", analyticsError);
      }
    }

    return NextResponse.json({
      success: true,
      response: text,
      usedFileUris,
      citations: citations.length > 0 ? citations : undefined,
      messageId,
    });
  } catch (error) {
    console.error("Chat error:", error);

    const errorMessage =
      (error as Error).message || "Fehler bei der Anfrage";
    const errorStatus = (error as { status?: number }).status;

    // Provide user-friendly error messages
    let userMessage = errorMessage;

    if (
      errorMessage.includes("overloaded") ||
      errorMessage.includes("UNAVAILABLE") ||
      errorStatus === 503
    ) {
      userMessage =
        "⏳ Das Modell ist momentan überlastet. Bitte warte 1-2 Minuten und versuche es erneut.";
    } else if (
      errorMessage.includes("quota") ||
      errorMessage.includes("429")
    ) {
      userMessage =
        "API-Limit erreicht. Bitte versuche es später erneut.";
    } else if (
      errorMessage.includes("invalid") ||
      errorMessage.includes("400")
    ) {
      userMessage = "Ungültige Anfrage. Bitte überprüfe deine Eingabe.";
    }

    // Log error
    if (sessionId) {
      try {
        const responseTime = Date.now() - startTime;
        await logChatMessage({
          sessionId,
          role: "assistant",
          content: "",
          responseTimeMs: responseTime,
          modelUsed: MODEL,
          hadError: true,
          errorMessage: userMessage,
        });
      } catch (analyticsError) {
        console.error("Analytics error (non-blocking):", analyticsError);
      }
    }

    return NextResponse.json(
      { error: userMessage, success: false },
      { status: errorStatus || 500 }
    );
  }
}
