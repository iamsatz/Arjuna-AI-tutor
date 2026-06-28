export type LanguageMode = "english" | "pure_telugu" | "mixed";
export type DeviceMode = "phone_only" | "phone_tv" | "tv_only";

const SETTINGS_KEY = "arjuna-settings";

export type AppSettings = {
  languageMode: LanguageMode;
  deviceMode: DeviceMode;
  parentPin: string;
};

const DEFAULT_SETTINGS: AppSettings = {
  languageMode: "mixed",
  deviceMode: "phone_only",
  parentPin: "1234",
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
  return next;
}

export function verifyParentPin(pin: string): boolean {
  return pin === loadSettings().parentPin;
}
