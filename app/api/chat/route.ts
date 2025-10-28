import { AIService, validateAndSanitizeMessages } from "@/helpers/sseHelper";
import { ChatFeatures, ChatRequestBody } from "@/types/useChat";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const { messages, model = "openai/gpt-4o-mini", features = {} } = body;

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required and cannot be empty" },
        { status: 400 }
      );
    }

    const sanitizedMessages = validateAndSanitizeMessages(messages);

    if (sanitizedMessages.length === 0) {
      return NextResponse.json(
        { error: "No valid messages provided" },
        { status: 400 }
      );
    }

    const enabledFeatures: ChatFeatures = {
      reasoning: features.reasoning ?? false,
      thinking: features.thinking ?? false,
      toolCalling: features.toolCalling ?? false,
      workflow: features.workflow ?? false,
      fileHandling: features.fileHandling ?? false,
    };

    const aiService = new AIService();

    // Create streaming response
    const responseStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Helper to encode and enqueue
        const send = (data: string) => {
          try {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } catch (err) {
            console.error("Failed to send chunk:", err);
          }
        };

        try {
          const lastMessage = messages[messages.length - 1];
          const content = lastMessage.content.toLowerCase();

          // Only show thinking/reasoning if explicitly requested or relevant
          const showThinking =
            enabledFeatures.thinking &&
            (content.includes("think") ||
              content.includes("explain") ||
              content.includes("reason"));

          const showReasoning =
            enabledFeatures.reasoning &&
            (content.includes("reason") || content.includes("analyze"));

          // Stream thinking
          if (showThinking) {
            for await (const chunk of aiService.streamThinking(
              lastMessage.content
            )) {
              send(chunk);
            }
          }

          // Stream reasoning
          if (showReasoning) {
            for await (const chunk of aiService.streamReasoning(
              lastMessage.content
            )) {
              send(chunk);
            }
          }

          // Handle workflow
          if (enabledFeatures.workflow && content.includes("workflow")) {
            for await (const chunk of aiService.streamWorkflow()) {
              send(chunk);
            }
          }

          // Handle tool calling
          if (enabledFeatures.toolCalling) {
            const toolRequests = aiService.detectToolRequests(
              lastMessage.content
            );

            for (const toolReq of toolRequests) {
              for await (const chunk of aiService.streamToolCall(
                toolReq.name,
                toolReq.args
              )) {
                send(chunk);
              }
            }
          }

          // Stream main AI response
          const response = await aiService.createChatCompletion(
            sanitizedMessages,
            { model, stream: true, max_tokens: 8000 }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error("AI service error:", response.status, errorText);
            throw new Error(
              `AI service error: ${response.status} - ${errorText}`
            );
          }

          // Stream the actual response with proper chunk accumulation
          for await (const chunk of aiService.handleStreamResponse(response)) {
            send(chunk);
          }

          // Send finish signal with accumulated text info
          send(
            JSON.stringify({
              type: "finish",
              finishedTypes: ["text"],
            })
          );

          send("[DONE]");
        } catch (error) {
          console.error("Stream error:", error);
          const errorMsg =
            error instanceof Error ? error.message : "Stream error occurred";
          send(
            JSON.stringify({
              type: "error",
              error: errorMsg,
              code: "STREAM_ERROR",
            })
          );
        } finally {
          controller.close();
        }
      },
      cancel() {
        console.log("Stream cancelled by client");
      },
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    features: {
      streaming: true,
      reasoning: true,
      thinking: true,
      toolCalling: true,
      workflow: true,
      fileHandling: true,
    },
  });
}
