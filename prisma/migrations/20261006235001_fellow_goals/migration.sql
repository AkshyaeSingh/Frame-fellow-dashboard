-- AlterTable
ALTER TABLE "Fellow" ADD COLUMN     "progressNote" TEXT,
ADD COLUMN     "prospects" TEXT;

-- CreateTable
CREATE TABLE "FellowGoal" (
    "id" TEXT NOT NULL,
    "fellowId" TEXT NOT NULL,
    "key" TEXT,
    "title" TEXT NOT NULL,
    "area" TEXT NOT NULL DEFAULT 'program',
    "status" TEXT NOT NULL DEFAULT 'not-started',
    "note" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FellowGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FellowGoal_fellowId_order_idx" ON "FellowGoal"("fellowId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "FellowGoal_fellowId_key_key" ON "FellowGoal"("fellowId", "key");

-- AddForeignKey
ALTER TABLE "FellowGoal" ADD CONSTRAINT "FellowGoal_fellowId_fkey" FOREIGN KEY ("fellowId") REFERENCES "Fellow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

