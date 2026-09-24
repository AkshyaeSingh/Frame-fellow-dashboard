-- AlterTable
ALTER TABLE "TrudyReport" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "raw" JSONB,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual';

-- CreateIndex
CREATE UNIQUE INDEX "TrudyReport_externalId_key" ON "TrudyReport"("externalId");

