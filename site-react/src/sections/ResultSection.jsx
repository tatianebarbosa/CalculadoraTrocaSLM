import DetailOverview from "../components/cards/DetailOverview";
import { buildJurosWarning } from "../lib/exchangeCalculator";

export default function ResultSection({ calc }) {
  return (
    <section className="panel panel--detail panel--principal-detail">
      <div className="section-title">
        <div>
          <p className="section-title__eyebrow">Resultado da troca</p>
        </div>
      </div>

      <DetailOverview calc={calc} />

      <div className="explanation-card detail-explanation-card">
        <p>{calc.quickSummary}</p>
      </div>

      {calc.jurosCredit > 0 ? (
        <div className="explanation-card detail-warning-card">
          <p>{buildJurosWarning(calc)}</p>
        </div>
      ) : null}

      {calc.voucherReactivationWarning ? (
        <div className="explanation-card detail-warning-card">
          <p>{calc.voucherReactivationWarning}</p>
        </div>
      ) : null}
    </section>
  );
}
