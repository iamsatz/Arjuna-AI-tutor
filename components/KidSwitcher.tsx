"use client";

import { FormEvent, useState } from "react";
import {
  addProfile,
  tryAddProfile,
  getActiveProfile,
  listProfiles,
  removeProfile,
  setActiveProfile,
  MAX_PROFILES,
  type ChildProfile,
  type CurriculumBoard,
  type MediumOfInstruction,
} from "@/lib/childProfile";
import {
  GRADE_OPTIONS,
  MEDIUM_OPTIONS,
  kidColor,
  kidInitial,
  type GradeOption,
} from "@/lib/profileOptions";
import { verifyParentPin } from "@/lib/settings";
import { Button } from "@/components/ui/Button";

type KidSwitcherProps = {
  onActiveChange?: (id: string) => void;
};

export function KidSwitcher({ onActiveChange }: KidSwitcherProps) {
  const [profiles, setProfiles] = useState<ChildProfile[]>(() => listProfiles());
  const [activeId, setActiveId] = useState<string>(
    () => getActiveProfile()?.id ?? "",
  );
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [grade, setGrade] = useState<GradeOption | "">("");
  const [board, setBoard] = useState<CurriculumBoard | "">("");
  const [medium, setMedium] = useState<MediumOfInstruction>("english_medium");

  const active = profiles.find((p) => p.id === activeId) ?? profiles[0] ?? null;

  function refresh(nextActiveId?: string) {
    const list = listProfiles();
    setProfiles(list);
    const id = nextActiveId ?? getActiveProfile()?.id ?? list[0]?.id ?? "";
    setActiveId(id);
    if (id) onActiveChange?.(id);
  }

  function handleSwitch(id: string) {
    if (id === activeId) return;
    setActiveProfile(id);
    refresh(id);
  }

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!active) return;
    if (!name.trim()) {
      setError("Enter a name");
      return;
    }
    const result = tryAddProfile({
      inviteCode: active.inviteCode,
      childName: name.trim(),
      grade: grade || undefined,
      board: board || undefined,
      schoolName: active.schoolName,
      medium,
    });
    if (!result.ok) {
      setError(
        result.reason === "duplicate_name"
          ? `${name.trim()} already exists — use a different name`
          : `Max ${MAX_PROFILES} kids on one device`,
      );
      return;
    }
    const created = result.profile;
    setName("");
    setGrade("");
    setBoard("");
    setAdding(false);
    refresh(created.id);
  }

  function handleRemove(id: string) {
    setError(null);
    if (!verifyParentPin(pin)) {
      setError("Wrong PIN");
      return;
    }
    removeProfile(id);
    setRemovingId(null);
    setPin("");
    refresh();
  }

  if (profiles.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-arjuna-muted">
        Who&apos;s learning?
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {profiles.map((p, index) => {
          const isActive = p.id === activeId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => p.id && handleSwitch(p.id)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-all ${
                isActive
                  ? "bg-arjuna-surface shadow-card ring-1 ring-arjuna-primary/40"
                  : "bg-arjuna-border/40 hover:bg-arjuna-border/60"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${kidColor(index)}`}
              >
                {kidInitial(p.childName)}
              </span>
              <div className="text-left">
                <p
                  className={`text-sm font-semibold leading-tight ${
                    isActive ? "text-arjuna-text" : "text-arjuna-muted"
                  }`}
                >
                  {p.childName}
                </p>
                {p.grade && (
                  <p className="text-[10px] text-arjuna-muted">{p.grade}</p>
                )}
              </div>
            </button>
          );
        })}

        {profiles.length < MAX_PROFILES && (
          <button
            type="button"
            onClick={() => {
              setAdding((v) => !v);
              setRemovingId(null);
              setError(null);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-dashed border-arjuna-primary/40 text-arjuna-muted hover:border-arjuna-primary hover:text-arjuna-primary transition-colors"
            aria-label="Add child"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-arjuna-red">{error}</p>}

      {adding && (
        <form
          onSubmit={handleAdd}
          className="mt-3 space-y-2 rounded-2xl border border-arjuna-border bg-arjuna-surface p-4 shadow-card"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Child's name"
            className="input-base"
          />
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value as GradeOption | "")}
            className="input-base"
          >
            <option value="">Select grade</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={medium}
            onChange={(e) => setMedium(e.target.value as MediumOfInstruction)}
            className="input-base"
          >
            {MEDIUM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Add &amp; switch
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {removingId && (
        <div className="mt-3 rounded-2xl border border-arjuna-border bg-arjuna-surface p-4 shadow-card">
          <p className="mb-2 text-sm font-semibold text-arjuna-text">
            Enter parent PIN to remove
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              className="input-base"
            />
            <Button
              variant="danger"
              onClick={() => handleRemove(removingId)}
            >
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
