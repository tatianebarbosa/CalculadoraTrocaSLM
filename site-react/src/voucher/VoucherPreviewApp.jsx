import { useState } from "react";
import { ACCESS_DURATION_MS, DEFAULT_LOGO_URL } from "../config/appConfig";
import VoucherPreviewWorkspace from "./components/VoucherPreviewWorkspace";
import { formatCnpjInput, normalizeCnpj } from "./lib/voucherSchoolForm";
import { lookupVoucherRequestsByCnpj } from "./lib/voucherPreviewApi";
import {
  VOUCHER_PREVIEW_ACCESS_STORAGE_KEY,
  VOUCHER_PREVIEW_ENABLED,
  VOUCHER_PREVIEW_ENVIRONMENT_LABEL
} from "./voucherPreviewConfig";

function normalizeSchoolName(value) {
  return String(value ?? "").trim();
}

function getIdentifiedSchoolNameFromLocation() {
  if (typeof window === "undefined") {
    return "";
  }

  const searchParams = new URLSearchParams(window.location.search);
  return normalizeSchoolName(
    searchParams.get("schoolName") || searchParams.get("school") || searchParams.get("escola") || ""
  );
}

function readPreviewAccessSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(VOUCHER_PREVIEW_ACCESS_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    if (typeof parsedValue?.expiresAt !== "number") {
      window.localStorage.removeItem(VOUCHER_PREVIEW_ACCESS_STORAGE_KEY);
      return null;
    }

    if (Date.now() > parsedValue.expiresAt) {
      window.localStorage.removeItem(VOUCHER_PREVIEW_ACCESS_STORAGE_KEY);
      return null;
    }

    const identifiedCnpj = normalizeCnpj(parsedValue?.identifiedCnpj || "");
    const identifiedSchoolName = normalizeSchoolName(
      parsedValue?.identifiedSchoolName || getIdentifiedSchoolNameFromLocation()
    );

    return {
      expiresAt: parsedValue.expiresAt,
      identifiedCnpj,
      identifiedSchoolName
    };
  } catch {
    window.localStorage.removeItem(VOUCHER_PREVIEW_ACCESS_STORAGE_KEY);
    return null;
  }
}

function storePreviewAccess(session) {
  if (typeof window === "undefined") {
    return;
  }

  const expiresAt =
    typeof session?.expiresAt === "number" && Number.isFinite(session.expiresAt)
      ? session.expiresAt
      : Date.now() + ACCESS_DURATION_MS;

  window.localStorage.setItem(
    VOUCHER_PREVIEW_ACCESS_STORAGE_KEY,
    JSON.stringify({
      expiresAt,
      identifiedCnpj: normalizeCnpj(session?.identifiedCnpj),
      identifiedSchoolName: normalizeSchoolName(session?.identifiedSchoolName)
    })
  );
}

function clearPreviewAccess() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(VOUCHER_PREVIEW_ACCESS_STORAGE_KEY);
}

