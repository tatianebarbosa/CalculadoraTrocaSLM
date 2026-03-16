import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workbookPath = path.resolve(currentDir, "..", "base_powerbi_troca_slm.xlsx");
const syncScriptPath = path.resolve(currentDir, "scripts", "base_catalog_sync.py");
const mainEntryPath = path.resolve(currentDir, "index.html");
const voucherPreviewEntryPath = path.resolve(currentDir, "voucher-preview", "index.html");
const voucherPreviewApiRoutes = new Map([
  ["/api/voucher-preview/requests", path.resolve(currentDir, "..", "api", "voucher-preview", "requests", "index.mjs")],
  [
    "/api/voucher-preview/requests/by-cnpj",
    path.resolve(currentDir, "..", "api", "voucher-preview", "requests", "by-cnpj.mjs")
  ],
  ["/api/voucher-preview/saf/requests", path.resolve(currentDir, "..", "api", "voucher-preview", "saf", "requests.mjs")]
]);

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

function createWebHeaders(nodeHeaders) {
  const headers = new Headers();

  Object.entries(nodeHeaders).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item));
      return;
    }

    if (typeof value === "string") {
      headers.set(key, value);
    }
  });

  return headers;
}

async function forwardVoucherPreviewApiRequest(request, response, routeModulePath) {
  const rawBody = request.method === "GET" || request.method === "HEAD" ? "" : await readBody(request);
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const requestInit = {
    method: request.method,
    headers: createWebHeaders(request.headers)
  };

  if (rawBody) {
    requestInit.body = rawBody;
  }

  const routeModule = await import(`${pathToFileURL(routeModulePath).href}?t=${Date.now()}`);
  const routeHandler = routeModule.default?.fetch;

  if (typeof routeHandler !== "function") {
    throw new Error(`Rota ${routeModulePath} nao exporta um handler fetch valido.`);
  }

  const webResponse = await routeHandler(new Request(requestUrl, requestInit));

  response.statusCode = webResponse.status;
  webResponse.headers.forEach((value, key) => {
    response.setHeader(key, value);
  });

  const responseBody = await webResponse.arrayBuffer();
  response.end(Buffer.from(responseBody));
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

function attachVoucherPreviewApiRoutes(server) {
  server.middlewares.use(async (request, response, next) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const routeModulePath = voucherPreviewApiRoutes.get(pathname);

    if (!routeModulePath) {
      next();
      return;
    }

    try {
      await forwardVoucherPreviewApiRequest(request, response, routeModulePath);
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        message: error instanceof Error ? error.message : "Falha ao executar a API local do voucher-preview."
      });
    }
  });
}

function voucherPreviewApiPlugin() {
  return {
    name: "voucher-preview-api-bridge",
    configureServer(server) {
      attachVoucherPreviewApiRoutes(server);
    },
    configurePreviewServer(server) {
      attachVoucherPreviewApiRoutes(server);
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, currentDir, "");
  const siteBasePath = env.VITE_SITE_BASE_PATH || "/";

  return {
    base: siteBasePath,
    plugins: [react(), sharedCatalogApiPlugin(), voucherPreviewApiPlugin()],
    build: {
      rollupOptions: {
        input: {
          main: mainEntryPath,
          voucherPreview: voucherPreviewEntryPath
        }
      }
    }
  };
});
