import { coinsToLevel } from "@/lib/game";
import { QuestionMode, QuestionRecord, UpdateProgressPayload, UserRecord } from "@/lib/types";

const SHEETDB_BASE_URL = process.env.SHEETDB_BASE_URL;
const QUESTIONS_SHEET = process.env.SHEETDB_QUESTIONS_SHEET ?? "Questions";
const USERS_SHEET = process.env.SHEETDB_USERS_SHEET ?? "Users";

const fallbackQuestions: QuestionRecord[] = [
  {
    ID: "1",
    Subject: "Math",
    Question: "What is 12 x 8?",
    Option_A: "88",
    Option_B: "96",
    Option_C: "108",
    Option_D: "112",
    Correct_Answer: "Option_B"
  },
  {
    ID: "2",
    Subject: "Science",
    Question: "What planet is known as the Red Planet?",
    Option_A: "Mars",
    Option_B: "Jupiter",
    Option_C: "Saturn",
    Option_D: "Venus",
    Correct_Answer: "Option_A"
  },
  {
    ID: "3",
    Subject: "History",
    Question: "Who was the first president of the United States?",
    Option_A: "Thomas Jefferson",
    Option_B: "Abraham Lincoln",
    Option_C: "George Washington",
    Option_D: "John Adams",
    Correct_Answer: "Option_C"
  }
];

export async function getQuestionSet({
  mode,
  subject,
  count = 20,
  mistakeIds = []
}: {
  mode: QuestionMode;
  subject?: string;
  count?: number;
  mistakeIds?: string[];
}) {
  const questions = await getAllQuestions();
  let working = questions;

  if (mode === "mock" || mode === "custom") {
    working = subject ? questions.filter((question) => question.Subject === subject) : questions;
  }

  if (mode === "review") {
    const set = new Set(mistakeIds);
    working = questions.filter((question) => set.has(question.ID));
  }

  if (mode === "standard") {
    return shuffle(working).slice(0, Math.max(count, 20));
  }

  return shuffle(working).slice(0, count);
}

export async function getUserByTelegramId(telegramId: string) {
  if (!SHEETDB_BASE_URL) {
    return null;
  }

  const records = await sheetDbRequest<UserRecord[]>(
    `${SHEETDB_BASE_URL}/search?sheet=${encodeURIComponent(USERS_SHEET)}&Telegram_ID=${encodeURIComponent(telegramId)}`
  );

  const record = records[0];
  return record ? normalizeUser(record) : null;
}

export async function ensureUser({
  telegramId,
  username
}: {
  telegramId: string;
  username: string;
}) {
  const existing = await getUserByTelegramId(telegramId);
  if (existing) {
    return existing;
  }

  const seedUser: UserRecord = {
    Telegram_ID: telegramId,
    Username: username,
    Coins: 0,
    Level: 1,
    Mistake_IDs: ""
  };

  if (!SHEETDB_BASE_URL) {
    return seedUser;
  }

  await sheetDbRequest(`${SHEETDB_BASE_URL}?sheet=${encodeURIComponent(USERS_SHEET)}`, {
    method: "POST",
    body: JSON.stringify({ data: [seedUser] })
  });

  return seedUser;
}

export async function updateUserProgress(payload: UpdateProgressPayload) {
  const existing =
    (await getUserByTelegramId(payload.telegramId)) ??
    (await ensureUser({ telegramId: payload.telegramId, username: payload.username }));

  const nextCoins =
    typeof payload.absoluteCoins === "number"
      ? Math.max(0, payload.absoluteCoins)
      : Math.max(0, existing.Coins + (payload.coinDelta ?? 0));

  const updated: UserRecord = {
    ...existing,
    Username: payload.username || existing.Username,
    Coins: nextCoins,
    Level: coinsToLevel(nextCoins),
    Mistake_IDs: payload.mistakeIds ?? existing.Mistake_IDs ?? ""
  };

  if (!SHEETDB_BASE_URL) {
    return updated;
  }

  await sheetDbRequest(
    `${SHEETDB_BASE_URL}/Telegram_ID/${encodeURIComponent(payload.telegramId)}?sheet=${encodeURIComponent(USERS_SHEET)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        data: {
          Username: updated.Username,
          Coins: updated.Coins,
          Level: updated.Level,
          Mistake_IDs: updated.Mistake_IDs
        }
      })
    }
  );

  return updated;
}

async function getAllQuestions() {
  if (!SHEETDB_BASE_URL) {
    return fallbackQuestions;
  }

  const records = await sheetDbRequest<Array<QuestionRecord & { SUBJECT?: string }>>(
    `${SHEETDB_BASE_URL}?sheet=${encodeURIComponent(QUESTIONS_SHEET)}`
  );
  return records.map(normalizeQuestion);
}

async function sheetDbRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SheetDB request failed: ${response.status} ${text}`);
  }

  return (await response.json()) as T;
}

function normalizeUser(record: UserRecord): UserRecord {
  return {
    ...record,
    Coins: Number(record.Coins ?? 0),
    Level: Number(record.Level ?? 1),
    Mistake_IDs: record.Mistake_IDs ?? ""
  };
}

function normalizeQuestion(
  record: QuestionRecord & { SUBJECT?: string }
): QuestionRecord {
  return {
    ID: String(record.ID ?? ""),
    Subject: record.Subject ?? record.SUBJECT ?? "",
    Question: record.Question ?? "",
    Option_A: record.Option_A ?? "",
    Option_B: record.Option_B ?? "",
    Option_C: record.Option_C ?? "",
    Option_D: record.Option_D ?? "",
    Correct_Answer: record.Correct_Answer ?? "Option_A"
  };
}

function shuffle<T>(items: T[]) {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
}
