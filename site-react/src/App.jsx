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
import { clampNumber, roundCurrency } from "./lib/formatters";
import LoginScreen from "./components/screens/LoginScreen";
import CatalogUnlockDialog from "./components/dialogs/CatalogUnlockDialog";
import PrincipalFormSection from "./sections/PrincipalFormSection";
import ResultSection from "./sections/ResultSection";
import NovaCompraSection from "./sections/NovaCompraSection";
import ExplanationSection from "./sections/ExplanationSection";
import MessagesSection from "./sections/MessagesSection";
import CatalogSection from "./sections/CatalogSection";

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

  const turmaOptions = catalog.map((item) => ({ value: item.turma, label: item.turma }));
  const principalPearsonAvailability = getPearsonAvailability(catalog, form.principalTurma);
  const novaPearsonAvailability = getPearsonAvailability(catalog, form.novaTurma);
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
    voucherMode: form.principalVoucherMode,
    voucherValue: form.principalVoucherValue,
    voucherApplied: calc.principal.voucherApplied,
    pearsonDiscount: calc.principal.pearsonDiscount,
    jurosCredit: calc.jurosCredit
  });
  const novaFocusRows = buildFocusRows({
    turma: form.novaTurma,
    hasMath: calc.nova.pearsonMath > 0,
    hasScience: calc.nova.pearsonScience > 0,
    voucherMode: form.novaVoucherMode,
    voucherValue: form.novaVoucherValue,
    voucherApplied: calc.nova.voucherApplied,
    pearsonDiscount: calc.nova.pearsonDiscount
  });
  const shouldShowCatalogNotice = isCatalogUnlocked || isCatalogLoading || isCatalogSaving || catalogNoticeType === "error";

  function updateForm(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleNumberChange(key, rawValue) {
    updateForm(key, rawValue === "" ? 0 : Number(rawValue));
  }

  function handleNumberFocus(event) {
    if (Number(event.target.value) === 0) {
      event.target.select();
    }
  }

  async function handleCopy(key, text) {
    try {
      await navigator.clipboard.writeText(text);
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
    setCatalogNotice("Edição liberada. Ao salvar, os novos dados serão usados nos cálculos da calculadora.");
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
    setCatalogNotice("Base restaurada. Clique em salvar para usar esses novos dados nos cálculos da calculadora.");
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
      setCatalogNotice("Dados salvos. Os novos valores serão usados nos cálculos da calculadora.");
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
    <div className="page-frame">
      <div className="top-strip" aria-hidden="true" />
      <div className="app-shell">
        <header className="site-header">
          <div className="site-header__brand">
            <img className="site-header__logo" src={DEFAULT_LOGO_URL} alt="Maple Bear" />
            <span className="site-header__brand-name">Maple Bear</span>
          </div>
          <div className="site-header__actions">
            <a
              className="site-header__cta"
              href="https://seb.operations.dynamics.com/?cmp=mbc&mi=PreOrderListPage"
              target="_blank"
              rel="noreferrer"
              title="Abrir nova troca em outra aba"
              aria-label="Abrir nova troca em outra aba"
            >
              Nova troca
            </a>
            <button className="site-header__secondary" type="button" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </header>

        <section className="page-intro">
          <div className="page-intro__copy">
            <p className="page-intro__eyebrow">Assistente operacional</p>
            <h1>
              <span className="page-intro__title-lock">Assistente de</span>
              <span className="page-intro__title-lock">Troca de Material</span>
            </h1>
            <p className="page-intro__subtitle">
              Ferramenta interna para analisar a troca de material entre o pedido principal e a nova compra.
            </p>
          </div>
          <div className="page-intro__rule">
            <span className="page-intro__rule-title">Regra central</span>
            <ul className="page-intro__rule-list">
              {DISPLAY_RULE_ITEMS.map((item) => (
                <li key={item.label || item.text}>
                  <span className="page-intro__rule-copy">
                    {item.label ? <strong className="page-intro__rule-label">{item.label}:</strong> : null}
                    {item.label ? " " : null}
                    <span className="page-intro__rule-text">{item.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <main className="page-grid">
          <PrincipalFormSection
            form={form}
            turmaOptions={turmaOptions}
            principalPearsonAvailability={principalPearsonAvailability}
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
            novaFocusRows={novaFocusRows}
            calc={calc}
            updateForm={updateForm}
            handleNumberChange={handleNumberChange}
            handleNumberFocus={handleNumberFocus}
          />
          <ExplanationSection calc={calc} />
          <MessagesSection calc={calc} copiedKey={copiedKey} onCopy={handleCopy} />
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
        </main>

        <footer className="page-credit" aria-label="Credito de desenvolvimento">
          Desenvolvido por Tatiane Xavier · Março/2026
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
      </div>
    </div>
  );
}
