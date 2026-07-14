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

  const toneClasses =
    label.tone === "ok"
      ? "bg-green-50 text-green-700 border-green-200"
      : label.tone === "bad"
        ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
        : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100";

  const base = `inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${toneClasses}`;

  const dot =
    label.tone === "ok"
      ? "bg-green-500"
      : label.tone === "bad"
        ? "bg-red-500"
        : "bg-amber-500";

  const content = (
    <>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label.text}
    </>
  );

  if (label.tone === "ok") {
    return <div className={base}>{content}</div>;
  }

  return (
    <Link href="/settings" className={base}>
      {content}
    </Link>
  );
}
