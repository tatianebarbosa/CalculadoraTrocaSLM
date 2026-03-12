export default function ExplanationSection({ calc }) {
  return (
    <section className="panel panel--explanation" id="explicacao">
      <div className="section-title">
        <div>
          <p className="section-title__eyebrow">Explicação</p>
          <h3>Motivo, regra e resumo</h3>
        </div>
      </div>

      <div className="explanation-stack">
        <div className="explanation-card">
          <span>Motivo da análise</span>
          <p>{calc.reason}</p>
        </div>
        <div className="explanation-card">
          <span>Regra usada</span>
          <p>{calc.ruleUsed}</p>
        </div>
        <div className="explanation-card">
          <span>Resumo simples</span>
          <p>{calc.simpleSummary}</p>
        </div>
      </div>
    </section>
  );
}
