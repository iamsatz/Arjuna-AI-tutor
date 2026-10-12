#!/usr/bin/env node
/**
 * Asserts each language mode sends the right saaras:v3 parameters to Sarvam,
 * so a child speaking English is never transcribed as Telugu. Stubs global
 * fetch and inspects the outgoing multipart form — no API key or dev server
 * needed.
 *
 * Usage: npm run check:stt
 */

import {
  greetingFor,
  sttSettingsFor,
  transcribeSpeech,
} from "../lib/sarvam.ts";

const EXPECTED = [
  { languageMode: "pure_telugu", languageCode: "te-IN", mode: "transcribe" },
  { languageMode: "mixed", languageCode: "unknown", mode: "codemix" },
  { languageMode: "english", languageCode: "en-IN", mode: "transcribe" },
  // Missing or unrecognised values fall back to the app default (mixed).
  { languageMode: undefined, languageCode: "unknown", mode: "codemix" },
  { languageMode: "klingon", languageCode: "unknown", mode: "codemix" },
];

const failures = [];

function check(pass, line, reason) {
  console.log(`${pass ? "✅" : "❌"} ${line}`);
  if (!pass) failures.push(reason);
}

async function checkOutgoingForm() {
  console.log("Sarvam STT request parameters per language mode\n");
  const realFetch = globalThis.fetch;

  for (const expected of EXPECTED) {
    let body = null;
    globalThis.fetch = async (_url, init) => {
      body = init.body;
      return { ok: true, json: async () => ({ transcript: "ok" }) };
    };

    await transcribeSpeech("test-key", Buffer.from("audio"), {
      languageMode: expected.languageMode,
    });

    const label = expected.languageMode ?? "(absent)";
    const model = body.get("model");
    const languageCode = body.get("language_code");
    const mode = body.get("mode");

    check(
      model === "saaras:v3" &&
        languageCode === expected.languageCode &&
        mode === expected.mode,
      `${label.padEnd(12)} model=${model} language_code=${languageCode} mode=${mode}`,
      `${label}: expected language_code=${expected.languageCode} mode=${expected.mode}, got language_code=${languageCode} mode=${mode}`,
    );
  }

  globalThis.fetch = realFetch;
}

function checkGreetings() {
  console.log("\nGreeting script per language mode\n");
  const telugu = /[\u0C00-\u0C7F]/;
  const latin = /[a-zA-Z]/;

  const pureTelugu = greetingFor("pure_telugu");
  check(
    telugu.test(pureTelugu) && !latin.test(pureTelugu),
    `pure_telugu  ${pureTelugu}`,
    "pure_telugu greeting must be Telugu script with no English words",
  );

  const english = greetingFor("english");
  check(
    latin.test(english) && !telugu.test(english),
    `english      ${english}`,
    "english greeting must contain no Telugu script",
  );

  const mixed = greetingFor("mixed");
  check(
    telugu.test(mixed) && latin.test(mixed),
    `mixed        ${mixed}`,
    "mixed greeting must contain both Telugu and English",
  );

  check(
    greetingFor(undefined) === mixed && greetingFor("klingon") === mixed,
    "(absent)     falls back to the mixed greeting",
    "unknown language modes must fall back to the mixed greeting",
  );
}

function checkSettingsHelper() {
  console.log("\nsttSettingsFor covers every mode\n");
  for (const { languageMode, languageCode, mode } of EXPECTED) {
    const actual = sttSettingsFor(languageMode);
    check(
      actual.languageCode === languageCode && actual.mode === mode,
      `${(languageMode ?? "(absent)").padEnd(12)} ${actual.languageCode} / ${actual.mode}`,
      `sttSettingsFor(${languageMode}) returned ${actual.languageCode}/${actual.mode}`,
    );
  }
}

async function main() {
  await checkOutgoingForm();
  checkGreetings();
  checkSettingsHelper();

  console.log("");
  if (failures.length) {
    for (const f of failures) console.log(`  - ${f}`);
    console.log(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }
  console.log("All speech-language checks passed.");
}

main();
