export type CurriculumBoard = "CBSE" | "ICSE" | "IB" | "State";

/** Backlog: full picker UI. Type is ready so the teaching-plan engine can use it. */
export type TeachingMethod =
  | "nep_ncf"
  | "activity_based"
  | "montessori"
  | "inquiry_ib"
  | "play_way"
  | "experiential"
  | "traditional";

/** Backlog: government Telugu-medium support. Default english_medium. */
export type MediumOfInstruction = "english_medium" | "telugu_medium";

export type ChildProfile = {
  /** Stable per-kid id. Always set on stored profiles; optional on freshly constructed ones. */
  id?: string;
  inviteCode: string;
  childName: string;
  grade?: string;
  board?: CurriculumBoard;
  schoolName?: string;
  medium?: MediumOfInstruction;
  method?: TeachingMethod;
};

type ProfileStore = {
  profiles: ChildProfile[];
  activeId: string;
};

const STORAGE_KEY = "arjuna-child-profile";
const PROFILES_KEY = "arjuna-profiles";
export const MAX_PROFILES = 3;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function generateProfileId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Shared memory key: same school + grade + board -> same curriculum & cache. */
export function buildSchoolKey(
  schoolName: string | undefined,
  grade: string | undefined,
  board: CurriculumBoard | undefined,
): string | null {
  if (!schoolName?.trim() || !grade?.trim()) return null;
  const boardPart = board ? normalize(board) : "any";
  return `${normalize(schoolName)}|${normalize(grade)}|${boardPart}`;
}

/**
 * Scope key for the shared teaching-plan/cache layer.
 * School-specific when a school name exists; otherwise shared State defaults.
 */
export function buildScopeKey(profile: ChildProfile): string {
  const schoolKey = buildSchoolKey(
    profile.schoolName,
    profile.grade,
    profile.board,
  );
  if (schoolKey) return schoolKey;

  const grade = profile.grade ? normalize(profile.grade) : "any";

  if (profile.medium === "telugu_medium") {
    return `state-telugu|${grade}`;
  }

  const board = profile.board ? normalize(profile.board) : "any";
  return `state|${grade}|${board}`;
}

/** Per-student agent key. Stable across name edits because it uses the id. */
export function buildStudentKey(inviteCode: string, profileId: string): string {
  return `${inviteCode}:${profileId}`;
}

/** Backlog helper: which subject is the "bridge" (spoken) subject for a medium. */
export function bridgeSubjectFor(medium: MediumOfInstruction | undefined): string {
  return medium === "telugu_medium" ? "English" : "Hindi";
}

export function normalizeTopicKey(parts: string[]): string {
  return parts.map((p) => normalize(p)).filter(Boolean).join("|");
}

export function buildGreeting(childName: string): string {
  return `Hi ${childName}! What homework do you have? Please upload or tell me the homework.`;
}

function isValidProfile(p: unknown): p is ChildProfile {
  if (!p || typeof p !== "object") return false;
  const c = p as ChildProfile;
  return Boolean(c.inviteCode) && Boolean(c.childName?.trim());
}

function writeStore(store: ProfileStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILES_KEY, JSON.stringify(store));
}

function readStore(): ProfileStore {
  const empty: ProfileStore = { profiles: [], activeId: "" };
  if (typeof window === "undefined") return empty;

  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProfileStore;
      const profiles = (parsed.profiles ?? []).filter(isValidProfile);
      let activeId = parsed.activeId;
      if (!profiles.some((p) => p.id === activeId)) {
        activeId = profiles[0]?.id ?? "";
      }
      return { profiles, activeId };
    }

    // One-time migration from the old single-profile key.
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as ChildProfile;
      if (isValidProfile(parsed)) {
        const id = parsed.id ?? generateProfileId();
        const store: ProfileStore = {
          profiles: [{ ...parsed, id }],
          activeId: id,
        };
        writeStore(store);
        return store;
      }
    }

    return empty;
  } catch {
    return empty;
  }
}

export function listProfiles(): ChildProfile[] {
  return readStore().profiles;
}

export function getActiveProfile(): ChildProfile | null {
  const { profiles, activeId } = readStore();
  return profiles.find((p) => p.id === activeId) ?? profiles[0] ?? null;
}

