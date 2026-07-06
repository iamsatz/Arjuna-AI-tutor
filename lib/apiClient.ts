import { loadSettings } from "@/lib/settings";

type FetchInit = RequestInit & {
  json?: Record<string, unknown>;
};

function geminiHeaders(): HeadersInit {
  const key = loadSettings().geminiApiKey?.trim();
  if (!key) return {};
  return { "x-gemini-key": key };
}

/** Client fetch that attaches Gemini key from Settings when present. */
export async function arjunaFetch(
  input: RequestInfo | URL,
  init: FetchInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const explicitKey =
    init.json && "geminiApiKey" in init.json
      ? String(init.json.geminiApiKey ?? "").trim()
      : "";

  if (!explicitKey) {
    const gh = geminiHeaders();
    for (const [k, v] of Object.entries(gh)) {
      if (!headers.has(k)) headers.set(k, v);
    }
  } else {
    headers.delete("x-gemini-key");
  }

  let body = init.body;
  if (init.json !== undefined) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const payload = { ...init.json };
    if (!explicitKey) {
      const savedKey = loadSettings().geminiApiKey?.trim();
      if (savedKey) payload.geminiApiKey = savedKey;
    }
    body = JSON.stringify(payload);
  }

  return fetch(input, { ...init, headers, body });
}

export function getGeminiKeyHeader(): Record<string, string> {
  const key = loadSettings().geminiApiKey?.trim();
  return key ? { "x-gemini-key": key } : {};
}

export function hasGeminiKeyConfigured(): boolean {
  const key = loadSettings().geminiApiKey?.trim();
  return Boolean(key && key.length > 8);
}
