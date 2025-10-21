/**
 * Chat API Route
 * Handles chat interactions with Claude API and tools
 */
import {
  Message,
  MessageParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages.mjs";
import { getConversationHistory, saveMessage } from "../db.server";
import MCPClient from "../mcp-client";
import { createClaudeService } from "../services/claude.server";
import { AppConfig } from "../services/config.server";
import { createSseStream, StreamManager } from "../services/streaming.server";
import { createToolService, ProductData } from "../services/tool.server";
import {
  CorsResponse,
  JSONResponse,
  MissingBodyArgErrorResponse,
  MissingParamErrorResponse,
  SseResponse,
} from "../lib/responses.server";

/**
 * Rract Router loader function for handling GET requests
 */
export async function loader({ request }: { request: Request }) {
  // Handle OPTIONS requests (CORS preflight)
  if (request.method === "OPTIONS") {
    return new CorsResponse(null, { status: 204 });
  }

  const url = new URL(request.url);

  const conversationId = url.searchParams.get("conversation_id");
  if (!conversationId?.length) {
    return new MissingParamErrorResponse("conversation_id");
  }

  // Handle history fetch requests - matches /chat?history=true&conversation_id=XYZ
  return handleHistoryRequest(conversationId);

  // API-only: reject all other requests
  return new JSONResponse(
    { error: AppConfig.errorMessages.chatUnsupported },
    { status: 400 },
  );
}

export async function action({ request }: { request: Request }) {
  // Handle SSE requests
  if (request.headers.get("Accept") === "text/event-stream") {
    const url = new URL(request.url);
    const conversationId =
      url.searchParams.get("conversation_id") ?? makeConversationId();
    return handleChatRequest(request, conversationId);
  }

  // API-only: reject all other requests
  return new JSONResponse(
    { error: AppConfig.errorMessages.chatUnsupported },
    { status: 400 },
  );
}

/**
 * Handle history fetch requests
 */
async function handleHistoryRequest(conversationId: string) {
  const messages = await getConversationHistory(conversationId);

  return new JSONResponse({ messages });
}

/**
 * Handle chat requests (both GET and POST)
 *
 */
async function handleChatRequest(request: Request, conversationId: string) {
  try {
    const url = new URL(request.url);
    const storeParam = url.searchParams.get("store");

    // Get message data from request body
    const {
      message: userMessage,
      store: storeArg,
      shopDomain: shopDomainArg,
      shopName,
    } = await request.json().catch(() => ({}));

    const store = storeArg ?? storeParam;
    const shopDomain =
      shopDomainArg ?? store ? `https://${store}.myshopify.com` : undefined;

    // Validate required message
    if (typeof shopDomain !== "string" || shopDomain.trim().length === 0) {
      return new MissingBodyArgErrorResponse(
        "shopDomain",
        "Alternatively, provide 'store' parameter in URL params or body.",
      );
    }
    if (typeof shopName !== "string" || shopName.trim().length === 0) {
      return new MissingBodyArgErrorResponse("shopName");
    }
    if (typeof userMessage !== "string" || userMessage.trim().length === 0) {
      return new MissingBodyArgErrorResponse("message");
    }

    // Create a stream for the response
    const responseStream = createSseStream(async (stream) => {
      await handleChatSession({
        shopDomain,
        shopName,
        userMessage,
        conversationId,
        stream,
      });
    });

    return new SseResponse(responseStream);
  } catch (error: any) {
    console.error("Error in chat request handler:", error);
    return new JSONResponse({ error: error?.message }, { status: 500 });
  }
}

type ChatSessionParams = {
  shopDomain: string;
  shopName: string;
  claudeToken?: string;
  conversationId: string;
  userMessage: string;
  stream: StreamManager;
};

/**
 * Handle a complete chat session
 */
async function handleChatSession({
  shopDomain,
  shopName,
  claudeToken,
  userMessage,
  conversationId,
  stream,
}: ChatSessionParams) {
  // Initialize services
  const claudeService = createClaudeService(shopName, claudeToken);
  const toolService = createToolService();
  const mcpClient = new MCPClient(shopDomain);

  // eslint-disable-next-line no-useless-catch
  try {
    // Send conversation ID to client
    stream.sendMessage({ type: "id", conversation_id: conversationId });

    // Connect to MCP servers and get available tools
    let tools: Tool[] = [];
    try {
      tools = await mcpClient.getTools();
      console.log(`Connected to MCP with ${tools.length} tools`);
    } catch (error) {
      console.warn(
        "Failed to connect to MCP servers, continuing without tools:",
        error,
      );
    }

    // Prepare conversation state
    const productsToDisplay: ProductData[] = [];

    // Save user message to the database
    await saveMessage(conversationId, "user", userMessage);

    // Fetch all messages from the database for this conversation
    const dbMessages = await getConversationHistory(conversationId);

    // Format messages for Claude API
    const conversationHistory = dbMessages.map((dbMessage) => {
      let content;
      try {
        content = JSON.parse(dbMessage.content);
      } catch (e) {
        content = dbMessage.content;
      }
      return {
        role: dbMessage.role,
        content,
      } as MessageParam;
    });

    // Execute the conversation stream
    let messagePart: Partial<Message> = {};

    while (messagePart.stop_reason !== "end_turn") {
      messagePart = await claudeService.streamConversation(
        {
          messages: conversationHistory,
          tools: tools,
        },
        {
          // Handle text chunks
          onText: (textDelta) => {
            stream.sendMessage({
              type: "chunk",
              chunk: textDelta,
            });
          },

          // Handle complete messages
          onMessage: (message) => {
            conversationHistory.push({
              role: message.role,
              content: message.content,
            });

            saveMessage(
              conversationId,
              message.role,
              JSON.stringify(message.content),
            ).catch((error) => {
              console.error("Error saving message to database:", error);
            });

            // Send a completion message
            stream.sendMessage({ type: "message_complete" });
          },

          // Handle tool use requests
          onToolUse: async (content) => {
            const toolName = content.name;
            const toolArgs = content.input;
            const toolUseId = content.id;

            stream.sendMessage({
              type: "tool_use",
              tool_use_message: `Calling tool: ${toolName} with arguments: ${JSON.stringify(toolArgs)}`,
            });

            // Call the tool
            const toolUseResponse = await mcpClient.callTool(
              toolName,
              toolArgs,
            );

            // Handle tool response based on success/error
            if (toolUseResponse.error) {
              await toolService.handleToolError(
                conversationId,
                conversationHistory,
                toolName,
                toolUseId,
                toolUseResponse,
                stream.sendMessage,
              );
            } else {
              const result = await toolService.handleToolSuccess(
                conversationId,
                conversationHistory,
                toolName,
                toolUseId,
                toolUseResponse,
              );

              if (result.productsToDisplay) {
                productsToDisplay.push(...result.productsToDisplay);
              }
            }

            // Signal new message to client
            stream.sendMessage({ type: "new_message" });
          },

          // Handle content block completion
          onContentBlock: (contentBlock) => {
            if (contentBlock.type === "text") {
              stream.sendMessage({
                type: "content_block_complete",
                content_block: contentBlock,
              });
            }
          },
        },
      );
    }

    // Send product results if available
    if (productsToDisplay.length > 0) {
      stream.sendMessage({
        type: "product_results",
        products: productsToDisplay,
      });
    }

    // Signal end of turn
    stream.sendMessage({ type: "end_turn" });
  } catch (error) {
    // The streaming handler takes care of error handling
    throw error;
  }
}

function makeConversationId() {
  const curDate = new Date();
  const year = curDate.getUTCFullYear();
  const month = String(curDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(curDate.getUTCDate()).padStart(2, "0");
  return `conv-${year}${month}${day}-${randId(8)}-${randId(8)}-${randId(8)}`;
}
function randId(length = 64) {
  let buffer = "";
  while (buffer.length < length) {
    buffer += Math.random().toString(36).substring(2);
  }
  buffer = buffer.substring(0, length);

  return buffer;
}
