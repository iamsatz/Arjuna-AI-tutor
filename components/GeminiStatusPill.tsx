"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  geminiStatusLabel,
  getGeminiKeyStatus,
  setGeminiKeyStatus,
} from "@/lib/geminiKeyStatus";
import { loadSettings, type GeminiKeyStatus } from "@/lib/settings";

export function GeminiStatusPill() {
  const [hasKey, setHasKey] = useState(false);
  const [status, setStatus] = useState<GeminiKeyStatus>("unknown");

  useEffect(() => {
    function refresh() {
      const next = getGeminiKeyStatus();
      setHasKey(next.hasKey);
      setStatus(next.status);
    }
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("arjuna-settings-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("arjuna-settings-changed", refresh);
    };
  }, []);

  useEffect(() => {
    if (!hasKey || status !== "unknown") return;

    const savedKey = loadSettings().geminiApiKey?.trim();
    if (!savedKey) return;

    void (async () => {
      try {
        const res = await fetch("/api/gemini-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ geminiApiKey: savedKey }),
        });
        const data = (await res.json()) as { ok?: boolean };
        const nextStatus: GeminiKeyStatus = data.ok ? "valid" : "invalid";
        setGeminiKeyStatus(nextStatus);
        setStatus(nextStatus);
      } catch {
        // keep unknown on network blip
      }
    })();
  }, [hasKey, status]);

  const label = geminiStatusLabel(hasKey, status);
  const className =
    label.tone === "ok"
      ? "rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800"
      : label.tone === "bad"
        ? "rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 underline-offset-2 hover:underline"
        : "rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 underline-offset-2 hover:underline";

  if (label.tone === "ok") {
    return <div className={className}>{label.text}</div>;
  }

  return (
    <Link href="/settings" className={className}>
      {label.text}
    </Link>
  );
}
