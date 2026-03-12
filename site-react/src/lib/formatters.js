const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

// Helpers de formato e saneamento numérico.
export function clampNumber(value, min = 0, max = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return min;
  }

  return Math.min(Math.max(parsed, min), max);
}

export function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value) {
  return moneyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value) {
  return `${percentFormatter.format(Number.isFinite(value) ? value : 0)}%`;
}

export function formatVoucherInput(mode, rawValue) {
  const safeValue = roundCurrency(clampNumber(rawValue, 0));
  if (safeValue <= 0) {
    return "Sem voucher";
  }

  return mode === "percent" ? formatPercent(safeValue) : formatMoney(safeValue);
}

export function formatPearsonSelection(hasMath, hasScience) {
  if (hasMath && hasScience) {
    return "Math + Science";
  }

  if (hasMath) {
    return "Somente Math";
  }

  if (hasScience) {
    return "Somente Science";
  }

  return "Sem Pearson";
}
