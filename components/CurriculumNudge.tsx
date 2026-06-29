"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildSchoolKey, type ChildProfile } from "@/lib/childProfile";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
      } catch {
        setHasCurriculum(false);
      }
    }
    void check();
  }, [schoolKey]);

  if (hasCurriculum === true) {
    return (
      <Card className="mb-4 border-green-200 bg-green-50 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-green-800">
          <span>✓</span> Syllabus added — Arjuna teaches in your school style
        </p>
      </Card>
    );
  }

  if (hasCurriculum === null) return null;

  return (
    <Card className="mb-4 border-purple-200 bg-purple-50">
      <p className="font-display font-bold text-arjuna-text">
        Add your child&apos;s syllabus
      </p>
      <p className="mt-1 text-sm text-arjuna-muted">
        Upload the term plan once in Settings. Arjuna uses it to teach the way
        your school teaches — no extra setup each day.
      </p>
      <Link href="/settings" className="mt-3 block">
        <Button variant="secondary" className="w-full">
          Go to Settings → Upload syllabus
        </Button>
      </Link>
    </Card>
  );
}
