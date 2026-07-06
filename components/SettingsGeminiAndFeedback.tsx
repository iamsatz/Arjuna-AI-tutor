"use client";

import { useState } from "react";
import {
  loadChildProfile,
  saveChildProfile,
  type ChildProfile,
  type TeachingMethod,
} from "@/lib/childProfile";
import {
  loadSettings,
  maskApiKey,
  saveSettings,
} from "@/lib/settings";
import { arjunaFetch } from "@/lib/apiClient";
import {
  normalizeTeachingMethod,
  TEACHING_METHOD_OPTIONS,
} from "@/lib/teachingMethods";

type Props = {
  profile: ChildProfile | null;
  onProfileChange?: () => void;
};

export function SettingsGeminiAndFeedback({ profile, onProfileChange }: Props) {
  const [settings, setSettings] = useState(loadSettings);
  const [geminiInput, setGeminiInput] = useState("");
  const [geminiTest, setGeminiTest] = useState<"idle" | "ok" | "fail">("idle");
  const [geminiTestMsg, setGeminiTestMsg] = useState<string | null>(null);
  const [geminiBusy, setGeminiBusy] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackBy, setFeedbackBy] = useState<"mother" | "father">("mother");
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [method, setMethod] = useState<TeachingMethod>(
    normalizeTeachingMethod(profile?.method),
  );

  const savedKeyHint = maskApiKey(settings.geminiApiKey);

  function refreshSettings() {
    setSettings(loadSettings());
  }

  function saveGeminiKey() {
    const key = geminiInput.trim();
    if (!key) return;
    saveSettings({ geminiApiKey: key });
    setGeminiInput("");
    refreshSettings();
    setGeminiTest("idle");
  }

  function clearGeminiKey() {
    saveSettings({ geminiApiKey: "" });
    setGeminiInput("");
    refreshSettings();
    setGeminiTest("idle");
    setGeminiTestMsg(null);
  }

  async function testGemini() {
    setGeminiBusy(true);
    setGeminiTest("idle");
    setGeminiTestMsg(null);
    try {
      // Test pasted key first — do not silently fall back to an old saved key.
      const pasted = geminiInput.trim();
      const key = pasted || settings.geminiApiKey?.trim();
      if (!key) {
        setGeminiTest("fail");
        setGeminiTestMsg("Paste a key first, then tap Test connection.");
        return;
      }
      const res = await fetch("/api/gemini-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: key }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        rateLimited?: boolean;
        error?: string;
        googleStatus?: number;
        message?: string;
      };
      if (data.ok) {
        setGeminiTest("ok");
        setGeminiTestMsg(
          data.rateLimited
            ? "Key works! Google's free limit is busy right now — try teaching in a minute."
            : pasted
              ? "Connection OK — tap Save key to keep this key on this phone."
              : "Connection OK — AI teaching ready.",
        );
        return;
      }
      setGeminiTest("fail");
      if (data.error === "google_rejected") {
        setGeminiTestMsg(
          "Google rejected this key. Create a fresh key at Google AI Studio and paste the whole key.",
        );
      } else if (data.error === "missing_api_key") {
        setGeminiTestMsg("No key to test. Paste your key above.");
      } else {
        setGeminiTestMsg(data.message ?? "Test failed on our server. Try again.");
      }
    } catch {
      setGeminiTest("fail");
      setGeminiTestMsg("Network error — check internet and try again.");
    } finally {
      setGeminiBusy(false);
    }
  }

  function copyAppUrl() {
    if (typeof window === "undefined") return;
    void navigator.clipboard.writeText(window.location.origin);
    setFeedbackMsg("App URL copied.");
    setTimeout(() => setFeedbackMsg(null), 2000);
  }

  function saveTeachingMethod(id: TeachingMethod) {
    const opt = TEACHING_METHOD_OPTIONS.find((o) => o.id === id);
    if (!opt?.available) return;
    setMethod(id);
    if (!profile) return;
    saveChildProfile({ ...profile, method: id });
    onProfileChange?.();
  }

  async function submitFeedback() {
    const rawText = feedbackText.trim();
    if (!rawText) return;
    setFeedbackBusy(true);
    setFeedbackMsg(null);
    try {
      const res = await arjunaFetch("/api/feedback", {
        method: "POST",
        json: {
          rawText,
          submittedBy: feedbackBy,
          inviteCode: profile?.inviteCode,
          childName: profile?.childName,
        },
      });
      const data = (await res.json()) as { analysis?: { summary?: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setFeedbackText("");
      setFeedbackMsg("Thanks — owner will see this on the dashboard.");
    } catch {
      setFeedbackMsg("Could not send feedback. Add Gemini key and try again.");
    } finally {
      setFeedbackBusy(false);
    }
  }

  return (
    <>
      <section className="mt-6 space-y-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 p-5 shadow-sm">
        <h2 className="font-display text-lg font-bold text-arjuna-text">
          Gemini AI key
        </h2>
        <p className="text-sm text-arjuna-muted">
          Paste your key from{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-indigo-700 underline"
          >
            Google AI Studio
          </a>
          . Unlocks photo reading, teaching chat, and summaries.
        </p>
        {savedKeyHint && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-green-800">Saved: {savedKeyHint}</p>
            <button
              type="button"
              onClick={clearGeminiKey}
              className="text-xs font-semibold text-red-700 underline"
            >
              Remove
            </button>
          </div>
        )}
        <input
          type="password"
          value={geminiInput}
          onChange={(e) => setGeminiInput(e.target.value)}
          placeholder="Paste Gemini API key"
          className="w-full rounded-xl border p-3 text-sm"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={saveGeminiKey}
            disabled={!geminiInput.trim()}
            className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Save key
          </button>
          <button
            type="button"
            onClick={() => void testGemini()}
            disabled={geminiBusy}
            className="flex-1 rounded-xl border border-indigo-300 bg-white py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {geminiBusy ? "Testing…" : "Test connection"}
          </button>
        </div>
        {(geminiTest === "ok" || geminiTest === "fail") && geminiTestMsg && (
          <p
            className={`text-sm ${geminiTest === "ok" ? "text-green-700" : "text-red-700"}`}
          >
            {geminiTestMsg}
          </p>
        )}
        <button
          type="button"
          onClick={copyAppUrl}
          className="w-full rounded-xl border border-indigo-200 bg-white py-2 text-sm font-semibold"
        >
          Copy app URL (for Postman / testing)
        </button>
      </section>

      {profile && (
        <section className="mt-6 space-y-3 rounded-2xl bg-white/95 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-arjuna-text">
            Teaching method · {profile.childName}
          </h2>
          <p className="text-sm text-arjuna-muted">
            How Arjuna explains concepts. Method 1 is live; others unlock after family testing.
          </p>
          <div className="space-y-2">
            {TEACHING_METHOD_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${
                  method === opt.id ? "border-arjuna-primary bg-orange-50/50" : "border-gray-200"
                } ${!opt.available ? "opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name="teachingMethod"
                  checked={method === opt.id}
                  disabled={!opt.available}
                  onChange={() => saveTeachingMethod(opt.id)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold">
                    {opt.label}
                    {!opt.available && (
                      <span className="ml-2 text-xs font-normal text-arjuna-muted">
                        — Coming soon
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-arjuna-muted">{opt.description}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 space-y-4 rounded-2xl border-2 border-teal-200 bg-teal-50/30 p-5 shadow-sm">
        <h2 className="font-display text-lg font-bold text-arjuna-text">
          Session feedback for owner
        </h2>
        <p className="text-sm text-arjuna-muted">
          After homework, Amma or Nanna can note what worked. Gemini analyzes it for the owner dashboard.
        </p>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={feedbackBy === "mother"}
              onChange={() => setFeedbackBy("mother")}
            />
            Amma
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={feedbackBy === "father"}
              onChange={() => setFeedbackBy("father")}
            />
            Nanna
          </label>
        </div>
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="e.g. Voice was good but Aadya got stuck on forty vs fourteen…"
          className="w-full rounded-xl border p-3 text-sm"
          rows={4}
        />
        <button
          type="button"
          disabled={feedbackBusy || !feedbackText.trim()}
          onClick={() => void submitFeedback()}
          className="w-full rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {feedbackBusy ? "Sending…" : "Send to owner dashboard"}
        </button>
        {feedbackMsg && (
          <p className="text-sm text-teal-900">{feedbackMsg}</p>
        )}
      </section>
    </>
  );
}
