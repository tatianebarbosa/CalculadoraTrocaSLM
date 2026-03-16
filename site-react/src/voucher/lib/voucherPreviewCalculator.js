import { PEARSON_ORDER_DISCOUNT } from "../../config/appConfig";
import { getCatalogTotals } from "../../lib/catalogApi";
import { clampNumber, formatMoney, formatVoucherInput, roundCurrency } from "../../lib/formatters";

function getTurmaData(catalog, turma) {
  return catalog.find((item) => item.turma === turma) ?? null;
}

function getVoucherAmount(mode, rawValue, slmBase) {
  const safeSlm = clampNumber(slmBase, 0);
  if (!safeSlm) {
    return 0;
  }

  if (mode === "percent") {
    const percent = clampNumber(rawValue, 0, 100);
    return roundCurrency((safeSlm * percent) / 100);
  }

  return roundCurrency(clampNumber(rawValue, 0, safeSlm));
}

export function calculateVoucherPreview(form, catalog) {
  const base = getTurmaData(catalog, form.turma);
  if (!base) {
    return {
      base: null,
      ready: false,
      metrics: {
        requiredSubtotal: 0,
        optionalPearsonSubtotal: 0,
        pearsonDiscount: 0,
        totalBeforeVoucher: 0,
        voucherApplied: 0,
        slmNet: 0,
        totalAfterVoucher: 0,
        voucherCoverage: 0
      },
      summaryText: "Selecione uma turma para iniciar a simulacao isolada do voucher.",
      notes: ["Rota isolada pronta para testes, mas ainda sem dados validos para calculo."]
    };
  }

  const rawVoucherValue = clampNumber(form.voucherValue, 0);
  const requestedVoucherInput = roundCurrency(rawVoucherValue);
  const optionalPearsonSubtotal = roundCurrency(
    (form.pearsonMath ? base.pearsonMath : 0) + (form.pearsonScience ? base.pearsonScience : 0)
  );
  const selectedPearsonCount = (form.pearsonMath ? 1 : 0) + (form.pearsonScience ? 1 : 0);
  const pearsonDiscount = roundCurrency(selectedPearsonCount * PEARSON_ORDER_DISCOUNT);
  const totals = getCatalogTotals(base);
  const voucherApplied = getVoucherAmount(form.voucherMode, rawVoucherValue, base.slm);
  const slmNet = roundCurrency(Math.max(base.slm - voucherApplied, 0));
  const totalBeforeVoucher = roundCurrency(
    Math.max(totals.totalObrigatorio + optionalPearsonSubtotal - pearsonDiscount, 0)
  );
  const totalAfterVoucher = roundCurrency(
    Math.max(slmNet + base.workbook + base.matematica + optionalPearsonSubtotal - pearsonDiscount, 0)
  );
  const voucherCoverage = totalBeforeVoucher > 0 ? roundCurrency((voucherApplied / totalBeforeVoucher) * 100) : 0;
  const voucherInputLabel = formatVoucherInput(form.voucherMode, requestedVoucherInput);
  const notes = [
    "O voucher reduz somente o SLM base da turma selecionada.",
    "Esta rota nao altera a calculadora principal nem a navegacao publicada."
  ];

  if (optionalPearsonSubtotal > 0) {
    notes.push(
      `Pearsons selecionados permanecem fora do voucher. Desconto operacional aplicado: ${formatMoney(pearsonDiscount)}.`
    );
  }

  if (form.voucherMode === "currency" && requestedVoucherInput > base.slm) {
    notes.push(`O valor informado foi limitado ao SLM base de ${formatMoney(base.slm)}.`);
  }

  if (form.voucherMode === "percent" && requestedVoucherInput > 100) {
    notes.push("O percentual informado foi limitado a 100%.");
  }

  return {
    base,
    ready: true,
    hasSelectedPearson: optionalPearsonSubtotal > 0,
    voucherInputLabel,
    metrics: {
      requiredSubtotal: totals.totalObrigatorio,
      optionalPearsonSubtotal,
      pearsonDiscount,
      totalBeforeVoucher,
      voucherApplied,
      slmNet,
      totalAfterVoucher,
      voucherCoverage
    },
    summaryText: `Turma ${form.turma}: voucher ${voucherInputLabel} aplicado em ${formatMoney(
      voucherApplied
    )} sobre SLM base de ${formatMoney(base.slm)}. Total final simulado: ${formatMoney(totalAfterVoucher)}.`,
    notes
  };
}
