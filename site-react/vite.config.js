import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workbookPath = path.resolve(currentDir, "..", "base_powerbi_troca_slm.xlsx");
const syncScriptPath = path.resolve(currentDir, "scripts", "base_catalog_sync.py");

// Lê o corpo manualmente para manter a rota simples dentro do Vite.
function readBody(request) {
  return new Promise((resolve, reject) => {
    let rawBody = "";
    request.on("data", (chunk) => {
      rawBody += chunk;
    });
    request.on("end", () => resolve(rawBody));
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

// Toda a persistencia da base passa por este script Python, que le e grava o Excel.
function runCatalogSync(command, payload) {
  const result = spawnSync("python", [syncScriptPath, command, workbookPath], {
    encoding: "utf-8",
    input: payload ? JSON.stringify(payload) : undefined
  });

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || "Falha ao sincronizar a base compartilhada.");
  }

  return JSON.parse(result.stdout);
}

function attachSharedCatalogRoute(server) {
  server.middlewares.use("/api/base-catalog", async (request, response, next) => {
    if (request.method === "GET") {
      try {
        sendJson(response, 200, runCatalogSync("read"));
      } catch (error) {
        sendJson(response, 500, { message: error instanceof Error ? error.message : "Falha ao ler a base compartilhada." });
      }
      return;
    }

    if (request.method === "PUT") {
      try {
        const rawBody = await readBody(request);
        const payload = rawBody ? JSON.parse(rawBody) : {};
        sendJson(response, 200, runCatalogSync("write", payload));
      } catch (error) {
        sendJson(response, 500, { message: error instanceof Error ? error.message : "Falha ao gravar a base compartilhada." });
      }
      return;
    }

    next();
  });
}

// Plugin pequeno para expor a mesma rota tanto no dev quanto no preview.
function sharedCatalogApiPlugin() {
  return {
    name: "shared-catalog-api",
    configureServer(server) {
      attachSharedCatalogRoute(server);
    },
    configurePreviewServer(server) {
      attachSharedCatalogRoute(server);
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, currentDir, "");
  const siteBasePath = env.VITE_SITE_BASE_PATH || "/";

  return {
    base: siteBasePath,
    plugins: [react(), sharedCatalogApiPlugin()]
  };
});
