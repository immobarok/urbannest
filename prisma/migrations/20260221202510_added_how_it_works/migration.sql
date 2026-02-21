-- CreateTable
CREATE TABLE "HowItWorksSection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'How it works?',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HowItWorksSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HowItWorksStep" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HowItWorksStep_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HowItWorksStep" ADD CONSTRAINT "HowItWorksStep_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "HowItWorksSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
