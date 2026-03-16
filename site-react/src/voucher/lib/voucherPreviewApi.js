export class VoucherPreviewApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "VoucherPreviewApiError";
    this.status = options.status || 500;
    this.details = options.details;
  }
}

async function requestVoucherPreviewApi(path, options = {}) {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.ok === false) {
    throw new VoucherPreviewApiError(payload?.message || "Falha ao acessar a API do voucher preview.", {
      status: response.status,
      details: payload?.details
    });
  }

  return payload?.data ?? null;
}

export function createVoucherRequest(payload) {
  return requestVoucherPreviewApi("/api/voucher-preview/requests", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(payload)
  });
}

export function lookupVoucherRequestsByCnpj(cnpj) {
  return requestVoucherPreviewApi(`/api/voucher-preview/requests/by-cnpj?cnpj=${encodeURIComponent(cnpj)}`);
}

export function listSafVoucherRequests(filters = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();

  return requestVoucherPreviewApi(`/api/voucher-preview/saf/requests${queryString ? `?${queryString}` : ""}`);
}

export function updateSafVoucherRequest(payload) {
  return requestVoucherPreviewApi("/api/voucher-preview/saf/requests", {
    method: "PATCH",
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(payload)
  });
}
