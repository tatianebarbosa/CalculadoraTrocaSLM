import { getGoogleAccessToken } from "./googleServiceAccountAuth.mjs";
import { getVoucherSheetsConfig } from "./voucherSheetsConfig.mjs";

function buildSheetsUrl(spreadsheetId, range, suffix = "", query = {}) {
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}${suffix}`
  );

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

async function requestSheets(range, { method = "GET", suffix = "", query = {}, body } = {}) {
  const accessToken = await getGoogleAccessToken();
  const { spreadsheetId } = getVoucherSheetsConfig();
  const response = await fetch(buildSheetsUrl(spreadsheetId, range, suffix, query), {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(body ? { "content-type": "application/json; charset=utf-8" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.message || "Falha ao acessar Google Sheets API.");
  }

  return payload;
}

export async function getSheetValues(range) {
  const payload = await requestSheets(range, {
    query: {
      majorDimension: "ROWS"
    }
  });

  return payload.values || [];
}

export async function appendSheetValues(range, values) {
  return requestSheets(range, {
    method: "POST",
    suffix: ":append",
    query: {
      includeValuesInResponse: "true",
      insertDataOption: "INSERT_ROWS",
      valueInputOption: "RAW"
    },
    body: {
      majorDimension: "ROWS",
      values
    }
  });
}

export async function updateSheetValues(range, values) {
  return requestSheets(range, {
    method: "PUT",
    query: {
      includeValuesInResponse: "true",
      valueInputOption: "RAW"
    },
    body: {
      majorDimension: "ROWS",
      values
    }
  });
}
