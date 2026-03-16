import { useEffect, useState } from "react";
import {
  SAF_DETAIL_FIELD_GROUPS,
  SAF_STATUS_OPTIONS,
  formatSafDisplayValue,
  isDiscountRequest,
  isInstallmentRequest
} from "../lib/voucherSafPanel";
import { buildVoucherSafOperationalTexts } from "../lib/voucherSafTexts";

function CopyCard({ copyKey, copiedKey, label, value, onCopy }) {
  return (
    <article className="voucher-saf__copy-card">
      <div className="voucher-saf__copy-card-header">
        <span>{label}</span>
        <button
          className={`voucher-saf__copy-button ${copiedKey === copyKey ? "is-copied" : ""}`.trim()}
          type="button"
          onClick={() => onCopy(copyKey, value)}
        >
          {copiedKey === copyKey ? "Copiado" : "Copiar"}
        </button>
      </div>
      <p>{value || "-"}</p>
    </article>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="voucher-saf__detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function VoucherSafDetailModal({
  record,
  returnForm,
  saveFeedback,
  isSaving,
  onClose,
  onReturnFieldChange,
  onSave
}) {
  const [copiedKey, setCopiedKey] = useState("");
  const previewRecord = {
    ...record,
    ...returnForm
  };
  const generatedTexts = buildVoucherSafOperationalTexts(previewRecord);
  const isDiscount = isDiscountRequest(record);
  const isInstallment = isInstallmentRequest(record);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  async function handleCopy(copyKey, text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(copyKey);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === copyKey ? "" : current));
      }, 1400);
    } catch {
      setCopiedKey("");
    }
  }

  return (
    <div className="voucher-saf__modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="voucher-saf__modal"
        role="dialog"
        aria-modal="true"
        aria-label="Detalhe da solicitacao SAF"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="voucher-saf__modal-header">
          <div>
            <span className="voucher-saf__modal-eyebrow">Detalhe da solicitacao</span>
            <h3>{record.NomeAluno || "Solicitacao interna SAF"}</h3>
            <p>
              {record.Escola || "-"} | {record.TipoSolicitacao || "-"} | {record.SituacaoSolicitacao || "-"}
            </p>
          </div>
          <button className="voucher-school__secondary-button" type="button" onClick={onClose}>
            Fechar
          </button>
        </header>

        <div className="voucher-saf__modal-body">
          <section className="voucher-saf__highlight-strip">
            <article className="voucher-saf__highlight-card">
              <span>{generatedTexts.highlightLabel}</span>
              <strong>{generatedTexts.highlightValue}</strong>
            </article>
            <article className="voucher-saf__highlight-card">
              <span>Resumo operacional</span>
              <strong>{generatedTexts.requestSummary}</strong>
            </article>
          </section>

          <section className="voucher-saf__detail-groups">
            {SAF_DETAIL_FIELD_GROUPS.map((group) => (
              <article key={group.title} className="voucher-saf__detail-group">
                <header>
                  <span>{group.title}</span>
                </header>
                <div className="voucher-saf__detail-grid">
                  {group.fields.map(([fieldKey, fieldLabel]) => (
                    <DetailField
                      key={fieldKey}
                      label={fieldLabel}
                      value={formatSafDisplayValue(fieldKey, previewRecord[fieldKey])}
                    />
                  ))}
                </div>
              </article>
            ))}
          </section>

          <section className="voucher-saf__return-panel">
            <div className="section-title">
              <div>
                <p className="section-title__eyebrow">Retorno SAF</p>
                <h3>Atualizacao interna da solicitacao</h3>
              </div>
            </div>

            {saveFeedback ? (
              <div className={`voucher-school__feedback is-${saveFeedback.type}`.trim()}>{saveFeedback.message}</div>
            ) : null}

            <div className="voucher-saf__return-form">
              <label className="field">
                <span className="field__label">SituacaoSolicitacao</span>
                <select
                  value={returnForm.SituacaoSolicitacao}
                  onChange={(event) => onReturnFieldChange("SituacaoSolicitacao", event.target.value)}
                >
                  {SAF_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field__label">AprovadoPor</span>
                <input
                  type="text"
                  value={returnForm.AprovadoPor}
                  onChange={(event) => onReturnFieldChange("AprovadoPor", event.target.value)}
                />
              </label>

              <label className="field">
                <span className="field__label">DataAnalise</span>
                <input
                  type="date"
                  value={returnForm.DataAnalise}
                  onChange={(event) => onReturnFieldChange("DataAnalise", event.target.value)}
                />
              </label>

              <label className="field">
                <span className="field__label">PercentualDescontoAprovado</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={returnForm.PercentualDescontoAprovado}
                  onChange={(event) => onReturnFieldChange("PercentualDescontoAprovado", event.target.value)}
                  disabled={!isDiscount}
                />
              </label>

              <label className="field">
                <span className="field__label">QuantidadeParcelasAprovadas</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={returnForm.QuantidadeParcelasAprovadas}
                  onChange={(event) => onReturnFieldChange("QuantidadeParcelasAprovadas", event.target.value)}
                  disabled={!isInstallment}
                />
              </label>

              <label className="field">
                <span className="field__label">CodigoVoucher</span>
                <input
                  type="text"
                  value={returnForm.CodigoVoucher}
                  onChange={(event) => onReturnFieldChange("CodigoVoucher", event.target.value)}
                  disabled={!isDiscount}
                />
              </label>

              <label className="field">
                <span className="field__label">DataValidadeFinal</span>
                <input
                  type="date"
                  value={returnForm.DataValidadeFinal}
                  onChange={(event) => onReturnFieldChange("DataValidadeFinal", event.target.value)}
                />
              </label>

              <label className="field field--full">
                <span className="field__label">ObservacaoInternaRetorno</span>
                <textarea
                  className="voucher-school__textarea"
                  rows="4"
                  value={returnForm.ObservacaoInternaRetorno}
                  onChange={(event) => onReturnFieldChange("ObservacaoInternaRetorno", event.target.value)}
                />
              </label>
            </div>

            <div className="voucher-school__actions">
              <button className="voucher-school__primary-button" type="button" onClick={onSave} disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar retorno SAF"}
              </button>
            </div>
          </section>

          <section className="voucher-saf__generated-grid">
            <CopyCard
              copyKey="emailSubject"
              copiedKey={copiedKey}
              label="Titulo do e-mail para financeiro"
              value={generatedTexts.emailSubject}
              onCopy={handleCopy}
            />
            <CopyCard
              copyKey="financeText"
              copiedKey={copiedKey}
              label="Texto-base para financeiro"
              value={generatedTexts.financeBaseText}
              onCopy={handleCopy}
            />
            <CopyCard
              copyKey="serviceMessage"
              copiedKey={copiedKey}
              label="Mensagem de aprovacao para atendimento"
              value={generatedTexts.serviceMessage}
              onCopy={handleCopy}
            />
            <CopyCard
              copyKey="magentoDescription"
              copiedKey={copiedKey}
              label="Descricao Magento"
              value={generatedTexts.magentoDescription}
              onCopy={handleCopy}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
