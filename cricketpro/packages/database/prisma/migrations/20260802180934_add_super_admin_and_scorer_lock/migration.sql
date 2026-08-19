-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "hasBeenScorer" BOOLEAN NOT NULL DEFAULT false;
