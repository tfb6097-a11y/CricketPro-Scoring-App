-- AddForeignKey
ALTER TABLE "match_playing_xi" ADD CONSTRAINT "match_playing_xi_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
