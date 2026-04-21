import { QuestionMode, QuestionRecord, UpdateProgressPayload, UserRecord } from "@/lib/types";
import { coinsToLevel } from "@/lib/game";

export async function fetchOrCreateUser(telegramId: string, username: string) {
  const existing = await fetchUserByTelegramId(telegramId);
  if (existing) {
    return normalizeUser(existing);
  }

  const created: UserRecord = {
    Telegram_ID: telegramId,
    Username: username,
    Coins: 0,
    Level: 1,
    Mistake_IDs: "",
    Correct_Answers: 0,
    Wrong_Answers: 0,
    Correct_IDs: ""
  };

  await sheetDbRequest(`${getBaseUrl()}?sheet=${encodeURIComponent(getUsersSheet())}`, {
    method: "POST",
    body: JSON.stringify({ data: [created] })
  });

  return created;
}

export async function syncTapReward(telegramId: string, username: string, coinDelta: number) {
  return submitAnswerResult({ telegramId, username, coinDelta });
}

export async function updateDisplayName(telegramId: string, username: string) {
  return submitAnswerResult({ telegramId, username, coinDelta: 0 });
}

export async function fetchLeaderboard(limit = 8) {
  const rows = await sheetDbRequest<UserRecord[]>(
    `${getBaseUrl()}?sheet=${encodeURIComponent(getUsersSheet())}`
  );

  return rows
    .map(normalizeUser)
    .filter((user) => user.Username?.trim())
    .sort((left, right) => right.Coins - left.Coins)
    .slice(0, limit);
}

export async function submitAnswerResult(payload: UpdateProgressPayload) {
  const existing =
    (await fetchUserByTelegramId(payload.telegramId)) ??
    ({
      Telegram_ID: payload.telegramId,
      Username: payload.username,
      Coins: 0,
      Level: 1,
      Mistake_IDs: "",
      Correct_Answers: 0,
      Wrong_Answers: 0,
      Correct_IDs: ""
    } satisfies UserRecord);

  const nextCoins =
    typeof payload.absoluteCoins === "number"
      ? Math.max(0, payload.absoluteCoins)
      : Math.max(0, Number(existing.Coins ?? 0) + (payload.coinDelta ?? 0));

  const updated: UserRecord = {
    ...normalizeUser(existing),
    Username: payload.username || existing.Username,
    Coins: nextCoins,
    Level: coinsToLevel(nextCoins),
    Mistake_IDs: payload.mistakeIds ?? existing.Mistake_IDs ?? "",
    Correct_Answers: Number(existing.Correct_Answers ?? 0) + (payload.correctIncrement ?? 0),
    Wrong_Answers: Number(existing.Wrong_Answers ?? 0) + (payload.wrongIncrement ?? 0),
    Correct_IDs: payload.correctIds ?? existing.Correct_IDs ?? ""
  };

  await sheetDbRequest(
    `${getBaseUrl()}/Telegram_ID/${encodeURIComponent(payload.telegramId)}?sheet=${encodeURIComponent(getUsersSheet())}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        data: {
          Username: updated.Username,
          Coins: updated.Coins,
          Level: updated.Level,
          Mistake_IDs: updated.Mistake_IDs,
          Correct_Answers: updated.Correct_Answers,
          Wrong_Answers: updated.Wrong_Answers,
          Correct_IDs: updated.Correct_IDs
        }
      })
    }
  );

  return updated;
}

export async function fetchQuestions({
  mode,
  subject,
  count,
  mistakes
}: {
  mode: QuestionMode;
  subject?: string;
  count?: number;
  mistakes?: string;
}) {
  const rows = await sheetDbRequest<Array<QuestionRecord & { SUBJECT?: string }>>(
    `${getBaseUrl()}?sheet=${encodeURIComponent(getQuestionsSheet())}`
  );

  let questions = rows.map(normalizeQuestion);
  const useAllSubjects = !subject || subject === "All_Questions";

  if (mode === "mock" || mode === "custom") {
    questions = !useAllSubjects
      ? questions.filter((question) => question.Subject === subject)
      : questions;
  }

  if (mode === "review") {
    const mistakeSet = new Set(
      (mistakes ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    );
    questions = questions.filter((question) => mistakeSet.has(question.ID));
  }

  if (mode === "mock") {
    return shuffle(questions).slice(0, 100);
  }

  if (mode === "custom") {
    return shuffle(questions).slice(0, count);
  }

  if (mode === "review") {
    return questions;
  }

  return shuffle(questions).slice(0, Math.max(count ?? 20, 20));
}

function normalizeUser(user: UserRecord): UserRecord {
  return {
    ...user,
    Coins: Number(user.Coins ?? 0),
    Level: Number(user.Level ?? 1),
    Correct_Answers: Number(user.Correct_Answers ?? 0),
    Wrong_Answers: Number(user.Wrong_Answers ?? 0),
    Correct_IDs: user.Correct_IDs ?? ""
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

async function fetchUserByTelegramId(telegramId: string) {
  const records = await sheetDbRequest<UserRecord[]>(
    `${getBaseUrl()}/search?sheet=${encodeURIComponent(getUsersSheet())}&Telegram_ID=${encodeURIComponent(telegramId)}`
  );
  return records[0] ? normalizeUser(records[0]) : null;
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

function getBaseUrl() {
  const value = process.env.NEXT_PUBLIC_SHEETDB_BASE_URL;
  if (!value) {
    throw new Error("NEXT_PUBLIC_SHEETDB_BASE_URL is missing");
  }
  return value;
}

function getQuestionsSheet() {
  return process.env.NEXT_PUBLIC_SHEETDB_QUESTIONS_SHEET ?? "Questions";
}

function getUsersSheet() {
  return process.env.NEXT_PUBLIC_SHEETDB_USERS_SHEET ?? "Users";
}

function shuffle<T>(items: T[]) {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
}
