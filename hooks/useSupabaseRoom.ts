"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { LessonState } from "@/lib/lessonTypes";

export function useSupabaseRoomSubscriber(code: string | null) {
  const [state, setState] = useState<LessonState | null>(null);
  const [connected, setConnected] = useState(false);
  const [tvLinked, setTvLinked] = useState(false);

  useEffect(() => {
    if (!code) {
      setState(null);
      setConnected(false);
      return;
    }

    let cancelled = false;

    async function joinAndLoad() {
      try {
        await fetch("/api/room/supabase", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, role: "tv" }),
        });

        const res = await fetch(`/api/room/supabase?code=${code}`);
        if (!res.ok) {
          if (!cancelled) setConnected(false);
          return;
        }
        const data = (await res.json()) as {
          state: LessonState;
          tv_linked: boolean;
        };
        if (!cancelled) {
          setState(data.state);
          setTvLinked(data.tv_linked);
          setConnected(true);
        }
      } catch {
        if (!cancelled) setConnected(false);
      }
    }

    void joinAndLoad();

    const sb = getSupabaseBrowser();
    if (!sb) {
      const interval = setInterval(() => void joinAndLoad(), 2000);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    const channel = sb
      .channel(`arjuna-room-${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "arjuna_rooms",
          filter: `code=eq.${code}`,
        },
        (payload) => {
          const row = payload.new as {
            state: LessonState;
            tv_linked: boolean;
          };
          if (!cancelled && row?.state) {
            setState(row.state);
            setTvLinked(row.tv_linked);
            setConnected(true);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void sb.removeChannel(channel);
    };
  }, [code]);

  return { state, connected, tvLinked };
}

export function useSupabaseRoomPublisher(code: string | null) {
  const pushState = useCallback(
    async (state: LessonState) => {
      if (!code) return;
      try {
        await fetch("/api/room/supabase", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, state }),
        });
      } catch {
        // ignore transient errors
      }
    },
    [code],
  );

  return { pushState };
}

export async function createSupabaseRoomClient(
  initialState: Partial<LessonState>,
): Promise<string | null> {
  try {
    const res = await fetch("/api/room/supabase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialState }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { code: string };
    return data.code;
  } catch {
    return null;
  }
}
