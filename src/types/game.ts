export interface GameQuestion {
  emoji: string;
  answer: string;
  options: string[];
}

export interface GameRankingEntry {
  user_id: number;
  nickname: string;
  profile_emoji: string;
  score: number;
  correct: number;
  total: number;
  is_friend: boolean;
}

export interface RankingSection {
  ranking: GameRankingEntry[];
  my_rank: number | null;
  my_entry: GameRankingEntry | null;
}

export interface RankingResponse {
  date: string;
  since: string;
  my_user_id: number;
  today: RankingSection;
  alltime: RankingSection;
}

export interface GameScore {
  score: number;
  correct: number;
  total: number;
  streak_max: number;
}

export interface GameFinalResults {
  score: number;
  correct: number;
  total: number;
  streakMax: number;
}
