// app/api/chat/route.ts
import { AIService, AVAILABLE_TOOLS } from "@/helpers/sseHelper";
import { ChatRequestBody } from "@/types/useChat";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const { messages, model = "gpt-4", stream = true } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required and cannot be empty" },
        { status: 400 }
      );
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return NextResponse.json(
          { error: "Each message must have role and content" },
          { status: 400 }
        );
      }
    }

    const aiService = new AIService();

    if (stream) {
      const responseStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          try {
            // Send step start
            controller.enqueue(
              encoder.encode('data: {"type":"step-start"}\n\n')
            );

            // Check if we should demonstrate advanced features
            const lastMessage = messages[messages.length - 1];
            const shouldDemoAdvanced =
              lastMessage.content.toLowerCase().includes("search") ||
              lastMessage.content.toLowerCase().includes("calculate") ||
              lastMessage.content.toLowerCase().includes("weather") ||
              lastMessage.content.toLowerCase().includes("think") ||
              lastMessage.content.toLowerCase().includes("workflow");

            if (shouldDemoAdvanced) {
              // Show thinking process
              if (
                lastMessage.content.toLowerCase().includes("think") ||
                lastMessage.content.toLowerCase().includes("reasoning")
              ) {
                for await (const chunk of aiService.simulateThinking(
                  lastMessage.content
                )) {
                  controller.enqueue(encoder.encode(`data: ${chunk}\n`));
                }
              }

              // Show workflow
              if (lastMessage.content.toLowerCase().includes("workflow")) {
                for await (const chunk of aiService.simulateWorkflow()) {
                  controller.enqueue(encoder.encode(`data: ${chunk}\n`));
                }
              }

              // Simulate tool calls
              if (lastMessage.content.toLowerCase().includes("search")) {
                for await (const chunk of aiService.simulateToolCall(
                  "web_search",
                  { query: lastMessage.content }
                )) {
                  controller.enqueue(encoder.encode(`data: ${chunk}\n`));
                }
              }

              if (lastMessage.content.toLowerCase().includes("calculate")) {
                for await (const chunk of aiService.simulateToolCall(
                  "calculate",
                  { expression: "2 + 2" }
                )) {
                  controller.enqueue(encoder.encode(`data: ${chunk}\n`));
                }
              }

              if (lastMessage.content.toLowerCase().includes("weather")) {
                for await (const chunk of aiService.simulateToolCall(
                  "get_weather",
                  { location: "San Francisco" }
                )) {
                  controller.enqueue(encoder.encode(`data: ${chunk}\n`));
                }
              }
            }

            // Stream the actual AI response
            const response = await aiService.createChatCompletion(messages, {
              model,
              stream: true,
            });

            for await (const chunk of aiService.handleStreamResponse(
              response
            )) {
              controller.enqueue(encoder.encode(`data: ${chunk}\n`));
              await new Promise((resolve) => setTimeout(resolve, 10));
            }

            // Send finish signal
            controller.enqueue(
              encoder.encode(
                'data: {"type":"finish","finishedTypes":["text"]}\n\n'
              )
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch (error) {
            console.error("Stream error:", error);
            const errorMsg =
              error instanceof Error ? error.message : "Stream error";
            controller.enqueue(
              encoder.encode(`data: {"type":"error","error":"${errorMsg}"}\n\n`)
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
        },
      });
    } else {
      // Non-streaming response
      const response = await aiService.createChatCompletion(messages, {
        model,
        stream: false,
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      return NextResponse.json({
        id: `chat_${Date.now()}`,
        message: {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: content,
          parts: [
            {
              type: "text",
              text: content,
              state: "done",
            },
          ],
        },
        usage: data.usage,
      });
    }
  } catch (error) {
    console.error("Chat API error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    features: {
      streaming: true,
      reasoning: true,
      toolCalling: true,
      workflow: true,
    },
    availableTools: Object.keys(AVAILABLE_TOOLS),
  });
}
