export type V0StepId =
  | "v0-2-voice"
  | "v0-3-pack"
  | "v0-4-woz"
  | "v0-gate"
  | "alpha-trial";

export type V0Step = {
  id: V0StepId;
  title: string;
  hint: string;
  logFile?: string;
};

export const V0_STEPS: V0Step[] = [
  {
    id: "v0-2-voice",
    title: "V0.2 Voice test",
    hint: "Play greeting for wife + Aadya. Pick shubh, priya, or ritu.",
    logFile: "arjuna-prd/OBSERVATIONS/prototype-voice.md",
  },
  {
    id: "v0-3-pack",
    title: "V0.3 Learner pack",
    hint: "Fill AADYA.md + add 5 diary photos to homework-samples/",
    logFile: "arjuna-prd/AADYA.md",
  },
  {
    id: "v0-4-woz",
    title: "V0.4 Wizard-of-Oz",
    hint: "3 × 15 min sessions with Claude voice. Log v0-session-1/2/3.md",
    logFile: "arjuna-prd/OBSERVATIONS/v0-session-1.md",
  },
  {
    id: "v0-gate",
    title: "V0 gate sign-off",
    hint: "All 4 checks in V0-GATE.md. Set NEXT_PUBLIC_ARJUNA_PHASE=alpha + GEMINI_API_KEY",
    logFile: "arjuna-prd/V0-GATE.md",
  },
  {
    id: "alpha-trial",
    title: "Alpha home trial",
    hint: "One diary photo + one Talk exchange with Aadya on her phone",
    logFile: "arjuna-prd/OBSERVATIONS/alpha-trial-1.md",
  },
];

const STORAGE_KEY = "arjuna-v0-progress";

export function loadV0Progress(): Record<V0StepId, boolean> {
  if (typeof window === "undefined") {
    return {
      "v0-2-voice": false,
      "v0-3-pack": false,
      "v0-4-woz": false,
      "v0-gate": false,
      "alpha-trial": false,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    return { ...defaultProgress(), ...JSON.parse(raw) };
  } catch {
    return defaultProgress();
  }
}

export function saveV0Step(id: V0StepId, done: boolean): void {
  const current = loadV0Progress();
  current[id] = done;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

function defaultProgress(): Record<V0StepId, boolean> {
  return {
    "v0-2-voice": false,
    "v0-3-pack": false,
    "v0-4-woz": false,
    "v0-gate": false,
    "alpha-trial": false,
  };
}

export function v0GateReady(progress: Record<V0StepId, boolean>): boolean {
  return (
    progress["v0-2-voice"] &&
    progress["v0-3-pack"] &&
    progress["v0-4-woz"] &&
    progress["v0-gate"]
  );
}
