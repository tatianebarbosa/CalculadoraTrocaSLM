import { badRequest, jsonResponse, methodNotAllowed, readJsonBody, serverError } from "../_lib/http.mjs";
import { requireVoucherPreviewApiEnabled } from "../_lib/runtime.mjs";
import { buildNewVoucherRequestRecord, normalizeCnpj, toSchoolRequestView } from "../_lib/voucherRequestSchema.mjs";
import {
  appendSolicitacaoVoucher,
  findBaseEscolaByCnpj,
  resolveBaseEscolaSummary
} from "../_lib/voucherSheetsRepository.mjs";

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return methodNotAllowed(["POST"]);
    }

    const disabledResponse = requireVoucherPreviewApiEnabled();

    if (disabledResponse) {
      return disabledResponse;
    }

    try {
      const payload = await readJsonBody(request);
      const cnpj = normalizeCnpj(payload?.CNPJ ?? payload?.cnpj);
      const escolaBase = cnpj ? await findBaseEscolaByCnpj(cnpj) : null;
      const validation = buildNewVoucherRequestRecord(payload, {
        fallbackSchoolName: escolaBase?.Escola || escolaBase?.NomeEscola || escolaBase?.RazaoSocial || ""
      });

      if (!validation.ok) {
        return badRequest("Dados invalidos para criar a solicitacao de voucher.", {
          errors: validation.errors
        });
      }

      const storage = await appendSolicitacaoVoucher(validation.record);

      return jsonResponse(
        {
          ok: true,
          message: "Solicitacao de voucher registrada com sucesso.",
          data: {
            request: toSchoolRequestView(validation.record),
            linkedSchool: resolveBaseEscolaSummary(escolaBase, validation.record.CNPJ),
            storage
          }
        },
        { status: 201 }
      );
    } catch (error) {
      return serverError("Falha ao registrar solicitacao de voucher no Google Sheets.", error);
    }
  }
};
