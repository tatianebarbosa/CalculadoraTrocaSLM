export default function ExplanationSection({ calc }) {
  return (
    <section className="panel panel--explanation" id="explicacao">
      <div className="section-title">
        <div>
          <p className="section-title__eyebrow">Leitura da análise</p>
          <h3>Motivo, regra e resumo</h3>
          <p className="section-title__summary">Visão curta para validar o racional da troca e orientar o próximo passo.</p>
        </div>
      </div>

      <div className="explanation-stack">
        <div className="explanation-card">
          <span>Motivo</span>
          <p>{calc.reason}</p>
        </div>
        <div className="explanation-card">
          <span>Regras aplicadas</span>
          <p>{calc.ruleUsed}</p>
        </div>
        <div className="explanation-card">
          <span>Resumo operacional</span>
          <p>{calc.simpleSummary}</p>
        </div>
      </div>
    </section>
  );
}
