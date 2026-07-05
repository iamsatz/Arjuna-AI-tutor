"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArjunaAvatar } from "@/components/ArjunaAvatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
      <Card>
        <div className="flex flex-col items-center text-center">
          <ArjunaAvatar state="idle" size="sm" />
          <h1 className="mt-4 font-display text-2xl font-bold text-arjuna-text">
            Welcome to Arjuna
          </h1>
          <p className="mt-2 text-sm text-arjuna-muted">
            Open the link your family sent on WhatsApp — or enter your family
            code below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-arjuna-text">
              Family code
            </span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. family01"
              autoComplete="off"
              autoCapitalize="none"
              className="mt-2 w-full rounded-2xl border-2 border-orange-100 bg-white px-4 py-3.5 font-semibold text-arjuna-text outline-none focus:border-arjuna-primary"
            />
          </label>
          <Button
            type="submit"
            size="lg"
            disabled={!code.trim()}
            className="w-full"
          >
            Continue
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-arjuna-muted">
          Need the app on TV or Android?{" "}
          <Link href="/download" className="font-semibold text-indigo-700 underline">
            Get the app
          </Link>
        </p>
      </Card>
    </main>
  );
}
