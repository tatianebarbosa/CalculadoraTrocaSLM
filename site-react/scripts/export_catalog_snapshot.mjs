import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_CATALOG } from "../src/catalog.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(currentDir, "..");
const workbookPath = path.resolve(projectDir, "..", "base_powerbi_troca_slm.xlsx");
const outputPath = path.resolve(projectDir, "public", "catalog.json");
const syncScriptPath = path.resolve(projectDir, "scripts", "base_catalog_sync.py");

function clampNumber(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.round((parsed + Number.EPSILON) * 100) / 100;
}

function normalizeCatalogItem(item) {
  return {
    turma: String(item?.turma ?? "").trim(),
    slm: clampNumber(item?.slm),
    workbook: clampNumber(item?.workbook),
    matematica: clampNumber(item?.matematica),
    pearsonMath: clampNumber(item?.pearsonMath),
    pearsonScience: clampNumber(item?.pearsonScience)
  };
}

function buildSnapshot(catalog, source) {
  return {
    generatedAt: new Date().toISOString(),
    source,
    catalog: catalog.map(normalizeCatalogItem).filter((item) => item.turma)
  };
}

function readWorkbookCatalog() {
  if (!fs.existsSync(workbookPath) || !fs.existsSync(syncScriptPath)) {
    return null;
  }

  const result = spawnSync("python", [syncScriptPath, "read", workbookPath], {
    encoding: "utf-8"
  });

  if (result.status !== 0) {
    return null;
  }

  try {
    const payload = JSON.parse(result.stdout);
    const sourceCatalog = Array.isArray(payload?.catalog) ? payload.catalog : payload;

    if (!Array.isArray(sourceCatalog)) {
      return null;
    }

    return sourceCatalog.map(normalizeCatalogItem).filter((item) => item.turma);
  } catch {
    return null;
  }
}

function readExistingSnapshot() {
  if (!fs.existsSync(outputPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    const sourceCatalog = Array.isArray(parsed?.catalog) ? parsed.catalog : parsed;

    if (!Array.isArray(sourceCatalog)) {
      return null;
    }

    return sourceCatalog.map(normalizeCatalogItem).filter((item) => item.turma);
  } catch {
    return null;
  }
}

const workbookCatalog = readWorkbookCatalog();
const existingCatalog = readExistingSnapshot();
const fallbackCatalog = DEFAULT_CATALOG.map(normalizeCatalogItem);

const finalCatalog =
  workbookCatalog?.length ? workbookCatalog : existingCatalog?.length ? existingCatalog : fallbackCatalog;
const sourceLabel =
  workbookCatalog?.length
    ? path.basename(workbookPath)
    : existingCatalog?.length
      ? "catalog.json existente"
      : "DEFAULT_CATALOG";

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(buildSnapshot(finalCatalog, sourceLabel), null, 2)}\n`, "utf-8");

console.log(`Catalogo publicado atualizado em ${outputPath}`);
console.log(`Origem usada: ${sourceLabel}`);
