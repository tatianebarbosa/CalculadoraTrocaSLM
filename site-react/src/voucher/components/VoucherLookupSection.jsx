import { useMemo, useState } from "react";

function getStatusTone(status) {
  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase();

  if (normalizedStatus.includes("aprov")) {
    return "success";
  }

  if (normalizedStatus.includes("reprov")) {
    return "danger";
  }

  if (normalizedStatus.includes("analise")) {
    return "warning";
  }

  return "neutral";
}

function getApprovalHighlight(requestItem) {
  if (requestItem.TipoSolicitacao === "Parcelamento") {
    return {
      label: "Parcelamento",
      value: requestItem.QuantidadeParcelasAprovadas ? `${requestItem.QuantidadeParcelasAprovadas}x` : "Em analise"
    };
  }

  return {
    label: "Desconto",
    value: requestItem.PercentualDescontoAprovado ? `${requestItem.PercentualDescontoAprovado}%` : "Em analise"
  };
}

function SummaryCard({ label, value, detail }) {
  return (
    <article className="voucher-school__summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function RequestMetric({ label, value, tone = "neutral" }) {
  return (
    <div className={`voucher-school__request-metric is-${tone}`.trim()}>
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

export default function VoucherLookupSection({
  lookupCnpj,
  lookupFeedback,
  lookupResult,
  isLookupLoading,
  isCnpjLocked,
  onLookupCnpjChange,
  onLookupSubmit,
  onUseSchoolInForm
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const requests = lookupResult?.requests || [];
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredRequests = useMemo(() => {
    if (!normalizedSearchQuery) {
      return requests;
    }

    return requests.filter((requestItem) => {
      const searchableText = [
        requestItem.DataHora,
        requestItem.Escola,
        requestItem.Ticket,
        requestItem.NomeAluno,
        requestItem.TipoSolicitacao,
        requestItem.SituacaoSolicitacao,
        requestItem.CodigoVoucher,
        requestItem.ObservacaoInternaRetorno
      ]
        .map((item) => String(item || "").toLowerCase())
        .join(" ");

      return searchableText.includes(normalizedSearchQuery);
    });
  }, [normalizedSearchQuery, requests]);

  const latestRequest = filteredRequests[0] || requests[0] || null;

  return (
    <section className="voucher-school__surface voucher-school__surface--lookup">
      <header className="voucher-school__panel-header voucher-school__panel-header--split">
        <div className="voucher-school__panel-copy-block">
          <p className="voucher-school__panel-eyebrow">Consultar solicitacao</p>
          <h3>Acompanhe o retorno da escola em um historico simples e visual</h3>
          <p className="voucher-school__panel-copy">
            Aqui a consulta fica separada do envio. Quando houver resposta, os principais dados aparecem em cards de
            leitura rapida, com foco em status, voucher e validade.
          </p>
        </div>

        <div className="voucher-school__panel-aside">
          <span className="voucher-school__panel-badge">Historico</span>
          <strong>{requests.length} registro(s)</strong>
          <p>Use a busca para localizar aluno, ticket, status ou codigo do voucher sem abrir uma tela tecnica.</p>
        </div>
      </header>

      <form className="voucher-school__lookup-hero" onSubmit={onLookupSubmit}>
        <div className="voucher-school__lookup-search">
          <span className="voucher-school__lookup-label">
            {isCnpjLocked ? "Buscar no historico da escola" : "Consultar por CNPJ"}
          </span>
          <input
            className="voucher-school__input voucher-school__input--search"
            type="text"
            inputMode={isCnpjLocked ? "search" : "numeric"}
            value={isCnpjLocked ? searchQuery : lookupCnpj}
            onChange={(event) => {
              if (isCnpjLocked) {
                setSearchQuery(event.target.value);
                return;
              }

              onLookupCnpjChange(event.target.value);
            }}
            placeholder={
              isCnpjLocked ? "Buscar por aluno, ticket, status ou codigo do voucher" : "00.000.000/0000-00"
            }
          />
        </div>

        <button
          className="voucher-school__primary-button voucher-school__primary-button--large"
          type="submit"
          disabled={isLookupLoading}
        >
          {isLookupLoading ? "Consultando..." : isCnpjLocked ? "Atualizar historico" : "Consultar"}
        </button>
      </form>

      {lookupFeedback ? (
        <div className={`voucher-school__feedback is-${lookupFeedback.type}`.trim()}>{lookupFeedback.message}</div>
      ) : null}

      <div className="voucher-school__summary-grid">
        <SummaryCard
          label="Escola"
          value={lookupResult?.school?.displayName || "Ainda nao localizada"}
          detail={
            lookupResult?.school
              ? "A consulta utiliza o mesmo vinculo de CNPJ da identificacao da escola."
              : "Assim que a base responder, o nome da escola aparecera aqui."
          }
        />
        <SummaryCard
          label="Solicitacoes"
          value={String(filteredRequests.length)}
          detail={
            normalizedSearchQuery
              ? "Resultado da busca atual dentro do historico carregado."
              : "Total de solicitacoes encontradas para este CNPJ."
          }
        />
        <SummaryCard
          label="Ultimo status"
          value={latestRequest?.SituacaoSolicitacao || "Sem retorno"}
          detail="O acompanhamento abaixo destaca o que ja foi analisado ou devolvido pelo time interno."
        />
      </div>

      {lookupResult?.school ? (
        <div className="voucher-school__school-card voucher-school__school-card--elevated">
          <div>
            <span className="voucher-school__school-label">Escola vinculada</span>
            <strong>{lookupResult.school.displayName}</strong>
          </div>
          {!isCnpjLocked ? (
            <button className="voucher-school__secondary-button" type="button" onClick={onUseSchoolInForm}>
              Usar na nova solicitacao
            </button>
          ) : null}
        </div>
      ) : null}

      {filteredRequests.length > 0 ? (
        <div className="voucher-school__request-list voucher-school__request-list--airy">
          {filteredRequests.map((requestItem) => {
            const approvalHighlight = getApprovalHighlight(requestItem);
            const statusTone = getStatusTone(requestItem.SituacaoSolicitacao);
            const hasVoucherCode = Boolean(requestItem.CodigoVoucher);

            return (
              <article
                key={`${requestItem.DataHora}-${requestItem.Ticket || requestItem.NomeAluno}`}
                className="voucher-school__request-card voucher-school__request-card--showcase"
              >
                <header className="voucher-school__request-header voucher-school__request-header--showcase">
                  <div className="voucher-school__request-heading">
                    <span className={`voucher-school__status-badge is-${statusTone}`.trim()}>
                      {requestItem.SituacaoSolicitacao || "Sem status"}
                    </span>
                    <h4>{requestItem.NomeAluno || "Solicitacao registrada"}</h4>
                    <p>
                      {requestItem.Escola || "Escola"} | {requestItem.TipoSolicitacao || "Solicitacao"} |{" "}
                      {requestItem.DataHora || "Data nao informada"}
                    </p>
                  </div>

                  <div className="voucher-school__request-hero-value">
                    <span>{hasVoucherCode ? "Codigo do voucher" : approvalHighlight.label}</span>
                    <strong>{hasVoucherCode ? requestItem.CodigoVoucher : approvalHighlight.value}</strong>
                  </div>
                </header>

                <div className="voucher-school__request-metrics">
                  <RequestMetric label="Status" value={requestItem.SituacaoSolicitacao} tone={statusTone} />
                  <RequestMetric label={approvalHighlight.label} value={approvalHighlight.value} />
                  <RequestMetric label="Validade" value={requestItem.DataValidadeFinal || "Aguardando definicao"} />
                  <RequestMetric label="Ticket" value={requestItem.Ticket || "Nao informado"} />
                </div>

                <div className="voucher-school__request-grid voucher-school__request-grid--showcase">
                  <RequestMetric label="Tipo de solicitacao" value={requestItem.TipoSolicitacao || "-"} />
                  <RequestMetric label="Aluno" value={requestItem.NomeAluno || "-"} />
                  <RequestMetric label="Voucher" value={requestItem.CodigoVoucher || "Ainda nao gerado"} />
                  <RequestMetric
                    label="Observacao de retorno"
                    value={requestItem.ObservacaoInternaRetorno || "Sem observacoes internas no momento."}
                  />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="voucher-school__empty-state voucher-school__empty-state--large">
          <strong>{requests.length > 0 ? "Nenhum resultado para essa busca." : "Nenhuma solicitacao carregada ainda."}</strong>
          <p>
            {isCnpjLocked
              ? requests.length > 0
                ? "Ajuste a pesquisa para localizar outro aluno, ticket, status ou codigo do voucher."
                : "Quando a escola tiver solicitacoes registradas, elas aparecerao aqui em cards de acompanhamento."
              : "Informe um CNPJ para consultar o historico desta escola."}
          </p>
        </div>
      )}
    </section>
  );
}
