-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'X', 'LINKEDIN', 'SUBSTACK', 'PODCAST', 'OTHER');

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fellow" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "track" TEXT,
    "format" TEXT,
    "hometown" TEXT,
    "partnerOrg" TEXT,
    "status" TEXT,
    "bio" TEXT,
    "plannedOutput" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "counterfactual" TEXT,
    "goals" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fellow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "fellowId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "handle" TEXT NOT NULL,
    "url" TEXT,
    "externalId" TEXT,
    "displayName" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "lastScrapedAt" TIMESTAMP(3),

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountSnapshot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "followers" INTEGER,
    "following" INTEGER,
    "postsCount" INTEGER,
    "totalViews" BIGINT,
    "source" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "AccountSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "fellowId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT,
    "kind" TEXT,
    "title" TEXT,
    "caption" TEXT,
    "publishedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "thumbnailUrl" TEXT,
    "views" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "saves" INTEGER,
    "transcript" TEXT,
    "hashtags" TEXT[],
    "mentions" TEXT[],
    "links" TEXT[],
    "isSponsored" BOOLEAN NOT NULL DEFAULT false,
    "collaborators" TEXT[],
    "aiSafetyScore" DOUBLE PRECISION,
    "isAiSafety" BOOLEAN NOT NULL DEFAULT false,
    "topics" TEXT[],
    "ctas" TEXT[],
    "orgsMentioned" TEXT[],
    "framing" TEXT,
    "analysis" JSONB,
    "analyzedAt" TIMESTAMP(3),
    "analyzedBy" TEXT,
    "raw" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL,
    "fellowId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "url" TEXT,
    "source" TEXT NOT NULL,
    "attribution" TEXT,
    "evidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrudyReport" (
    "id" TEXT NOT NULL,
    "fellowId" TEXT NOT NULL,
    "against" TEXT NOT NULL,
    "againstCategory" TEXT,
    "platform" "Platform",
    "reportDate" TIMESTAMP(3),
    "score" INTEGER,
    "contentFit" INTEGER,
    "audienceFit" INTEGER,
    "persuasionFit" INTEGER,
    "insights" TEXT[],
    "contentNotes" TEXT[],
    "audienceNotes" TEXT[],
    "persuasionNotes" TEXT[],
    "metrics" JSONB,
    "demographics" JSONB,
    "contentSummary" TEXT,
    "brandSafety" JSONB,
    "expectedViews" INTEGER,
    "estConversions" INTEGER,
    "conversionRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrudyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormResponse" (
    "id" TEXT NOT NULL,
    "fellowId" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeRun" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "actor" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "items" INTEGER NOT NULL DEFAULT 0,
    "postsUpserted" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_slug_key" ON "Cohort"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Fellow_slug_key" ON "Fellow"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Account_platform_handle_key" ON "Account"("platform", "handle");

-- CreateIndex
CREATE INDEX "AccountSnapshot_accountId_takenAt_idx" ON "AccountSnapshot"("accountId", "takenAt");

-- CreateIndex
CREATE INDEX "Post_fellowId_publishedAt_idx" ON "Post"("fellowId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Post_platform_externalId_key" ON "Post"("platform", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "FormResponse_fellowId_form_key" ON "FormResponse"("fellowId", "form");

-- CreateIndex
CREATE UNIQUE INDEX "ScrapeRun_runId_key" ON "ScrapeRun"("runId");

-- AddForeignKey
ALTER TABLE "Fellow" ADD CONSTRAINT "Fellow_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_fellowId_fkey" FOREIGN KEY ("fellowId") REFERENCES "Fellow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountSnapshot" ADD CONSTRAINT "AccountSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_fellowId_fkey" FOREIGN KEY ("fellowId") REFERENCES "Fellow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_fellowId_fkey" FOREIGN KEY ("fellowId") REFERENCES "Fellow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrudyReport" ADD CONSTRAINT "TrudyReport_fellowId_fkey" FOREIGN KEY ("fellowId") REFERENCES "Fellow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_fellowId_fkey" FOREIGN KEY ("fellowId") REFERENCES "Fellow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
