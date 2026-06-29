import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { generateSessionSummary } from "@/lib/gemini";
import { missingGeminiResponse } from "@/lib/userErrors";
import { appendSession } from "@/lib/sessionsStore";
import { sendWhatsAppText } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return missingGeminiResponse();
  }

  const body = (await request.json()) as {
    transcript: string;
    durationMin?: number;
    childName?: string;
    inviteCode?: string;
  };
  if (!body.transcript?.trim()) {
    return NextResponse.json({ error: "transcript required" }, { status: 400 });
  }

  try {
    const summary = await generateSessionSummary(geminiKey, body.transcript);
    const timeLine = body.durationMin
      ? `\nTotal time: ${body.durationMin} min`
      : "";

    const teluguMsg = `${summary.telugu_summary}${timeLine}`;
    const englishMsg = `${summary.english_summary}${timeLine}`;

    const whatsappSent = { mother: false, father: false };

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    const mother = process.env.PARENT_PHONE_MOTHER;
    const father = process.env.PARENT_PHONE_FATHER;

    if (token && phoneId && mother) {
      await sendWhatsAppText(token, phoneId, mother, teluguMsg);
      whatsappSent.mother = true;
    }
    if (token && phoneId && father) {
      await sendWhatsAppText(token, phoneId, father, englishMsg);
      whatsappSent.father = true;
    }

    await appendSession({
      id: randomUUID(),
      date: new Date().toISOString(),
      durationMin: body.durationMin,
      childName: body.childName,
      inviteCode: body.inviteCode,
      english_summary: summary.english_summary,
      telugu_summary: summary.telugu_summary,
      whatsappSent,
    });

    return NextResponse.json({
      ...summary,
      whatsappSent,
      preview: { telugu: teluguMsg, english: englishMsg },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Summary failed";
    return NextResponse.json({ error: "summary_failed", message }, { status: 502 });
  }
}
