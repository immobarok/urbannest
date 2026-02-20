-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "bucket" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_uploaderId_idx" ON "media"("uploaderId");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
