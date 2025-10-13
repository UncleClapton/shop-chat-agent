/**
 * Tool Service
 * Manages tool execution and processing
 */
import { ImageBlockParam, MessageParam, TextBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs';
import { saveMessage } from "../db.server";
import { AppConfig } from "./config.server";

type ToolResponseContent = string | (ImageBlockParam | TextBlockParam)[];

type ToolSuccessResponse = {
  content: ToolResponseContent
  error?: never;
}

type ToolErrorResponse = {
  content?: never;
  error: {
    type: string;
    data: ToolResponseContent
  };
}

type ToolResponse = ToolSuccessResponse | ToolErrorResponse;

export type ProductData = {
  id: string;
  title: string;
  price: string;
  handle: string;
  image_url: string;
  description: string;
  url: string;
}

// Additional data that is processed by this service may be contained within this type, but it is not guaranteed
export type ToolSuccessResult = {
  productsToDisplay?: ProductData[];
}

type ToolService = {
  handleToolError: (
    conversationId: string,
    conversationHistory: MessageParam[],
    toolName: string,
    toolUseId: string,
    toolUseResponse: ToolErrorResponse,
    sendMessage: (data: Record<string, any>) => void,
  ) => Promise<void>;
  handleToolSuccess: (
    conversationId: string,
    conversationHistory: MessageParam[],
    toolName: string,
    toolUseId: string,
    toolUseResponse: ToolSuccessResponse,
  ) => Promise<ToolSuccessResult>;
  processProductSearchResult: (toolUseResponse: ToolResponse) => any[];
  addToolResultToHistory: (
    conversationId: string,
    conversationHistory: MessageParam[],
    toolUseId: string,
    content: ToolResponseContent,
  ) => Promise<void>;
}

/**
 * Creates a tool service instance
 */
export function createToolService (): ToolService {
  /**
   * Handles a tool error response
   */
  const handleToolError: ToolService['handleToolError'] = async (
    conversationId,
    conversationHistory,
    toolName,
    toolUseId,
    toolUseResponse,
    sendMessage,
  ) => {
    if (toolUseResponse.error.type === "auth_required") {
      console.log("Auth required for tool:", toolName);
      await addToolResultToHistory(conversationId, conversationHistory, toolUseId, toolUseResponse.error.data);
      sendMessage({ type: 'auth_required' });
    } else {
      console.log("Tool use error", toolUseResponse.error);
      await addToolResultToHistory(conversationId, conversationHistory, toolUseId, toolUseResponse.error.data);
    }
  };

  /**
   * Handles a successful tool response
   */
  const handleToolSuccess: ToolService['handleToolSuccess'] = async (
    conversationId,
    conversationHistory,
    toolName,
    toolUseId,
    toolUseResponse,
  ) => {
    addToolResultToHistory(conversationId, conversationHistory, toolUseId, toolUseResponse.content);

    const result: ToolSuccessResult = {};

    if (toolName === AppConfig.tools.productSearchName) {
      result.productsToDisplay = processProductSearchResult(toolUseResponse)
    }

    return result;
  };

  /**
   * Processes product search results
   */
  const processProductSearchResult: ToolService['processProductSearchResult'] = (toolUseResponse) => {
    try {
      console.log("Processing product search result");
      let products = [];

      if (toolUseResponse.content && toolUseResponse.content.length > 0) {
        const firstBlock = toolUseResponse.content[0];
        const content = typeof firstBlock === 'string' ? firstBlock : (firstBlock as TextBlockParam).text || '';
        try {
          let responseData;
          if (typeof content === 'object') {
            responseData = content;
          } else if (typeof content === 'string') {
            responseData = JSON.parse(content);
          }

          if (responseData?.products && Array.isArray(responseData.products)) {
            products = responseData.products
              .slice(0, AppConfig.tools.maxProductsToDisplay)
              .map(formatProductData);

            console.log(`Found ${products.length} products to display`);
          }
        } catch (e) {
          console.error("Error parsing product data:", e);
        }
      }

      return products;
    } catch (error) {
      console.error("Error processing product search results:", error);
      return [];
    }
  };

  /**
   * Formats a product data object
   */
  const formatProductData = (product: any) => {
    const price = product.price_range
      ? `${product.price_range.currency} ${product.price_range.min}`
      : (product.variants && product.variants.length > 0
        ? `${product.variants[0].currency} ${product.variants[0].price}`
        : 'Price not available');

    return {
      id: product.product_id || `product-${Math.random().toString(36).substring(7)}`,
      title: product.title || 'Product',
      price: price,
      handle: product.url?.split('?')?.[0].split('/')?.pop() || '',
      image_url: product.image_url || '',
      description: product.description || '',
      url: product.url || ''
    };
  };

  /**
   * Adds a tool result to the conversation history
   */
  const addToolResultToHistory: ToolService['addToolResultToHistory'] = async (
    conversationId,
    conversationHistory,
    toolUseId,
    content,
  ) => {
    const toolResultMessage: MessageParam = {
      role: 'user',
      content: [{
        type: "tool_result",
        tool_use_id: toolUseId,
        content: content
      }]
    };

    // Add to in-memory history
    conversationHistory.push(toolResultMessage);

    // Save to database with special format to indicate tool result
    if (conversationId) {
      try {
        await saveMessage(conversationId, 'user', JSON.stringify(toolResultMessage.content));
      } catch (error) {
        console.error('Error saving tool result to database:', error);
      }
    }
  };

  return {
    handleToolError,
    handleToolSuccess,
    processProductSearchResult,
    addToolResultToHistory
  };
}

export default {
  createToolService
};
