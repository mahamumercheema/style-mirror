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
        name: "auth-api-dev-middleware",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = req.url ? new URL(req.url, "http://localhost:3000") : null;
            if (url && url.pathname.startsWith("/api/auth/")) {
              let rawBody = "";
              req.on("data", (chunk) => {
                rawBody += chunk;
              });
              req.on("end", async () => {
                try {
                  const body = rawBody ? JSON.parse(rawBody) : {};
                  const { handleRegisterIntent, handleVerifyCode, handleResendCode, handleLogin } =
                    await server.ssrLoadModule("/src/lib/server-auth.ts");

                  let result: { status: number; body: Record<string, unknown> };

                  if (url.pathname === "/api/auth/register-intent" && req.method === "POST") {
                    result = await handleRegisterIntent(body);
                  } else if (url.pathname === "/api/auth/verify-code" && req.method === "POST") {
                    result = await handleVerifyCode(body);
                  } else if (url.pathname === "/api/auth/resend-code" && req.method === "POST") {
                    result = await handleResendCode(body);
                  } else if (url.pathname === "/api/auth/login" && req.method === "POST") {
                    result = await handleLogin(body);
                  } else {
                    res.statusCode = 404;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ error: "Endpoint not found" }));
                    return;
                  }

                  res.statusCode = result.status;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify(result.body));
                } catch (err) {
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: (err as Error).message }));
                }
              });
              return;
            }
            next();
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
  },
});
