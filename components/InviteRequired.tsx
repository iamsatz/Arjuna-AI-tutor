"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArjunaAvatar } from "@/components/ArjunaAvatar";
import { tryAddProfile } from "@/lib/childProfile";
import { GRADE_OPTIONS, type GradeOption } from "@/lib/profileOptions";

/** Keep the extractFamilyCode export so any existing callers don't break. */
export function extractFamilyCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const fromLink = trimmed.match(/join\/([A-Za-z0-9_-]+)/);
  if (fromLink) return fromLink[1].toLowerCase();
  return trimmed.replace(/\s+/g, "").toLowerCase();
}

type Step = "name" | "grade";

const ALL_GRADES: Array<GradeOption | "College"> = [
  ...GRADE_OPTIONS,
  "College",
];

export function InviteRequired() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  function handleNameSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError(null);
    setStep("grade");
  }

  function handleGradeSelect(grade: string) {
    setSelectedGrade(grade);
  }

  function handleStart() {
    if (!selectedGrade) {
      setError("Please pick your class.");
      return;
    }
    setError(null);

    const inviteCode = `local_${Date.now()}`;
    const result = tryAddProfile({
      inviteCode,
      childName: name.trim(),
      grade: selectedGrade,
    });

    if (!result.ok) {
      setError(
        result.reason === "duplicate_name"
          ? `${name.trim()} already exists — try a different name.`
          : "Maximum 3 students on one device.",
      );
      return;
    }

    router.replace("/?welcome=1");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-arjuna-bg">
      {/* Top decorative band */}
      <div className="h-2 w-full rounded-b-3xl bg-arjuna-primary" />

      <div className="flex flex-1 flex-col px-6 py-8">
        {/* Step 1 — name */}
        {step === "name" && (
          <div className="flex flex-1 flex-col">
            <div className="flex flex-col items-center text-center">
              <ArjunaAvatar state="idle" size="sm" />
              <h1 className="mt-5 font-display text-3xl font-bold text-arjuna-text">
                Hi! I&apos;m Arjuna.
              </h1>
              <p className="mt-2 text-base leading-relaxed text-arjuna-muted">
                Your personal homework friend. Let&apos;s get started!
              </p>
            </div>

            <form onSubmit={handleNameSubmit} className="mt-10 flex flex-col gap-4">
              <div>
                <label
                  htmlFor="student-name"
                  className="mb-2 block text-sm font-semibold text-arjuna-text"
                >
                  What&apos;s your name?
                </label>
                <input
                  ref={nameRef}
                  id="student-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aadya"
                  autoComplete="given-name"
                  autoFocus
                  className="w-full rounded-2xl border-2 border-orange-100 bg-white px-4 py-4 font-display text-lg font-semibold text-arjuna-text outline-none transition focus:border-arjuna-primary"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm font-medium text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!name.trim()}
                className="mt-2 w-full rounded-2xl bg-arjuna-primary px-6 py-4 font-display text-lg font-bold text-white shadow-chunky transition active:scale-95 disabled:opacity-40"
              >
                Next
              </button>
            </form>

            <p className="mt-auto pt-8 text-center text-xs text-arjuna-muted">
              For students aged 6 – 20
            </p>
          </div>
        )}

        {/* Step 2 — grade */}
        {step === "grade" && (
          <div className="flex flex-1 flex-col">
            <button
              type="button"
              onClick={() => { setStep("name"); setError(null); }}
              className="mb-6 flex items-center gap-1 text-sm font-semibold text-arjuna-primaryDark"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>

            <div className="text-center">
              <p className="font-display text-2xl font-bold text-arjuna-text">
                Great, {name.trim()}!
              </p>
              <p className="mt-2 text-base text-arjuna-muted">
                What class are you in?
              </p>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-2.5">
              {ALL_GRADES.map((g) => {
                const isSelected = selectedGrade === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleGradeSelect(g)}
                    className={`rounded-2xl border-2 px-4 py-2.5 font-display text-sm font-bold transition active:scale-95 ${
                      isSelected
                        ? "border-arjuna-primary bg-arjuna-primary text-white shadow-chunky"
                        : "border-orange-100 bg-white text-arjuna-text hover:border-arjuna-primary/40"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>

            {error && (
              <p role="alert" className="mt-4 text-center text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <div className="mt-auto pt-8">
              <button
                type="button"
                onClick={handleStart}
                disabled={!selectedGrade}
                className="w-full rounded-2xl bg-arjuna-primary px-6 py-4 font-display text-lg font-bold text-white shadow-chunky transition active:scale-95 disabled:opacity-40"
              >
                Start learning
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
