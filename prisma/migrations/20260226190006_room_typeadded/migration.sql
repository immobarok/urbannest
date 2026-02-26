-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('SINGLE_ROOM', 'SHARED_ROOM', 'STUDIO', 'ENSUITE');

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "roomType" "RoomType" NOT NULL DEFAULT 'SINGLE_ROOM';
