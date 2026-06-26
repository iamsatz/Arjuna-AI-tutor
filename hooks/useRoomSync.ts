"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomSyncState } from "@/lib/roomSync";

type PublisherInput = Omit<RoomSyncState, "updatedAt" | "tvLinked">;

export function useRoomPublisher(state: PublisherInput) {
  const [code, setCode] = useState<string | null>(null);
  const [tvLinked, setTvLinked] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let cancelled = false;

    async function createRoom() {
      try {
        const response = await fetch("/api/room", { method: "POST" });
        if (!response.ok) return;
        const data = (await response.json()) as { code: string };
        if (!cancelled) setCode(data.code);
      } catch {
        // Room sync is optional for solo phone use.
      }
    }

    void createRoom();
    return () => {
      cancelled = true;
    };
  }, []);

  const pushState = useCallback(async () => {
    if (!code) return;

    try {
      await fetch(`/api/room/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stateRef.current),
      });
    } catch {
      // Ignore transient network errors during family testing.
    }
  }, [code]);

  useEffect(() => {
    void pushState();
  }, [pushState, state]);

  useEffect(() => {
    if (!code) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/room/${code}`);
        if (!response.ok) return;
        const data = (await response.json()) as { tvLinked?: boolean };
        setTvLinked(Boolean(data.tvLinked));
      } catch {
        // Ignore polling errors.
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [code]);

  return { code, tvLinked };
}

export function useRoomSubscriber(code: string | null) {
  const [state, setState] = useState<RoomSyncState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!code) {
      setState(null);
      setConnected(false);
      return;
    }

    let cancelled = false;

    async function joinRoom() {
      try {
        await fetch(`/api/room/${code}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "tv" }),
        });
      } catch {
        // Retry on poll.
      }
    }

    void joinRoom();

    async function poll() {
      try {
        const response = await fetch(`/api/room/${code}`);
        if (!response.ok) {
          if (!cancelled) {
            setConnected(false);
            setState(null);
          }
          return;
        }

        const data = (await response.json()) as RoomSyncState;
        if (!cancelled) {
          setState(data);
          setConnected(true);
        }
      } catch {
        if (!cancelled) setConnected(false);
      }
    }

    void poll();
    const interval = setInterval(() => void poll(), 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [code]);

  return { state, connected };
}
