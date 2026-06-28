import { promises as fs } from "fs";
import path from "path";

export type StoredSession = {
  id: string;
  date: string;
  durationMin?: number;
  childName?: string;
  inviteCode?: string;
  english_summary: string;
  telugu_summary: string;
  whatsappSent: { mother: boolean; father: boolean };
};

const SESSIONS_PATH = path.join(process.cwd(), "data", "sessions.json");

export async function readSessions(): Promise<StoredSession[]> {
  try {
    const raw = await fs.readFile(SESSIONS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as StoredSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendSession(session: StoredSession): Promise<void> {
  const sessions = await readSessions();
  sessions.unshift(session);
  await fs.mkdir(path.dirname(SESSIONS_PATH), { recursive: true });
  await fs.writeFile(SESSIONS_PATH, JSON.stringify(sessions, null, 2));
}
