import { buildFinancialAction, buildNextStep } from "../../lib/exchangeCalculator";
import { formatMoney } from "../../lib/formatters";

export default function DetailOverview({ calc }) {
  const exchangeRoute = calc.ready ? `${calc.form.principalTurma} → ${calc.form.novaTurma}` : "Selecione as turmas";
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

  return (
    <div className="detail-overview">
      <div className={calc.canExchange ? "detail-overview__status" : "detail-overview__status is-blocked"}>
        <strong>{calc.canExchange ? "PODE TROCAR" : "NÃO PODE TROCAR"}</strong>
      </div>

      <div className="detail-overview__highlight">
        <span>Crédito total disponível</span>
        <strong>{formatMoney(calc.totalAvailable)}</strong>
      </div>

      <div className="detail-overview__grid">
        <div className="detail-overview__item">
          <span>Valor do pedido principal</span>
          <strong>{formatMoney(calc.principal.paidMaterials)}</strong>
        </div>
        <div className="detail-overview__item">
          <span>Valor da nova compra</span>
          <strong>{formatMoney(calc.nova.paidMaterials)}</strong>
        </div>
        <div className="detail-overview__item">
          <span>{actionLabel}</span>
          <strong>{actionValue}</strong>
        </div>
      </div>

      <div className="detail-overview__meta">
        <div className="detail-overview__meta-row">
          <span>Comparação</span>
          <strong>{exchangeRoute}</strong>
        </div>
        <div className="detail-overview__meta-row">
          <span>Ação financeira</span>
          <strong>{buildFinancialAction(calc)}</strong>
        </div>
        <div className="detail-overview__meta-row">
          <span>Próximo passo</span>
          <strong>{buildNextStep(calc)}</strong>
        </div>
      </div>
    </div>
  );
}
