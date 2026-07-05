import { NextRequest, NextResponse } from "next/server";
import { buildSchoolKey, type CurriculumBoard } from "@/lib/childProfile";
import {
  getCurriculumBySchoolKey,
  saveCurriculum,
} from "@/lib/curriculumStore";
import { extractCurriculum } from "@/lib/gemini";
import { missingGeminiResponse } from "@/lib/userErrors";
import { resolveGeminiKey } from "@/lib/resolveApiKey";

export async function GET(request: NextRequest) {
  const schoolKey = request.nextUrl.searchParams.get("schoolKey");
  if (!schoolKey) {
    return NextResponse.json({ error: "schoolKey required" }, { status: 400 });
  }

  const curriculum = await getCurriculumBySchoolKey(schoolKey);
  if (!curriculum) {
    return NextResponse.json({ curriculum: null });
  }

  return NextResponse.json({ curriculum });
}

export async function POST(request: NextRequest) {
  const apiKey = resolveGeminiKey(request);

  const form = await request.formData();
  const schoolName = String(form.get("schoolName") ?? "").trim();
  const grade = String(form.get("grade") ?? "").trim();
  const boardRaw = String(form.get("board") ?? "").trim();
  const board = (boardRaw || undefined) as CurriculumBoard | undefined;
  const replace = String(form.get("replace") ?? "") === "true";

  if (!schoolName || !grade) {
    return NextResponse.json(
      { error: "schoolName and grade required" },
      { status: 400 },
    );
  }

  const schoolKey = buildSchoolKey(schoolName, grade, board);
  if (!schoolKey) {
    return NextResponse.json({ error: "invalid_school_key" }, { status: 400 });
  }

  const existing = await getCurriculumBySchoolKey(schoolKey);
  if (existing && !replace) {
    return NextResponse.json({ curriculum: existing, reused: true });
  }

  const files = form.getAll("pages").filter((f): f is File => f instanceof File);
  if (!files.length) {
    return NextResponse.json(
      {
        error: "pages required",
        message: "Upload diary term pages, PDF or photos (optional fallback)",
      },
      { status: 400 },
    );
  }

  if (!apiKey) {
    return missingGeminiResponse();
  }

  try {
    const images: { base64: string; mimeType: string }[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      images.push({
        base64: buffer.toString("base64"),
        mimeType: file.type || "application/octet-stream",
      });
    }

    const parsed = await extractCurriculum(apiKey, images);

    if (!parsed.subjects.length) {
      return NextResponse.json(
        {
          error: "parse_failed",
          message: parsed.notes || "Could not read curriculum document",
        },
        { status: 422 },
      );
    }

    const curriculum = await saveCurriculum({
      schoolKey,
      schoolName,
      grade,
      board,
      term: parsed.term || undefined,
      subjects: parsed.subjects,
      rawText: parsed.rawText,
    });

    if (!curriculum) {
      return NextResponse.json({ error: "save_failed" }, { status: 502 });
    }

    return NextResponse.json({ curriculum, reused: false, replaced: replace });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Curriculum upload failed";
    return NextResponse.json({ error: "extract_failed", message }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const schoolKey = request.nextUrl.searchParams.get("schoolKey");
  if (!schoolKey) {
    return NextResponse.json({ error: "schoolKey required" }, { status: 400 });
  }

  const sb = (await import("@/lib/supabase/server")).getSupabaseServer();
  if (!sb) {
    return NextResponse.json({ error: "missing_config" }, { status: 503 });
  }

  const { error } = await sb
    .from("arjuna_curricula")
    .delete()
    .eq("school_key", schoolKey);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
