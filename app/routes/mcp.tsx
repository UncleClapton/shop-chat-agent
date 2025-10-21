import { JSONResponse, MissingBodyArgErrorResponse, MissingParamErrorResponse } from "app/lib/responses.server";
import { getMCPClient } from 'app/mcp-client';
import { AppConfig } from "app/services/config.server";

export async function loader({ request }: { request: Request }) {
  // Handle OPTIONS requests (CORS preflight)
  if (request.method === "OPTIONS") {
    return new JSONResponse(null, {
      status: 204,
    });
  }
  if (request.method === "GET") {
    const url = new URL(request.url);
    const store = url.searchParams.get("store");
    if (!store || typeof store !== "string") {
      return new MissingBodyArgErrorResponse("store");
    }

    const tools = await getMCPClient(`https://${store}.myshopify.com`).getTools().catch((e) => {
      console.error("Error fetching tools from MCP:", e);
      return null;
    });
    if (!tools) {
      return new JSONResponse(
        { error: "Failed to fetch tools from Storefront MCP" },
        { status: 500 },
      );
    }

    return new JSONResponse(
      { tools },
      { status: 200 }
    )
  }
  return new JSONResponse(
    { error: AppConfig.errorMessages.mcpUnsupported },
    { status: 400 },
  );
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return new JSONResponse(
      { error: AppConfig.errorMessages.mcpUnsupported },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return new JSONResponse(
      { error: AppConfig.errorMessages.missingBody },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const storeParam = url.searchParams.get("store");

  const { store = storeParam, tool: toolName, args: toolArgs } = body as {
    store?: string;
    tool?: string;
    args?: Record<string, any>;
  };
  if (!store || typeof store !== "string") {
    return new MissingParamErrorResponse("store");
  }
  if (!toolName || typeof toolName !== "string") {
    return new MissingBodyArgErrorResponse("tool");
  }
  if (!toolArgs || typeof toolArgs !== "object") {
    return new MissingBodyArgErrorResponse("args");
  }

  const mcpClient = getMCPClient(`https://${store}.myshopify.com`);
  const tools = await mcpClient.getTools();

  const selectedTool = tools.find((tool) => tool.name === toolName);
  if (!selectedTool) {
    return new JSONResponse(
      { error: `'${toolName}' not found in Storefront MCP` },
      { status: 400 },
    );
  }

  if (selectedTool.input_schema && typeof selectedTool.input_schema === "object") {
    const requiredFields: string[] = selectedTool.input_schema.required || [];
    for (const field of requiredFields) {
      if (!(field in toolArgs)) {
        return new MissingBodyArgErrorResponse(`args.${field}`);
      }
    }
  }

  let response = await mcpClient.callToolRaw(toolName, toolArgs).catch((e) => {
    return { error: e.message || String(e) };
  })

  // try to iterate over response to see if content contains unserializable data
  response = deserializeResponse(response)

  return new JSONResponse(
    response,
    { status: 'error' in response ? 500 : 200 },
  );
}


function deserializeResponse(node: any): any {
  if (!node) return node;
  if (Array.isArray(node)) {
    return node.map(deserializeResponse);
  }
  if (typeof node === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(node)) {
      result[key] = deserializeResponse(value);
    }
    return result;
  }
  if (typeof node === 'string') {
    try {
      return JSON.parse(node);
    } catch {
      return node;
    }
  }
  return node;
}
