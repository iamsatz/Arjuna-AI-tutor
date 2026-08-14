/**
 * Shared between the browser (which sends it) and the API routes (which check
 * it). Kept in its own module with no imports: `lib/apiAuth.ts` reaches for the
 * invite store and therefore `fs`, which must never reach the client bundle.
 */
export const INVITE_HEADER = "x-arjuna-invite";
