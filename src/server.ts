import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname === "/api/-invite-catequista") {
    const module = await import("./routes/api/-invite-catequista");
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método não permitido." }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }
    return await module.POST(request);
  }

  if (pathname === "/api/-delete-invite") {
    const module = await import("./routes/api/-delete-invite");
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método não permitido." }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }
    return await module.POST(request);
  }

  if (pathname === "/api/-delete-catequista") {
    const module = await import("./routes/api/-delete-catequista");
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método não permitido." }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }
    return await module.POST(request);
  }

  if (pathname === "/api/-validate-convite") {
    const module = await import("./routes/api/-validate-convite");
    if (request.method !== "GET") {
      return new Response(JSON.stringify({ error: "Método não permitido." }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }
    return await module.GET(request);
  }

  if (pathname === "/api/-accept-invite") {
    const module = await import("./routes/api/-accept-invite");
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método não permitido." }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }
    return await module.POST(request);
  }

  if (pathname === "/api/-reenvio-notificacao") {
    const module = await import("./routes/api/-reenvio-notificacao");
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método não permitido." }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }
    return await module.POST(request);
  }

  return new Response(JSON.stringify({ error: "Rota de API não encontrada." }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) {
        return await handleApiRequest(request);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
