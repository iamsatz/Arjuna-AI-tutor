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
  const [serverOk, setServerOk] = useState(false);
  const [dismissed, setDismissed] = useState(false);

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
    void (async () => {
      const savedKey = loadSettings().geminiApiKey?.trim();
      const current = getGeminiKeyStatus();

      if (savedKey && current.status === "unknown") {
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
      }

      if (!savedKey || current.status !== "valid") {
        try {
          const res = await fetch("/api/gemini-test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          const data = (await res.json()) as { ok?: boolean };
          setServerOk(Boolean(data.ok));
        } catch {
          setServerOk(false);
        }
      } else {
        setServerOk(false);
      }
    })();
  }, [hasKey, status]);

  const label = geminiStatusLabel(hasKey, status, serverOk);

  // Don't render anything when AI is working fine or user dismissed
  if (label.tone === "ok" || dismissed) return null;

  return (
    <Link
      href="/settings"
      className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 transition-colors hover:bg-amber-100"
      onClick={() => setDismissed(true)}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
        <span className="truncate text-xs font-semibold text-amber-900">
          {label.text}
        </span>
      </div>
      <span className="shrink-0 text-xs font-semibold text-amber-700">
        Fix in Settings
      </span>
    </Link>
  );
}
