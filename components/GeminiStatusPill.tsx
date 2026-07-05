"use client";

import Link from "next/link";
import { hasGeminiKeyConfigured } from "@/lib/apiClient";

export function GeminiStatusPill() {
  const ready = hasGeminiKeyConfigured();

  if (ready) {
    return (
      <div className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800">
        AI teaching ready
      </div>
    );
  }

  return (
    <Link
      href="/settings"
      className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 underline-offset-2 hover:underline"
    >
      Tap to add AI key in Settings
    </Link>
  );
}
