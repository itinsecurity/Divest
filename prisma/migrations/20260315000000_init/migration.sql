-- CreateTable
CREATE TABLE "AssetProfile" (
    "id" TEXT NOT NULL,
    "instrumentType" TEXT NOT NULL,
    "isin" TEXT,
    "ticker" TEXT,
    "name" TEXT,
    "exchange" TEXT,
    "country" TEXT,
    "sector" TEXT,
    "industry" TEXT,
    "fundManager" TEXT,
    "fundCategory" TEXT,
    "equityPct" DECIMAL(65,30),
    "bondPct" DECIMAL(65,30),
    "sectorWeightings" TEXT,
    "geographicWeightings" TEXT,
    "fieldSources" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL,
    "instrumentIdentifier" TEXT NOT NULL,
    "instrumentType" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "shares" DECIMAL(65,30),
    "pricePerShare" DECIMAL(65,30),
    "currentValue" DECIMAL(65,30),
    "enrichmentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "assetProfileId" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetProfile_isin_key" ON "AssetProfile"("isin");

-- CreateIndex
CREATE UNIQUE INDEX "Holding_accountName_instrumentIdentifier_key" ON "Holding"("accountName", "instrumentIdentifier");

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_assetProfileId_fkey" FOREIGN KEY ("assetProfileId") REFERENCES "AssetProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
