"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  LOCAL_INVITE_CODE,
  tryAddProfile,
  type CurriculumBoard,
  type MediumOfInstruction,
} from "@/lib/childProfile";
import {
  BOARD_OPTIONS,
  GRADE_OPTIONS,
  MEDIUM_OPTIONS,
  type GradeOption,
} from "@/lib/profileOptions";
import { ArjunaAvatar } from "@/components/ArjunaAvatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type WhoIsLearningProps = {
  /** Called after a profile is saved so the parent can switch to the lesson UI. */
  onComplete?: () => void;
};

export function WhoIsLearning({ onComplete }: WhoIsLearningProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [childName, setChildName] = useState("");
  const [grade, setGrade] = useState<GradeOption | "">("");
  const [board, setBoard] = useState<CurriculumBoard | "">("");
  const [medium, setMedium] = useState<MediumOfInstruction>("english_medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const trimmedName = childName.trim();
    if (!trimmedName) {
      setError("What's your child's name?");
      setSubmitting(false);
      return;
    }

    const result = tryAddProfile({
      inviteCode: LOCAL_INVITE_CODE,
      childName: trimmedName,
      grade: grade || undefined,
      board: board || undefined,
      medium,
    });

    if (!result.ok) {
      setError(
        result.reason === "duplicate_name"
          ? `${trimmedName} is already on this phone.`
          : "This phone already has 3 children. Remove one in Settings first.",
      );
      setSubmitting(false);
      return;
    }

    onComplete?.();
    setSubmitting(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-arjuna-bg px-6 py-10">
      <Card>
        <div className="flex flex-col items-center text-center">
          <ArjunaAvatar state="idle" size="sm" />
          <h1 className="mt-3 font-display text-2xl font-bold text-arjuna-text">
            Who are we helping?
          </h1>
          <p className="mt-2 text-sm text-arjuna-muted">
            Enter your child&apos;s name — then straight to homework.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-arjuna-text">
              Child&apos;s name
            </span>
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              required
              autoComplete="given-name"
              placeholder="e.g. Aadya"
              className="mt-2 w-full rounded-2xl border-2 border-orange-100 px-4 py-3.5 text-lg font-semibold outline-none focus:border-arjuna-primary"
            />
          </label>

          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="text-sm font-semibold text-indigo-700 underline"
          >
            {showDetails
              ? "Hide details"
              : "More details (grade, board — optional)"}
          </button>

          {showDetails && (
            <>
              <label className="block">
                <span className="text-sm font-semibold text-arjuna-text">
                  Grade
                </span>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as GradeOption | "")}
                  className="mt-2 w-full rounded-2xl border-2 border-orange-100 px-4 py-3.5 outline-none focus:border-arjuna-primary"
                >
                  <option value="">Pick a grade (optional)</option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-arjuna-text">
                  Board
                </span>
                <select
                  value={board}
                  onChange={(e) =>
                    setBoard(e.target.value as CurriculumBoard | "")
                  }
                  className="mt-2 w-full rounded-2xl border-2 border-orange-100 px-4 py-3.5 outline-none focus:border-arjuna-primary"
                >
                  <option value="">Pick board (optional)</option>
                  {BOARD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-arjuna-text">
                  Language at school
                </span>
                <select
                  value={medium}
                  onChange={(e) =>
                    setMedium(e.target.value as MediumOfInstruction)
                  }
                  className="mt-2 w-full rounded-2xl border-2 border-orange-100 px-4 py-3.5 outline-none focus:border-arjuna-primary"
                >
                  {MEDIUM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={submitting || !childName.trim()}
            className="w-full"
          >
            {submitting ? "Starting…" : "Start homework"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-arjuna-muted">
          Need the app on TV or Android?{" "}
          <Link
            href="/download"
            className="font-semibold text-indigo-700 underline"
          >
            Get the app
          </Link>
        </p>
      </Card>
    </main>
  );
}
