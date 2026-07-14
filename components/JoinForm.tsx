"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  listProfiles,
  setActiveProfile,
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

type JoinFormProps = {
  code: string;
};

type FamilyChild = {
  id: string;
  childName: string;
  grade?: string;
  board?: CurriculumBoard;
};

type JoinMode = "loading" | "setup" | "pick_kid" | "add_kid";

function DownloadHint() {
  return (
    <p className="mt-4 text-center text-xs text-arjuna-muted">
      Need the app on TV or Android?{" "}
      <Link href="/download" className="font-semibold text-indigo-700 underline">
        Get the app
      </Link>
    </p>
  );
}

export function JoinForm({ code }: JoinFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<JoinMode>("loading");
  const [showDetails, setShowDetails] = useState(false);
  const [childName, setChildName] = useState("");
  const [grade, setGrade] = useState<GradeOption | "">("");
  const [board, setBoard] = useState<CurriculumBoard | "">("");
  const [medium, setMedium] = useState<MediumOfInstruction>("english_medium");
  const [inviteValid, setInviteValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [serverChildren, setServerChildren] = useState<FamilyChild[]>([]);

  useEffect(() => {
    async function loadInvite() {
      try {
        const response = await fetch(`/api/invite/${code}`);
        if (!response.ok) {
          setError(
            "This link is not valid. Ask your family for the full link from WhatsApp.",
          );
          setMode("loading");
          return;
        }

        const data = (await response.json()) as {
          invite: {
            label?: string;
            setupComplete?: boolean;
            children?: FamilyChild[];
          };
        };

        setLabel(data.invite.label ?? null);
        setInviteValid(true);
        setServerChildren(data.invite.children ?? []);

        const localForInvite = listProfiles().filter(
          (p) => p.inviteCode === code,
        );
        const hasKids =
          (data.invite.children?.length ?? 0) > 0 ||
          localForInvite.length > 0 ||
          data.invite.setupComplete;

        setMode(hasKids ? "pick_kid" : "setup");
      } catch {
        setError("Could not load your link. Check your internet and try again.");
      }
    }

    void loadInvite();
  }, [code]);

  function saveLocalAndGo(
    child: FamilyChild,
    mediumValue: MediumOfInstruction = "english_medium",
  ) {
    const existing = listProfiles().find(
      (p) =>
        p.inviteCode === code &&
        p.childName.trim().toLowerCase() === child.childName.trim().toLowerCase(),
    );
    if (existing?.id) {
      setActiveProfile(existing.id);
      router.replace("/?welcome=1");
      return;
    }

    const result = tryAddProfile({
      inviteCode: code,
      childName: child.childName,
      grade: child.grade,
      board: child.board,
      medium: mediumValue,
    });
    if (!result.ok) {
      setError(
        result.reason === "duplicate_name"
          ? `${child.childName} is already on this phone.`
          : "Could not save profile. Try again.",
      );
      return;
    }
    router.replace("/?welcome=1");
  }

  async function finishSetup() {
    setSubmitting(true);
    setError(null);

    const trimmedName = childName.trim();
    if (!trimmedName) {
      setError("What's your child's name?");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/family/${code}/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childName: trimmedName,
          grade: grade || undefined,
          board: board || undefined,
        }),
      });

      const body = (await response.json()) as {
        ok?: boolean;
        child?: FamilyChild;
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        if (
          body.error === "database_unavailable" ||
          body.error === "save_failed"
        ) {
          const local = tryAddProfile({
            inviteCode: code,
            childName: trimmedName,
            grade: grade || undefined,
            board: board || undefined,
            medium,
          });
          if (local.ok) {
            router.replace("/?welcome=1");
            return;
          }
        }
        setError(body.message ?? "Could not set up. Try again.");
        return;
      }

      const child = body.child ?? {
        id: "",
        childName: trimmedName,
        grade: grade || undefined,
        board: board || undefined,
      };

      saveLocalAndGo(child, medium);
    } catch {
      const local = tryAddProfile({
        inviteCode: code,
        childName: trimmedName,
        grade: grade || undefined,
        board: board || undefined,
        medium,
      });
      if (local.ok) {
        router.replace("/?welcome=1");
        return;
      }
      setError("Could not set up. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function addKidOnServer() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/family/${code}/children`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childName: childName.trim(),
          grade: grade || undefined,
          board: board || undefined,
        }),
      });
      const body = (await response.json()) as {
        child?: FamilyChild;
        error?: string;
      };
      if (!response.ok) {
        if (body.error === "duplicate_name") {
          saveLocalAndGo({
            id: "",
            childName: childName.trim(),
            grade: grade || undefined,
            board: board || undefined,
          });
          return;
        }
        setError(
          body.error === "max_children"
            ? "This family already has 3 children."
            : "Could not add child. Try again.",
        );
        return;
      }
      if (body.child) {
        saveLocalAndGo(body.child, medium);
      }
    } catch {
      saveLocalAndGo({
        id: "",
        childName: childName.trim(),
        grade: grade || undefined,
        board: board || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleSetupSubmit(event: FormEvent) {
    event.preventDefault();
    void finishSetup();
  }

  function kidsForPicker(): FamilyChild[] {
    if (serverChildren.length > 0) return serverChildren;
    return listProfiles()
      .filter((p) => p.inviteCode === code)
      .map((p) => ({
        id: p.id ?? p.childName,
        childName: p.childName,
        grade: p.grade,
        board: p.board,
      }));
  }

  if (mode === "loading" && !error) {
    return (
      <Card>
        <p className="text-center text-sm text-arjuna-muted">Loading…</p>
      </Card>
    );
  }

  if (error && !inviteValid && mode === "loading") {
    return (
      <Card>
        <p className="text-sm text-red-700">{error}</p>
        <DownloadHint />
      </Card>
    );
  }

  if (mode === "pick_kid") {
    const kids = kidsForPicker();
    const localNames = new Set(
      listProfiles()
        .filter((p) => p.inviteCode === code)
        .map((p) => p.childName.trim().toLowerCase()),
    );

    return (
      <Card>
        <div className="flex flex-col items-center text-center">
          <ArjunaAvatar state="idle" size="sm" />
          <h1 className="mt-3 font-display text-2xl font-bold text-arjuna-text">
            Who is using this phone?
          </h1>
          {label && (
            <p className="mt-1 text-sm text-arjuna-muted">Family: {label}</p>
          )}
          <p className="mt-2 text-sm text-arjuna-muted">
            Tap a name to start homework.
          </p>
        </div>
        <div className="mt-4 space-y-2">
          {kids.map((child) => (
            <Button
              key={child.id || child.childName}
              className="w-full"
              variant={
                localNames.has(child.childName.trim().toLowerCase())
                  ? "secondary"
                  : "primary"
              }
              onClick={() => saveLocalAndGo(child)}
            >
              {child.childName}
              {child.grade ? ` · ${child.grade}` : ""}
            </Button>
          ))}
          {kids.length < 3 && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setChildName("");
                setGrade("");
                setBoard("");
                setMode("add_kid");
              }}
            >
              Add another child
            </Button>
          )}
        </div>
        {error && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <DownloadHint />
      </Card>
    );
  }

  if (mode === "add_kid") {
    return (
      <Card>
        <h1 className="text-xl font-bold text-arjuna-text">
          Add a child
        </h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!childName.trim()) {
              setError("Enter a name.");
              return;
            }
            void addKidOnServer();
          }}
          className="mt-4 space-y-3"
        >
          <input
            type="text"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="Child's name"
            autoComplete="given-name"
            className="input-base"
          />
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setMode("pick_kid")}
            >
              Back
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? "Adding…" : "Start homework"}
            </Button>
          </div>
        </form>
        <DownloadHint />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <ArjunaAvatar state="idle" size="sm" />
        <h1 className="mt-3 text-2xl font-bold text-arjuna-text">
          Who are we helping?
        </h1>
        {label && (
          <p className="mt-1 text-xs text-arjuna-muted">Family: {label}</p>
        )}
        <p className="mt-1.5 text-sm text-arjuna-muted">
          Enter your child&apos;s name — then straight to homework.
        </p>
      </div>

      <form onSubmit={handleSetupSubmit} className="mt-5 space-y-3">
        <div>
          <label className="block text-sm font-semibold text-arjuna-text mb-1.5">
            Child&apos;s name
          </label>
          <input
            type="text"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            required
            autoComplete="given-name"
            placeholder="e.g. Aadya"
            className="input-base"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="text-sm font-medium text-arjuna-primary hover:underline"
        >
          {showDetails ? "Hide details" : "Add grade, board (optional)"}
        </button>

        {showDetails && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-arjuna-text mb-1.5">Grade</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as GradeOption | "")}
                className="input-base"
              >
                <option value="">Select grade</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-arjuna-text mb-1.5">Board</label>
              <select
                value={board}
                onChange={(e) => setBoard(e.target.value as CurriculumBoard | "")}
                className="input-base"
              >
                <option value="">Select board</option>
                {BOARD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-arjuna-text mb-1.5">Language at school</label>
              <select
                value={medium}
                onChange={(e) => setMedium(e.target.value as MediumOfInstruction)}
                className="input-base"
              >
                {MEDIUM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={submitting || !childName.trim()}
          className="w-full"
        >
          {submitting ? "Starting…" : "Start homework"}
        </Button>
      </form>
      <DownloadHint />
    </Card>
  );
}
