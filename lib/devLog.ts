/** Log the real error to the console in dev without changing the friendly UI text shown to the user. */
export function logDevError(context: string, error: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error(`[Arjuna:${context}]`, error);
  }
}
