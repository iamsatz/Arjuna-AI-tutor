import { loadSettings } from "@/lib/settings";
import { getActiveProfile } from "@/lib/childProfile";
import { INVITE_HEADER } from "@/lib/inviteHeader";

type FetchInit = RequestInit & {
  json?: Record<string, unknown>;
};

/** Family credential sent with every AI/mutating request. */
export function getInviteHeader(): Record<string, string> {
  const code = getActiveProfile()?.inviteCode?.trim();
  return code ? { [INVITE_HEADER]: code } : {};
}

/** Only attach a saved parent key when it passed Test connection. */
function validatedUserKey(): string | null {
  const settings = loadSettings();
  const key = settings.geminiApiKey?.trim();
  if (!key || settings.geminiKeyStatus !== "valid") return null;
  return key;
}

function geminiHeaders(): HeadersInit {
  const key = validatedUserKey();
  if (!key) return {};
  return { "x-gemini-key": key };
}

/** Client fetch that attaches Gemini key from Settings when validated. */
export async function arjunaFetch(
  input: RequestInfo | URL,
  init: FetchInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(getInviteHeader())) {
    if (!headers.has(k)) headers.set(k, v);
  }

  // The key travels in the header only. Putting it in the JSON body as well
  // meant the parent's Google key was written into every server request log.
  for (const [k, v] of Object.entries(geminiHeaders())) {
    if (!headers.has(k)) headers.set(k, v);
  }

  let body = init.body;
  if (init.json !== undefined) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    body = JSON.stringify(init.json);
  }

  // Default to POST when a JSON body is present — a GET/HEAD request with a
  // body throws in the browser before it is ever sent.
  const method =
    init.method ?? (init.json !== undefined ? "POST" : undefined);

  return fetch(input, { ...init, method, headers, body });
}

/**
 * Headers for raw `fetch` calls that send FormData (uploads), where
 * `arjunaFetch`'s JSON path does not apply. Always includes the family gate.
 */
export function getGeminiKeyHeader(): Record<string, string> {
  const key = validatedUserKey();
  return {
    ...getInviteHeader(),
    ...(key ? { "x-gemini-key": key } : {}),
  };
}

export function hasGeminiKeyConfigured(): boolean {
  return validatedUserKey() !== null;
}

export function hasValidatedUserKey(): boolean {
  return validatedUserKey() !== null;
}
