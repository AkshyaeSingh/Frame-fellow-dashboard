-- AlterTable
ALTER TABLE "Fellow" ADD COLUMN     "cadenceScope" TEXT NOT NULL DEFAULT 'all';

-- AlterTable
ALTER TABLE "FellowNote" ADD COLUMN     "shared" BOOLEAN NOT NULL DEFAULT false;

