import { buildFinancialAction, buildNextStep } from "../../lib/exchangeCalculator";
import { formatMoney } from "../../lib/formatters";

function buildFinalReinforcement(calc) {
  if (!calc.ready) {
    return "Complete a simulação.";
  }

  if (calc.requiresCancellationForJuros) {
    return "A troca não pode seguir diretamente, pois os juros geram sobra de valor na loja.";
  }

  if (!calc.canExchange) {
    return "A troca não pode seguir, pois sobraria crédito na loja.";
  }

  if (calc.difference > 0) {
    return "Troca liberada com diferença a pagar.";
  }

  return "Troca liberada sem diferença de valor.";
}

export default function DetailOverview({ calc }) {
  const isBlocked = !calc.canExchange;
  const exchangeRoute = calc.ready ? `${calc.form.principalTurma} para ${calc.form.novaTurma}` : "Selecione as turmas";
  const actionLabel = calc.canExchange
    ? calc.difference > 0
      ? "Diferença a pagar"
      : "Mesmo valor"
    : "Valor que sobraria na loja";
  const actionValue = calc.canExchange
    ? calc.difference > 0
      ? formatMoney(calc.difference)
      : "Sem diferença"
    : formatMoney(calc.leftover);
  const finalReinforcement = buildFinalReinforcement(calc);
  const highlightLabel = calc.requiresCancellationForJuros
    ? "Juros aplicados no pedido principal"
    : calc.canExchange
      ? "Crédito que ficará disponível na loja"
      : "Sobra de crédito na loja";
  const highlightValue = calc.requiresCancellationForJuros
    ? formatMoney(calc.jurosCredit)
    : calc.canExchange
      ? formatMoney(calc.totalAvailable)
      : formatMoney(calc.leftover);
  const financialHighlightClass = calc.canExchange
    ? "detail-overview__highlight detail-overview__highlight--primary"
    : "detail-overview__highlight detail-overview__highlight--primary is-neutral";
  const financialGridClass =
    !calc.canExchange && (!calc.requiresCancellationForJuros || calc.difference <= 0)
      ? "detail-overview__grid detail-overview__grid--compact"
      : "detail-overview__grid";
  const financialItems = [
    {
      label: "Valor do pedido principal",
      value: formatMoney(calc.principal.paidMaterials)
    },
    {
      label: "Valor da nova compra",
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

      <section className="detail-overview__section detail-overview__section--financial">
        <p className="detail-overview__section-label">Impacto financeiro</p>

        <div className={financialHighlightClass}>
          <span>{highlightLabel}</span>
          <strong>{highlightValue}</strong>
        </div>

        <div className={financialGridClass}>
          {financialItems.map((item) => (
            <div key={item.label} className="detail-overview__item">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="detail-overview__section detail-overview__section--actions">
        <p className="detail-overview__section-label">O que fazer</p>

        <div className="detail-overview__action-grid">
          <div className="detail-overview__action-card">
            <span>Ação necessária</span>
            <strong>{buildFinancialAction(calc)}</strong>
          </div>
          <div className="detail-overview__action-card">
            <span>Próximo passo</span>
            <strong>{buildNextStep(calc)}</strong>
          </div>
        </div>
      </section>

      <section className="detail-overview__section detail-overview__section--details">
        <p className="detail-overview__comparison">{exchangeRoute}</p>

        <div className={isBlocked ? "detail-explanation-card is-blocked" : "detail-explanation-card"}>
          <p>{finalReinforcement}</p>
        </div>
      </section>
    </div>
  );
}
