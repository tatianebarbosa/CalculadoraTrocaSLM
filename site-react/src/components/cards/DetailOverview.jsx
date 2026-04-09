import { formatMoney } from "../../lib/formatters";

function buildFinalReinforcement(calc) {
  if (!calc.ready) {
    return "Complete a simulação.";
  }

  if (calc.requiresCancellationForJuros) {
    return "A troca não pode seguir neste momento, pois há juros vinculados ao pedido principal.";
  }

  if (!calc.canExchange) {
    return "A troca não pode seguir, pois haveria saldo remanescente na loja.";
  }

  if (calc.difference > 0) {
    return "Troca liberada com diferença a pagar.";
  }

  return "Troca liberada sem diferença a pagar.";
}

function buildCompositionSummary(breakdown) {
  const parts = [];

  if (breakdown.slmPaid > 0) {
    parts.push(`SLM ${formatMoney(breakdown.slmPaid)}`);
  }

  if (breakdown.workbook > 0) {
    parts.push(`Workbook ${formatMoney(breakdown.workbook)}`);
  }

  if (breakdown.matematica > 0) {
    parts.push(`Mat. Aplicada ${formatMoney(breakdown.matematica)}`);
  }

  if (breakdown.pearsonMath > 0) {
    parts.push(`Pearson Math ${formatMoney(breakdown.pearsonMath)}`);
  }

  if (breakdown.pearsonScience > 0) {
    parts.push(`Pearson Science ${formatMoney(breakdown.pearsonScience)}`);
  }

  if (breakdown.pearsonDiscount > 0) {
    parts.push(`Desc. Pearson -${formatMoney(breakdown.pearsonDiscount)}`);
  }

  return parts.join(" + ");
}

function buildPrincipalSummaryText(calc) {
  if (calc.principalCreditIsManual) {
    return "Valor pago real informado";
  }

  return buildCompositionSummary(calc.principal);
}

export default function DetailOverview({ calc }) {
  const isBlocked = !calc.canExchange;
  const actionLabel = calc.canExchange
    ? calc.difference > 0
      ? "Diferença a pagar"
      : "Mesmo valor"
    : "Saldo que sobraria na loja";
  const actionValue = calc.canExchange
    ? calc.difference > 0
      ? formatMoney(calc.difference)
      : "Sem diferença"
    : formatMoney(calc.leftover);
  const finalReinforcement = buildFinalReinforcement(calc);
  const highlightLabel = calc.requiresCancellationForJuros
    ? "Juros vinculados ao pedido"
    : calc.canExchange
      ? "Crédito disponível na loja"
      : "Saldo remanescente na loja";
  const highlightValue = calc.requiresCancellationForJuros
    ? "Sim"
    : calc.canExchange
      ? formatMoney(calc.totalAvailable)
      : formatMoney(calc.leftover);
  const financialHighlightClass = calc.canExchange
    ? "detail-overview__highlight detail-overview__highlight--primary"
    : "detail-overview__highlight detail-overview__highlight--primary is-neutral";
  const financialSectionClass = isBlocked
    ? "detail-overview__section detail-overview__section--financial is-blocked"
    : "detail-overview__section detail-overview__section--financial";
  const financialItems = [
    {
      label: "Pedido principal",
      context: calc.form.principalTurma,
      breakdown: buildPrincipalSummaryText(calc),
      value: formatMoney(calc.principalCredit)
    },
    {
      label: "Nova compra",
      context: calc.form.novaTurma,
      breakdown: buildCompositionSummary(calc.nova),
      value: formatMoney(calc.nova.paidMaterials)
    }
  ];

  if (calc.canExchange) {
    financialItems.push({
      label: actionLabel,
      value: actionValue
    });
  } else if (calc.requiresCancellationForJuros && calc.difference > 0) {
    financialItems.push({
      label: "Diferença após a nova compra",
      value: formatMoney(calc.difference)
    });
  }

  return (
    <div className="detail-overview">
      <section className="detail-overview__section detail-overview__section--status">
        <div className={isBlocked ? "detail-overview__status is-blocked" : "detail-overview__status"}>
          <strong>{isBlocked ? "NÃO PODE TROCAR" : "PODE TROCAR"}</strong>
        </div>
      </section>

      <section className={financialSectionClass}>
        <p className="detail-overview__section-label">Impacto financeiro</p>

        <div className={financialHighlightClass}>
          <span>{highlightLabel}</span>
          <strong>{highlightValue}</strong>
        </div>

        <div className="focus-card detail-overview__summary-card">
          <span className="focus-card__title">Resumo da troca</span>
          <div className="focus-card__rows">
            {financialItems.map((item) => (
              <div key={item.label} className="focus-card__row detail-overview__summary-row">
                <span>{item.label}</span>
                <div className="detail-overview__summary-content">
                  {item.context ? <small className="detail-overview__summary-context">{item.context}</small> : null}
                  {item.breakdown ? <small className="detail-overview__summary-breakdown">{item.breakdown}</small> : null}
                  <strong>{item.value}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="detail-overview__section detail-overview__section--details">
        <p className={isBlocked ? "detail-overview__footnote is-blocked" : "detail-overview__footnote"}>
          {finalReinforcement}
        </p>
      </section>
    </div>
  );
}
