-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('SPOTIFY', 'APPLE_MUSIC');

-- CreateEnum
CREATE TYPE "LinkSessionStatus" AS ENUM ('PENDING', 'CONNECTED', 'REVOKED');

-- CreateTable
CREATE TABLE "LinkedAccount" (
    "id" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "scopes" TEXT,
    "accessToken" TEXT NOT NULL,
    "accessTokenIv" TEXT NOT NULL,
    "accessTokenTag" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "refreshTokenIv" TEXT NOT NULL,
    "refreshTokenTag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "status" "LinkSessionStatus" NOT NULL DEFAULT 'PENDING',
    "oauthState" TEXT NOT NULL,
    "oauthStateExp" TIMESTAMP(3) NOT NULL,
    "linkedAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinkedAccount_id_key" ON "LinkedAccount"("id");

-- CreateIndex
CREATE UNIQUE INDEX "LinkedAccount_providerUserId_key" ON "LinkedAccount"("providerUserId");

-- CreateIndex
CREATE INDEX "LinkedAccount_provider_idx" ON "LinkedAccount"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "LinkSession_tokenHash_key" ON "LinkSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "LinkSession_oauthState_key" ON "LinkSession"("oauthState");

-- CreateIndex
CREATE INDEX "LinkSession_provider_status_idx" ON "LinkSession"("provider", "status");

-- CreateIndex
CREATE INDEX "LinkSession_linkedAccountId_idx" ON "LinkSession"("linkedAccountId");

-- CreateIndex
CREATE INDEX "LinkSession_oauthState_idx" ON "LinkSession"("oauthState");

-- AddForeignKey
ALTER TABLE "LinkSession" ADD CONSTRAINT "LinkSession_linkedAccountId_fkey" FOREIGN KEY ("linkedAccountId") REFERENCES "LinkedAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
