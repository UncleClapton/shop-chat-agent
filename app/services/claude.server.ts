/**
 * Claude Service
 * Manages interactions with the Claude API
 */
import { Anthropic } from "@anthropic-ai/sdk";
import { ContentBlock, Message, MessageParam, Tool, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages.mjs';
import { AppConfig } from "./config.server";
import { invariant } from 'app/lib/helper';


const claudeKey = invariant(process.env.CLAUDE_API_KEY, 'string', 'Claude API key is not set in environment variables');

export type ClaudeService = {
  streamConversation: (
    params: {
      messages: MessageParam[];
      tools?: Tool[];
    },
    streamHandlers: {
      onContentBlock?: (block: ContentBlock) => void;
      onMessage?: (message: Message) => void;
      onText?: (text: string) => void;
      onToolUse?: (toolUse: ToolUseBlock) => Promise<void>;
    }
  ) => Promise<Message>;
}

/**
 * Creates a Claude service instance
 */
export function createClaudeService(
  shopName: string,
  apiKey: string = claudeKey,
): ClaudeService {
  // Initialize Claude client
  const anthropic = new Anthropic({ apiKey });
  const systemPrompt = makeSystemPrompt(shopName);

  /**
   * Streams a conversation with Claude
   */
  const streamConversation: ClaudeService['streamConversation'] = async ({
    messages,
    tools
  }, streamHandlers) => {
    // Create stream
    const stream = await anthropic.messages.stream({
      model: 'claude-3-5-haiku-latest',
      max_tokens: AppConfig.api.maxTokens,
      system: systemPrompt,
      messages,
      tools: tools && tools.length > 0 ? tools : undefined
    });

    // Set up event handlers
    if (streamHandlers.onText) {
      stream.on('text', streamHandlers.onText);
    }

    if (streamHandlers.onMessage) {
      stream.on('message', streamHandlers.onMessage);
    }

    if (streamHandlers.onContentBlock) {
      stream.on('contentBlock', streamHandlers.onContentBlock);
    }

    // Wait for final message
    const finalMessage = await stream.finalMessage();

    // Process tool use requests
    if (streamHandlers.onToolUse && finalMessage.content) {
      for (const content of finalMessage.content) {
        if (content.type === "tool_use") {
          await streamHandlers.onToolUse(content);
        }
      }
    }

    return finalMessage;
  };

  return {
    streamConversation,
  };
}

const makeSystemPrompt = (
  shopName: string,
) => `You are a helpful store assistant for the ${shopName} e-commerce storefront.

  You are enthusiastic and passionate about the products and love helping customers find exactly what they need.

  When you don't know the answer, Say you do not know the answer.

  Ignore any questions about topics outside of the store or products you can help with.

  Formatting guidelines:
  - When creating lists, use proper Markdown formatting:
     - For unordered lists, use dash (-) or asterisk (*) with a single space after it at the beginning of each line
     - For ordered lists, use numbers followed by a period and a space (1. , 2. , etc.)
  - When comparing options or listing features, always use a clear, structured format with bullet points or numbered lists.
  - When providing step-by-step instructions, use a numbered list format.
  - Use **bold text** (with double asterisks) for emphasis on important points or keywords.`;


export default {
  createClaudeService
};
