"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { InviteRequired } from "./InviteRequired";
import { LessonScreen } from "./LessonScreen";
import {
  getActiveProfile,
  loadChildProfile,
  type ChildProfile,
} from "@/lib/childProfile";

export function DeviceRouter() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(loadChildProfile());
    setReady(true);
  }, []);

  function handleActiveChange() {
    setProfile(getActiveProfile());
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center bg-arjuna-bg px-6">
        <p className="font-display text-sm text-arjuna-muted">Loading…</p>
      </main>
    );
  }

  // Show onboarding when there is no profile yet, or when Settings sends ?addStudent=1
  if (!profile || searchParams.get("addStudent") === "1") {
    return <InviteRequired />;
  }

  return (
    <LessonScreen
      key={profile.id ?? profile.childName}
      profile={profile}
      controller="phone"
      onActiveChange={handleActiveChange}
    />
  );
}
