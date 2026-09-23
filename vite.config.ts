// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    preset: "node-server",
  },
  vite: {
    plugins: [
      {
        name: "api-dev-middleware",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url ? new URL(req.url, "http://localhost:3000") : null;
            if (!url || !url.pathname.startsWith("/api/")) {
              return next();
            }

            const chunks: Buffer[] = [];
            req.on("data", (chunk) => {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            req.on("end", async () => {
              try {
                const bodyBuffer = Buffer.concat(chunks);
                const { handleApiRouter } = await server.ssrLoadModule("/src/lib/server-api.ts");

                const headers = new Headers();
                for (const [key, value] of Object.entries(req.headers)) {
                  if (value) {
                    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
                  }
                }

                const reqUrl = `http://localhost:3000${req.url}`;
                const fetchRequest = new Request(reqUrl, {
                  method: req.method,
                  headers,
                  body:
                    req.method !== "GET" && req.method !== "HEAD" && bodyBuffer.length > 0
                      ? bodyBuffer
                      : undefined,
                });

                const apiResponse = await handleApiRouter(fetchRequest);
                if (!apiResponse) {
                  res.statusCode = 404;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: "Endpoint not found" }));
                  return;
                }

                res.statusCode = apiResponse.status;
                apiResponse.headers.forEach((val, key) => {
                  res.setHeader(key, val);
                });
                const responseText = await apiResponse.text();
                res.end(responseText);
              } catch (err) {
                console.error("API dev middleware error:", err);
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: (err as Error).message }));
              }
            });
          });
        },
      },
    ],
    server: {
      host: "0.0.0.0",
      port: 3000,
    },
    resolve: {
      alias: {
        "@mediapipe/pose": path.resolve(__dirname, "./src/lib/mediapipe-pose-shim.ts"),
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
    },
  },
});
