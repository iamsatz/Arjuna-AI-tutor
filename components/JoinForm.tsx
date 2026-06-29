"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addProfile,
  type CurriculumBoard,
  type MediumOfInstruction,
} from "@/lib/childProfile";
import { MEDIUM_OPTIONS } from "@/lib/profileOptions";

type JoinFormProps = {
  code: string;
};

export function JoinForm({ code }: JoinFormProps) {
  const router = useRouter();
  const [childName, setChildName] = useState("");
  const [grade, setGrade] = useState("");
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
          setError("This invite link is not valid.");
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
          addProfile({
            inviteCode: code,
            childName: data.invite.childName,
            grade: data.invite.grade,
            board: data.invite.board,
            medium: "english_medium",
          });
          router.replace("/");
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const profileInput = {
      inviteCode: code,
      childName: childName.trim(),
      grade: grade.trim() || undefined,
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

      addProfile(profileInput);
      router.replace("/");
    } catch {
      if (inviteValid) {
        addProfile(profileInput);
        router.replace("/");
        return;
      }
      setError("Could not save profile. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/95 p-6 text-sm text-arjuna-muted shadow-sm">
        Loading invite...
      </div>
    );
  }

  if (error && !childName) {
    return (
      <div className="rounded-2xl bg-white/95 p-6 shadow-sm">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/95 p-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-widest text-arjuna-muted">
        Arjuna · Welcome
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-arjuna-text">
        Set up your child
      </h1>
      {label && (
        <p className="mt-2 text-sm text-arjuna-muted">Invite: {label}</p>
      )}
      <p className="mt-2 text-sm text-arjuna-muted">
        Enter your child&apos;s name to start homework tutoring.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-arjuna-text">
            Child&apos;s name
          </span>
          <input
            type="text"
            value={childName}
            onChange={(event) => setChildName(event.target.value)}
            required
            autoComplete="given-name"
            className="mt-2 w-full rounded-xl border border-arjuna-primary/20 bg-white px-4 py-3 text-arjuna-text outline-none focus:border-arjuna-primary"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-arjuna-text">
            Grade (optional)
          </span>
          <input
            type="text"
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            placeholder="Class 2, Grade 3, etc."
            className="mt-2 w-full rounded-xl border border-arjuna-primary/20 bg-white px-4 py-3 text-arjuna-text outline-none focus:border-arjuna-primary"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-arjuna-text">
            Board (optional)
          </span>
          <select
            value={board}
            onChange={(event) =>
              setBoard(event.target.value as CurriculumBoard | "")
            }
            className="mt-2 w-full rounded-xl border border-arjuna-primary/20 bg-white px-4 py-3 text-arjuna-text outline-none focus:border-arjuna-primary"
          >
            <option value="">Select board</option>
            <option value="CBSE">CBSE</option>
            <option value="ICSE">ICSE</option>
            <option value="IB">IB</option>
            <option value="State">State</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-arjuna-text">
            Medium of instruction
          </span>
          <select
            value={medium}
            onChange={(e) =>
              setMedium(e.target.value as MediumOfInstruction)
            }
            className="mt-2 w-full rounded-xl border border-arjuna-primary/20 bg-white px-4 py-3 text-arjuna-text outline-none focus:border-arjuna-primary"
          >
            {MEDIUM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-arjuna-primary px-4 py-3 font-semibold text-white transition hover:bg-arjuna-primaryDark disabled:opacity-60"
        >
          {submitting ? "Starting..." : "Start Arjuna"}
        </button>
      </form>
    </div>
  );
}
