import { useState } from "react";

function UsageHistoryDialog({ events, onClose }) {
  return (
    <div className="modal-backdrop usage-history-dialog__backdrop" role="presentation" onClick={onClose}>
      <section
        className="usage-history-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="usage-history-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="usage-history-dialog__header">
          <div>
            <span className="usage-dialog__eyebrow">Atividade</span>
            <h3 id="usage-history-dialog-title">Todas as movimentações</h3>
          </div>

          <button className="usage-history-dialog__close" type="button" onClick={onClose} aria-label="Fechar histórico de atividades">
            x
          </button>
        </div>

        {events.length ? (
          <div className="usage-history-dialog__list">
            <ul className="usage-dialog__activity-list">
              {events.map((event) => (
                <li key={event.id}>
                  <strong>{event.label}</strong>
                  <span>{event.occurredAtLabel}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="usage-dialog__empty">Nenhuma atividade registrada para este recorte.</p>
        )}
      </section>
    </div>
  );
}

export default function UsageDialog({
  filters,
  report,
  onFilterChange,
  onApplyCurrentWeek,
  onApplyToday,
  onResetFilters,
  onClose
}) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const quickFilterButtonStyle = { borderRadius: "8px" };
  const latestEvent = report.recentEvents[0] ?? null;
  const hasActivityHistory = report.recentEvents.length > 1;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="usage-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="usage-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="usage-dialog__header">
          <div>
            <span className="usage-dialog__eyebrow">Uso do site</span>
            <h3 id="usage-dialog-title">Utilização registrada</h3>
          </div>

          <button className="usage-dialog__close" type="button" onClick={onClose} aria-label="Fechar modal de uso do site">
            x
          </button>
        </div>

        <p className="usage-dialog__intro">Ajuste o período para ver a movimentação registrada.</p>

        <div className="usage-dialog__filters">
          <label className="field">
            <span className="field__label">De</span>
            <input
              className="usage-dialog__input"
              type="date"
              value={filters.startDate}
              onChange={(event) => onFilterChange("startDate", event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">Até</span>
            <input
              className="usage-dialog__input"
              type="date"
              value={filters.endDate}
              onChange={(event) => onFilterChange("endDate", event.target.value)}
            />
          </label>

          <div className="field usage-dialog__filter-shortcuts">
            <span className="field__label">Atalhos</span>
            <div className="usage-dialog__filter-actions">
              <button className="catalog-editor__button usage-dialog__filter-button" type="button" onClick={onApplyToday} style={quickFilterButtonStyle}>
                Hoje
              </button>
              <button className="catalog-editor__button usage-dialog__filter-button" type="button" onClick={onApplyCurrentWeek} style={quickFilterButtonStyle}>
                Esta semana
              </button>
              <button className="catalog-editor__button usage-dialog__filter-button" type="button" onClick={onResetFilters} style={quickFilterButtonStyle}>
                Últimos 30 dias
              </button>
            </div>
          </div>
        </div>

        <div className="usage-dialog__summary-grid">
          <article className="usage-dialog__summary-card">
            <span>Eventos no período</span>
            <strong>{report.totalEvents}</strong>
          </article>

          <article className="usage-dialog__summary-card">
            <span>Dias com uso</span>
            <strong>{report.daysWithUsage}</strong>
          </article>

          <article className="usage-dialog__summary-card">
            <span>Última atividade</span>
            <strong>{report.lastActivityLabel}</strong>
          </article>
        </div>

        <div className="usage-dialog__content-grid">
          <section className="usage-dialog__panel usage-dialog__panel--metrics">
            <div className="section-title section-title--inline-action">
              <div>
                <p className="section-title__eyebrow">Resumo</p>
                <h3>Tipos de uso</h3>
              </div>
            </div>

            <div className="usage-dialog__metric-grid">
              {report.metrics.map((metric) => (
                <article key={metric.type} className="usage-dialog__metric-card">
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </article>
              ))}
            </div>
          </section>

          <div className="usage-dialog__side-stack">
            <section className="usage-dialog__panel">
              <div className="section-title">
                <div>
                  <p className="section-title__eyebrow">Movimento</p>
                  <h3>Por dia</h3>
                </div>
              </div>

              {report.timeline.length ? (
                <div className="usage-dialog__table-wrap">
                  <table className="usage-dialog__table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.timeline.map((item) => (
                        <tr key={item.dateKey}>
                          <td>{item.label}</td>
                          <td>{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="usage-dialog__empty">Nenhum registro encontrado para o período selecionado.</p>
              )}
            </section>

            <section className="usage-dialog__panel usage-dialog__panel--activity">
              <div className="section-title section-title--inline-action">
                <div>
                  <p className="section-title__eyebrow">Atividade</p>
                  <h3>Última atividade</h3>
                </div>

                {hasActivityHistory ? (
                  <button className="usage-dialog__history-button" type="button" onClick={() => setIsHistoryOpen(true)}>
                    Ver todas
                  </button>
                ) : null}
              </div>

              {latestEvent ? (
                <ul className="usage-dialog__activity-list">
                  <li key={latestEvent.id}>
                    <strong>{latestEvent.label}</strong>
                    <span>{latestEvent.occurredAtLabel}</span>
                  </li>
                </ul>
              ) : (
                <p className="usage-dialog__empty">Nenhuma atividade recente para este recorte.</p>
              )}
            </section>
          </div>
        </div>

        {isHistoryOpen ? <UsageHistoryDialog events={report.recentEvents} onClose={() => setIsHistoryOpen(false)} /> : null}
      </section>
    </div>
  );
}
