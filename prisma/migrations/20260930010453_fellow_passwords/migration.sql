-- AlterTable
ALTER TABLE "Fellow" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Fellow_username_key" ON "Fellow"("username");


-- Cohort 2 fellows sign in with their lowercase first name.
UPDATE "Fellow" f SET "username" = lower(split_part(f."name", ' ', 1))
FROM "Cohort" c WHERE c."id" = f."cohortId" AND c."slug" = 'cohort-2' AND f."username" IS NULL;
