import type { Tool } from '@anthropic-ai/sdk/resources/messages.mjs';

/**
 * Client for interacting with Model Context Protocol (MCP) API endpoints.
 * Manages connections to both customer and storefront MCP endpoints, and handles tool invocation.
 */
export default class MCPClient {
  private storefrontMcpEndpoint: string;
  public storefrontTools: Array<Tool> | undefined;

  /**
   * Creates a new MCPClient instance.
   *
   * @param {string} hostUrl - The base URL for the shop
   */
  constructor(hostUrl: string) {
    this.storefrontMcpEndpoint = (new URL('/api/mcp', hostUrl)).toString();
  }

  /**
   * Connects to the storefront MCP server and retrieves available tools.
   */
  async getTools (): Promise<Array<Tool>> {
    if (this.storefrontTools) {
      return this.storefrontTools;
    }

    try {
      console.log(`Connecting to MCP server at ${this.storefrontMcpEndpoint}`);

      const headers = {
        "Content-Type": "application/json"
      };

      const response = await this._makeJsonRpcRequest(
        this.storefrontMcpEndpoint,
        "tools/list",
        {},
        headers
      );

      // Extract tools from the JSON-RPC response format
      const toolsData = response.result && response.result.tools ? response.result.tools : [];
      this.storefrontTools = this._formatToolsData(toolsData);

      return this.storefrontTools;
    } catch (e) {
      console.error("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  /**
   * Calls a tool on the storefront MCP server.
   */
  async callTool (toolName: string, toolArgs: unknown): Promise<any> {
    const tools = await this.getTools();
    if (!tools.some(tool => tool.name === toolName)) {
      throw new Error(`Tool ${toolName} not found`);
    }

    try {
      console.log("Calling storefront tool", toolName, toolArgs);

      const headers = {
        "Content-Type": "application/json"
      };

      const response = await this._makeJsonRpcRequest(
        this.storefrontMcpEndpoint,
        "tools/call",
        {
          name: toolName,
          arguments: toolArgs,
        },
        headers
      );

      return response.result || response;
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Makes a JSON-RPC request to the specified endpoint.
   */
  private async _makeJsonRpcRequest (
    endpoint: string,
    method: string,
    params: Record<string, any>,
    headers: Record<string, string>
  ): Promise<any> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: method,
        id: 1,
        params: params
      }),
    });

    if (!response.ok) {
      throw new HTTPError(response);
    }

    return await response.json();
  }

  /**
   * Formats raw tool data into a consistent format.
   */
  private _formatToolsData (toolsData: ToolRaw[]): Tool[] {
    return toolsData.map((tool) => {
      return {
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema || tool.input_schema,
      };
    });
  }
}



export class HTTPError extends Error {
  status: number;

  constructor(response: Response) {
    super(`HTTP Error: ${response.status} ${response.text()}`);
    this.name = "HTTPError";
    this.status = response.status;
  }
}

type ToolRaw = {
  name: string;
  description: string;
  inputSchema?: any;
  input_schema: any;
};