function VoucherPreviewLogin({ cnpj, errorMessage, isSubmitting, onCnpjChange, onSubmit }) {
  return (
    <div className="page-frame voucher-preview voucher-preview--locked">
      <div className="top-strip" aria-hidden="true" />
      <div className="app-shell app-shell--login">
        <main className="login-layout">
          <section className="login-hero">
            <div className="login-hero__brand site-header__brand">
              <img className="site-header__logo" src={DEFAULT_LOGO_URL} alt="" aria-hidden="true" />
              <span className="site-header__brand-name">Maple Bear</span>
            </div>
            <p className="page-intro__eyebrow">Preview isolado</p>
            <h1>
              <span>Modulo de</span>
              <span>Voucher</span>
            </h1>
            <p className="page-intro__subtitle">
              Ambiente separado para validar a experiencia de voucher sem tocar no fluxo atual em producao.
            </p>
          </section>

          <section className="login-card">
            <span className="login-card__eyebrow">Acesso restrito</span>
            <h2>Entrar no preview</h2>
            <p className="login-card__intro">
              Informe o CNPJ para identificar o acesso ao modulo isolado.
            </p>

            <form className="login-form" name="voucher-preview-login" autoComplete="on" onSubmit={onSubmit}>
              <label className="field" htmlFor="voucher-preview-cnpj">
                <input
                  className="login-form__input"
                  id="voucher-preview-cnpj"
                  name="voucher-preview-cnpj"
                  type="text"
                  inputMode="numeric"
                  value={cnpj}
                  onChange={(event) => onCnpjChange(event.target.value)}
                  placeholder="Digite o CNPJ"
                  autoComplete="organization"
                  autoFocus
                />
              </label>

              {errorMessage ? <p className="login-card__feedback is-error">{errorMessage}</p> : null}

              <button
                className="login-card__submit"
                type="submit"
                disabled={normalizeCnpj(cnpj).length !== 14 || isSubmitting}
              >
                {isSubmitting ? "Validando acesso..." : "Entrar no preview"}
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}

function VoucherPreviewUnavailable() {
  return (
    <div className="page-frame voucher-preview voucher-preview--locked">
      <div className="top-strip" aria-hidden="true" />
      <div className="app-shell voucher-preview__shell">
        <main className="voucher-preview__locked-layout">
          <section className="voucher-preview__locked-card">
            <span className="voucher-preview__locked-badge">Nao ativo</span>
            <h1>Modulo de voucher isolado e desligado neste ambiente.</h1>
            <p>
              A rota foi preparada para desenvolvimento e preview, sem substituir a calculadora atual e sem ativacao
              publica por padrao.
            </p>
            <p>
              Para liberar testes fora do modo `dev`, habilite `VITE_ENABLE_VOUCHER_PREVIEW=true` apenas no ambiente
              de preview.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

export default function VoucherPreviewApp() {
  const [session, setSession] = useState(() => readPreviewAccessSession());
  const [cnpj, setCnpj] = useState(() => formatCnpjInput(session?.identifiedCnpj || ""));
  const [loginError, setLoginError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(session));
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  function handleCnpjChange(value) {
    setCnpj(formatCnpjInput(value));
    if (loginError) {
      setLoginError("");
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();

    if (normalizeCnpj(cnpj).length !== 14) {
      setLoginError("Informe um CNPJ valido para continuar.");
      return;
    }

    const normalizedCnpj = normalizeCnpj(cnpj);
    const schoolNameFromLocation = getIdentifiedSchoolNameFromLocation();

    setIsLoggingIn(true);

    try {
      let identifiedSchoolName = schoolNameFromLocation;

      if (!identifiedSchoolName) {
        try {
          const lookupData = await lookupVoucherRequestsByCnpj(normalizedCnpj);
          identifiedSchoolName = normalizeSchoolName(lookupData?.school?.displayName);
        } catch {
          identifiedSchoolName = "";
        }
      }

      const nextSession = {
        expiresAt: Date.now() + ACCESS_DURATION_MS,
        identifiedCnpj: normalizedCnpj,
        identifiedSchoolName
      };

      storePreviewAccess(nextSession);
      setSession(nextSession);
      setIsAuthenticated(true);
      setLoginError("");
      setCnpj(formatCnpjInput(nextSession.identifiedCnpj));
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleLogout() {
    clearPreviewAccess();
    setSession(null);
    setIsAuthenticated(false);
    setCnpj("");
    setLoginError("");
    setIsLoggingIn(false);
  }

  function handleIdentifiedSchoolNameChange(nextSchoolName) {
    const normalizedSchoolName = normalizeSchoolName(nextSchoolName);

    setSession((current) => {
      if (!current || current.identifiedSchoolName === normalizedSchoolName) {
        return current;
      }

      const nextSession = {
        ...current,
        expiresAt: Date.now() + ACCESS_DURATION_MS,
        identifiedSchoolName: normalizedSchoolName
      };

      storePreviewAccess(nextSession);
      return nextSession;
    });
  }

  if (!VOUCHER_PREVIEW_ENABLED) {
    return <VoucherPreviewUnavailable />;
  }

  if (!isAuthenticated) {
    return (
      <VoucherPreviewLogin
        cnpj={cnpj}
        errorMessage={loginError}
        isSubmitting={isLoggingIn}
        onCnpjChange={handleCnpjChange}
        onSubmit={handleLoginSubmit}
      />
    );
  }

  return (
    <VoucherPreviewWorkspace
      environmentLabel={VOUCHER_PREVIEW_ENVIRONMENT_LABEL}
      identifiedCnpj={session?.identifiedCnpj || ""}
      identifiedSchoolName={session?.identifiedSchoolName || ""}
      onIdentifiedSchoolNameChange={handleIdentifiedSchoolNameChange}
      onLogout={handleLogout}
    />
  );
}
