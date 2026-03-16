import crypto from "node:crypto";
import { GOOGLE_SHEETS_SCOPE, GOOGLE_TOKEN_URI } from "./voucherSheetsConfig.mjs";

const tokenCache = globalThis.__voucherPreviewGoogleTokenCache || new Map();

globalThis.__voucherPreviewGoogleTokenCache = tokenCache;

function getEnvValue(name) {
  return String(process.env[name] || "").trim();
}

function normalizePrivateKey(privateKey) {
  return privateKey.replace(/\\n/g, "\n");
}

function getServiceAccountCredentials() {
  const rawJson = getEnvValue("GOOGLE_SERVICE_ACCOUNT_JSON");

  if (rawJson) {
    const parsed = JSON.parse(rawJson);
    const clientEmail = String(parsed.client_email || "").trim();
    const privateKey = normalizePrivateKey(String(parsed.private_key || ""));
    const tokenUri = String(parsed.token_uri || GOOGLE_TOKEN_URI).trim();

    if (!clientEmail || !privateKey) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON nao contem client_email/private_key validos.");
    }

    return {
      clientEmail,
      privateKey,
      tokenUri
    };
  }

  const clientEmail = getEnvValue("GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL");
  const privateKey = normalizePrivateKey(getEnvValue("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"));

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Configure GOOGLE_SERVICE_ACCOUNT_JSON ou o par GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY."
    );
  }

  return {
    clientEmail,
    privateKey,
    tokenUri: GOOGLE_TOKEN_URI
  };
}

function encodeBase64Url(value) {
  const rawValue = typeof value === "string" ? value : JSON.stringify(value);
  return Buffer.from(rawValue).toString("base64url");
}

function buildJwtAssertion({ clientEmail, privateKey, tokenUri, scope }) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 3300;
  const encodedHeader = encodeBase64Url({
    alg: "RS256",
    typ: "JWT"
  });
  const encodedClaimSet = encodeBase64Url({
    iss: clientEmail,
    scope,
    aud: tokenUri,
    exp: expiresAt,
    iat: issuedAt
  });
  const unsignedToken = `${encodedHeader}.${encodedClaimSet}`;
  const signer = crypto.createSign("RSA-SHA256");

  signer.update(unsignedToken);
  signer.end();

  const signature = signer.sign(privateKey).toString("base64url");

  return `${unsignedToken}.${signature}`;
}

export async function getGoogleAccessToken(scopes = [GOOGLE_SHEETS_SCOPE]) {
  const normalizedScope = [...new Set(scopes)].sort().join(" ");
  const cachedToken = tokenCache.get(normalizedScope);

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const credentials = getServiceAccountCredentials();
  const assertion = buildJwtAssertion({
    ...credentials,
    scope: normalizedScope
  });

  const tokenResponse = await fetch(credentials.tokenUri, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    }).toString()
  });

  const payload = await tokenResponse.json().catch(() => ({}));

  if (!tokenResponse.ok || !payload.access_token) {
    throw new Error(payload?.error_description || payload?.error || "Falha ao autenticar na Google Service Account.");
  }

  tokenCache.set(normalizedScope, {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000
  });

  return payload.access_token;
}
