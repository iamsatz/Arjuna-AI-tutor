"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function InviteRequired() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    router.push(`/join/${encodeURIComponent(trimmed)}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-arjuna-bg px-6 py-10">
      <div className="rounded-2xl bg-white/95 p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-widest text-arjuna-muted">
          Arjuna
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-arjuna-text">
          Enter your family code
        </h1>
        <p className="mt-3 text-sm text-arjuna-muted">
          Type the family code you received to set up your child&apos;s profile
          and start homework tutoring.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Family code"
            autoComplete="off"
            autoCapitalize="none"
            className="w-full rounded-xl border border-arjuna-primary/20 bg-white px-4 py-3 text-arjuna-text outline-none focus:border-arjuna-primary"
          />
          <button
            type="submit"
            disabled={!code.trim()}
            className="w-full rounded-xl bg-arjuna-primary px-4 py-3 font-semibold text-white transition hover:bg-arjuna-primaryDark disabled:opacity-60"
          >
            Continue
          </button>
        </form>

        <p className="mt-4 text-xs text-arjuna-muted">
          No code? Open the invite link you received instead.
        </p>
      </div>
    </main>
  );
}
