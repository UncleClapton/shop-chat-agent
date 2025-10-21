/**
 * Configuration Service
 * Centralizes all configuration values for the chat service
 */

import { Model } from '@anthropic-ai/sdk/resources/index.mjs';

export const AppConfig = {
  // API Configuration
  api: {
    defaultModel: 'claude-haiku-4-5',
    maxTokens: 2000,
  },

  // Error Message Templates
  errorMessages: {
    missingBody: "Request body is missing or invalid.",
    missingBodyArg: (param: string) => `Missing or invalid body parameter: ${param}.`,
    missingParam: (param: string) => `Missing or invalid query parameter: ${param}.`,
    chatUnsupported: "This endpoint only supports server-sent events (SSE) requests or history requests.",
    mcpUnsupported: "This endpoint only supports POST requests.",
    authFailed: "Authentication failed with Claude API.",
    apiKeyError: "Please check your API key in environment variables.",
    rateLimitExceeded: "Rate limit exceeded.",
    rateLimitDetails: "Please try again later.",
    genericError: "Failed to get response from Claude."
  },

  // Tool Configuration
  tools: {
    productSearchName: "search_shop_catalog",
    maxProductsToDisplay: 10,
  }
} as const satisfies AppConfigType;


type AppConfigType = {
  api: {
    defaultModel: Model;
    maxTokens: number;
  };
  errorMessages: {
    missingBody: string;
    missingBodyArg: (param: string) => string;
    missingParam: (param: string) => string;
    chatUnsupported: string;
    mcpUnsupported: string;
    authFailed: string;
    apiKeyError: string;
    rateLimitExceeded: string;
    rateLimitDetails: string;
    genericError: string;
  };
  tools: {
    productSearchName: string;
    maxProductsToDisplay: number;
  };
};
