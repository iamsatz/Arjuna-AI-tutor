"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArjunaAvatar } from "@/components/ArjunaAvatar";
import {
  listProfiles,
  tryAddProfile,
} from "@/lib/childProfile";
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

function isDuplicateName(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (!n) return false;
  return listProfiles().some((p) => p.childName.trim().toLowerCase() === n);
}

export function InviteRequired() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [dupError, setDupError] = useState<string | null>(null);

  // Live duplicate check on every keystroke
  useEffect(() => {
    if (!name.trim()) {
      setDupError(null);
      return;
    }
    if (isDuplicateName(name)) {
      setDupError(`"${name.trim()}" already exists — use a different name.`);
    } else {
      setDupError(null);
    }
  }, [name]);

  function handleNameSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (dupError) return; // block if duplicate
    setError(null);
    setStep("grade");
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
          ? `"${name.trim()}" already exists — try a different name.`
          : "Maximum 3 students on one device.",
      );
      return;
    }

    router.replace("/?welcome=1");
  }

  const nameIsBlocked = !!dupError || !name.trim();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-arjuna-bg">
      {/* Thin top accent */}
      <div className="h-1.5 w-full bg-arjuna-primary" />

      <div className="flex flex-1 flex-col px-5 py-6">

        {/* ── Step 1 — name ─────────────────────────── */}
        {step === "name" && (
          <div className="flex flex-1 flex-col gap-5">
            {/* Avatar + headline inline to save vertical space */}
            <div className="flex items-center gap-4">
              <ArjunaAvatar state="idle" size="sm" />
              <div>
                <h1 className="font-display text-2xl font-bold leading-tight text-arjuna-text">
                  Hi! I&apos;m Arjuna.
                </h1>
                <p className="mt-0.5 text-sm leading-relaxed text-arjuna-muted">
                  Your personal homework friend.
                </p>
              </div>
            </div>

            <form onSubmit={handleNameSubmit} className="flex flex-col gap-3">
              <label
                htmlFor="student-name"
                className="text-sm font-semibold text-arjuna-text"
              >
                What&apos;s your name?
              </label>
              <input
                ref={nameRef}
                id="student-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. Aadya"
                autoComplete="given-name"
                autoFocus
                className={`w-full rounded-2xl border-2 bg-white px-4 py-3.5 font-display text-base font-semibold text-arjuna-text outline-none transition focus:border-arjuna-primary ${
                  dupError
                    ? "border-red-400 focus:border-red-500"
                    : "border-orange-100"
                }`}
              />

              {/* Inline duplicate / generic error */}
              {(dupError || error) && (
                <p role="alert" className="text-sm font-medium text-red-600">
                  {dupError ?? error}
                </p>
              )}

              <button
                type="submit"
                disabled={nameIsBlocked}
                className="w-full rounded-2xl bg-arjuna-primary px-6 py-3.5 font-display text-base font-bold text-white shadow-chunky transition active:scale-95 disabled:opacity-40"
              >
                Next
              </button>
            </form>

            {/* Existing students list — useful context, no wasted space */}
            {listProfiles().length > 0 && (
              <div className="rounded-2xl border-2 border-orange-100 bg-white px-4 py-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-arjuna-muted">
                  Already on this device
                </p>
                <div className="flex flex-wrap gap-2">
                  {listProfiles().map((p) => (
                    <span
                      key={p.id}
                      className="flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-1.5 font-display text-sm font-bold text-arjuna-text"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-arjuna-primary text-[10px] font-bold text-white">
                        {p.childName.charAt(0).toUpperCase()}
                      </span>
                      {p.childName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-auto text-center text-xs text-arjuna-muted">
              For students aged 6 – 20 &middot; Up to 3 students per device
            </p>
          </div>
        )}

        {/* ── Step 2 — grade ────────────────────────── */}
        {step === "grade" && (
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setStep("name"); setError(null); }}
                aria-label="Back"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition active:scale-95"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div>
                <p className="font-display text-xl font-bold text-arjuna-text">
                  Hi {name.trim()}! What class?
                </p>
                <p className="text-sm text-arjuna-muted">Pick your current grade.</p>
              </div>
            </div>

            {/* Grade chip grid — compact rows */}
            <div className="flex flex-wrap gap-2">
              {ALL_GRADES.map((g) => {
                const isSelected = selectedGrade === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => { setSelectedGrade(g); setError(null); }}
                    className={`rounded-xl border-2 px-3.5 py-2 font-display text-sm font-bold transition active:scale-95 ${
                      isSelected
                        ? "border-arjuna-primary bg-arjuna-primary text-white shadow-chunky"
                        : "border-orange-100 bg-white text-arjuna-text"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <div className="mt-auto">
              <button
                type="button"
                onClick={handleStart}
                disabled={!selectedGrade}
                className="w-full rounded-2xl bg-arjuna-primary px-6 py-3.5 font-display text-base font-bold text-white shadow-chunky transition active:scale-95 disabled:opacity-40"
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
