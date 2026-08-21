import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from "node:http";
import { connect, type Socket } from "node:net";

import { assertPublicUrl, type ResolvedAddress } from "../audit/ssrf";

const SOCKET_TIMEOUT_MS = 15_000;

export interface SafeAuditProxy {
  readonly url: string;
  close(): Promise<void>;
}

/**
 * Local forward proxy used by Lighthouse. Every browser request and CONNECT
 * tunnel is DNS-checked and pinned before a socket is opened, so redirects and
 * subresources cannot bypass the crawler's SSRF boundary.
 */
export async function createSafeAuditProxy(): Promise<SafeAuditProxy> {
  const server = createServer((request, response) => {
    void proxyHttpRequest(request, response);
  });
  server.on("connect", (request, clientSocket, head) => {
    void proxyConnect(request, clientSocket as Socket, head);
  });
  server.on("clientError", (_error, socket) => socket.destroy());

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error("SAFE_PROXY_BIND_FAILED");
  }
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

async function proxyConnect(request: IncomingMessage, clientSocket: Socket, head: Buffer): Promise<void> {
  try {
    const authority = request.url ?? "";
    const target = await assertPublicUrl(new URL(`https://${authority}`));
    if (target.url.port && target.url.port !== "443") throw new Error("PROXY_PORT_BLOCKED");
    const upstream = connectPinned(target.addresses, 443);
    upstream.setTimeout(SOCKET_TIMEOUT_MS, () => upstream.destroy());
    clientSocket.setTimeout(SOCKET_TIMEOUT_MS, () => clientSocket.destroy());
    upstream.once("connect", () => {
      clientSocket.write("HTTP/1.1 200 Connection Established\r\nProxy-Agent: KILENI\r\n\r\n");
      if (head.length) upstream.write(head);
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });
    upstream.once("error", () => clientSocket.destroy());
    clientSocket.once("error", () => upstream.destroy());
  } catch {
    clientSocket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
  }
}

async function proxyHttpRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { connection: "close" });
      response.end();
      return;
    }
    const target = await assertPublicUrl(new URL(request.url ?? ""));
    if (target.url.protocol !== "http:" || (target.url.port && target.url.port !== "80")) {
      response.writeHead(403, { connection: "close" });
      response.end();
      return;
    }
    const address = chooseAddress(target.addresses);
    const headers: Record<string, string | string[] | undefined> = { ...request.headers, host: target.url.host };
    delete headers["proxy-connection"];
    const upstream = httpRequest({
      host: address.address,
      family: address.family,
      port: 80,
      method: request.method,
      path: `${target.url.pathname}${target.url.search}`,
      headers,
      timeout: SOCKET_TIMEOUT_MS,
    }, (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    });
    upstream.once("timeout", () => upstream.destroy(new Error("PROXY_UPSTREAM_TIMEOUT")));
    upstream.once("error", () => {
      if (!response.headersSent) response.writeHead(502, { connection: "close" });
      response.end();
    });
    request.pipe(upstream);
  } catch {
    response.writeHead(403, { connection: "close" });
    response.end();
  }
}

function connectPinned(addresses: readonly ResolvedAddress[], port: number): Socket {
  const address = chooseAddress(addresses);
  return connect({ host: address.address, family: address.family, port });
}

function chooseAddress(addresses: readonly ResolvedAddress[]): ResolvedAddress {
  const address = addresses.find((candidate) => candidate.family === 4) ?? addresses[0];
  if (!address) throw new Error("PROXY_DNS_EMPTY");
  return address;
}
