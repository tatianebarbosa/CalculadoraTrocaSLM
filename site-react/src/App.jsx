import { useEffect, useState } from "react";
import {
  ACCESS_CODE,
  COPY_FEEDBACK_MS,
  DEFAULT_FORM,
  DEFAULT_LOGO_URL,
  DISPLAY_RULE_ITEMS,
  LIVE_CATALOG_NOTICE,
  PUBLISHED_CATALOG_NOTICE
} from "./config/appConfig";
import {
  canWriteCatalog,
  clearStoredAccess,
  getDefaultCatalog,
  hasStoredAccess,
  requestSharedCatalog,
  storeAccessForOneWeek
} from "./lib/catalogApi";
import { buildFocusRows, calculateExchange, getPearsonAvailability } from "./lib/exchangeCalculator";
import { clampNumber, formatMoney, roundCurrency } from "./lib/formatters";
import {
  ensureSimulationUsageTracked,
  getCurrentWeekUsageFilters,
  getDefaultUsageFilters,
  getTodayUsageFilters,
  getUsageReport,
  trackUsageEvent,
  USAGE_EVENT_TYPES
} from "./lib/usageAnalytics";
import LoginScreen from "./components/screens/LoginScreen";
import CatalogUnlockDialog from "./components/dialogs/CatalogUnlockDialog";
import UsageDialog from "./components/dialogs/UsageDialog";
import PrincipalFormSection from "./sections/PrincipalFormSection";
import ResultSection from "./sections/ResultSection";
import NovaCompraSection from "./sections/NovaCompraSection";
import ExplanationSection from "./sections/ExplanationSection";
import MessagesSection from "./sections/MessagesSection";
import CatalogSection from "./sections/CatalogSection";

const ERP_PREORDER_URL = "https://seb.operations.dynamics.com/?cmp=mbc&mi=PreOrderListPage";

function getPearsonValues(item) {
  return {
    math: clampNumber(item?.pearsonMath, 0),
    science: clampNumber(item?.pearsonScience, 0)
  };
}

function buildTurmaOptionMeta(item) {
  return formatMoney(item.slm);
}

