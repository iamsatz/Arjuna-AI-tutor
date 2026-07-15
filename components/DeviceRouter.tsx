"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [ready, setReady] = useState(false);
  // When ?addStudent=1 is present we show the onboarding form to add a new student.
  const [addingStudent, setAddingStudent] = useState(false);

  useEffect(() => {
    setProfile(loadChildProfile());

    const wantsAdd = searchParams.get("addStudent") === "1";
    if (wantsAdd) {
      // Clear the param from the URL so navigating back never re-triggers the form.
      router.replace("/");
      const profiles = listProfiles();
      if (profiles.length < MAX_PROFILES) {
        setAddingStudent(true);
      }
      // If already at cap, just land on home — Settings shows the error there.
    }

    setReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleActiveChange() {
    setProfile(getActiveProfile());
    setAddingStudent(false);
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center bg-arjuna-bg px-6">
        <p className="font-sans text-sm text-arjuna-muted">Loading…</p>
      </main>
    );
  }

  // TV path restored — routes any TV user-agent or ?tv=1 to TvLessonScreen
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
