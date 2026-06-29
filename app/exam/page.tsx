"use client";

import { Suspense, useEffect, useState } from "react";
import { ExamHub } from "@/components/ExamHub";
import { InviteRequired } from "@/components/InviteRequired";
import { loadChildProfile, type ChildProfile } from "@/lib/childProfile";

export default function ExamPage() {
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(loadChildProfile());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-arjuna-bg">
        <p className="text-sm text-arjuna-muted">Loading…</p>
      </main>
    );
  }

  if (!profile) {
    return <InviteRequired />;
  }

  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-arjuna-bg">
          <p className="text-sm text-arjuna-muted">Loading…</p>
        </main>
      }
    >
      <ExamHub profile={profile} />
    </Suspense>
  );
}
