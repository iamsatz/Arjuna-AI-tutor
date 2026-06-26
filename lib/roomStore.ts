import {
  createRoomCode,
  emptyRoomState,
  type RoomRecord,
  type RoomSyncState,
} from "@/lib/roomSync";

const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var __arjunaRooms: Map<string, RoomRecord> | undefined;
}

function getRooms() {
  if (!globalThis.__arjunaRooms) {
    globalThis.__arjunaRooms = new Map<string, RoomRecord>();
  }
  return globalThis.__arjunaRooms;
}

function pruneExpiredRooms() {
  const now = Date.now();
  const rooms = getRooms();
  rooms.forEach((room, code) => {
    if (now - room.updatedAt > ROOM_TTL_MS) {
      rooms.delete(code);
    }
  });
}

export function createRoom(phase: string): RoomRecord {
  pruneExpiredRooms();
  const rooms = getRooms();

  let code = createRoomCode();
  while (rooms.has(code)) {
    code = createRoomCode();
  }

  const now = Date.now();
  const room: RoomRecord = {
    code,
    createdAt: now,
    updatedAt: now,
    ...emptyRoomState(phase),
  };

  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): RoomRecord | null {
  pruneExpiredRooms();
  const room = getRooms().get(code);
  if (!room) return null;
  if (Date.now() - room.updatedAt > ROOM_TTL_MS) {
    getRooms().delete(code);
    return null;
  }
  return room;
}

export function updateRoom(
  code: string,
  patch: Partial<RoomSyncState> & { tvLinked?: boolean },
): RoomRecord | null {
  const room = getRoom(code);
  if (!room) return null;

  const next: RoomRecord = {
    ...room,
    ...patch,
    code,
    updatedAt: Date.now(),
  };

  getRooms().set(code, next);
  return next;
}

export function markTvLinked(code: string): RoomRecord | null {
  return updateRoom(code, { tvLinked: true });
}
