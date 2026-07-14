"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArjunaAvatar } from "@/components/ArjunaAvatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * Accept whatever the parent has: a bare code ("family01"), the code with
 * stray spaces/capitals, or the entire WhatsApp link pasted as-is.
 */
export function extractFamilyCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const fromLink = trimmed.match(/join\/([A-Za-z0-9_-]+)/);
  if (fromLink) return fromLink[1].toLowerCase();
  return trimmed.replace(/\s+/g, "").toLowerCase();
}

export function InviteRequired() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const extracted = extractFamilyCode(code);
    if (!extracted) return;
    router.push(`/join/${encodeURIComponent(extracted)}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center bg-arjuna-bg px-5 py-10">
      <div className="flex flex-col items-center text-center">
        <ArjunaAvatar state="idle" size="sm" />
        <h1 className="mt-4 text-2xl font-bold text-arjuna-text">
          Welcome to Arjuna
        </h1>
        <p className="mt-2 text-sm text-arjuna-muted leading-relaxed">
          Got a WhatsApp link from your family? Just tap it — or paste it below, the full link works.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-3">
        <div>
          <label className="block text-sm font-semibold text-arjuna-text mb-1.5">
            Family code or link
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="family01 — or paste the full link"
            autoComplete="off"
            autoCapitalize="none"
            className="input-base"
          />
          <p className="mt-1.5 text-xs text-arjuna-muted">
            Your code is the last part of the link: …/join/<strong>family01</strong>
          </p>
        </div>
        <Button
          type="submit"
          disabled={!code.trim()}
          className="w-full"
        >
          Continue
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-arjuna-muted">
        Need the app on TV or Android?{" "}
        <Link href="/download" className="font-semibold text-arjuna-primary hover:underline">
          Get the app
        </Link>
      </p>
    </main>
  );
}
