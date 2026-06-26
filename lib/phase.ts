export type AppPhase = "v0" | "alpha";

export function getAppPhase(): AppPhase {
  const phase = process.env.NEXT_PUBLIC_ARJUNA_PHASE?.toLowerCase();
  return phase === "alpha" ? "alpha" : "v0";
}

export function isV0Locked(): boolean {
  return getAppPhase() === "v0";
}
