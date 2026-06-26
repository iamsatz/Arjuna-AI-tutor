"use client";

import { useEffect, useState } from "react";
import { getAppPhase } from "@/lib/phase";
import {
  loadV0Progress,
  saveV0Step,
  V0_STEPS,
  type V0StepId,
} from "@/lib/v0Progress";

export function V0ProgressPanel() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(loadV0Progress);
  const phase = getAppPhase();

  useEffect(() => {
    setProgress(loadV0Progress());
  }, [open]);

  const toggle = (id: V0StepId) => {
    const next = !progress[id];
    saveV0Step(id, next);
    setProgress({ ...progress, [id]: next });
  };

  const doneCount = V0_STEPS.filter((s) => progress[s.id]).length;

  return (
    <div className="w-full border-t border-arjuna-primary/10 pt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-xl bg-white/90 px-4 py-3 text-left text-sm text-arjuna-muted shadow-sm"
      >
        <span className="font-semibold text-arjuna-text">
          For parents · V0 steps ({doneCount}/{V0_STEPS.length})
        </span>
        <span className="mt-1 block text-xs">
          Phase: {phase === "v0" ? "V0 locked" : "Alpha unlocked"}
        </span>
      </button>

      {open && (
        <ul className="mt-3 space-y-2">
          {V0_STEPS.map((step) => (
            <li
              key={step.id}
              className="rounded-lg bg-white/80 px-3 py-2 text-sm"
            >
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={progress[step.id]}
                  onChange={() => toggle(step.id)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-arjuna-text">
                    {step.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-arjuna-muted">
                    {step.hint}
                  </span>
                  {step.logFile && (
                    <span className="mt-0.5 block text-xs text-arjuna-primaryDark">
                      Log: {step.logFile}
                    </span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {phase === "v0" && progress["v0-gate"] && (
        <p className="mt-3 rounded-lg bg-arjuna-primary/10 px-3 py-2 text-xs text-arjuna-text">
          Gate signed? Set{" "}
          <code className="text-arjuna-primaryDark">
            NEXT_PUBLIC_ARJUNA_PHASE=alpha
          </code>{" "}
          and GEMINI_API_KEY in .env.local, then restart dev server.
        </p>
      )}
    </div>
  );
}
