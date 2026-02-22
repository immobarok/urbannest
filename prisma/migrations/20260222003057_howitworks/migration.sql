-- CreateTable
CREATE TABLE "WhyChooseSection" (
    "id" SERIAL NOT NULL,
    "header" TEXT NOT NULL,
    "headerHighlight" TEXT,
    "subHeader" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhyChooseSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhyChooseCard" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "iconAlt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sectionId" INTEGER NOT NULL,

    CONSTRAINT "WhyChooseCard_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WhyChooseCard" ADD CONSTRAINT "WhyChooseCard_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "WhyChooseSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
