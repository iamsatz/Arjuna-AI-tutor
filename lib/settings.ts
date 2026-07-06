export type LanguageMode = "english" | "pure_telugu" | "mixed";
export type DeviceMode = "phone_only" | "phone_tv" | "tv_only";

const SETTINGS_KEY = "arjuna-settings";

export type GeminiKeyStatus = "valid" | "invalid" | "unknown";

export type AppSettings = {
  languageMode: LanguageMode;
  deviceMode: DeviceMode;
  parentPin: string;
  geminiApiKey?: string;
  /** Last known result from Test connection in Settings. */
  geminiKeyStatus?: GeminiKeyStatus;
  geminiKeyCheckedAt?: string;
  /** Optional daily English vocabulary habit. */
  dailyWordsEnabled?: boolean;
  dailyWordsCount?: 5 | 10;
  journalEnabled?: boolean;
  dailyRewardTarget?: number;
};

const DEFAULT_SETTINGS: AppSettings = {
  languageMode: "mixed",
  deviceMode: "phone_only",
  parentPin: "1234",
  dailyWordsEnabled: false,
  dailyWordsCount: 5,
  journalEnabled: true,
  dailyRewardTarget: 3,
};

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const next = { ...loadSettings(), ...partial };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("arjuna-settings-changed"));
  }
  return next;
}

export function verifyParentPin(pin: string): boolean {
  return pin === loadSettings().parentPin;
}

export function maskApiKey(key?: string): string {
  if (!key?.trim()) return "";
  const k = key.trim();
  if (k.length <= 4) return "••••";
  return `••••${k.slice(-4)}`;
}
