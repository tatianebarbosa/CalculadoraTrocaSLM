import { notFound } from "./http.mjs";

export function isVoucherPreviewApiEnabled() {
  const vercelEnvironment = String(process.env.VERCEL_ENV || "").trim().toLowerCase();
  const featureFlag = String(process.env.VOUCHER_PREVIEW_API_ENABLED || "").trim().toLowerCase() === "true";

  if (vercelEnvironment === "production") {
    return false;
  }

  return featureFlag;
}

export function requireVoucherPreviewApiEnabled() {
  if (isVoucherPreviewApiEnabled()) {
    return null;
  }

  return notFound("API do modulo voucher-preview desabilitada neste ambiente.");
}
