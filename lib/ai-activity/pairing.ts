import { createHash, randomBytes } from "node:crypto";

export const AI_PAIRING_CODE_TTL_MS = 10 * 60 * 1000;
export const AI_DEVICE_TOKEN_PREFIX = "syncdev_";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type AiPairingCodeRecord = {
  id: string;
  ownerId: string;
  codeHash: string;
  expiresAt: string;
  consumedAt: string | null;
  createdAt: string;
};

export type AiExtensionDeviceRecord = {
  id: string;
  ownerId: string;
  connectionId: string;
  tokenHash: string;
  label: string | null;
  permissionState: "pending" | "granted" | "revoked" | "expired";
  createdAt: string;
  lastSeenAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
};

export type AiPairingStore = {
  createCode: (
    record: AiPairingCodeRecord,
  ) => Promise<AiPairingCodeRecord>;
  findCodeByHash: (codeHash: string) => Promise<AiPairingCodeRecord | null>;
  consumeCode: (
    id: string,
    consumedAt: string,
  ) => Promise<AiPairingCodeRecord | null>;
  createDevice: (
    record: AiExtensionDeviceRecord,
  ) => Promise<AiExtensionDeviceRecord>;
  findDeviceByTokenHash: (
    tokenHash: string,
  ) => Promise<AiExtensionDeviceRecord | null>;
  findDeviceByConnectionId: (
    ownerId: string,
    connectionId: string,
  ) => Promise<AiExtensionDeviceRecord | null>;
  listDevices: (ownerId: string) => Promise<AiExtensionDeviceRecord[]>;
  revokeDevice: (
    ownerId: string,
    connectionId: string,
    revokedAt: string,
  ) => Promise<AiExtensionDeviceRecord | null>;
  touchDevice: (
    id: string,
    lastSeenAt: string,
  ) => Promise<void>;
};

export function hashPairingSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generatePairingCode(): { code: string; codeHash: string } {
  const bytes = randomBytes(8);
  let raw = "";
  for (const byte of bytes) {
    raw += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  const code = `${raw.slice(0, 4)}-${raw.slice(4)}`;
  return { code, codeHash: hashPairingSecret(code) };
}

export function generateDeviceToken(): {
  token: string;
  tokenHash: string;
  connectionId: string;
} {
  const token = `${AI_DEVICE_TOKEN_PREFIX}${randomBytes(24).toString("hex")}`;
  const connectionId = `ext-${randomBytes(8).toString("hex")}`;
  return {
    token,
    tokenHash: hashPairingSecret(token),
    connectionId,
  };
}

export function isPairingCodeExpired(
  record: Pick<AiPairingCodeRecord, "expiresAt" | "consumedAt">,
  now = new Date(),
): boolean {
  if (record.consumedAt) return true;
  return Date.parse(record.expiresAt) <= now.getTime();
}

export function isExtensionDeviceUsable(
  record: AiExtensionDeviceRecord,
  now = new Date(),
): { ok: true } | { ok: false; reason: "revoked" | "expired" } {
  if (record.revokedAt || record.permissionState === "revoked") {
    return { ok: false, reason: "revoked" };
  }
  if (
    record.permissionState === "expired" ||
    (record.expiresAt && Date.parse(record.expiresAt) <= now.getTime())
  ) {
    return { ok: false, reason: "expired" };
  }
  if (record.permissionState !== "granted") {
    return { ok: false, reason: "revoked" };
  }
  return { ok: true };
}

export function createMemoryPairingStore(
  now = () => new Date(),
): AiPairingStore {
  const codes = new Map<string, AiPairingCodeRecord>();
  const devices = new Map<string, AiExtensionDeviceRecord>();
  void now;

  return {
    async createCode(record) {
      codes.set(record.codeHash, record);
      return record;
    },
    async findCodeByHash(codeHash) {
      return codes.get(codeHash) ?? null;
    },
    async consumeCode(id, consumedAt) {
      for (const [hash, record] of codes) {
        if (record.id === id) {
          const next = { ...record, consumedAt };
          codes.set(hash, next);
          return next;
        }
      }
      return null;
    },
    async createDevice(record) {
      devices.set(record.tokenHash, record);
      return record;
    },
    async findDeviceByTokenHash(tokenHash) {
      return devices.get(tokenHash) ?? null;
    },
    async findDeviceByConnectionId(ownerId, connectionId) {
      return (
        [...devices.values()].find(
          (device) =>
            device.ownerId === ownerId && device.connectionId === connectionId,
        ) ?? null
      );
    },
    async listDevices(ownerId) {
      return [...devices.values()]
        .filter((device) => device.ownerId === ownerId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async revokeDevice(ownerId, connectionId, revokedAt) {
      for (const [hash, device] of devices) {
        if (device.ownerId === ownerId && device.connectionId === connectionId) {
          const next: AiExtensionDeviceRecord = {
            ...device,
            permissionState: "revoked",
            revokedAt,
          };
          devices.set(hash, next);
          return next;
        }
      }
      return null;
    },
    async touchDevice(id, lastSeenAt) {
      for (const [hash, device] of devices) {
        if (device.id === id) {
          devices.set(hash, { ...device, lastSeenAt });
        }
      }
    },
  };
}
