"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InviteRequired } from "./InviteRequired";
import { LessonScreen } from "./LessonScreen";
import { TvLessonScreen } from "./TvLessonScreen";
import {
  getActiveProfile,
  loadChildProfile,
  type ChildProfile,
} from "@/lib/childProfile";
import { isTvDevice } from "@/lib/platform";

export function DeviceRouter() {
  const router = useRouter();
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(loadChildProfile());
    setReady(true);
  }, []);

  function handleActiveChange() {
    setProfile(getActiveProfile());
  }

  useEffect(() => {
    if (isTvDevice() && window.location.pathname === "/") {
      router.replace("/tv");
    }
  }, [router]);

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center bg-arjuna-bg px-6">
        <p className="font-display text-sm text-arjuna-muted">Loading…</p>
      </main>
    );
  }

  if (typeof window !== "undefined" && isTvDevice()) {
    return <TvLessonScreen />;
  }

  if (!profile) {
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
