import http from "http";
import net from "net";

const PORT = Number(process.env.PORT) || 20961;
const TARGET_HOST = "localhost";
const TARGET_PORT = 5000;

function proxyHTTP(req, res) {
  const opts = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `${TARGET_HOST}:${TARGET_PORT}` },
  };

  const proxyReq = http.request(opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    if (!res.headersSent) res.writeHead(502);
    res.end(`Main app unavailable: ${err.message}`);
  });

  req.pipe(proxyReq, { end: true });
}

const server = http.createServer(proxyHTTP);

// Proxy WebSocket upgrades so Vite HMR works end-to-end
server.on("upgrade", (req, clientSocket, head) => {
  const serverSocket = net.connect(TARGET_PORT, TARGET_HOST, () => {
    const headers = Object.entries(req.headers)
      .filter(([k]) => k !== "host")
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\r\n");

    serverSocket.write(
      `${req.method ?? "GET"} ${req.url} HTTP/1.1\r\n` +
        `Host: ${TARGET_HOST}:${TARGET_PORT}\r\n` +
        `${headers}\r\n\r\n`,
    );

    if (head && head.length) serverSocket.write(head);

    clientSocket.pipe(serverSocket);
    serverSocket.pipe(clientSocket);
  });

  serverSocket.on("error", () => clientSocket.destroy());
  clientSocket.on("error", () => serverSocket.destroy());
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `  PROXY ready on port ${PORT}  →  forwarding all traffic to :${TARGET_PORT}`,
  );
});
