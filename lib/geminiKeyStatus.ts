import { loadSettings, saveSettings, type GeminiKeyStatus } from "@/lib/settings";

export function getGeminiKeyStatus(): {
  hasKey: boolean;
  status: GeminiKeyStatus;
  usingServerDefault: boolean;
} {
  const settings = loadSettings();
  const hasKey = Boolean(settings.geminiApiKey?.trim());
  const status = hasKey ? (settings.geminiKeyStatus ?? "unknown") : "unknown";
  return {
    hasKey,
    status,
    usingServerDefault: !hasKey || status !== "valid",
  };
}

export function setGeminiKeyStatus(status: GeminiKeyStatus) {
  saveSettings({
    geminiKeyStatus: status,
    geminiKeyCheckedAt: new Date().toISOString(),
  });
}

export function clearInvalidUserKey() {
  saveSettings({
    geminiApiKey: "",
    geminiKeyStatus: undefined,
    geminiKeyCheckedAt: undefined,
  });
}

export function geminiStatusLabel(
  hasKey: boolean,
  status: GeminiKeyStatus,
  serverOk?: boolean,
): { text: string; tone: "ok" | "warn" | "bad" } {
  if (hasKey && status === "valid") {
    return { text: "Your AI key active", tone: "ok" };
  }
  if (hasKey && status === "invalid") {
    return { text: "Your key not working — using Arjuna AI or fix in Settings", tone: "bad" };
  }
  if (hasKey) {
    return { text: "Key saved — test in Settings", tone: "warn" };
  }
  if (serverOk) {
    return { text: "Arjuna AI ready", tone: "ok" };
  }
  return { text: "Tap to add AI key in Settings", tone: "warn" };
}
