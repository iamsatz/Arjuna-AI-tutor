"use client";

import { FormEvent, useState } from "react";
import {
  addProfile,
  getActiveProfile,
  listProfiles,
  removeProfile,
  setActiveProfile,
  MAX_PROFILES,
  type ChildProfile,
  type CurriculumBoard,
  type MediumOfInstruction,
  type TeachingMethod,
} from "@/lib/childProfile";
import { MEDIUM_OPTIONS, METHOD_OPTIONS } from "@/lib/profileOptions";
import { verifyParentPin } from "@/lib/settings";

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
  const [grade, setGrade] = useState("");
  const [board, setBoard] = useState<CurriculumBoard | "">("");
  const [medium, setMedium] = useState<MediumOfInstruction>("english_medium");
  const [method, setMethod] = useState<TeachingMethod>("experiential");

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
    const created = addProfile({
      inviteCode: active.inviteCode,
      childName: name.trim(),
      grade: grade.trim() || undefined,
      board: board || undefined,
      schoolName: active.schoolName,
      medium,
      method,
    });
    if (!created) {
      setError(`Max ${MAX_PROFILES} kids on one device`);
      return;
    }
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
      <div className="flex flex-wrap items-center gap-2">
        {profiles.map((p) => {
          const isActive = p.id === activeId;
          return (
            <div key={p.id} className="flex items-center">
              <button
                type="button"
                onClick={() => p.id && handleSwitch(p.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  isActive
                    ? "bg-arjuna-primary text-white"
                    : "border border-arjuna-primary/30 bg-white text-arjuna-text"
                }`}
              >
                {p.childName}
              </button>
              {isActive && profiles.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setRemovingId((cur) => (cur === p.id ? null : p.id ?? null))
                  }
                  aria-label={`Remove ${p.childName}`}
                  className="ml-1 text-xs text-arjuna-muted"
                >
                  ✕
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
            className="rounded-full border border-dashed border-arjuna-primary/40 px-3 py-1.5 text-sm font-semibold text-arjuna-primaryDark"
          >
            + Add kid
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {removingId && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-900">
            Parent PIN to remove this kid (deletes their data on this device).
          </p>
          <div className="mt-2 flex gap-2">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              className="flex-1 rounded-lg border p-2 text-sm"
            />
            <button
              type="button"
              onClick={() => handleRemove(removingId)}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {adding && (
        <form
          onSubmit={handleAdd}
          className="mt-3 space-y-2 rounded-xl border border-arjuna-primary/20 bg-white p-3"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Kid's name"
            className="w-full rounded-lg border p-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="Grade (optional)"
              className="flex-1 rounded-lg border p-2 text-sm"
            />
            <select
              value={board}
              onChange={(e) => setBoard(e.target.value as CurriculumBoard | "")}
              className="rounded-lg border p-2 text-sm"
            >
              <option value="">Board</option>
              <option value="CBSE">CBSE</option>
              <option value="ICSE">ICSE</option>
              <option value="IB">IB</option>
              <option value="State">State</option>
            </select>
          </div>
          <select
            value={medium}
            onChange={(e) => setMedium(e.target.value as MediumOfInstruction)}
            className="w-full rounded-lg border p-2 text-sm"
          >
            {MEDIUM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as TeachingMethod)}
            className="w-full rounded-lg border p-2 text-sm"
          >
            {METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="w-full rounded-lg bg-arjuna-primary py-2 text-sm font-semibold text-white"
          >
            Add &amp; switch
          </button>
        </form>
      )}
    </div>
  );
}
