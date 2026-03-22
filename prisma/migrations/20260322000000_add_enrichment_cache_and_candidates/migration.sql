-- CreateTable
CREATE TABLE "EnrichmentCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrichmentCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrichmentCandidate" (
    "id" TEXT NOT NULL,
    "assetProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ticker" TEXT,
    "isin" TEXT,
    "exchange" TEXT,
    "instrumentType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "rawData" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrichmentCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnrichmentCache_cacheKey_key" ON "EnrichmentCache"("cacheKey");

-- AddForeignKey
ALTER TABLE "EnrichmentCandidate" ADD CONSTRAINT "EnrichmentCandidate_assetProfileId_fkey" FOREIGN KEY ("assetProfileId") REFERENCES "AssetProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
