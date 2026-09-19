-- CreateTable
CREATE TABLE "TokenVaultRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "destroyedAt" TIMESTAMP(3),

    CONSTRAINT "TokenVaultRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectionRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "adapter" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "externalSubjectId" TEXT,
    "grantedScopes" JSONB NOT NULL,
    "tokenVaultId" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionGrantRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "actions" JSONB NOT NULL,
    "purpose" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "consentVersion" TEXT NOT NULL,
    "syncEnforced" BOOLEAN NOT NULL DEFAULT true,
    "providerEnforced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PermissionGrantRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubOAuthHandshake" (
    "state" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "codeVerifierCipher" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubOAuthHandshake_pkey" PRIMARY KEY ("state")
);

-- CreateIndex
CREATE INDEX "TokenVaultRecord_workspaceId_userId_idx" ON "TokenVaultRecord"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "ConnectionRecord_workspaceId_userId_provider_idx" ON "ConnectionRecord"("workspaceId", "userId", "provider");

-- CreateIndex
CREATE INDEX "PermissionGrantRecord_workspaceId_userId_connectionId_idx" ON "PermissionGrantRecord"("workspaceId", "userId", "connectionId");

-- CreateIndex
CREATE INDEX "GithubOAuthHandshake_expiresAt_idx" ON "GithubOAuthHandshake"("expiresAt");

-- AddForeignKey
ALTER TABLE "TokenVaultRecord" ADD CONSTRAINT "TokenVaultRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenVaultRecord" ADD CONSTRAINT "TokenVaultRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionRecord" ADD CONSTRAINT "ConnectionRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionRecord" ADD CONSTRAINT "ConnectionRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionGrantRecord" ADD CONSTRAINT "PermissionGrantRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionGrantRecord" ADD CONSTRAINT "PermissionGrantRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionGrantRecord" ADD CONSTRAINT "PermissionGrantRecord_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ConnectionRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubOAuthHandshake" ADD CONSTRAINT "GithubOAuthHandshake_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
