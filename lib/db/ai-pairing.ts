import { randomUUID } from "node:crypto";

import {
  AI_PAIRING_CODE_TTL_MS,
  generateDeviceToken,
  generatePairingCode,
  hashPairingSecret,
  isExtensionDeviceUsable,
  isPairingCodeExpired,
  type AiExtensionDeviceRecord,
  type AiPairingCodeRecord,
  type AiPairingStore,
} from "@/lib/ai-activity/pairing";
import type { AiOwnerIdentity } from "@/lib/db/ai-activity";
import { prisma } from "@/lib/prisma";

function toCodeRecord(row: {
  id: string;
  ownerId: string;
  codeHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}): AiPairingCodeRecord {
  return {
    id: row.id,
    ownerId: row.ownerId,
    codeHash: row.codeHash,
    expiresAt: row.expiresAt.toISOString(),
    consumedAt: row.consumedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDeviceRecord(row: {
  id: string;
  ownerId: string;
  connectionId: string;
  tokenHash: string;
  label: string | null;
  permissionState: string;
  createdAt: Date;
  lastSeenAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
}): AiExtensionDeviceRecord {
  return {
    id: row.id,
    ownerId: row.ownerId,
    connectionId: row.connectionId,
    tokenHash: row.tokenHash,
    label: row.label,
    permissionState: row.permissionState as AiExtensionDeviceRecord["permissionState"],
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
  };
}

export function createPrismaPairingStore(): AiPairingStore {
  return {
    async createCode(record) {
      const row = await prisma.aiPairingCode.create({
        data: {
          id: record.id,
          ownerId: record.ownerId,
          codeHash: record.codeHash,
          expiresAt: new Date(record.expiresAt),
          consumedAt: record.consumedAt ? new Date(record.consumedAt) : null,
          createdAt: new Date(record.createdAt),
        },
      });
      return toCodeRecord(row);
    },
    async findCodeByHash(codeHash) {
      const row = await prisma.aiPairingCode.findUnique({ where: { codeHash } });
      return row ? toCodeRecord(row) : null;
    },
    async consumeCode(id, consumedAt) {
      const row = await prisma.aiPairingCode.update({
        where: { id },
        data: { consumedAt: new Date(consumedAt) },
      });
      return toCodeRecord(row);
    },
    async createDevice(record) {
      const row = await prisma.aiExtensionDevice.create({
        data: {
          id: record.id,
          ownerId: record.ownerId,
          connectionId: record.connectionId,
          tokenHash: record.tokenHash,
          label: record.label,
          permissionState: record.permissionState,
          createdAt: new Date(record.createdAt),
          lastSeenAt: record.lastSeenAt ? new Date(record.lastSeenAt) : null,
          expiresAt: record.expiresAt ? new Date(record.expiresAt) : null,
          revokedAt: record.revokedAt ? new Date(record.revokedAt) : null,
        },
      });
      return toDeviceRecord(row);
    },
    async findDeviceByTokenHash(tokenHash) {
      const row = await prisma.aiExtensionDevice.findUnique({
        where: { tokenHash },
      });
      return row ? toDeviceRecord(row) : null;
    },
    async findDeviceByConnectionId(ownerId, connectionId) {
      const row = await prisma.aiExtensionDevice.findUnique({
        where: { ownerId_connectionId: { ownerId, connectionId } },
      });
      return row ? toDeviceRecord(row) : null;
    },
    async listDevices(ownerId) {
      const rows = await prisma.aiExtensionDevice.findMany({
        where: { ownerId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toDeviceRecord);
    },
    async revokeDevice(ownerId, connectionId, revokedAt) {
      const existing = await prisma.aiExtensionDevice.findUnique({
        where: { ownerId_connectionId: { ownerId, connectionId } },
      });
      if (!existing) return null;
      const row = await prisma.aiExtensionDevice.update({
        where: { id: existing.id },
        data: {
          permissionState: "revoked",
          revokedAt: new Date(revokedAt),
        },
      });
      return toDeviceRecord(row);
    },
    async touchDevice(id, lastSeenAt) {
      await prisma.aiExtensionDevice.update({
        where: { id },
        data: { lastSeenAt: new Date(lastSeenAt) },
      });
    },
  };
}

export async function issueAiPairingCode(
  owner: AiOwnerIdentity,
  store: AiPairingStore,
  now = new Date(),
) {
  const { code, codeHash } = generatePairingCode();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + AI_PAIRING_CODE_TTL_MS).toISOString();
  await store.createCode({
    id: randomUUID(),
    ownerId: owner.ownerId,
    codeHash,
    expiresAt,
    consumedAt: null,
    createdAt,
  });
  return { code, expiresAt };
}

export async function claimAiPairingCode(
  code: string,
  store: AiPairingStore,
  input: { label?: string; now?: Date } = {},
) {
  const now = input.now ?? new Date();
  const normalized = code.trim().toUpperCase();
  const record = await store.findCodeByHash(hashPairingSecret(normalized));
  if (!record || isPairingCodeExpired(record, now)) {
    return { ok: false as const, error: "Pairing code is invalid or expired" };
  }

  await store.consumeCode(record.id, now.toISOString());
  const issued = generateDeviceToken();
  const device = await store.createDevice({
    id: randomUUID(),
    ownerId: record.ownerId,
    connectionId: issued.connectionId,
    tokenHash: issued.tokenHash,
    label: input.label?.trim() || "Chrome extension",
    permissionState: "granted",
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt: null,
    revokedAt: null,
  });

  return {
    ok: true as const,
    token: issued.token,
    connectionId: device.connectionId,
    deviceId: device.id,
    ownerId: device.ownerId,
  };
}

export async function revokeAiExtensionDevice(
  ownerId: string,
  connectionId: string,
  store: AiPairingStore,
  now = new Date(),
) {
  return store.revokeDevice(ownerId, connectionId.trim(), now.toISOString());
}

export async function authenticateDeviceToken(
  token: string,
  store: AiPairingStore,
  now = new Date(),
) {
  const device = await store.findDeviceByTokenHash(hashPairingSecret(token.trim()));
  if (!device) return { ok: false as const, error: "Unauthorized", status: 401 as const };
  const usable = isExtensionDeviceUsable(device, now);
  if (!usable.ok) {
    return {
      ok: false as const,
      error:
        usable.reason === "expired"
          ? "Extension device is expired"
          : "Extension device is revoked",
      status: 403 as const,
    };
  }
  await store.touchDevice(device.id, now.toISOString());
  return { ok: true as const, device };
}
