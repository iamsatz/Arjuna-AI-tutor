export const OWNER_COOKIE_NAME = "owner_session";
export const OWNER_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`arjuna-owner:${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function getOwnerSessionToken(
  password: string,
): Promise<string> {
  return hashPassword(password);
}

export async function verifyOwnerSession(
  password: string | undefined,
  cookieValue: string | undefined,
): Promise<boolean> {
  if (!password || !cookieValue) return false;
  const expected = await getOwnerSessionToken(password);
  return cookieValue === expected;
}
