-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "assignedScorerId" TEXT;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_assignedScorerId_fkey" FOREIGN KEY ("assignedScorerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
