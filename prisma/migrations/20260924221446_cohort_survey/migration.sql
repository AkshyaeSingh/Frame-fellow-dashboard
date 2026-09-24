-- CreateTable
CREATE TABLE "CohortSurvey" (
    "id" TEXT NOT NULL,
    "cohortSlug" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortSurvey_pkey" PRIMARY KEY ("id")
);
