import { DEFAULT_CATALOG } from "../catalog";
import {
  ACCESS_DURATION_MS,
  ACCESS_STORAGE_KEY,
  CATALOG_API_ENDPOINT,
  CATALOG_SOURCE_MODE,
  CATALOG_STATIC_ENDPOINT,
  CATALOG_WRITE_ENABLED,
  HAS_CUSTOM_CATALOG_API
} from "../config/appConfig";
import { clampNumber } from "./formatters";

// Base compartilhada: leitura, normalização e persistência.
export function normalizeCatalogItem(item, turmaFallback = "") {
  return {
    turma: String(item?.turma ?? turmaFallback),
    slm: clampNumber(item?.slm, 0),
    workbook: clampNumber(item?.workbook, 0),
    matematica: clampNumber(item?.matematica, 0),
    pearsonMath: clampNumber(item?.pearsonMath, 0),
    pearsonScience: clampNumber(item?.pearsonScience, 0)
  };
}

export function getDefaultCatalog() {
  return DEFAULT_CATALOG.map((item) => normalizeCatalogItem(item));
}

export function sanitizeCatalog(rawCatalog) {
  if (!Array.isArray(rawCatalog)) {
    return getDefaultCatalog();
  }

  const rawCatalogByTurma = new Map(
    rawCatalog
      .filter((item) => typeof item?.turma === "string" && item.turma.trim())
      .map((item) => [item.turma, item])
  );

  return DEFAULT_CATALOG.map((defaultItem) =>
    normalizeCatalogItem(rawCatalogByTurma.get(defaultItem.turma) ?? defaultItem, defaultItem.turma)
  );
}

function buildCatalogReadTargets() {
  if (CATALOG_SOURCE_MODE === "api") {
    return [CATALOG_API_ENDPOINT, CATALOG_STATIC_ENDPOINT];
  }

  if (CATALOG_SOURCE_MODE === "static") {
    return [CATALOG_STATIC_ENDPOINT, CATALOG_API_ENDPOINT];
  }

  if (CATALOG_WRITE_ENABLED || HAS_CUSTOM_CATALOG_API) {
    return [CATALOG_API_ENDPOINT, CATALOG_STATIC_ENDPOINT];
  }

  return [CATALOG_STATIC_ENDPOINT, CATALOG_API_ENDPOINT];
}

async function fetchCatalogPayload(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Falha ao sincronizar os novos dados.");
  }

  return sanitizeCatalog(Array.isArray(payload) ? payload : payload?.catalog);
}

export async function requestSharedCatalog(method = "GET", catalog = null) {
  if (method === "GET") {
    let lastError = null;

    for (const url of buildCatalogReadTargets()) {
      try {
        return await fetchCatalogPayload(url, { method: "GET" });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Falha ao carregar os dados da base.");
  }

  if (!CATALOG_WRITE_ENABLED) {
    throw new Error(
      "A versao publicada esta em modo somente leitura. Para atualizar a base, gere um novo catalog.json e publique o site novamente."
    );
  }

  return fetchCatalogPayload(CATALOG_API_ENDPOINT, {
    method,
    headers: catalog ? { "Content-Type": "application/json" } : undefined,
    body: catalog ? JSON.stringify({ catalog }) : undefined
  });
}

export function canWriteCatalog() {
  return CATALOG_WRITE_ENABLED;
}

export function hasStoredAccess() {
  if (typeof window === "undefined") {
    return false;
  }

  const rawValue = window.localStorage.getItem(ACCESS_STORAGE_KEY);
  if (!rawValue) {
    return false;
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    if (typeof parsedValue?.expiresAt !== "number") {
      window.localStorage.removeItem(ACCESS_STORAGE_KEY);
      return false;
    }

    if (Date.now() > parsedValue.expiresAt) {
      window.localStorage.removeItem(ACCESS_STORAGE_KEY);
      return false;
    }

    return true;
  } catch {
    window.localStorage.removeItem(ACCESS_STORAGE_KEY);
    return false;
  }
}

export function storeAccessForOneWeek() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ACCESS_STORAGE_KEY,
    JSON.stringify({
      expiresAt: Date.now() + ACCESS_DURATION_MS
    })
  );
}

export function clearStoredAccess() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_STORAGE_KEY);
  window.sessionStorage.removeItem(ACCESS_STORAGE_KEY);
}

export function getCatalogTotals(item) {
  const totalObrigatorio = item.slm + item.workbook + item.matematica;

  return {
    totalObrigatorio,
    totalComPearsons: totalObrigatorio + item.pearsonMath + item.pearsonScience
  };
}