/** Backward-compatible alias: returns the active profile. */
export function loadChildProfile(): ChildProfile | null {
  return getActiveProfile();
}

export function setActiveProfile(id: string): ChildProfile | null {
  const store = readStore();
  if (!store.profiles.some((p) => p.id === id)) return null;
  writeStore({ ...store, activeId: id });
  return store.profiles.find((p) => p.id === id) ?? null;
}

export function nameExistsInFamily(
  inviteCode: string,
  childName: string,
  excludeId?: string,
): boolean {
  const normalized = childName.trim().toLowerCase();
  if (!normalized) return false;
  return readStore().profiles.some(
    (p) =>
      p.inviteCode === inviteCode &&
      p.id !== excludeId &&
      p.childName.trim().toLowerCase() === normalized,
  );
}

export type AddProfileResult =
  | { ok: true; profile: ChildProfile }
  | { ok: false; reason: "duplicate_name" | "max_profiles" };

/**
 * Adds a new profile (assigns an id) and makes it active.
 */
export function addProfile(profile: ChildProfile): ChildProfile | null {
  const result = tryAddProfile(profile);
  return result.ok ? result.profile : null;
}

export function tryAddProfile(profile: ChildProfile): AddProfileResult {
  const store = readStore();
  if (store.profiles.length >= MAX_PROFILES) {
    return { ok: false, reason: "max_profiles" };
  }
  if (nameExistsInFamily(profile.inviteCode, profile.childName)) {
    return { ok: false, reason: "duplicate_name" };
  }
  const id = profile.id ?? generateProfileId();
  const created: ChildProfile = { ...profile, id };
  writeStore({ profiles: [...store.profiles, created], activeId: id });
  return { ok: true, profile: created };
}

export function removeProfile(id: string): ChildProfile | null {
  const store = readStore();
  const profiles = store.profiles.filter((p) => p.id !== id);
  let activeId = store.activeId;
  if (activeId === id) activeId = profiles[0]?.id ?? "";
  writeStore({ profiles, activeId });
  return getActiveProfileFrom({ profiles, activeId });
}

function getActiveProfileFrom(store: ProfileStore): ChildProfile | null {
  return store.profiles.find((p) => p.id === store.activeId) ?? null;
}

/**
 * Backward-compatible upsert.
 * - If the profile has an id (or matches an existing invite+name), it is updated.
 * - Otherwise a new profile is created (respecting the cap).
 * The affected profile becomes active.
 */
export function saveChildProfile(profile: ChildProfile): ChildProfile {
  const store = readStore();
  const profiles = [...store.profiles];

  let id = profile.id;
  let index = -1;

  if (id) {
    index = profiles.findIndex((p) => p.id === id);
  } else {
    index = profiles.findIndex(
      (p) =>
        p.inviteCode === profile.inviteCode &&
        p.childName.trim().toLowerCase() ===
          profile.childName.trim().toLowerCase(),
    );
    if (index >= 0) id = profiles[index].id;
  }

  if (!id) id = generateProfileId();
  const saved: ChildProfile = { ...profile, id };

  if (index >= 0) {
    profiles[index] = saved;
  } else if (profiles.length < MAX_PROFILES) {
    if (nameExistsInFamily(profile.inviteCode, profile.childName, id)) {
      return profiles.find((p) => p.id === store.activeId) ?? saved;
    }
    profiles.push(saved);
  } else {
    // Cap reached and no match: replace the active slot to preserve old behavior.
    const activeIdx = profiles.findIndex((p) => p.id === store.activeId);
    profiles[activeIdx >= 0 ? activeIdx : 0] = saved;
  }

  writeStore({ profiles, activeId: id });
  return saved;
}

/** Removes the active profile (or all profiles if none active). */
export function clearChildProfile(): void {
  if (typeof window === "undefined") return;
  const store = readStore();
  if (store.activeId) {
    removeProfile(store.activeId);
  } else {
    localStorage.removeItem(PROFILES_KEY);
  }
  // Clean up the legacy key so migration doesn't resurrect old data.
  localStorage.removeItem(STORAGE_KEY);
}

/** Clears every profile on the device. */
export function clearAllProfiles(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILES_KEY);
  localStorage.removeItem(STORAGE_KEY);
}
