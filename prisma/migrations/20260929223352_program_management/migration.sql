-- AlterTable
ALTER TABLE "Fellow" ADD COLUMN     "about" TEXT,
ADD COLUMN     "accessVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "buddy" TEXT,
ADD COLUMN     "cadenceNote" TEXT,
ADD COLUMN     "fellowNotes" TEXT,
ADD COLUMN     "health" TEXT,
ADD COLUMN     "interests" TEXT[],
ADD COLUMN     "longPerWeek" DOUBLE PRECISION,
ADD COLUMN     "needs" TEXT,
ADD COLUMN     "nextStep" TEXT,
ADD COLUMN     "pointOfContact" TEXT,
ADD COLUMN     "programGoals" TEXT,
ADD COLUMN     "programLong" INTEGER,
ADD COLUMN     "programShort" INTEGER,
ADD COLUMN     "shortPerWeek" DOUBLE PRECISION,
ADD COLUMN     "slackUserId" TEXT;

-- CreateTable
CREATE TABLE "CadenceWeek" (
    "id" TEXT NOT NULL,
    "fellowId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "long" INTEGER,
    "short" INTEGER,
    "note" TEXT,

    CONSTRAINT "CadenceWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "date" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "location" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FellowResource" (
    "id" TEXT NOT NULL,
    "fellowId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "by" TEXT NOT NULL DEFAULT 'team',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FellowResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlackMessage" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channel" TEXT,
    "ts" TEXT NOT NULL,
    "threadTs" TEXT,
    "userId" TEXT NOT NULL,
    "fellowId" TEXT,
    "text" TEXT NOT NULL,
    "permalink" TEXT,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "reactions" INTEGER NOT NULL DEFAULT 0,
    "signals" TEXT[],
    "postedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlackMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FellowEdit" (
    "id" TEXT NOT NULL,
    "fellowId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "by" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FellowEdit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "CadenceWeek_fellowId_week_key" ON "CadenceWeek"("fellowId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_externalId_key" ON "Resource"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "FellowResource_fellowId_resourceId_key" ON "FellowResource"("fellowId", "resourceId");

-- CreateIndex
CREATE INDEX "SlackMessage_fellowId_postedAt_idx" ON "SlackMessage"("fellowId", "postedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SlackMessage_channelId_ts_key" ON "SlackMessage"("channelId", "ts");

-- CreateIndex
CREATE INDEX "FellowEdit_fellowId_createdAt_idx" ON "FellowEdit"("fellowId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Fellow_slackUserId_key" ON "Fellow"("slackUserId");

-- AddForeignKey
ALTER TABLE "CadenceWeek" ADD CONSTRAINT "CadenceWeek_fellowId_fkey" FOREIGN KEY ("fellowId") REFERENCES "Fellow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FellowResource" ADD CONSTRAINT "FellowResource_fellowId_fkey" FOREIGN KEY ("fellowId") REFERENCES "Fellow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FellowResource" ADD CONSTRAINT "FellowResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackMessage" ADD CONSTRAINT "SlackMessage_fellowId_fkey" FOREIGN KEY ("fellowId") REFERENCES "Fellow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FellowEdit" ADD CONSTRAINT "FellowEdit_fellowId_fkey" FOREIGN KEY ("fellowId") REFERENCES "Fellow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

