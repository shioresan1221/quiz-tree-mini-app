import { QuestionMode, QuestionRecord, UpdateProgressPayload, UserRecord } from "@/lib/types";

export async function fetchOrCreateUser(telegramId: string, username: string) {
  const response = await fetch(
    `/api/users?telegramId=${encodeURIComponent(telegramId)}&username=${encodeURIComponent(username)}`,
    {
      cache: "no-store"
    }
  );

  const data = (await response.json()) as { user: UserRecord; error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Unable to load user");
  }
  return normalizeUser(data.user);
}

export async function syncTapReward(telegramId: string, username: string, coinDelta: number) {
  return submitAnswerResult({ telegramId, username, coinDelta });
}

export async function submitAnswerResult(payload: UpdateProgressPayload) {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = (await response.json()) as { user: UserRecord; error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Unable to update user");
  }
  return normalizeUser(data.user);
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
  const params = new URLSearchParams({
    mode
  });

  if (subject) {
    params.set("subject", subject);
  }

  if (count) {
    params.set("count", String(count));
  }

  if (mistakes) {
    params.set("mistakes", mistakes);
  }

  const response = await fetch(`/api/questions?${params.toString()}`, {
    cache: "no-store"
  });

  const data = (await response.json()) as {
    questions: QuestionRecord[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to load questions");
  }

  return data.questions;
}

function normalizeUser(user: UserRecord): UserRecord {
  return {
    ...user,
    Coins: Number(user.Coins ?? 0),
    Level: Number(user.Level ?? 1)
  };
}
