import { loadSettings, saveSettings, type GeminiKeyStatus } from "@/lib/settings";

export function getGeminiKeyStatus(): {
  hasKey: boolean;
  status: GeminiKeyStatus;
} {
  const settings = loadSettings();
  const hasKey = Boolean(settings.geminiApiKey?.trim());
  return {
    hasKey,
    status: hasKey ? (settings.geminiKeyStatus ?? "unknown") : "unknown",
  };
}

export function setGeminiKeyStatus(status: GeminiKeyStatus) {
  saveSettings({
    geminiKeyStatus: status,
    geminiKeyCheckedAt: new Date().toISOString(),
  });
}

export function geminiStatusLabel(
  hasKey: boolean,
  status: GeminiKeyStatus,
): { text: string; tone: "ok" | "warn" | "bad" } {
  if (!hasKey) {
    return { text: "Tap to add AI key in Settings", tone: "warn" };
  }
  if (status === "valid") {
    return { text: "AI teaching ready", tone: "ok" };
  }
  if (status === "invalid") {
    return { text: "AI key not working — fix in Settings", tone: "bad" };
  }
  return { text: "Key saved — test in Settings", tone: "warn" };
}
