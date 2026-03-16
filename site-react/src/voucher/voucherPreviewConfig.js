const runtimeEnv = import.meta.env;

export const VOUCHER_PREVIEW_ENABLED = runtimeEnv.DEV || runtimeEnv.VITE_ENABLE_VOUCHER_PREVIEW === "true";
export const VOUCHER_PREVIEW_ACCESS_STORAGE_KEY = "troca-saf-voucher-preview-login";
export const VOUCHER_PREVIEW_ENVIRONMENT_LABEL = runtimeEnv.DEV ? "DEV" : "PREVIEW";
