import { getSupabaseServer } from "@/lib/supabase/server";

export type MemoryKind = "explanation" | "quiz" | "plan";

type GetOrCreateParams<T> = {
  schoolKey: string;
  kind: MemoryKind;
  topicKey: string;
  generate: () => Promise<T>;
};

export async function getOrCreate<T>({
  schoolKey,
  kind,
  topicKey,
  generate,
}: GetOrCreateParams<T>): Promise<{ value: T; cached: boolean }> {
  const sb = getSupabaseServer();
  if (!sb) {
    const value = await generate();
    return { value, cached: false };
  }

  const { data: existing, error: readError } = await sb
    .from("arjuna_memory")
    .select("content")
    .eq("school_key", schoolKey)
    .eq("kind", kind)
    .eq("topic_key", topicKey)
    .maybeSingle();

  if (!readError && existing?.content) {
    return { value: existing.content as T, cached: true };
  }

  const value = await generate();

  const { error: writeError } = await sb.from("arjuna_memory").upsert(
    {
      school_key: schoolKey,
      kind,
      topic_key: topicKey,
      content: value as Record<string, unknown>,
    },
    { onConflict: "school_key,kind,topic_key" },
  );

  if (writeError) {
    console.error("memory.getOrCreate write", writeError);
  }

  return { value, cached: false };
}
