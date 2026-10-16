import http from "node:http";
import net from "node:net";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";

const publicDirectory = path.resolve(
  fileURLToPath(new URL("../dist/", import.meta.url)),
);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

export function validateTarget(value) {
  if (!value || typeof value.host !== "string")
    throw new Error("Introduce una dirección válida.");
  const host = value.host.trim();
  const port =
    typeof value.port === "string" && /^\d+$/.test(value.port)
      ? Number(value.port)
      : value.port;
  const validHost =
    net.isIP(host) ||
    /^(?=.{1,253}$)[a-z\d](?:[a-z\d.-]*[a-z\d])?$/i.test(host);
  if (!validHost || !Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Revisa la dirección y el puerto (1–65535).");
  return { host, port };
}

export async function createAppServer({ port = 0, dev = false } = {}) {
  const tickets = new Map();
  const sockets = new Set();
  let url;
  const allowedOrigin = (origin) =>
    origin === url || (dev && origin === "http://127.0.0.1:5173");
  const json = (res, status, data) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  };
  const server = http.createServer(async (req, res) => {
    if (
      req.headers.host !== new URL(url).host &&
      !(dev && req.headers.host === "127.0.0.1:5173")
    )
      return json(res, 403, { error: "Origen no permitido." });
    const requestUrl = new URL(req.url, url);
    if (requestUrl.pathname === "/api/sessions") {
      if (req.method !== "POST")
        return json(res, 405, { error: "Método no permitido." });
      if (
        !allowedOrigin(req.headers.origin) ||
        req.headers["content-type"] !== "application/json"
      )
        return json(res, 403, { error: "Origen no permitido." });
      try {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 2048) {
            json(res, 413, { error: "Solicitud demasiado grande." });
            return;
          }
        }
        const target = validateTarget(JSON.parse(body));
        // Tickets expire quickly and can only open one local WebSocket.
        if (tickets.size >= 128)
          return json(res, 429, {
            error: "Demasiados intentos. Espera un momento.",
          });
        const ticket = randomBytes(32).toString("hex");
        tickets.set(ticket, { ...target, expires: Date.now() + 30000 });
        return json(res, 201, { ticket });
      } catch (error) {
        return json(res, 400, {
          error:
            error instanceof SyntaxError
              ? "Solicitud inválida."
              : error.message,
        });
      }
    }
    if (requestUrl.pathname.startsWith("/api/"))
      return json(res, 404, { error: "No encontrado." });
    if (req.method !== "GET" && req.method !== "HEAD")
      return json(res, 405, { error: "Método no permitido." });
    try {
      const filename = path.resolve(
        publicDirectory,
        "." +
          decodeURIComponent(
            requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname,
          ),
      );
      if (
        !filename.startsWith(publicDirectory + path.sep) &&
        filename !== path.join(publicDirectory, "index.html")
      )
        return json(res, 403, { error: "Ruta no permitida." });
      const content = await readFile(filename);
      res.writeHead(200, {
        "Content-Type":
          types[path.extname(filename)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ws://127.0.0.1:*; frame-ancestors 'none'; object-src 'none'; base-uri 'none'",
        "Cache-Control": "no-cache",
      });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch {
      json(res, 404, {
        error: "Archivo no encontrado. Ejecuta npm run build.",
      });
    }
  });
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 8 * 1024 * 1024,
    perMessageDeflate: false,
  });
  server.on("upgrade", (req, socket, head) => {
    const requestUrl = new URL(req.url, url);
    const ticket = requestUrl.searchParams.get("ticket");
    const target = tickets.get(ticket);
    tickets.delete(ticket);
    if (
      (req.headers.host !== new URL(url).host &&
        !(dev && req.headers.host === "127.0.0.1:5173")) ||
      requestUrl.pathname !== "/vnc" ||
      !allowedOrigin(req.headers.origin) ||
      !target ||
      target.expires < Date.now()
    ) {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const tcp = net.createConnection({
        host: target.host,
        port: target.port,
      });
      sockets.add(tcp);
      let pending = [];
      let pendingBytes = 0;
      let connected = false;
      const stop = () => {
        pending = [];
        tcp.destroy();
        sockets.delete(tcp);
      };
      tcp.setTimeout(10000, () =>
        ws.close(
          4000,
          "El servidor no responde. Revisa la dirección y el puerto.",
        ),
      );
      tcp.on("connect", () => {
        connected = true;
        tcp.setTimeout(0);
        for (const data of pending) tcp.write(data);
        pending = [];
      });
      tcp.on("data", (data) => {
        if (ws.readyState === WebSocket.OPEN) {
          if (ws.bufferedAmount > 8 * 1024 * 1024) {
            tcp.pause();
          }
          ws.send(data, { binary: true }, () => {
            if (!tcp.destroyed) tcp.resume();
          });
        }
      });
      tcp.on("error", () =>
        ws.close(4001, "No se pudo abrir la conexión con el servidor."),
      );
      tcp.on("close", () => {
        sockets.delete(tcp);
        if (ws.readyState === WebSocket.OPEN)
          ws.close(1000, "El servidor cerró la conexión.");
      });
      ws.on("message", (data) => {
        if (connected) {
          if (!tcp.write(data)) ws.pause();
        } else {
          pendingBytes += data.length;
          if (pendingBytes > 1024 * 1024) ws.close(1009, "Demasiados datos.");
          else pending.push(data);
        }
      });
      tcp.on("drain", () => ws.resume());
      ws.on("error", stop);
      ws.on("close", stop);
    });
  });
  const expiry = setInterval(() => {
    for (const [key, value] of tickets)
      if (value.expires < Date.now()) tickets.delete(key);
  }, 30000);
  expiry.unref();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  url = `http://127.0.0.1:${server.address().port}`;
  return {
    url,
    close: async () => {
      clearInterval(expiry);
      for (const ws of wss.clients) ws.terminate();
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => wss.close(resolve));
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
