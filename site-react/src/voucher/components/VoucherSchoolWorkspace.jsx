import { useEffect, useState } from "react";
import { getDefaultCatalog, requestSharedCatalog } from "../../lib/catalogApi";
import { createVoucherRequest, lookupVoucherRequestsByCnpj, VoucherPreviewApiError } from "../lib/voucherPreviewApi";
import {
  buildPostSubmitFormState,
  buildVoucherRequestPayload,
  formatCnpjInput,
  formatCpfInput,
  INITIAL_VOUCHER_REQUEST_FORM,
  normalizeCnpj,
  validateVoucherRequestForm
} from "../lib/voucherSchoolForm";
import { VOUCHER_PREVIEW_SCHOOL_VIEW } from "../lib/voucherPreviewRoutes";
import VoucherLookupSection from "./VoucherLookupSection";
import VoucherRequestFormSection from "./VoucherRequestFormSection";

function getIdentifiedCnpjFromLocation() {
  if (typeof window === "undefined") {
    return "";
  }

  const searchParams = new URLSearchParams(window.location.search);
  const candidateCnpj = searchParams.get("cnpj") || searchParams.get("schoolCnpj") || "";

  return normalizeCnpj(candidateCnpj);
}

function buildApiHint(error) {
  if (!(error instanceof VoucherPreviewApiError)) {
    return null;
  }

  if (error.status === 404) {
    return "A API do voucher-preview esta desabilitada neste ambiente. Confirme VOUCHER_PREVIEW_API_ENABLED=true fora de producao.";
  }

  return null;
}

function formatFieldValue(key, value) {
  if (key === "CNPJ") {
    return formatCnpjInput(value);
  }

  if (key === "CPFResponsavel1" || key === "CPFResponsavel2") {
    return formatCpfInput(value);
  }

  return value;
}

function normalizeSchoolName(value) {
  return String(value ?? "").trim();
}

function VoucherModeCard({ eyebrow, title, description, detail, isActive, onClick }) {
  return (
    <button
      className={`voucher-school__mode-card ${isActive ? "is-active" : ""}`.trim()}
      type="button"
      onClick={onClick}
    >
      <span>{eyebrow}</span>
      <strong>{title}</strong>
      <p>{description}</p>
      <small>{detail}</small>
    </button>
  );
}

