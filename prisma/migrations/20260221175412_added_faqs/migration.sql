-- CreateTable
CREATE TABLE "faqsection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqsection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "faqsectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "faq" ADD CONSTRAINT "faq_faqsectionId_fkey" FOREIGN KEY ("faqsectionId") REFERENCES "faqsection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
