import { formatMoney } from "../../lib/formatters";

function buildFinalReinforcement(calc) {
  if (!calc.ready) {
    return "Complete a simulacao.";
  }

  if (calc.requiresCancellationForJuros) {
    return "A troca n\u00e3o pode seguir neste momento, pois h\u00e1 juros vinculados ao pedido principal.";
  }

  if (!calc.canExchange) {
    return "A troca n\u00e3o pode seguir, pois haveria saldo remanescente na loja.";
  }

  if (calc.acceptedSolutionRequirement) {
    return `A troca pode seguir, mas somente com a compra obrigat\u00f3ria de ${calc.acceptedSolutionRequirement.itemsLabel}.`;
  }

  if (calc.difference > 0) {
    return "Troca liberada com diferen\u00e7a a pagar.";
  }

  return "Troca liberada sem diferen\u00e7a a pagar.";
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

function buildSolutionText(solutionSuggestion) {
  if (!solutionSuggestion) {
    return "";
  }

  if (solutionSuggestion.hasAlternativeChoice) {
    return `Se incluir ${solutionSuggestion.alternativesLabel} na nova compra, o saldo remanescente deixa de existir e a troca pode seguir. O valor final dependerá do item escolhido: ${solutionSuggestion.alternativesOutcomeText}.`;
  }

  const outcomeText =
    solutionSuggestion.difference > 0
      ? `a troca pode seguir com diferen\u00e7a de ${formatMoney(solutionSuggestion.difference)} a pagar.`
      : "a troca pode seguir sem diferen\u00e7a a pagar.";

  return `Se incluir ${solutionSuggestion.addedItemsLabel} na nova compra, o saldo remanescente deixa de existir e ${outcomeText}`;
}

function buildAppliedSolutionText(calc) {
  if (!calc.acceptedSolutionRequirement) {
    return "";
  }

  if (calc.difference > 0) {
    return `Seguiremos com a troca somente se a nova compra incluir obrigatoriamente ${calc.acceptedSolutionRequirement.itemsLabel}, mesmo que esse item apare\u00e7a como opcional na loja. Nesse cen\u00e1rio, a diferen\u00e7a ser\u00e1 de ${formatMoney(calc.difference)} a pagar.`;
  }

  return `Seguiremos com a troca somente se a nova compra incluir obrigatoriamente ${calc.acceptedSolutionRequirement.itemsLabel}, mesmo que esse item apare\u00e7a como opcional na loja.`;
}

export default function DetailOverview({ calc, onAcceptSolution }) {
  const isBlocked = !calc.canExchange;
  const actionLabel = calc.canExchange ? (calc.difference > 0 ? "Diferen\u00e7a a pagar" : "Mesmo valor") : "Saldo que sobraria na loja";
  const actionValue = calc.canExchange
    ? calc.difference > 0
      ? formatMoney(calc.difference)
      : "Sem diferen\u00e7a"
    : formatMoney(calc.leftover);
  const finalReinforcement = buildFinalReinforcement(calc);
  const highlightLabel = calc.requiresCancellationForJuros
    ? "Juros vinculados ao pedido"
    : calc.canExchange
      ? "Cr\u00e9dito dispon\u00edvel na loja"
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
      label: "Diferen\u00e7a ap\u00f3s a nova compra",
      value: formatMoney(calc.difference)
    });
  }

  const solutionText = buildSolutionText(calc.solutionSuggestion);
  const appliedSolutionText = buildAppliedSolutionText(calc);
  const solutionHeading = appliedSolutionText
    ? "Solu\u00e7\u00e3o aplicada"
    : calc.isSolutionSimulated
      ? "Simula\u00e7\u00e3o ativa"
      : "Solu\u00e7\u00e3o poss\u00edvel";
  const solutionButtonLabel = calc.isSolutionSimulated ? "Desativar simula\u00e7\u00e3o" : "Simular solu\u00e7\u00e3o";
  const solutionButtonClass = calc.isSolutionSimulated
    ? "message-card__copy-button detail-overview__solution-button is-copied"
    : "message-card__copy-button detail-overview__solution-button";
  const detailsSectionClass =
    solutionText || appliedSolutionText
      ? "detail-overview__section detail-overview__section--details is-pinned"
      : "detail-overview__section detail-overview__section--details";

  return (
    <div className="detail-overview">
      <section className="detail-overview__section detail-overview__section--status">
        <div className={isBlocked ? "detail-overview__status is-blocked" : "detail-overview__status"}>
          <strong>{isBlocked ? "N\u00c3O PODE TROCAR" : "PODE TROCAR"}</strong>
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

        {solutionText || appliedSolutionText ? (
          <div className={`detail-overview__solution ${appliedSolutionText ? "is-applied" : ""}`.trim()}>
            <span>{solutionHeading}</span>
            <p>{appliedSolutionText || solutionText}</p>
            {solutionText && !appliedSolutionText ? (
              <button className={solutionButtonClass} type="button" onClick={onAcceptSolution}>
                {solutionButtonLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className={detailsSectionClass}>
        <p className={isBlocked ? "detail-overview__footnote is-blocked" : "detail-overview__footnote"}>
          {finalReinforcement}
        </p>
      </section>
    </div>
  );
}
