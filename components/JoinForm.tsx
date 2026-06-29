"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addProfile,
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
import { StepDots } from "@/components/ui/StepDots";

type JoinFormProps = {
  code: string;
};

export function JoinForm({ code }: JoinFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [childName, setChildName] = useState("");
  const [grade, setGrade] = useState<GradeOption | "">("");
  const [board, setBoard] = useState<CurriculumBoard | "">("");
  const [medium, setMedium] = useState<MediumOfInstruction>("english_medium");
  const [loading, setLoading] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvite() {
      try {
        const response = await fetch(`/api/invite/${code}`);
        if (!response.ok) {
          setError(
            "This invite link is not valid. Open the full link from Copy link (not the family name).",
          );
          return;
        }

        const data = (await response.json()) as {
          invite: {
            label?: string;
            childName?: string;
            grade?: string;
            board?: CurriculumBoard;
            claimed: boolean;
          };
        };

        setLabel(data.invite.label ?? null);
        setInviteValid(true);

        if (data.invite.claimed && data.invite.childName) {
          const result = tryAddProfile({
            inviteCode: code,
            childName: data.invite.childName,
            grade: data.invite.grade,
            board: data.invite.board,
            medium: "english_medium",
          });
          if (result.ok) router.replace("/?welcome=1");
          return;
        }
      } catch {
        setError("Could not load invite link.");
      } finally {
        setLoading(false);
      }
    }

    void loadInvite();
  }, [code, router]);

  async function finishSetup() {
    setSubmitting(true);
    setError(null);

    const profileInput = {
      inviteCode: code,
      childName: childName.trim(),
      grade: grade || undefined,
      board: board || undefined,
      medium,
    };

    try {
      const response = await fetch(`/api/invite/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childName: profileInput.childName,
          grade: profileInput.grade,
          board: profileInput.board,
        }),
      });

      if (!response.ok && !inviteValid) {
        setError("Could not save profile. Try again.");
        return;
      }

      const result = tryAddProfile(profileInput);
      if (!result.ok) {
        setError(
          result.reason === "duplicate_name"
            ? `A child named ${childName.trim()} already exists in this family. Use a different name.`
            : "Could not save profile. Try again.",
        );
        return;
      }
      router.replace("/?welcome=1");
    } catch {
      if (inviteValid) {
        const result = tryAddProfile(profileInput);
        if (!result.ok) {
          setError(
            result.reason === "duplicate_name"
              ? `A child named ${childName.trim()} already exists in this family. Use a different name.`
              : "Could not save profile. Try again.",
          );
          return;
        }
        router.replace("/?welcome=1");
        return;
      }
      setError("Could not save profile. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (step === 1) {
      if (!childName.trim()) {
        setError("What's your child's name?");
        return;
      }
      setStep(2);
      return;
    }
    void finishSetup();
  }

  if (loading) {
    return (
      <Card>
        <p className="text-center text-sm text-arjuna-muted">Loading…</p>
      </Card>
    );
  }

  if (error && !childName && !inviteValid) {
    return (
      <Card>
        <p className="text-sm text-red-700">{error}</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <ArjunaAvatar state="idle" size="sm" />
        <h1 className="mt-3 font-display text-2xl font-bold text-arjuna-text">
          {step === 1 ? "Who are we helping?" : "Almost done!"}
        </h1>
        {label && (
          <p className="mt-1 text-sm text-arjuna-muted">Family: {label}</p>
        )}
        <p className="mt-2 text-sm text-arjuna-muted">
          {step === 1
            ? "Tell us your child's name to get started."
            : "Pick grade and school details — we'll use your syllabus later."}
        </p>
      </div>

      <StepDots current={step} total={2} />

      <form onSubmit={handleNext} className="space-y-4">
        {step === 1 && (
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
        )}

        {step === 2 && (
          <>
            <label className="block">
              <span className="text-sm font-semibold text-arjuna-text">
                Grade
              </span>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as GradeOption | "")}
                required
                className="mt-2 w-full rounded-2xl border-2 border-orange-100 px-4 py-3.5 text-base outline-none focus:border-arjuna-primary"
              >
                <option value="">Pick a grade</option>
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

        <div className="flex gap-2">
          {step === 2 && (
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              Back
            </Button>
          )}
          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="flex-1"
          >
            {submitting
              ? "Starting…"
              : step === 1
                ? "Next"
                : "Start Arjuna"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
