export type AppPhase = "v0" | "alpha";

export function getAppPhase(): AppPhase {
  const phase = process.env.NEXT_PUBLIC_ARJUNA_PHASE?.toLowerCase();
  if (phase === "v0") return "v0";
  return "alpha";
}

export function isV0Locked(): boolean {
  return false;
}
