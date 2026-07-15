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
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-arjuna-muted">
        Who&apos;s learning?
      </p>
      <div className="flex flex-wrap items-end gap-3">
        {profiles.map((p, index) => {
          const isActive = p.id === activeId;
          return (
            <div key={p.id} className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => p.id && handleSwitch(p.id)}
                className={`flex h-14 w-14 items-center justify-center rounded-full font-display text-xl font-bold text-white shadow-chunky transition ${
                  kidColor(index)
                } ${isActive ? "ring-4 ring-arjuna-primary ring-offset-2" : "opacity-80"}`}
              >
                {kidInitial(p.childName)}
              </button>
              <span
                className={`mt-1 max-w-[4rem] truncate text-xs font-semibold ${
                  isActive ? "text-arjuna-text" : "text-arjuna-muted"
                }`}
              >
                {p.childName}
              </span>
              {p.grade && (
                <span className="max-w-[4rem] truncate text-[10px] text-arjuna-muted">
                  {p.grade}
                </span>
              )}
              {isActive && profiles.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setRemovingId((cur) => (cur === p.id ? null : p.id ?? null))
                  }
                  className="mt-0.5 text-[10px] text-arjuna-muted underline"
                >
                  remove
                </button>
              )}
            </div>
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
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-arjuna-primary/40 font-display text-2xl text-arjuna-primaryDark"
          >
            +
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {removingId && (
        <div className="mt-3 rounded-2xl border-2 border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-900">Parent PIN to remove this kid</p>
          <div className="mt-2 flex gap-2">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              className="flex-1 rounded-xl border border-arjuna-border p-2 text-sm"
            />
            <Button
              variant="secondary"
              className="!bg-red-600 !text-white"
              onClick={() => handleRemove(removingId)}
            >
              Remove
            </Button>
          </div>
        </div>
      )}

      {adding && (
        <form
          onSubmit={handleAdd}
          className="mt-3 space-y-2 rounded-2xl border border-arjuna-border bg-white p-4"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Kid's name"
            className="w-full rounded-xl border border-arjuna-border p-3 text-sm"
          />
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value as GradeOption | "")}
            className="w-full rounded-xl border border-arjuna-border p-3 text-sm"
          >
            <option value="">Pick grade</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={medium}
            onChange={(e) => setMedium(e.target.value as MediumOfInstruction)}
            className="w-full rounded-xl border border-arjuna-border p-3 text-sm"
          >
            {MEDIUM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button type="submit" className="w-full">
            Add &amp; switch
          </Button>
        </form>
      )}
    </div>
  );
}
