const runtimeEnv = import.meta.env;
const customCatalogApiUrl =
  typeof runtimeEnv.VITE_CATALOG_API_URL === "string" ? runtimeEnv.VITE_CATALOG_API_URL.trim() : "";
const rawCatalogSourceMode =
  typeof runtimeEnv.VITE_CATALOG_SOURCE === "string" ? runtimeEnv.VITE_CATALOG_SOURCE.trim().toLowerCase() : "";

// Ajustes centrais da calculadora.
export const PEARSON_ORDER_DISCOUNT = 44;
export const COPY_FEEDBACK_MS = 1600;
// Controle visual para ambiente interno/restrito. Nao tratar este codigo como camada de seguranca.
export const ACCESS_CODE = "SAF2026@";
export const ACCESS_STORAGE_KEY = "troca-saf-login";
export const ACCESS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
export const DEFAULT_LOGO_URL = `${runtimeEnv.BASE_URL}SAFLOGO.png`;
export const CATALOG_STATIC_ENDPOINT = `${runtimeEnv.BASE_URL}catalog.json`;
export const CATALOG_API_ENDPOINT = customCatalogApiUrl || "/api/base-catalog";
export const HAS_CUSTOM_CATALOG_API = customCatalogApiUrl !== "";
export const CATALOG_SOURCE_MODE = ["api", "static", "auto"].includes(rawCatalogSourceMode)
  ? rawCatalogSourceMode
  : "auto";
export const CATALOG_WRITE_ENABLED = runtimeEnv.DEV || runtimeEnv.VITE_ENABLE_CATALOG_WRITE === "true";
export const PUBLISHED_CATALOG_NOTICE = "";
export const LIVE_CATALOG_NOTICE =
  "Dados carregados. Os novos valores serao usados nos calculos da calculadora.";

export const RULE_TEXT =
  "A análise compara o valor pago no pedido principal com o valor da nova compra, considerando SLM, workbook, Matemática Aplicada e Pearson, quando houver. O voucher é aplicado somente sobre o valor do SLM base. Aviso: neste momento, quando houver juros no pedido principal, a troca não pode seguir. A loja está reembolsando esse valor indevidamente, o que gera sobra na loja. Se sobrar valor na loja, a troca não pode seguir. Se faltar valor, a troca pode seguir com pagamento da diferença.";

export const JUROS_WARNING_TEXT =
  "Juros geram sobra de valor na loja e impedem a troca do material.";

export const DISPLAY_RULE_ITEMS = [
  {
    label: "",
    text: "A análise compara o valor pago no pedido principal com o valor da nova compra, considerando SLM, workbook, Matemática Aplicada e Pearson, quando houver."
  },
  {
    label: "",
    text: "O voucher é aplicado somente sobre o valor do SLM base."
  },
  {
    label: "",
    text: "Aviso: neste momento, quando houver juros no pedido principal, a troca não pode seguir. A loja está reembolsando esse valor indevidamente, o que gera sobra na loja."
  },
  {
    label: "",
    text: "Se sobrar valor na loja, a troca não pode seguir."
  },
  {
    label: "",
    text: "Se faltar valor, a troca pode seguir com pagamento da diferença."
  }
];

export const DEFAULT_FORM = {
  principalTurma: "Year 3",
  principalPearsonMath: false,
  principalPearsonScience: false,
  principalVoucherMode: "currency",
  principalVoucherValue: 0,
  jurosValor: 0,
  novaTurma: "Senior Kindergarten",
  novaPearsonMath: false,
  novaPearsonScience: false,
  novaVoucherMode: "currency",
  novaVoucherValue: 0
};

export const PEARSON_HINT_TEXT =
  "Quando Pearson for adquirido junto com o SLM, será considerado desconto de R$ 44 por Pearson selecionado.";

export const BOOLEAN_OPTIONS = [
  { label: "Não", value: false },
  { label: "Sim", value: true }
];

export const VOUCHER_MODE_OPTIONS = [
  { label: "%", value: "percent" },
  { label: "R$", value: "currency" }
];

export const EDITABLE_CATALOG_FIELDS = [
  { key: "slm", label: "SLM base" },
  { key: "workbook", label: "Workbook" },
  { key: "matematica", label: "Matemática Aplicada" },
  { key: "pearsonMath", label: "Pearson Math" },
  { key: "pearsonScience", label: "Pearson Science" }
];
