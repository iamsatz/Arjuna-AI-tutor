#!/usr/bin/env node
/**
 * Post-build release checklist helper.
 * Usage: node scripts/release.mjs
 */
import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "..");

console.log("\nArjuna release checklist\n");

try {
  console.log("1. Running production build…");
  execSync("npm run build", { cwd: root, stdio: "inherit" });
} catch {
  console.error("Build failed. Fix errors before deploying.");
  process.exit(1);
}

console.log("\n2. Deploy web (run manually if not using Vercel CLI):");
console.log("   vercel --prod");
console.log("\n3. Update CAPACITOR_SERVER_URL in .env.local to your HTTPS URL");
console.log("\n4. Sync Android:");
console.log("   npm run cap:sync");
console.log("   npx cap open android");
console.log("   → Build → Build APK(s) in Android Studio");
console.log("\n5. Copy APK to public/Arjuna-latest.apk and redeploy web");
console.log("\n6. Run Supabase migrations if new:");
console.log("   supabase/migrations/002_arjuna_feedback.sql");

const apkHint = resolve(root, "android/app/build/outputs/apk");
if (existsSync(apkHint)) {
  console.log(`\n   APK output folder exists: ${apkHint}`);
}

console.log("\nDone.\n");
