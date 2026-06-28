import { NextRequest, NextResponse } from "next/server";
import { extractConceptNotesFromImages } from "@/lib/gemini";
import { getExamById, updateExam } from "@/lib/examStore";

const SOFT_PAGE_CAP = 30;

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_api_key", message: "Add GEMINI_API_KEY to .env.local" },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const examId = form.get("examId")?.toString();
  const topicsRaw = form.get("topics")?.toString();
  const typedTopics = topicsRaw
    ? topicsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  if (!examId) {
    return NextResponse.json({ error: "examId required" }, { status: 400 });
  }

  const exam = await getExamById(examId);
  if (!exam) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const files = form.getAll("pages").filter((f): f is File => f instanceof File);
  if (!files.length) {
    return NextResponse.json({ error: "pages required" }, { status: 400 });
  }

  const warning =
    files.length > SOFT_PAGE_CAP
      ? `Uploaded ${files.length} pages. Processing first ${SOFT_PAGE_CAP}.`
      : undefined;

  const toProcess = files.slice(0, SOFT_PAGE_CAP);
  const images: { base64: string; mimeType: string }[] = [];

  for (const file of toProcess) {
    const buffer = Buffer.from(await file.arrayBuffer());
    images.push({
      base64: buffer.toString("base64"),
      mimeType: file.type || "image/jpeg",
    });
  }

  const mergedTopics = Array.from(
    new Set([...(exam.topics ?? []), ...typedTopics]),
  );

  try {
    const result = await extractConceptNotesFromImages(
      apiKey,
      images,
      mergedTopics,
    );

    if (!result.conceptNotes) {
      return NextResponse.json(
        { error: "extraction_failed", message: "Could not read pages" },
        { status: 422 },
      );
    }

    const updated = await updateExam(examId, {
      conceptNotes: result.conceptNotes,
      topics: mergedTopics,
      pageCount: toProcess.length,
      status: "ready",
    });

    return NextResponse.json({
      exam: updated,
      concepts: result.concepts,
      confidence: result.confidence,
      warning,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Material failed";
    return NextResponse.json({ error: "material_failed", message }, { status: 502 });
  }
}
