import type { CapacitorConfig } from "@capacitor/cli";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

function loadCapacitorUrlFromEnvLocal() {
  const envPath = resolve(__dirname, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key === "CAPACITOR_SERVER_URL" && value) {
      process.env.CAPACITOR_SERVER_URL = value;
    }
  }
}

loadCapacitorUrlFromEnvLocal();

/**
 * The APK loads your Next.js app in a WebView from this URL.
 * - Home Wi‑Fi trial: http://YOUR_MAC_IP:3000 (dev server must be running)
 * - Standalone phone: https://your-app.vercel.app (deploy first)
 *
 * Set in .env.local: CAPACITOR_SERVER_URL=http://192.168.0.20:3000
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.arjuna.tutor",
  appName: "Arjuna",
  webDir: "www",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith("http://"),
      }
    : undefined,
  android: {
    allowMixedContent: true,
  },
};

export default config;
