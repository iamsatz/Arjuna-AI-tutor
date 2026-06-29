import { getSupabaseServer } from "@/lib/supabase/server";

export type OutcomeResult = "understood" | "struggled" | "doubt";

export type StudentMemoryProfile = {
  weakTopics: string[];
  masteredTopics: string[];
  recentHomework: string[];
  learningStyleNotes: string[];
  struggleCounts: Record<string, number>;
  totalSessions: number;
};

export type StudentMemory = {
  studentKey: string;
  inviteCode?: string;
  childName?: string;
  schoolKey?: string;
  profile: StudentMemoryProfile;
  updatedAt?: string;
};

const MAX_LIST = 12;

function emptyProfile(): StudentMemoryProfile {
  return {
    weakTopics: [],
    masteredTopics: [],
    recentHomework: [],
    learningStyleNotes: [],
    struggleCounts: {},
    totalSessions: 0,
  };
}

function normalizeProfile(raw: unknown): StudentMemoryProfile {
  const base = emptyProfile();
  if (!raw || typeof raw !== "object") return base;
  const p = raw as Partial<StudentMemoryProfile>;
  return {
    weakTopics: Array.isArray(p.weakTopics) ? p.weakTopics.slice(0, MAX_LIST) : [],
    masteredTopics: Array.isArray(p.masteredTopics)
      ? p.masteredTopics.slice(0, MAX_LIST)
      : [],
    recentHomework: Array.isArray(p.recentHomework)
      ? p.recentHomework.slice(0, MAX_LIST)
      : [],
    learningStyleNotes: Array.isArray(p.learningStyleNotes)
      ? p.learningStyleNotes.slice(0, MAX_LIST)
      : [],
    struggleCounts:
      p.struggleCounts && typeof p.struggleCounts === "object"
        ? (p.struggleCounts as Record<string, number>)
        : {},
    totalSessions: typeof p.totalSessions === "number" ? p.totalSessions : 0,
  };
}

export async function getStudentMemory(
  studentKey: string,
): Promise<StudentMemory> {
  const sb = getSupabaseServer();
  if (!sb) {
    return { studentKey, profile: emptyProfile() };
  }

  const { data, error } = await sb
    .from("arjuna_student_memory")
    .select("*")
    .eq("student_key", studentKey)
    .maybeSingle();

  if (error || !data) {
    return { studentKey, profile: emptyProfile() };
  }

  return {
    studentKey,
    inviteCode: (data.invite_code as string | null) ?? undefined,
    childName: (data.child_name as string | null) ?? undefined,
    schoolKey: (data.school_key as string | null) ?? undefined,
    profile: normalizeProfile(data.profile),
    updatedAt: (data.updated_at as string | null) ?? undefined,
  };
}

function pushUnique(list: string[], value: string): string[] {
  const v = value.trim();
  if (!v) return list;
  const next = [v, ...list.filter((x) => x.toLowerCase() !== v.toLowerCase())];
  return next.slice(0, MAX_LIST);
}

function removeItem(list: string[], value: string): string[] {
  return list.filter((x) => x.toLowerCase() !== value.trim().toLowerCase());
}

type RecordOutcomeInput = {
  studentKey: string;
  inviteCode?: string;
  childName?: string;
  schoolKey?: string;
  subject?: string;
  topic: string;
  result: OutcomeResult;
  note?: string;
};

export async function recordOutcome(
  input: RecordOutcomeInput,
): Promise<StudentMemory> {
  const current = await getStudentMemory(input.studentKey);
  const profile = current.profile;
  const topic = input.topic.trim();

  if (topic) {
    if (input.result === "understood") {
      profile.masteredTopics = pushUnique(profile.masteredTopics, topic);
      profile.weakTopics = removeItem(profile.weakTopics, topic);
    } else if (input.result === "struggled") {
      profile.weakTopics = pushUnique(profile.weakTopics, topic);
      profile.struggleCounts[topic] = (profile.struggleCounts[topic] ?? 0) + 1;
    } else if (input.result === "doubt") {
      profile.weakTopics = pushUnique(profile.weakTopics, topic);
    }
  }

  if (input.subject && topic) {
    profile.recentHomework = pushUnique(
      profile.recentHomework,
      `${input.subject}: ${topic}`,
    );
  }

  if (input.note?.trim()) {
    profile.learningStyleNotes = pushUnique(
      profile.learningStyleNotes,
      input.note.trim(),
    );
  }

  const sb = getSupabaseServer();
  if (!sb) {
    return { ...current, profile };
  }

  const { error } = await sb.from("arjuna_student_memory").upsert(
    {
      student_key: input.studentKey,
      invite_code: input.inviteCode ?? current.inviteCode ?? null,
      child_name: input.childName ?? current.childName ?? null,
      school_key: input.schoolKey ?? current.schoolKey ?? null,
      profile,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_key" },
  );

  if (error) {
    console.error("recordOutcome", error);
  }

  return {
    studentKey: input.studentKey,
    inviteCode: input.inviteCode ?? current.inviteCode,
    childName: input.childName ?? current.childName,
    schoolKey: input.schoolKey ?? current.schoolKey,
    profile,
  };
}

/** Short teaching hints for the system prompt. Empty array when nothing learned yet. */
export function buildStudentNotes(memory: StudentMemory): string[] {
  const notes: string[] = [];
  const { profile, childName } = memory;
  const who = childName ?? "This child";

  const repeatedStruggles = Object.entries(profile.struggleCounts)
    .filter(([, count]) => count >= 2)
    .map(([topic]) => topic);

  if (repeatedStruggles.length) {
    notes.push(
      `${who} has struggled repeatedly with: ${repeatedStruggles.join(", ")}. Go slower and use real objects/examples.`,
    );
  } else if (profile.weakTopics.length) {
    notes.push(
      `${who} recently found these tricky: ${profile.weakTopics.slice(0, 3).join(", ")}. Be extra patient here.`,
    );
  }

  if (profile.masteredTopics.length) {
    notes.push(
      `${who} already understands: ${profile.masteredTopics.slice(0, 3).join(", ")}. No need to re-explain basics.`,
    );
  }

  for (const note of profile.learningStyleNotes.slice(0, 2)) {
    notes.push(note);
  }

  return notes;
}
