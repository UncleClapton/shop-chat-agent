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
    missingParameter: (param: string) => `Missing required parameter: ${param}`,
    apiUnsupported: "This endpoint only supports server-sent events (SSE) requests or history requests.",
    authFailed: "Authentication failed with Claude API",
    apiKeyError: "Please check your API key in environment variables",
    rateLimitExceeded: "Rate limit exceeded",
    rateLimitDetails: "Please try again later",
    genericError: "Failed to get response from Claude"
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
    missingParameter: (param: string) => string;
    apiUnsupported: string;
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
