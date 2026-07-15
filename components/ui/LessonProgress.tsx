"use client";

import { ArjunaAvatar } from "@/components/ArjunaAvatar";

type LessonProgressProps = {
  step: "reading" | "building" | "teaching";
};

const STEPS = [
  { id: "reading", label: "Reading homework" },
  { id: "building", label: "Building task list" },
  { id: "teaching", label: "Starting lesson" },
] as const;

export function LessonProgress({ step }: LessonProgressProps) {
  const activeIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <CardOverlay>
      <ArjunaAvatar state="loading" size="sm" />
      <p className="mt-4 font-display text-lg font-bold text-arjuna-text">
        Arjuna is reading your homework…
      </p>
      <ul className="mt-4 w-full space-y-2">
        {STEPS.map((s, i) => {
          const done = i < activeIndex;
          const current = i === activeIndex;
          return (
            <li
              key={s.id}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                current
                  ? "bg-arjuna-primaryLight font-semibold text-arjuna-text"
                  : done
                    ? "text-green-700"
                    : "text-arjuna-muted"
              }`}
            >
              <span>{done ? "✓" : current ? "●" : "○"}</span>
              {s.label}
            </li>
          );
        })}
      </ul>
    </CardOverlay>
  );
}

function CardOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
      <div className="w-full max-w-sm rounded-3xl border border-arjuna-border bg-white p-6 shadow-chunky">
        <div className="flex flex-col items-center">{children}</div>
      </div>
    </div>
  );
}
