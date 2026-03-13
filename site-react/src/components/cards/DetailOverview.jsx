import { buildFinancialAction, buildNextStep } from "../../lib/exchangeCalculator";
import { formatMoney } from "../../lib/formatters";

function buildFinalReinforcement(calc) {
  if (!calc.ready) {
    return "Complete a simulacao.";
  }

  if (calc.requiresCancellationForJuros) {
    return "A troca nao pode seguir neste momento, pois os juros estao sendo reembolsados e isso gera sobra de valor na loja.";
  }

  if (!calc.canExchange) {
    return "A troca nao pode seguir, pois sobraria credito na loja.";
  }

  if (calc.difference > 0) {
    return "Troca liberada com diferenca a pagar.";
  }

  return "Troca liberada sem diferenca de valor.";
}

export default function DetailOverview({ calc }) {
  const isBlocked = !calc.canExchange;
  const shouldShowRefundInfo = calc.requiresCancellationForJuros || !calc.canExchange;
  const refundInfoTooltipId = "refund-info-tooltip";
  const exchangeRoute = calc.ready ? `${calc.form.principalTurma} para ${calc.form.novaTurma}` : "Selecione as turmas";
  const actionLabel = calc.canExchange
    ? calc.difference > 0
      ? "Diferenca a pagar"
      : "Mesmo valor"
    : "Valor que sobraria na loja";
  const actionValue = calc.canExchange
    ? calc.difference > 0
      ? formatMoney(calc.difference)
      : "Sem diferenca"
    : formatMoney(calc.leftover);
  const finalReinforcement = buildFinalReinforcement(calc);
  const highlightLabel = calc.requiresCancellationForJuros
    ? "Juros reembolsados na loja"
    : calc.canExchange
      ? "Credito que ficara disponivel na loja"
      : "Sobra de credito na loja";
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
  const financialSectionClass = isBlocked
    ? "detail-overview__section detail-overview__section--financial is-blocked"
    : "detail-overview__section detail-overview__section--financial";
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
      label: "Diferenca apos a nova compra",
      value: formatMoney(calc.difference)
    });
  }

  return (
    <div className="detail-overview">
      <section className="detail-overview__section detail-overview__section--status">
        <div className={isBlocked ? "detail-overview__status is-blocked" : "detail-overview__status"}>
          <strong>{isBlocked ? "NAO PODE TROCAR" : "PODE TROCAR"}</strong>
        </div>
      </section>

      <section className={financialSectionClass}>
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
          <div className="detail-overview__action-card detail-overview__action-card--primary">
            <div className="detail-overview__action-heading">
              <span>Acao necessaria</span>
            </div>
            {shouldShowRefundInfo ? (
              <span className="detail-overview__info">
                <button
                  className="detail-overview__info-trigger"
                  type="button"
                  aria-label="Informacoes sobre reembolso"
                  aria-describedby={refundInfoTooltipId}
                >
                  i
                </button>
                <span className="detail-overview__info-tooltip" id={refundInfoTooltipId} role="tooltip">
                  Se for boleto, a solicitacao e feita pelo ERP. Se for cartao de credito, o reembolso e feito de
                  forma automatica com o cancelamento do pedido.
                </span>
              </span>
            ) : null}
            <strong>{buildFinancialAction(calc)}</strong>
          </div>
          <div className="detail-overview__action-card detail-overview__action-card--secondary">
            <span>Proximo passo</span>
            <strong>{buildNextStep(calc)}</strong>
          </div>
        </div>
      </section>

      <section className="detail-overview__section detail-overview__section--details">
        <p className="detail-overview__comparison">{exchangeRoute}</p>
        <p className={isBlocked ? "detail-overview__footnote is-blocked" : "detail-overview__footnote"}>
          {finalReinforcement}
        </p>
      </section>
    </div>
  );
}
