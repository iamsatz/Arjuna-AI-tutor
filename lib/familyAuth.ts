export const FAMILY_COOKIE_NAME = "arjuna_family_session";
export const FAMILY_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function normalizeCode(code: string): string {
  return code.trim().toLowerCase();
}

async function digest(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashFamilyPassword(
  inviteCode: string,
  password: string,
): Promise<string> {
  return digest(`arjuna-family:${normalizeCode(inviteCode)}:${password.trim()}`);
}

export async function getFamilySessionToken(
  inviteCode: string,
  password: string,
): Promise<string> {
  return hashFamilyPassword(inviteCode, password);
}

export function familySessionCookieValue(
  inviteCode: string,
  token: string,
): string {
  return `${normalizeCode(inviteCode)}:${token}`;
}

export function parseFamilySessionCookie(
  cookieValue: string | undefined,
): { code: string; token: string } | null {
  if (!cookieValue) return null;
  const idx = cookieValue.indexOf(":");
  if (idx <= 0) return null;
  const code = cookieValue.slice(0, idx).trim().toLowerCase();
  const token = cookieValue.slice(idx + 1).trim();
  if (!code || !token) return null;
  return { code, token };
}

export async function verifyFamilySession(
  inviteCode: string,
  storedHash: string | undefined,
  cookieValue: string | undefined,
): Promise<boolean> {
  if (!storedHash || !cookieValue) return false;
  const parsed = parseFamilySessionCookie(cookieValue);
  if (!parsed) return false;
  if (parsed.code !== normalizeCode(inviteCode)) return false;
  return parsed.token === storedHash;
}

export function isValidFamilyPassword(password: string): boolean {
  return password.trim().length >= 6;
}
