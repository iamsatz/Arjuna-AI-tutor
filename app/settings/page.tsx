"use client";

import { useState } from "react";
import Link from "next/link";
import {
  loadSettings,
  saveSettings,
  type DeviceMode,
  type LanguageMode,
} from "@/lib/settings";

export default function SettingsPage() {
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);

  function update(partial: Partial<typeof settings>) {
    const next = saveSettings(partial);
    setSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-arjuna-bg px-6 py-10">
      <Link href="/" className="text-sm text-arjuna-primaryDark underline">
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-arjuna-text">Settings</h1>

      <section className="mt-6 space-y-4 rounded-2xl bg-white/95 p-5 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium">Language mode</span>
          <select
            value={settings.languageMode}
            onChange={(e) =>
              update({ languageMode: e.target.value as LanguageMode })
            }
            className="mt-2 w-full rounded-xl border p-3"
          >
            <option value="english">English only</option>
            <option value="pure_telugu">Pure Telugu</option>
            <option value="mixed">Mixed (English + Telugu)</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Device mode</span>
          <select
            value={settings.deviceMode}
            onChange={(e) =>
              update({ deviceMode: e.target.value as DeviceMode })
            }
            className="mt-2 w-full rounded-xl border p-3"
          >
            <option value="phone_only">Phone only</option>
            <option value="phone_tv">Phone upload → TV lesson</option>
            <option value="tv_only">TV only (mic + type)</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Parent PIN (default 1234)</span>
          <input
            type="password"
            value={settings.parentPin}
            onChange={(e) => update({ parentPin: e.target.value })}
            className="mt-2 w-full rounded-xl border p-3"
          />
        </label>

        {saved && (
          <p className="text-sm text-green-700">Saved. Reload lesson to apply.</p>
        )}
      </section>

      <Link
        href="/roadmap"
        className="mt-6 block text-center text-sm text-arjuna-muted underline"
      >
        See coming soon features
      </Link>
    </main>
  );
}