// Fluxo principal: autenticação, cálculo da troca e edição controlada da base.
export default function App() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [catalog, setCatalog] = useState(() => getDefaultCatalog());
  const [savedCatalog, setSavedCatalog] = useState(() => getDefaultCatalog());
  const [copiedKey, setCopiedKey] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(() => hasStoredAccess());
  const [isCatalogUnlocked, setIsCatalogUnlocked] = useState(false);
  const [catalogUnlockCode, setCatalogUnlockCode] = useState("");
  const [catalogUnlockError, setCatalogUnlockError] = useState("");
  const [isCatalogUnlockDialogOpen, setIsCatalogUnlockDialogOpen] = useState(false);
  const [catalogNotice, setCatalogNotice] = useState("");
  const [catalogNoticeType, setCatalogNoticeType] = useState("info");
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [isCatalogSaving, setIsCatalogSaving] = useState(false);
  const [isUsageDialogOpen, setIsUsageDialogOpen] = useState(false);
  const [usageFilters, setUsageFilters] = useState(() => getDefaultUsageFilters());
  const [usageReport, setUsageReport] = useState(() => getUsageReport(getDefaultUsageFilters()));
  const [usageRevision, setUsageRevision] = useState(0);
  const catalogCanBeEdited = canWriteCatalog();

  useEffect(() => {
    let isCancelled = false;

    async function loadSharedCatalog() {
      setIsCatalogLoading(true);
      setCatalogNotice("Carregando os dados da base...");
      setCatalogNoticeType("info");

      try {
        const sharedCatalog = await requestSharedCatalog();
        if (isCancelled) {
          return;
        }

        setCatalog(sharedCatalog);
        setSavedCatalog(sharedCatalog);
        setCatalogNotice(catalogCanBeEdited ? LIVE_CATALOG_NOTICE : PUBLISHED_CATALOG_NOTICE);
        setCatalogNoticeType("success");
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setCatalogNotice(error instanceof Error ? error.message : "Falha ao carregar os dados da base.");
        setCatalogNoticeType("error");
      } finally {
        if (!isCancelled) {
          setIsCatalogLoading(false);
        }
      }
    }

    loadSharedCatalog();

    return () => {
      isCancelled = true;
    };
  }, [catalogCanBeEdited]);

  useEffect(() => {
    setUsageReport(getUsageReport(usageFilters));
  }, [usageFilters, usageRevision]);

  const turmaOptions = catalog.map((item) => ({
    value: item.turma,
    label: item.turma,
    meta: buildTurmaOptionMeta(item)
  }));
  const principalCatalogItem = catalog.find((item) => item.turma === form.principalTurma) ?? null;
  const novaCatalogItem = catalog.find((item) => item.turma === form.novaTurma) ?? null;
  const principalPearsonAvailability = getPearsonAvailability(catalog, form.principalTurma);
  const novaPearsonAvailability = getPearsonAvailability(catalog, form.novaTurma);
  const principalPearsonValues = getPearsonValues(principalCatalogItem);
  const novaPearsonValues = getPearsonValues(novaCatalogItem);
  const calc = calculateExchange(form, catalog);

  useEffect(() => {
    setForm((current) => {
      const nextState = {};

      if (current.principalPearsonMath && !principalPearsonAvailability.math) {
        nextState.principalPearsonMath = false;
      }

      if (current.principalPearsonScience && !principalPearsonAvailability.science) {
        nextState.principalPearsonScience = false;
      }

      if (current.novaPearsonMath && !novaPearsonAvailability.math) {
        nextState.novaPearsonMath = false;
      }

      if (current.novaPearsonScience && !novaPearsonAvailability.science) {
        nextState.novaPearsonScience = false;
      }

      return Object.keys(nextState).length ? { ...current, ...nextState } : current;
    });
  }, [
    principalPearsonAvailability.math,
    principalPearsonAvailability.science,
    novaPearsonAvailability.math,
    novaPearsonAvailability.science
  ]);

  const principalFocusRows = buildFocusRows({
    turma: form.principalTurma,
    hasMath: calc.principal.pearsonMath > 0,
    hasScience: calc.principal.pearsonScience > 0,
    pearsonMathValue: calc.principal.pearsonMath,
    pearsonScienceValue: calc.principal.pearsonScience,
    voucherMode: form.principalVoucherMode,
    voucherValue: form.principalVoucherValue,
    voucherApplied: calc.principal.voucherApplied,
    pearsonDiscount: calc.principal.pearsonDiscount,
    hasJuros: calc.hasJuros,
    useRealPaidAmount: calc.principalCreditIsManual,
    showVoucherRow: false
  });
  const novaFocusRows = buildFocusRows({
    turma: form.novaTurma,
    hasMath: calc.nova.pearsonMath > 0,
    hasScience: calc.nova.pearsonScience > 0,
    pearsonMathValue: calc.nova.pearsonMath,
    pearsonScienceValue: calc.nova.pearsonScience,
    voucherMode: form.novaVoucherMode,
    voucherValue: form.novaVoucherValue,
    voucherApplied: calc.nova.voucherApplied,
    pearsonDiscount: calc.nova.pearsonDiscount
  });
  const shouldShowCatalogNotice = isCatalogUnlocked || isCatalogLoading || isCatalogSaving || catalogNoticeType === "error";

  function updateForm(key, value) {
    if (ensureSimulationUsageTracked()) {
      setUsageRevision((current) => current + 1);
    }

    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function parseNumericInput(rawValue) {
    if (rawValue === "") {
      return 0;
    }

    const normalizedValue = String(rawValue)
      .trim()
      .replace(/\s+/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");

    const parsedValue = Number(normalizedValue);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  function handleNumberChange(key, rawValue) {
    updateForm(key, parseNumericInput(rawValue));
  }

  function handleNumberFocus(event) {
    if (Number(event.target.value) === 0) {
      event.target.select();
    }
  }

  async function handleCopy(key, text) {
    try {
      await navigator.clipboard.writeText(text);
      trackUsageEvent(USAGE_EVENT_TYPES.MESSAGE_COPIED);
      setUsageRevision((current) => current + 1);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? "" : current));
      }, COPY_FEEDBACK_MS);
    } catch {
      setCopiedKey("");
    }
  }

  function handleAccessCodeChange(value) {
    setAccessCode(value);
    if (loginError) {
      setLoginError("");
    }
  }

  function handleLoginSubmit(event) {
    event.preventDefault();

    if (accessCode.trim() === ACCESS_CODE) {
      storeAccessForOneWeek();
      trackUsageEvent(USAGE_EVENT_TYPES.LOGIN_SUCCESS);
      setUsageRevision((current) => current + 1);
      setIsAuthenticated(true);
      setLoginError("");
      setAccessCode("");
      return;
    }

    setLoginError("Código inválido. Verifique e tente novamente.");
  }

  function handleCatalogUnlockOpen() {
    if (!catalogCanBeEdited) {
      return;
    }

    setCatalogUnlockCode("");
    setCatalogUnlockError("");
    setIsCatalogUnlockDialogOpen(true);
  }

  function handleCatalogUnlockClose() {
    setCatalogUnlockCode("");
    setCatalogUnlockError("");
    setIsCatalogUnlockDialogOpen(false);
  }

  function handleCatalogUnlockCodeChange(value) {
    setCatalogUnlockCode(value);
    if (catalogUnlockError) {
      setCatalogUnlockError("");
    }
  }

  function handleCatalogUnlockSubmit(event) {
    event.preventDefault();

    if (!catalogCanBeEdited) {
      setCatalogUnlockError("A versão publicada está em modo somente leitura.");
      return;
    }

    if (catalogUnlockCode.trim() !== ACCESS_CODE) {
      setCatalogUnlockError("Código inválido. Verifique e tente novamente.");
      return;
    }

    setIsCatalogUnlocked(true);
    handleCatalogUnlockClose();
    setCatalogNotice("Edição liberada. Ao salvar, os novos dados passarão a ser usados nos cálculos.");
    setCatalogNoticeType("info");
  }

  function handleCatalogValueChange(turma, field, rawValue) {
    const nextValue = rawValue === "" ? 0 : roundCurrency(clampNumber(rawValue, 0));

    setCatalog((current) =>
      current.map((item) => (item.turma === turma ? { ...item, [field]: nextValue } : item))
    );
  }

  function handleCatalogReset() {
    if (!catalogCanBeEdited) {
      return;
    }

    if (!window.confirm("Restaurar os valores padrão da base interna?")) {
      return;
    }

    setCatalog(getDefaultCatalog());
    setCatalogNotice("Base restaurada. Clique em salvar para aplicar esses valores nos cálculos.");
    setCatalogNoticeType("info");
  }

  async function handleCatalogSave() {
    if (!catalogCanBeEdited) {
      return;
    }

    setIsCatalogSaving(true);
    setCatalogNotice("Salvando os novos dados...");
    setCatalogNoticeType("info");

    try {
      const sharedCatalog = await requestSharedCatalog("PUT", catalog);
      setCatalog(sharedCatalog);
      setSavedCatalog(sharedCatalog);
      setCatalogNotice("Dados salvos. Os novos valores já estão sendo usados nos cálculos.");
      setCatalogNoticeType("success");
    } catch (error) {
      setCatalogNotice(error instanceof Error ? error.message : "Falha ao salvar os novos dados.");
      setCatalogNoticeType("error");
    } finally {
      setIsCatalogSaving(false);
    }
  }

  function handleCatalogLock() {
    if (!catalogCanBeEdited) {
      setIsCatalogUnlocked(false);
      return;
    }

    setCatalog(savedCatalog);
    setIsCatalogUnlocked(false);
    setCatalogNotice("Edição cancelada. Os cálculos voltaram aos últimos dados salvos.");
    setCatalogNoticeType("info");
  }

  function handleLogout() {
    clearStoredAccess();
    setIsAuthenticated(false);
    setAccessCode("");
    setLoginError("");
    handleCatalogUnlockClose();
    handleCatalogLock();
  }

  function handleUsageDialogOpen() {
    setUsageRevision((current) => current + 1);
    setIsUsageDialogOpen(true);
  }

  function handleUsageDialogClose() {
    setIsUsageDialogOpen(false);
  }

  function handleUsageFilterChange(key, value) {
    setUsageFilters((current) => {
      const nextFilters = {
        ...current,
        [key]: value
      };

      if (nextFilters.startDate && nextFilters.endDate && nextFilters.startDate > nextFilters.endDate) {
        if (key === "startDate") {
          nextFilters.endDate = value;
        } else {
          nextFilters.startDate = value;
        }
      }

      return nextFilters;
    });
  }

  function handleUsageFiltersReset() {
    setUsageFilters(getDefaultUsageFilters());
  }

  function handleUsageCurrentWeek() {
    setUsageFilters(getCurrentWeekUsageFilters());
  }

  function handleUsageToday() {
    setUsageFilters(getTodayUsageFilters());
  }

  function handleErpOpen() {
    trackUsageEvent(USAGE_EVENT_TYPES.ERP_OPENED);
    setUsageRevision((current) => current + 1);
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        logoUrl={DEFAULT_LOGO_URL}
        accessCode={accessCode}
        onAccessCodeChange={handleAccessCodeChange}
        onSubmit={handleLoginSubmit}
        errorMessage={loginError}
      />
    );
  }

  return (
    <div className="page-frame" id="top">
      <div className="top-strip" aria-hidden="true" />
      <div className="app-shell">
        <header className="site-header">
          <div className="site-header__inner">
            <div className="site-header__brand-block">
              <div className="site-header__brand">
                <img className="site-header__logo" src={DEFAULT_LOGO_URL} alt="Logo SAF" />
              </div>

              <nav className="site-header__nav" aria-label="Navegação principal">
                <a className="site-header__nav-link is-active" href="#top">
                  Simulação
                </a>
                <a className="site-header__nav-link" href="#mensagens">
                  Mensagens
                </a>
                <a className="site-header__nav-link" href="#base">
                  Base
                </a>
                <button className="site-header__nav-button" type="button" onClick={handleUsageDialogOpen}>
                  Uso do site
                </button>
              </nav>
            </div>

            <div className="site-header__actions">
              <a
                className="site-header__cta"
                href={ERP_PREORDER_URL}
                target="_blank"
                rel="noreferrer"
                title="Abrir nova troca em outra aba"
                aria-label="Abrir nova troca em outra aba"
                onClick={handleErpOpen}
              >
                Nova troca
              </a>

              <button className="site-header__secondary" type="button" onClick={handleLogout}>
                Sair
              </button>
            </div>
          </div>
        </header>

        <section className="page-hero">
          <div className="page-hero__content">
            <p className="page-hero__eyebrow">Assistente operacional</p>
            <h1 className="page-hero__title">Análise de Troca SLM</h1>
            <p className="page-hero__subtitle">
              Canal interno para comparar o pedido principal e a nova compra, validar voucher, Pearson e juros e orientar a decisão operacional.
            </p>
          </div>
        </section>

        <main className="workspace-layout">
          <section className="workspace-main" aria-label="Área principal da simulação">
            <div className="workspace-primary-grid">
              <PrincipalFormSection
                form={form}
                turmaOptions={turmaOptions}
                principalPearsonAvailability={principalPearsonAvailability}
                principalPearsonValues={principalPearsonValues}
                principalFocusRows={principalFocusRows}
                calc={calc}
                updateForm={updateForm}
                handleNumberChange={handleNumberChange}
                handleNumberFocus={handleNumberFocus}
              />
              <ResultSection calc={calc} />
              <NovaCompraSection
                form={form}
                turmaOptions={turmaOptions}
                novaPearsonAvailability={novaPearsonAvailability}
                novaPearsonValues={novaPearsonValues}
                novaFocusRows={novaFocusRows}
                calc={calc}
                updateForm={updateForm}
                handleNumberChange={handleNumberChange}
                handleNumberFocus={handleNumberFocus}
              />
            </div>
          </section>

          <div className="workspace-full">
            <MessagesSection calc={calc} copiedKey={copiedKey} onCopy={handleCopy} />
          </div>

          <aside className="workspace-sidebar" aria-label="Contexto e apoio da simulação">
            <div className="workspace-sidebar__support-grid">
              <section className="panel panel--context panel--rules">
                <div className="section-title">
                  <div>
                    <p className="section-title__eyebrow">Regras da análise</p>
                    <h3>Critérios operacionais</h3>
                  </div>
                </div>

                <ul className="context-list">
                  {DISPLAY_RULE_ITEMS.map((item) => (
                    <li key={item.label || item.text}>{item.text}</li>
                  ))}
                </ul>
              </section>

              <ExplanationSection calc={calc} />
            </div>
          </aside>

          <div className="workspace-full">
            <CatalogSection
              catalog={catalog}
              canEditCatalog={catalogCanBeEdited}
              isCatalogUnlocked={isCatalogUnlocked}
              isCatalogLoading={isCatalogLoading}
              isCatalogSaving={isCatalogSaving}
              catalogNotice={catalogNotice}
              catalogNoticeType={catalogNoticeType}
              shouldShowCatalogNotice={shouldShowCatalogNotice}
              onUnlockOpen={handleCatalogUnlockOpen}
              onSave={handleCatalogSave}
              onReset={handleCatalogReset}
              onLock={handleCatalogLock}
              onValueChange={handleCatalogValueChange}
            />
          </div>
        </main>

        <footer className="page-credit" aria-label="Crédito de desenvolvimento">
          Desenvolvido por Tatiane Xavier | Mar/2026
        </footer>

        {isCatalogUnlockDialogOpen ? (
          <CatalogUnlockDialog
            accessCode={catalogUnlockCode}
            onAccessCodeChange={handleCatalogUnlockCodeChange}
            onSubmit={handleCatalogUnlockSubmit}
            onClose={handleCatalogUnlockClose}
            errorMessage={catalogUnlockError}
          />
        ) : null}

        {isUsageDialogOpen ? (
          <UsageDialog
            filters={usageFilters}
            report={usageReport}
            onFilterChange={handleUsageFilterChange}
            onApplyCurrentWeek={handleUsageCurrentWeek}
            onApplyToday={handleUsageToday}
            onResetFilters={handleUsageFiltersReset}
            onClose={handleUsageDialogClose}
          />
        ) : null}
      </div>
    </div>
  );
}
