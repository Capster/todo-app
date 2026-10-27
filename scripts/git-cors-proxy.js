#!/usr/bin/env node

const http = require("node:http");

const PORT = Number(process.env.GIT_CORS_PROXY_PORT || 9999);
const HOST = process.env.GIT_CORS_PROXY_HOST || "127.0.0.1";

const REQUEST_SKIP_HEADERS = new Set([
  "connection",
  "host",
  "origin",
  "referer",
  "content-length",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
]);

const RESPONSE_SKIP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function corsHeaders(request) {
  const origin = request.headers.origin || "*";
  const requestedHeaders = request.headers["access-control-request-headers"];

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      requestedHeaders ||
      "Authorization, Content-Type, Accept, Git-Protocol, X-Requested-With",
    "Access-Control-Expose-Headers": "*",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function sendText(response, status, message, extraHeaders) {
  response.writeHead(status, {
    ...extraHeaders,
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(message);
}

const server = http.createServer(async (request, response) => {
  const cors = corsHeaders(request);

  if (request.method === "OPTIONS") {
    response.writeHead(204, cors);
    response.end();
    return;
  }

  let target;
  try {
    const requestUrl = new URL(
      request.url || "/",
      `http://${request.headers.host || "localhost"}`,
    );
    target = new URL(
      `https://${decodeURIComponent(requestUrl.pathname).slice(1)}${requestUrl.search}`,
    );
  } catch {
    sendText(response, 400, "Invalid proxy path.", cors);
    return;
  }

  if (target.protocol !== "https:" || target.hostname !== "github.com") {
    sendText(response, 403, "Only https://github.com is allowed.", cors);
    return;
  }

  const headers = {};
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) {
      continue;
    }
    if (REQUEST_SKIP_HEADERS.has(name.toLowerCase())) {
      continue;
    }
    headers[name] = value;
  }
  headers["accept-encoding"] = "identity";

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : Buffer.concat(chunks);

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: "follow",
    });

    const responseHeaders = {};
    upstream.headers.forEach((value, name) => {
      if (!RESPONSE_SKIP_HEADERS.has(name.toLowerCase())) {
        responseHeaders[name] = value;
      }
    });

    const buffer = Buffer.from(await upstream.arrayBuffer());
    response.writeHead(upstream.status, { ...responseHeaders, ...cors });
    response.end(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendText(response, 502, `Proxy request failed: ${message}`, cors);
  }
});

server.listen(PORT, HOST, () => {
  console.log(
    `Git CORS proxy listening on http://${HOST}:${PORT} (forwarding to https://github.com)`,
  );
});
