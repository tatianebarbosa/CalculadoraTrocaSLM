import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_LOGO_URL } from "../../config/appConfig";
import VoucherSafPanel from "./VoucherSafPanel";
import VoucherSchoolWorkspace from "./VoucherSchoolWorkspace";
import {
  getVoucherPreviewLocationState,
  navigateVoucherPreview,
  VOUCHER_PREVIEW_PRIMARY_VIEW,
  VOUCHER_PREVIEW_SCHOOL_VIEW
} from "../lib/voucherPreviewRoutes";

const PAGE_COPY = {
  [VOUCHER_PREVIEW_PRIMARY_VIEW.SCHOOL]: {
    eyebrow: "Voucher | Solicitacoes",
    title: "Solicite vouchers com mais clareza e acompanhe cada retorno",
    subtitle:
      "Uma experiencia isolada e mais amigavel para a escola abrir pedidos, consultar o historico e acompanhar devolutivas com seguranca."
  },
  [VOUCHER_PREVIEW_PRIMARY_VIEW.SAF]: {
    eyebrow: "Voucher | Painel SAF",
    title: "Triagem, analise e conteudo operacional em uma pagina interna exclusiva",
    subtitle:
      "O time SAF acessa uma view separada para tratar a fila, atualizar a planilha e gerar mensagens, titulos e codigos sem misturar esse fluxo com a experiencia da escola."
  }
};

function VoucherMenuItem({ label, description, isActive, onClick }) {
  return (
    <button
      className={`voucher-preview__menu-item ${isActive ? "is-active" : ""}`.trim()}
      type="button"
      onClick={onClick}
    >
      <strong>{label}</strong>
      <span>{description}</span>
    </button>
  );
}

export default function VoucherPreviewWorkspace({
  environmentLabel,
  identifiedCnpj,
  identifiedSchoolName,
  onIdentifiedSchoolNameChange,
  onLogout
}) {
  const [locationState, setLocationState] = useState(() => getVoucherPreviewLocationState());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const pageCopy = PAGE_COPY[locationState.primaryView];

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    if (!window.location.hash) {
      navigateVoucherPreview(VOUCHER_PREVIEW_PRIMARY_VIEW.SCHOOL, VOUCHER_PREVIEW_SCHOOL_VIEW.NEW_REQUEST);
    }

    function syncLocation() {
      setLocationState(getVoucherPreviewLocationState());
    }

    syncLocation();
    window.addEventListener("hashchange", syncLocation);

    return () => {
      window.removeEventListener("hashchange", syncLocation);
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const activeLabel = useMemo(() => {
    return locationState.primaryView === VOUCHER_PREVIEW_PRIMARY_VIEW.SAF ? "Painel SAF" : "Solicitacoes";
  }, [locationState.primaryView]);

  function handleNavigate(primaryView, schoolView) {
    navigateVoucherPreview(primaryView, schoolView);
    setIsMenuOpen(false);
  }

  return (
    <div className="page-frame voucher-preview">
      <div className="top-strip" aria-hidden="true" />
      <div className="app-shell voucher-preview__shell">
        <header className="site-header voucher-preview__header">
          <div className="site-header__brand">
            <img className="site-header__logo" src={DEFAULT_LOGO_URL} alt="Maple Bear" />
            <span className="site-header__brand-name">Maple Bear</span>
          </div>

          <div className="voucher-preview__header-nav">
            <div ref={menuRef} className={`voucher-preview__menu ${isMenuOpen ? "is-open" : ""}`.trim()}>
              <button
                className="voucher-preview__menu-trigger"
                type="button"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((current) => !current)}
              >
                <span>Voucher</span>
                <strong>{activeLabel}</strong>
              </button>

              {isMenuOpen ? (
                <div className="voucher-preview__menu-popover" role="menu" aria-label="Navegacao do modulo voucher">
                  <VoucherMenuItem
                    label="Painel SAF"
                    description="Fila interna, analise e retorno operacional."
                    isActive={locationState.primaryView === VOUCHER_PREVIEW_PRIMARY_VIEW.SAF}
                    onClick={() => handleNavigate(VOUCHER_PREVIEW_PRIMARY_VIEW.SAF)}
                  />
                  <VoucherMenuItem
                    label="Solicitacoes"
                    description="Nova solicitacao e consulta do historico."
                    isActive={locationState.primaryView === VOUCHER_PREVIEW_PRIMARY_VIEW.SCHOOL}
                    onClick={() =>
                      handleNavigate(VOUCHER_PREVIEW_PRIMARY_VIEW.SCHOOL, locationState.schoolView)
                    }
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="site-header__actions">
            <span className="voucher-preview__environment-chip">{environmentLabel}</span>
            <button className="site-header__secondary" type="button" onClick={onLogout}>
              Sair
            </button>
          </div>
        </header>

        <section className={`voucher-preview__hero voucher-preview__hero--${locationState.primaryView}`.trim()}>
          <div className="voucher-preview__hero-copy">
            <p className="page-intro__eyebrow">{pageCopy.eyebrow}</p>
            <h1 className="voucher-preview__title">{pageCopy.title}</h1>
            <p className="voucher-preview__subtitle">{pageCopy.subtitle}</p>
          </div>
        </section>

        {locationState.primaryView === VOUCHER_PREVIEW_PRIMARY_VIEW.SAF ? (
          <VoucherSafPanel />
        ) : (
          <VoucherSchoolWorkspace
            identifiedCnpj={identifiedCnpj}
            identifiedSchoolName={identifiedSchoolName}
            schoolView={locationState.schoolView}
            onIdentifiedSchoolNameChange={onIdentifiedSchoolNameChange}
            onSchoolViewChange={(nextSchoolView) =>
              handleNavigate(VOUCHER_PREVIEW_PRIMARY_VIEW.SCHOOL, nextSchoolView)
            }
          />
        )}

        <footer className="page-credit">Modulo de voucher isolado para escolas e SAF | Marco/2026</footer>
      </div>
    </div>
  );
}
