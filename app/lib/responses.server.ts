import { AppConfig } from 'app/services/config.server';

const HttpMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
  HEAD: "HEAD",
  OPTIONS: "OPTIONS",
  TRACE: "TRACE",
  CONNECT: "CONNECT",
} as const;
export type HttpMethod = typeof HttpMethod[keyof typeof HttpMethod];

/**
 * Gets CORS headers for the response
 */
export function getCorsHeaders (methods?: HttpMethod[]) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": methods?.join(",") ?? "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400", // 24 hours
  } as const;
}

/**
 * Get SSE headers for the response
 */
export function getSseHeaders (methods?: HttpMethod[]) {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": methods?.join(",") ?? "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  } as const;
}



export class CorsResponse extends Response {
  constructor(body: BodyInit | null, init?: ResponseInit & { allowMethods?: HttpMethod[] }) {
    const { allowMethods, ...restInit } = init ?? {};

    restInit.headers = Object.assign(
      {},
      getCorsHeaders(allowMethods),
      restInit.headers ?? {}
    );

    super(body, restInit);
  }
}

export class SseResponse extends Response {
  constructor(body: BodyInit | null, init?: ResponseInit & { allowMethods?: HttpMethod[] }) {
    const { allowMethods, ...restInit } = init ?? {};

    restInit.headers = Object.assign(
      {},
      getSseHeaders(allowMethods),
      restInit.headers ?? {}
    );

    super(body, restInit);
  }
}

export class JSONResponse extends CorsResponse {
  constructor(body: object | null, init?: ResponseInit) {
    super(
      typeof body === "object" && body !== null ? JSON.stringify(body) : body,
      {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
      },
    );
  }
}

export class MissingParamErrorResponse extends JSONResponse {
  constructor(param: string) {
    super(
      { error: AppConfig.errorMessages.missingParam(param) },
      { status: 400 },
    );
  }
}

export class MissingBodyArgErrorResponse extends JSONResponse {
  constructor(param: string, extraInfo?: string) {
    super(
      { error: AppConfig.errorMessages.missingBodyArg(param) + (extraInfo ? ` ${extraInfo}` : "") },
      { status: 400 },
    );
  }
}