export default function VoucherSchoolWorkspace({
  identifiedCnpj: identifiedCnpjProp,
  identifiedSchoolName: identifiedSchoolNameProp,
  schoolView,
  onIdentifiedSchoolNameChange,
  onSchoolViewChange
}) {
  const [catalog, setCatalog] = useState(() => getDefaultCatalog());
  const [catalogNotice, setCatalogNotice] = useState("");
  const [catalogNoticeType, setCatalogNoticeType] = useState("info");
  const [form, setForm] = useState(INITIAL_VOUCHER_REQUEST_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitFeedback, setSubmitFeedback] = useState(null);
  const [lookupFeedback, setLookupFeedback] = useState(null);
  const [schoolLookupFeedback, setSchoolLookupFeedback] = useState(null);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupCnpj, setLookupCnpj] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [isSchoolLookupLoading, setIsSchoolLookupLoading] = useState(false);

  const identifiedCnpj = normalizeCnpj(identifiedCnpjProp || getIdentifiedCnpjFromLocation());
  const identifiedSchoolName = normalizeSchoolName(identifiedSchoolNameProp);
  const hasIdentifiedCnpj = identifiedCnpj.length === 14;
  const formattedIdentifiedCnpj = formatCnpjInput(identifiedCnpj);
  const turmaOptions = catalog.map((item) => ({ value: item.turma, label: item.turma }));
  const isNewRequestView = schoolView === VOUCHER_PREVIEW_SCHOOL_VIEW.NEW_REQUEST;
  const requestsCount = lookupResult?.requests?.length || 0;
  const schoolDisplayName = form.Escola || identifiedSchoolName || lookupResult?.school?.displayName || "Sua escola";

  useEffect(() => {
    let isCancelled = false;

    async function loadSharedCatalog() {
      setCatalogNotice("");
      setCatalogNoticeType("info");

      try {
        const sharedCatalog = await requestSharedCatalog();
        if (isCancelled) {
          return;
        }

        setCatalog(sharedCatalog);
        setCatalogNotice("");
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setCatalogNotice(error instanceof Error ? error.message : "Falha ao carregar as turmas do modulo.");
        setCatalogNoticeType("error");
      }
    }

    loadSharedCatalog();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasIdentifiedCnpj) {
      return;
    }

    setLookupCnpj(formattedIdentifiedCnpj);
    setForm((current) => ({
      ...current,
      CNPJ: formattedIdentifiedCnpj
    }));
  }, [formattedIdentifiedCnpj, hasIdentifiedCnpj]);

  useEffect(() => {
    if (!identifiedSchoolName) {
      return;
    }

    setForm((current) => {
      if (current.Escola === identifiedSchoolName) {
        return current;
      }

      return {
        ...current,
        Escola: identifiedSchoolName
      };
    });
  }, [identifiedSchoolName]);

  function updateFormField(key, nextValue) {
    if (hasIdentifiedCnpj && key === "CNPJ") {
      return;
    }

    setForm((current) => {
      const formattedValue = formatFieldValue(key, nextValue);

      if (key === "TipoSolicitacao") {
        return {
          ...current,
          TipoSolicitacao: formattedValue,
          PercentualDescontoSolicitado: formattedValue === "Desconto" ? current.PercentualDescontoSolicitado : "",
          QuantidadeParcelasSolicitadas: formattedValue === "Parcelamento" ? current.QuantidadeParcelasSolicitadas : ""
        };
      }

      return {
        ...current,
        [key]: formattedValue
      };
    });

    setFormErrors((current) => {
      if (!current[key]) {
        return current;
      }

      return {
        ...current,
        [key]: ""
      };
    });
  }

  function applyLookupDataToForm(lookupData, explicitCnpj = "") {
    const resolvedCnpj = formatCnpjInput(explicitCnpj || lookupData?.cnpj || "");
    const schoolName = lookupData?.school?.displayName || "";

    setForm((current) => ({
      ...current,
      Escola: schoolName || current.Escola,
      CNPJ: resolvedCnpj || current.CNPJ
    }));
  }

  async function runLookup(rawCnpj, options = {}) {
    const normalizedCnpj = hasIdentifiedCnpj ? identifiedCnpj : normalizeCnpj(rawCnpj);
    const shouldPopulateLookupPanel = options.populateLookupPanel !== false;
    const shouldAutofillForm = Boolean(options.autofillForm);
    const useSchoolLookupState = Boolean(options.useSchoolLookupState);

    if (normalizedCnpj.length !== 14) {
      const nextFeedback = {
        type: "error",
        message: "Informe um CNPJ valido com 14 digitos para consultar."
      };

      if (shouldPopulateLookupPanel) {
        setLookupFeedback(nextFeedback);
        setLookupResult(null);
      }

      if (useSchoolLookupState) {
        setSchoolLookupFeedback(nextFeedback);
      }

      return null;
    }

    if (shouldPopulateLookupPanel) {
      setIsLookupLoading(true);
      setLookupFeedback(null);
      setLookupCnpj(formatCnpjInput(normalizedCnpj));
    }

    if (useSchoolLookupState) {
      setIsSchoolLookupLoading(true);
      setSchoolLookupFeedback(null);
    }

    try {
      const data = await lookupVoucherRequestsByCnpj(normalizedCnpj);
      const hasResults = (data?.requests?.length || 0) > 0;
      const hasSchool = Boolean(data?.school?.displayName);
      const nextFeedback = hasResults || hasSchool
        ? {
            type: "success",
            message: hasResults
              ? `${data.requests.length} solicitacao(oes) encontrada(s) para este CNPJ.`
              : "CNPJ encontrado na base, sem solicitacoes registradas ate o momento."
          }
        : {
            type: "info",
            message: "Nenhum dado encontrado para este CNPJ no modulo voucher-preview."
          };

      if (shouldPopulateLookupPanel) {
        setLookupResult(data);
        setLookupFeedback(nextFeedback);
      }

      if (useSchoolLookupState) {
        setSchoolLookupFeedback(
          hasSchool
            ? {
                type: "success",
                message: `Escola preenchida automaticamente com base na BaseEscolas: ${data.school.displayName}.`
              }
            : nextFeedback
        );
      }

      if (hasSchool) {
        onIdentifiedSchoolNameChange?.(data.school.displayName);
      }

      if (shouldAutofillForm && hasSchool) {
        applyLookupDataToForm(data, normalizedCnpj);
      }

      return data;
    } catch (error) {
      const apiHint = buildApiHint(error);
      const nextFeedback = {
        type: "error",
        message: apiHint || (error instanceof Error ? error.message : "Falha ao consultar o CNPJ.")
      };

      if (shouldPopulateLookupPanel) {
        setLookupFeedback(nextFeedback);
        setLookupResult(null);
      }

      if (useSchoolLookupState) {
        setSchoolLookupFeedback(nextFeedback);
      }

      return null;
    } finally {
      if (shouldPopulateLookupPanel) {
        setIsLookupLoading(false);
      }

      if (useSchoolLookupState) {
        setIsSchoolLookupLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!hasIdentifiedCnpj) {
      return;
    }

    runLookup(identifiedCnpj, {
      populateLookupPanel: true,
      autofillForm: true,
      useSchoolLookupState: true
    });
  }, [hasIdentifiedCnpj, identifiedCnpj]);

  async function handleFormSubmit(event) {
    event.preventDefault();

    const nextErrors = validateVoucherRequestForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      setSubmitFeedback({
        type: "error",
        message: "Revise os campos obrigatorios antes de enviar a solicitacao."
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitFeedback({
      type: "info",
      message: "Enviando solicitacao para a fila isolada do voucher-preview..."
    });

    try {
      const payload = buildVoucherRequestPayload(form);
      const response = await createVoucherRequest(payload);

      setSubmitFeedback({
        type: "success",
        message: `Solicitacao enviada com status ${response?.request?.SituacaoSolicitacao || "Recebido"}.`
      });
      setFormErrors({});
      setForm((current) => buildPostSubmitFormState(current));
      await runLookup(payload.CNPJ, {
        populateLookupPanel: true,
        autofillForm: true,
        useSchoolLookupState: false
      });
    } catch (error) {
      const apiHint = buildApiHint(error);

      setSubmitFeedback({
        type: "error",
        message: apiHint || (error instanceof Error ? error.message : "Falha ao enviar a solicitacao.")
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLookupSubmit(event) {
    event.preventDefault();
    runLookup(hasIdentifiedCnpj ? identifiedCnpj : lookupCnpj, {
      populateLookupPanel: true,
      autofillForm: true,
      useSchoolLookupState: false
    });
  }

  function handleSchoolLookup() {
    runLookup(hasIdentifiedCnpj ? identifiedCnpj : form.CNPJ, {
      populateLookupPanel: true,
      autofillForm: true,
      useSchoolLookupState: true
    });
  }

  function handleUseSchoolInForm() {
    if (!lookupResult) {
      return;
    }

    applyLookupDataToForm(lookupResult, lookupResult.cnpj);
    setSchoolLookupFeedback({
      type: "success",
      message: "Escola e CNPJ aplicados no formulario."
    });
    onSchoolViewChange(VOUCHER_PREVIEW_SCHOOL_VIEW.NEW_REQUEST);
  }

  return (
    <section className="voucher-preview__zone voucher-preview__zone--school">
      <div className="voucher-school__hero">
        <div className="voucher-school__hero-copy">
          <p className="voucher-school__hero-eyebrow">Atendimento SAF | Voucher</p>
          <h3>Uma experiencia mais clara para solicitar e acompanhar vouchers da escola</h3>
          <p className="voucher-school__hero-text">
            Esta pagina foi redesenhada para a escola preencher o pedido com mais conforto, em blocos curtos e com uma
            leitura mais institucional. O envio e a consulta continuam isolados do fluxo principal do produto.
          </p>

          <div className="voucher-school__hero-chips">
            <span className="voucher-school__hero-chip">{schoolDisplayName}</span>
            {hasIdentifiedCnpj ? <span className="voucher-school__hero-chip">{formattedIdentifiedCnpj}</span> : null}
          </div>
        </div>

        <div className="voucher-school__hero-grid">
          <article className="voucher-school__hero-card">
            <span>Nova solicitacao</span>
            <strong>Pedido guiado em blocos</strong>
            <p>Organizamos o envio em etapas leves para a escola informar apenas o que faz sentido em cada caso.</p>
          </article>
          <article className="voucher-school__hero-card">
            <span>Consulta</span>
            <strong>{requestsCount} registro(s) no historico</strong>
            <p>O acompanhamento fica separado, com leitura rapida de status, voucher, validade e principais retornos.</p>
          </article>
        </div>
      </div>

      <div className="voucher-school__mode-switch" role="tablist" aria-label="Subpaginas de solicitacoes de voucher">
        <VoucherModeCard
          eyebrow="Solicitar"
          title="Nova solicitacao"
          description="Preencha os dados da escola, do aluno e do contexto em blocos curtos e mais acolhedores."
          detail="Ideal para abrir um novo pedido com mais clareza."
          isActive={isNewRequestView}
          onClick={() => onSchoolViewChange(VOUCHER_PREVIEW_SCHOOL_VIEW.NEW_REQUEST)}
        />
        <VoucherModeCard
          eyebrow="Acompanhar"
          title="Consultar solicitacao"
          description="Veja o historico do CNPJ, pesquise no retorno e acompanhe o andamento da fila com mais rapidez."
          detail="Ideal para consultar status, validade e codigo do voucher."
          isActive={!isNewRequestView}
          onClick={() => onSchoolViewChange(VOUCHER_PREVIEW_SCHOOL_VIEW.LOOKUP)}
        />
      </div>

      {catalogNotice ? (
        <div className={`voucher-preview__notice is-${catalogNoticeType}`.trim()} role="status">
          {catalogNotice}
        </div>
      ) : null}

      {isNewRequestView ? (
        <VoucherRequestFormSection
          form={form}
          errors={formErrors}
          turmaOptions={turmaOptions}
          isSubmitting={isSubmitting}
          isCnpjLocked={hasIdentifiedCnpj}
          identifiedCnpj={formattedIdentifiedCnpj}
          onFieldChange={updateFormField}
          onSubmit={handleFormSubmit}
          onLookupSchool={handleSchoolLookup}
          isSchoolLookupLoading={isSchoolLookupLoading}
          schoolLookupFeedback={schoolLookupFeedback}
          submitFeedback={submitFeedback}
        />
      ) : (
        <VoucherLookupSection
          lookupCnpj={lookupCnpj}
          lookupFeedback={lookupFeedback}
          lookupResult={lookupResult}
          isLookupLoading={isLookupLoading}
          isCnpjLocked={hasIdentifiedCnpj}
          onLookupCnpjChange={(value) => setLookupCnpj(formatCnpjInput(value))}
          onLookupSubmit={handleLookupSubmit}
          onUseSchoolInForm={handleUseSchoolInForm}
        />
      )}
    </section>
  );
}
