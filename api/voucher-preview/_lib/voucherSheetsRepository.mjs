import { appendSheetValues, getSheetValues, updateSheetValues } from "./googleSheetsClient.mjs";
import { normalizeCnpj, resolveSchoolDisplayName } from "./voucherRequestSchema.mjs";
import { EDITABLE_SAF_RETURN_FIELDS, getVoucherSheetsConfig, SOLICITACOES_VOUCHER_HEADERS } from "./voucherSheetsConfig.mjs";

function normalizeHeaderName(header) {
  return String(header || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function mapRowsToRecords(headers, rows) {
  return rows
    .map((row, index) => {
      const record = {
        rowNumber: index + 2
      };

      headers.forEach((header, headerIndex) => {
        record[header] = row[headerIndex] ?? "";
      });

      return record;
    })
    .filter((record) => headers.some((header) => String(record[header] || "").trim() !== ""));
}

function ensureRequiredHeaders(actualHeaders, requiredHeaders, sheetName) {
  const missingHeaders = requiredHeaders.filter((header) => !actualHeaders.includes(header));

  if (missingHeaders.length > 0) {
    throw new Error(`A aba ${sheetName} nao contem os cabecalhos esperados: ${missingHeaders.join(", ")}.`);
  }
}

function inferAppendedRowNumber(updatedRange) {
  const match = /!(?:[A-Z]+)(\d+):/.exec(String(updatedRange || ""));
  return match ? Number(match[1]) : null;
}

function getColumnLetter(columnNumber) {
  let dividend = columnNumber;
  let columnName = "";

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
}

async function readSheetHeader(sheetName, requiredHeaders = []) {
  const [headerRow = []] = await getSheetValues(`${sheetName}!1:1`);
  const headers = headerRow.map((header) => String(header || "").trim()).filter(Boolean);

  if (headers.length === 0) {
    throw new Error(`A aba ${sheetName} nao possui cabecalho configurado.`);
  }

  if (requiredHeaders.length > 0) {
    ensureRequiredHeaders(headers, requiredHeaders, sheetName);
  }

  return headers;
}

export async function readSheetRecords(sheetName, requiredHeaders = []) {
  const values = await getSheetValues(`${sheetName}!A:ZZ`);
  const [headerRow = [], ...rows] = values;
  const headers = headerRow.map((header) => String(header || "").trim()).filter(Boolean);

  if (headers.length === 0) {
    return {
      headers: [],
      records: []
    };
  }

  if (requiredHeaders.length > 0) {
    ensureRequiredHeaders(headers, requiredHeaders, sheetName);
  }

  return {
    headers,
    records: mapRowsToRecords(headers, rows)
  };
}

export async function appendSolicitacaoVoucher(record) {
  const { solicitacoesSheetName } = getVoucherSheetsConfig();
  const headers = await readSheetHeader(solicitacoesSheetName, SOLICITACOES_VOUCHER_HEADERS);
  const row = headers.map((header) => record[header] ?? "");
  const payload = await appendSheetValues(`${solicitacoesSheetName}!A:A`, [row]);

  return {
    rowNumber: inferAppendedRowNumber(payload?.updates?.updatedRange),
    updatedRange: payload?.updates?.updatedRange || "",
    updatedRows: payload?.updates?.updatedRows || 0
  };
}

export async function findSolicitacaoVoucherByRowNumber(rowNumber) {
  const records = await listSolicitacoesVoucher();

  return records.find((record) => record.rowNumber === rowNumber) || null;
}

export async function findBaseEscolaByCnpj(cnpj) {
  const { baseEscolasSheetName } = getVoucherSheetsConfig();
  const { headers, records } = await readSheetRecords(baseEscolasSheetName);
  const cnpjHeader = headers.find((header) => normalizeHeaderName(header) === "cnpj");

  if (!cnpjHeader) {
    return null;
  }

  return records.find((record) => normalizeCnpj(record[cnpjHeader]) === cnpj) || null;
}

function sortSolicitacoesDescending(records) {
  return [...records].sort((left, right) => String(right.DataHora || "").localeCompare(String(left.DataHora || "")));
}

export async function listSolicitacoesVoucher() {
  const { solicitacoesSheetName } = getVoucherSheetsConfig();
  const { records } = await readSheetRecords(solicitacoesSheetName, SOLICITACOES_VOUCHER_HEADERS);

  return sortSolicitacoesDescending(records);
}

export async function findSolicitacoesVoucherByCnpj(cnpj) {
  const records = await listSolicitacoesVoucher();
  return records.filter((record) => normalizeCnpj(record.CNPJ) === cnpj);
}

export function summarizeSolicitacoesByStatus(records) {
  return records.reduce((summary, record) => {
    const status = String(record.SituacaoSolicitacao || "SemStatus").trim() || "SemStatus";

    summary[status] = (summary[status] || 0) + 1;

    return summary;
  }, {});
}

export function summarizeSolicitacoesByTipo(records) {
  return records.reduce((summary, record) => {
    const tipo = String(record.TipoSolicitacao || "SemTipo").trim() || "SemTipo";

    summary[tipo] = (summary[tipo] || 0) + 1;

    return summary;
  }, {});
}

export async function updateSolicitacaoVoucherReturn(rowNumber, updates) {
  const { solicitacoesSheetName } = getVoucherSheetsConfig();
  const { headers, records } = await readSheetRecords(solicitacoesSheetName, SOLICITACOES_VOUCHER_HEADERS);
  const currentRecord = records.find((record) => record.rowNumber === rowNumber);

  if (!currentRecord) {
    throw new Error(`Solicitacao da linha ${rowNumber} nao encontrada.`);
  }

  const mergedRecord = {
    ...currentRecord,
    ...Object.fromEntries(
      EDITABLE_SAF_RETURN_FIELDS.map((field) => [field, field in updates ? updates[field] : currentRecord[field] ?? ""])
    )
  };
  const rowValues = headers.map((header) => mergedRecord[header] ?? "");
  const lastColumn = getColumnLetter(headers.length);
  const range = `${solicitacoesSheetName}!A${rowNumber}:${lastColumn}${rowNumber}`;

  await updateSheetValues(range, [rowValues]);

  return {
    ...mergedRecord,
    rowNumber
  };
}

export function resolveBaseEscolaSummary(record, cnpj) {
  if (!record) {
    return null;
  }

  return {
    displayName: resolveSchoolDisplayName(record),
    cnpj,
    rowNumber: record.rowNumber
  };
}
