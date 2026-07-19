import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "apps/mobile/.expo-web-export");
const port = Number(process.env.PRODUCT_WEB_PORT ?? process.env.PORT ?? 3210);
const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

function resolveRequest(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const safePath = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const candidate = resolve(join(root, safePath));
  if (!candidate.startsWith(root)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  const index = resolve(join(root, "index.html"));
  return existsSync(index) ? index : null;
}

createServer((request, response) => {
  if (request.url === "/healthz") {
    response.writeHead(existsSync(join(root, "index.html")) ? 200 : 503, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: existsSync(join(root, "index.html")) ? "ok" : "missing_export" }));
    return;
  }
  const file = resolveRequest(request.url ?? "/");
  if (!file) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  response.writeHead(200, {
    "content-type": mimeTypes.get(extname(file)) ?? "application/octet-stream",
    "cache-control": file.endsWith("index.html") ? "no-store" : "public, max-age=31536000, immutable"
  });
  createReadStream(file).pipe(response);
}).listen(port, "0.0.0.0", () => {
  console.log(`MoveInRange product web serving ${root} on ${port}`);
});
