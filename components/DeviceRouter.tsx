"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArjunaScreen } from "./ArjunaScreen";
import { TvScreen } from "./TvScreen";
import { isTvDevice } from "@/lib/platform";

export function DeviceRouter() {
  const router = useRouter();

  useEffect(() => {
    if (isTvDevice() && window.location.pathname === "/") {
      router.replace("/tv");
    }
  }, [router]);

  if (typeof window !== "undefined" && isTvDevice()) {
    return <TvScreen />;
  }

  return <ArjunaScreen />;
}
