"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildSchoolKey, type ChildProfile } from "@/lib/childProfile";
import { Button } from "@/components/ui/Button";
import { logDevError } from "@/lib/devLog";

type CurriculumNudgeProps = {
  profile: ChildProfile;
};

export function CurriculumNudge({ profile }: CurriculumNudgeProps) {
  const [hasCurriculum, setHasCurriculum] = useState<boolean | null>(null);
  const schoolKey = buildSchoolKey(
    profile.schoolName,
    profile.grade,
    profile.board,
  );

  useEffect(() => {
    if (!schoolKey) {
      setHasCurriculum(false);
      return;
    }
    async function check() {
      try {
        const res = await fetch(
          `/api/curriculum?schoolKey=${encodeURIComponent(schoolKey!)}`,
        );
        if (!res.ok) {
          setHasCurriculum(false);
          return;
        }
        const data = (await res.json()) as { curriculum: unknown | null };
        setHasCurriculum(Boolean(data.curriculum));
      } catch (err) {
        logDevError("CurriculumNudge check", err);
        setHasCurriculum(false);
      }
    }
    void check();
  }, [schoolKey]);

  if (hasCurriculum === true) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-green-600">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-sm font-medium text-green-800">
          Syllabus loaded — Arjuna teaches in your school style
        </p>
      </div>
    );
  }

  if (hasCurriculum === null) return null;

  return (
    <div className="mb-3 flex items-start gap-3 rounded-2xl border border-arjuna-border bg-arjuna-surface p-3.5 shadow-card">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-arjuna-bg">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-arjuna-muted">
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-arjuna-text">
          Add your child&apos;s syllabus
        </p>
        <p className="mt-0.5 text-xs text-arjuna-muted">
          Upload once in Settings so Arjuna teaches in your school&apos;s style.
        </p>
        <div className="mt-2">
          <Link href="/settings">
            <Button size="sm" variant="secondary">
              Upload syllabus
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
