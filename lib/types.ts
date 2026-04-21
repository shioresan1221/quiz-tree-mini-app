export type QuestionRecord = {
  ID: string;
  Subject: string;
  Question: string;
  Option_A: string;
  Option_B: string;
  Option_C: string;
  Option_D: string;
  Correct_Answer: "Option_A" | "Option_B" | "Option_C" | "Option_D";
};

export type UserRecord = {
  Telegram_ID: string;
  Username: string;
  Coins: number;
  Level: number;
  Mistake_IDs: string;
  Correct_Answers: number;
  Wrong_Answers: number;
  Correct_IDs: string;
};

export type QuestionMode = "standard" | "mock" | "custom" | "review";

export type UserProfile = {
  telegramId: string;
  username: string;
  firstName: string;
};

export type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

export type UpdateProgressPayload = {
  telegramId: string;
  username: string;
  coinDelta?: number;
  absoluteCoins?: number;
  mistakeIds?: string;
  correctIncrement?: number;
  wrongIncrement?: number;
  correctIds?: string;
};
