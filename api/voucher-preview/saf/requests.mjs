import { badRequest, jsonResponse, methodNotAllowed, readJsonBody, serverError } from "../_lib/http.mjs";
import { requireVoucherPreviewApiEnabled } from "../_lib/runtime.mjs";
import { buildSafUpdatePayload, normalizeCnpj } from "../_lib/voucherRequestSchema.mjs";
import {
  findSolicitacaoVoucherByRowNumber,
  listSolicitacoesVoucher,
  summarizeSolicitacoesByStatus,
  summarizeSolicitacoesByTipo,
  updateSolicitacaoVoucherReturn
} from "../_lib/voucherSheetsRepository.mjs";
import { SOLICITACOES_VOUCHER_HEADERS } from "../_lib/voucherSheetsConfig.mjs";

function sanitizeLimit(rawValue) {
  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 100;
  }

  return Math.min(parsed, 250);
}

function sanitizeSort(rawValue) {
  return String(rawValue || "").trim().toLowerCase() === "asc" ? "asc" : "desc";
}

function sortRecords(records, sortDirection) {
  const ordered = [...records].sort((left, right) => String(right.DataHora || "").localeCompare(String(left.DataHora || "")));

  return sortDirection === "asc" ? ordered.reverse() : ordered;
}

function toLowerTrimmed(value) {
  return String(value || "").trim().toLowerCase();
}

function filterSafRecords(records, filters) {
  return records.filter((record) => {
    const normalizedRecordCnpj = normalizeCnpj(record.CNPJ);
    const searchTarget = [
      record.Escola,
      normalizedRecordCnpj,
      record.CNPJ,
      record.Ticket
    ]
      .map((item) => toLowerTrimmed(item))
      .join(" ");

    if (filters.search && !searchTarget.includes(filters.search)) {
      return false;
    }

    if (filters.cnpj && normalizedRecordCnpj !== filters.cnpj) {
      return false;
    }

    if (filters.status && toLowerTrimmed(record.SituacaoSolicitacao) !== filters.status) {
      return false;
    }

    if (filters.tipo && toLowerTrimmed(record.TipoSolicitacao) !== filters.tipo) {
      return false;
    }

    if (filters.ticket && !toLowerTrimmed(record.Ticket).includes(filters.ticket)) {
      return false;
    }

    return true;
  });
}

async function handleGetSafRequests(request) {
  const url = new URL(request.url);
  const filters = {
    search: toLowerTrimmed(url.searchParams.get("q") || url.searchParams.get("search")),
    cnpj: normalizeCnpj(url.searchParams.get("cnpj")),
    status: toLowerTrimmed(url.searchParams.get("status") || url.searchParams.get("situacao")),
    tipo: toLowerTrimmed(url.searchParams.get("tipo") || url.searchParams.get("tipoSolicitacao")),
    ticket: toLowerTrimmed(url.searchParams.get("ticket")),
    sort: sanitizeSort(url.searchParams.get("sort")),
    limit: sanitizeLimit(url.searchParams.get("limit"))
  };
  const records = await listSolicitacoesVoucher();
  const filteredRecords = sortRecords(filterSafRecords(records, filters), filters.sort);
  const availableStatuses = [...new Set(records.map((record) => String(record.SituacaoSolicitacao || "").trim()).filter(Boolean))];
  const availableTipos = [...new Set(records.map((record) => String(record.TipoSolicitacao || "").trim()).filter(Boolean))];

  return jsonResponse({
    ok: true,
    message: "Leitura SAF preparada com sucesso.",
    data: {
      headers: SOLICITACOES_VOUCHER_HEADERS,
      filtersApplied: {
        search: filters.search || null,
        cnpj: filters.cnpj || null,
        status: filters.status || null,
        tipo: filters.tipo || null,
        ticket: filters.ticket || null,
        sort: filters.sort,
        limit: filters.limit
      },
      totalRecords: records.length,
      filteredRecords: filteredRecords.length,
      summaryByStatus: summarizeSolicitacoesByStatus(records),
      summaryByTipo: summarizeSolicitacoesByTipo(records),
      filterOptions: {
        statuses: availableStatuses,
        tipos: availableTipos
      },
      records: filteredRecords.slice(0, filters.limit)
    }
  });
}

async function handlePatchSafRequest(request) {
  const payload = await readJsonBody(request);
  const currentRecord = await findSolicitacaoVoucherByRowNumber(Number(payload?.rowNumber));

  if (!currentRecord) {
    return badRequest("Solicitacao nao encontrada para o rowNumber informado.");
  }

  const validation = buildSafUpdatePayload(payload, currentRecord);

  if (!validation.ok) {
    return badRequest("Dados invalidos para atualizar o retorno SAF.", {
      errors: validation.errors
    });
  }

  const updatedRecord = await updateSolicitacaoVoucherReturn(validation.rowNumber, validation.updates);

  return jsonResponse({
    ok: true,
    message: "Retorno SAF atualizado com sucesso na planilha.",
    data: {
      record: updatedRecord
    }
  });
}

export default {
  async fetch(request) {
    if (!["GET", "PATCH"].includes(request.method)) {
      return methodNotAllowed(["GET", "PATCH"]);
    }

    const disabledResponse = requireVoucherPreviewApiEnabled();

    if (disabledResponse) {
      return disabledResponse;
    }

    try {
      if (request.method === "GET") {
        return await handleGetSafRequests(request);
      }

      return await handlePatchSafRequest(request);
    } catch (error) {
      return serverError(
        request.method === "GET"
          ? "Falha ao preparar leitura SAF das solicitacoes de voucher."
          : "Falha ao atualizar o retorno SAF na planilha.",
        error
      );
    }
  }
};
