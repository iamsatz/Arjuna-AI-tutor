"use client";

import { useEffect, useState } from "react";
import { InviteRequired } from "./InviteRequired";
import { LessonScreen } from "./LessonScreen";
import { TvLessonScreen } from "./TvLessonScreen";
import {
  getActiveProfile,
  listProfiles,
  loadChildProfile,
  MAX_PROFILES,
  type ChildProfile,
} from "@/lib/childProfile";
import { isTvDevice } from "@/lib/platform";

export function DeviceRouter() {
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);

  useEffect(() => {
    setProfile(loadChildProfile());

    // Read ?addStudent=1 via window.location — avoids useSearchParams suspense
    const params = new URLSearchParams(window.location.search);
    if (params.get("addStudent") === "1") {
      // Clear the param so back-navigation never re-triggers
      window.history.replaceState({}, "", "/");
      if (listProfiles().length < MAX_PROFILES) {
        setAddingStudent(true);
      }
    }

    setReady(true);
  }, []);

  function handleActiveChange() {
    setProfile(getActiveProfile());
    setAddingStudent(false);
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center bg-white px-6">
        <p className="font-sans text-sm text-arjuna-muted">Loading…</p>
      </main>
    );
  }

  // TV path — routes any TV user-agent or ?tv=1 to TvLessonScreen
  if (isTvDevice()) {
    return <TvLessonScreen />;
  }

  // Show onboarding when no profile exists, or when user taps "Add student" in Settings
  if (!profile || addingStudent) {
    return (
      <InviteRequired
        onComplete={() => {
          setProfile(getActiveProfile());
          setAddingStudent(false);
        }}
      />
    );
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
