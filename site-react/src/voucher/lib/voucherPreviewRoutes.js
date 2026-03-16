export const VOUCHER_PREVIEW_PRIMARY_VIEW = {
  SCHOOL: "school",
  SAF: "saf"
};

export const VOUCHER_PREVIEW_SCHOOL_VIEW = {
  NEW_REQUEST: "new-request",
  LOOKUP: "lookup"
};

function sanitizeSchoolView(rawValue) {
  return rawValue === VOUCHER_PREVIEW_SCHOOL_VIEW.LOOKUP
    ? VOUCHER_PREVIEW_SCHOOL_VIEW.LOOKUP
    : VOUCHER_PREVIEW_SCHOOL_VIEW.NEW_REQUEST;
}

export function buildVoucherPreviewHash(primaryView, schoolView = VOUCHER_PREVIEW_SCHOOL_VIEW.NEW_REQUEST) {
  if (primaryView === VOUCHER_PREVIEW_PRIMARY_VIEW.SAF) {
    return "#/saf";
  }

  return `#/escolas/${sanitizeSchoolView(schoolView)}`;
}

export function parseVoucherPreviewHash(rawHash) {
  const normalizedHash = String(rawHash || "").trim().replace(/^#/, "");
  const normalizedPath = normalizedHash.startsWith("/") ? normalizedHash.slice(1) : normalizedHash;
  const [primarySegment, secondarySegment] = normalizedPath.split("/");

  if (primarySegment === "saf") {
    return {
      primaryView: VOUCHER_PREVIEW_PRIMARY_VIEW.SAF,
      schoolView: VOUCHER_PREVIEW_SCHOOL_VIEW.NEW_REQUEST
    };
  }

  if (primarySegment === "escolas") {
    return {
      primaryView: VOUCHER_PREVIEW_PRIMARY_VIEW.SCHOOL,
      schoolView: sanitizeSchoolView(secondarySegment)
    };
  }

  return {
    primaryView: VOUCHER_PREVIEW_PRIMARY_VIEW.SCHOOL,
    schoolView: VOUCHER_PREVIEW_SCHOOL_VIEW.NEW_REQUEST
  };
}

export function getVoucherPreviewLocationState() {
  if (typeof window === "undefined") {
    return parseVoucherPreviewHash("");
  }

  return parseVoucherPreviewHash(window.location.hash);
}

export function navigateVoucherPreview(primaryView, schoolView) {
  if (typeof window === "undefined") {
    return;
  }

  const nextHash = buildVoucherPreviewHash(primaryView, schoolView);

  if (window.location.hash === nextHash) {
    return;
  }

  window.location.hash = nextHash;
}
