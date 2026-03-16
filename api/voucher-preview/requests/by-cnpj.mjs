import { badRequest, jsonResponse, methodNotAllowed, serverError } from "../_lib/http.mjs";
import { requireVoucherPreviewApiEnabled } from "../_lib/runtime.mjs";
import { normalizeCnpj, toSchoolRequestView } from "../_lib/voucherRequestSchema.mjs";
import {
  findBaseEscolaByCnpj,
  findSolicitacoesVoucherByCnpj,
  resolveBaseEscolaSummary
} from "../_lib/voucherSheetsRepository.mjs";

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return methodNotAllowed(["GET"]);
    }

    const disabledResponse = requireVoucherPreviewApiEnabled();

    if (disabledResponse) {
      return disabledResponse;
    }

    try {
      const url = new URL(request.url);
      const cnpj = normalizeCnpj(url.searchParams.get("cnpj"));

      if (cnpj.length !== 14) {
        return badRequest("Informe um CNPJ valido com 14 digitos na query string.");
      }

      const [escolaBase, solicitacoes] = await Promise.all([
        findBaseEscolaByCnpj(cnpj),
        findSolicitacoesVoucherByCnpj(cnpj)
      ]);

      const schoolSummary =
        resolveBaseEscolaSummary(escolaBase, cnpj) ||
        (solicitacoes[0]
          ? {
              displayName: solicitacoes[0].Escola,
              cnpj,
              rowNumber: null
            }
          : null);

      return jsonResponse({
        ok: true,
        message:
          escolaBase || solicitacoes.length > 0
            ? "Consulta por CNPJ realizada com sucesso."
            : "Nenhum registro encontrado para o CNPJ informado.",
        data: {
          cnpj,
          school: schoolSummary,
          requestsCount: solicitacoes.length,
          latestRequest: solicitacoes[0] ? toSchoolRequestView(solicitacoes[0]) : null,
          requests: solicitacoes.map((record) => toSchoolRequestView(record))
        }
      });
    } catch (error) {
      return serverError("Falha ao consultar solicitacoes por CNPJ no Google Sheets.", error);
    }
  }
};
