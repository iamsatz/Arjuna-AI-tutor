export function isTvDevice(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent.toLowerCase();
  if (
    ua.includes("tv") ||
    ua.includes("leanback") ||
    ua.includes("aft") ||
    ua.includes("androidtv")
  ) {
    return true;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("tv") === "1") return true;

  return (
    window.matchMedia("(min-width: 960px) and (pointer: coarse)").matches &&
    !window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

export function getInitialTvCode(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code")?.trim();
  return code && /^\d{4}$/.test(code) ? code : null;
}
