import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from "class-validator";

export class PlayingXIEntryDto {
  @IsString()
  playerId!: string;

  isCaptain?: boolean;
  isKeeper?: boolean;
}

export class SetPlayingXIDto {
  @IsString()
  teamId!: string;

  @IsArray()
  @ArrayMinSize(11)
  @ArrayMaxSize(11)
  players!: PlayingXIEntryDto[];
}