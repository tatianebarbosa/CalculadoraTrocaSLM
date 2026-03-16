function SummaryCard({ label, value, detail }) {
  return (
    <article className="voucher-saf__summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}

export default function VoucherSafRequestTable({
  records,
  summary,
  isLoading,
  feedback,
  onSelectRecord
}) {
  return (
    <div className="voucher-saf__table-shell">
      <div className="voucher-saf__summary-grid">
        <SummaryCard label="Total na fila" value={summary.totalRecords} detail="Base completa do painel SAF." />
        <SummaryCard label="Filtradas" value={summary.filteredRecords} detail="Ordenacao aplicada: mais recente primeiro." />
        <SummaryCard
          label="Recebido"
          value={summary.summaryByStatus.Recebido || 0}
          detail="Solicitacoes aguardando triagem inicial."
        />
      </div>

      {feedback ? <div className={`voucher-school__feedback is-${feedback.type}`.trim()}>{feedback.message}</div> : null}

      <div className="voucher-saf__table-wrap">
        <table className="voucher-saf__table">
          <thead>
            <tr>
              <th>DataHora</th>
              <th>Escola</th>
              <th>CNPJ</th>
              <th>Ticket</th>
              <th>NomeSolicitante</th>
              <th>NomeAluno</th>
              <th>TipoSolicitacao</th>
              <th>SituacaoSolicitacao</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 ? (
              records.map((record) => (
                <tr
                  key={record.rowNumber}
                  className="voucher-saf__table-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectRecord(record)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectRecord(record);
                    }
                  }}
                >
                  <td>{record.DataHora || "-"}</td>
                  <td>{record.Escola || "-"}</td>
                  <td>{record.CNPJ || "-"}</td>
                  <td>{record.Ticket || "-"}</td>
                  <td>{record.NomeSolicitante || "-"}</td>
                  <td>{record.NomeAluno || "-"}</td>
                  <td>{record.TipoSolicitacao || "-"}</td>
                  <td>{record.SituacaoSolicitacao || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="voucher-saf__empty-cell" colSpan="8">
                  {isLoading ? "Carregando solicitacoes..." : "Nenhuma solicitacao encontrada com os filtros atuais."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
