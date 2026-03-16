const DEFAULT_JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8"
};

export function jsonResponse(payload, init = {}) {
  const headers = new Headers(init.headers || {});

  Object.entries(DEFAULT_JSON_HEADERS).forEach(([key, value]) => {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  });

  return new Response(JSON.stringify(payload), {
    ...init,
    headers
  });
}

export function errorResponse(status, message, details = undefined) {
  return jsonResponse(
    {
      ok: false,
      message,
      ...(details ? { details } : {})
    },
    { status }
  );
}

export function methodNotAllowed(allowedMethods) {
  return errorResponse(405, "Metodo nao permitido.", {
    allowedMethods
  });
}

export function badRequest(message, details = undefined) {
  return errorResponse(400, message, details);
}

export function notFound(message, details = undefined) {
  return errorResponse(404, message, details);
}

export function serverError(message, error = undefined) {
  if (error) {
    console.error(message, error);
  }

  return errorResponse(500, message);
}

export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch (error) {
    throw new Error("Corpo JSON invalido.", { cause: error });
  }
}
