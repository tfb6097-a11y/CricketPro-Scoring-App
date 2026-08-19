export type ExtraType = "NONE" | "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE";
export type DismissalType =
  | "BOWLED"
  | "CAUGHT"
  | "LBW"
  | "RUN_OUT"
  | "STUMPED"
  | "HIT_WICKET"
  | "RETIRED_HURT"
  | "OTHER";

export interface RecordBallPayload {
  matchId: string;
  inningsId: string;
  sequenceNum: number;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  runsOffBat: number;
  extraType: ExtraType;
  extraRuns: number;
  isFreeHit: boolean;
  wicket?: {
    dismissedPlayerId: string;
    dismissalType: DismissalType;
    fielderId?: string;
  };
  commentary?: string;
}

export interface BallBroadcastEvent {
  matchId: string;
  inningsId: string;
  overNumber: number;
  ballsBowled: number;
  totalRuns: number;
  totalWickets: number;
  oversBowled: string;
}