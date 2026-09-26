-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "commentsScrapedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "fellowId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "author" TEXT,
    "text" TEXT NOT NULL,
    "likes" INTEGER,
    "replies" INTEGER,
    "isReply" BOOLEAN NOT NULL DEFAULT false,
    "isCreator" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "sentiment" TEXT,
    "signals" TEXT[],
    "analyzedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FellowNote" (
    "id" TEXT NOT NULL,
    "fellowId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "url" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "author" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FellowNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_fellowId_idx" ON "Comment"("fellowId");

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "Comment_platform_externalId_key" ON "Comment"("platform", "externalId");

-- CreateIndex
CREATE INDEX "FellowNote_fellowId_date_idx" ON "FellowNote"("fellowId", "date");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_fellowId_fkey" FOREIGN KEY ("fellowId") REFERENCES "Fellow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FellowNote" ADD CONSTRAINT "FellowNote_fellowId_fkey" FOREIGN KEY ("fellowId") REFERENCES "Fellow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

