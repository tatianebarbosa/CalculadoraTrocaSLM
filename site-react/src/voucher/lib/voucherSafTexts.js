import { formatCpfInput } from "./voucherSchoolForm";
import { formatSafDisplayValue, getPrimaryCpf, isDiscountRequest, isInstallmentRequest } from "./voucherSafPanel";

function resolveFinalValidity(record) {
  return record?.DataValidadeFinal || record?.DataValidadeSugerida || "sem data definida";
}

function resolveApprovedValue(record) {
  if (isDiscountRequest(record)) {
    return record?.PercentualDescontoAprovado || record?.PercentualDescontoSolicitado || "0";
  }

  if (isInstallmentRequest(record)) {
    return record?.QuantidadeParcelasAprovadas || record?.QuantidadeParcelasSolicitadas || "0";
  }

  return "";
}

export function buildVoucherSafOperationalTexts(record) {
  const isDiscount = isDiscountRequest(record);
  const isInstallment = isInstallmentRequest(record);
  const approvedValue = resolveApprovedValue(record);
  const validity = resolveFinalValidity(record);
  const voucherCode = String(record?.CodigoVoucher || "").trim();
  const primaryCpf = formatCpfInput(getPrimaryCpf(record));
  const emailSubject = isDiscount
    ? `[Voucher] ${record.Escola} | ${record.NomeAluno} | ${approvedValue}%`
    : `[Parcelamento] ${record.Escola} | ${record.NomeAluno} | ${approvedValue}x`;
  const financeBaseText = isDiscount
    ? `Solicitacao de desconto aprovada para ${record.Escola}. Aluno: ${record.NomeAluno}. Ticket: ${record.Ticket || "-"}. Percentual aprovado: ${approvedValue}%. Validade final: ${validity}. Codigo do voucher: ${voucherCode || "pendente de definicao"}.`
    : `Solicitacao de parcelamento aprovada para ${record.Escola}. Aluno: ${record.NomeAluno}. Ticket: ${record.Ticket || "-"}. Parcelas aprovadas: ${approvedValue}. CPF para aplicacao: ${primaryCpf || "nao informado"}.`;
  const serviceMessage = isDiscount
    ? `Solicitacao aprovada. Aplicar voucher de ${approvedValue}% para ${record.NomeAluno}. Validade: ${validity}. Codigo: ${voucherCode || "a definir pelo financeiro"}.`
    : `Solicitacao aprovada. Liberar parcelamento em ${approvedValue}x para ${record.NomeAluno}, utilizando o CPF ${primaryCpf || "nao informado"}.`;
  const magentoDescription = isDiscount
    ? `Voucher ${approvedValue}% | ${record.Escola} | ${record.NomeAluno} | validade ${validity}`
    : `Parcelamento ${approvedValue}x | ${record.Escola} | ${record.NomeAluno} | CPF ${primaryCpf || "nao informado"}`;

  return {
    emailSubject,
    financeBaseText,
    serviceMessage,
    magentoDescription,
    highlightLabel: isDiscount ? "CodigoVoucher" : "CPF principal",
    highlightValue: isDiscount ? (voucherCode || "Pendente") : (primaryCpf || "Nao informado"),
    requestSummary: isDiscount
      ? `Solicitado: ${formatSafDisplayValue("PercentualDescontoSolicitado", record?.PercentualDescontoSolicitado)}% | Aprovado: ${approvedValue}%`
      : `Solicitado: ${formatSafDisplayValue("QuantidadeParcelasSolicitadas", record?.QuantidadeParcelasSolicitadas)}x | Aprovado: ${approvedValue}x`
  };
}
