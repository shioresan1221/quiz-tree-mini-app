const TELEGRAM_API_BASE = "https://api.telegram.org";

export default async (request) => {
  if (request.method !== "POST") {
    return json({ ok: true, ignored: true }, 200);
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return json({ ok: false, error: "Missing TELEGRAM_BOT_TOKEN" }, 500);
  }

  const update = await request.json();
  const message = update?.message;

  if (!message?.text || !message.from) {
    return json({ ok: true, ignored: true }, 200);
  }

  const text = String(message.text).trim();
  const from = message.from;
  const chatId = message.chat.id;

  try {
    if (text.startsWith("/whoami")) {
      await sendTelegramMessage(token, chatId, [
        "Your Telegram identity:",
        `ID: ${from.id}`,
        `Username: @${from.username ?? "none"}`
      ].join("\n"));
      return json({ ok: true }, 200);
    }

    if (text.startsWith("/helpadmin") || text.startsWith("/start")) {
      await sendTelegramMessage(token, chatId, helpMessage());
      return json({ ok: true }, 200);
    }

    const authorized = await isAuthorized(from);
    if (!authorized) {
      await sendTelegramMessage(
        token,
        chatId,
        "You are not authorized to manage the question bank."
      );
      return json({ ok: true }, 200);
    }

    if (text.startsWith("/authorize")) {
      const result = await handleAuthorize(text);
      await sendTelegramMessage(token, chatId, result);
      return json({ ok: true }, 200);
    }

    if (text.startsWith("/addquestion")) {
      const question = await parseQuestionPayload(text);
      const nextId = await getNextQuestionId();
      const row = {
        ID: String(nextId),
        SUBJECT: question.subject,
        Question: question.question,
        Option_A: question.optionA,
        Option_B: question.optionB,
        Option_C: question.optionC,
        Option_D: question.optionD,
        Correct_Answer: question.correctAnswer
      };

      await sheetDbRequest(`${getSheetDbBaseUrl()}?sheet=${encodeURIComponent(getQuestionsSheet())}`, {
        method: "POST",
        body: JSON.stringify({ data: [row] })
      });

      await sendTelegramMessage(
        token,
        chatId,
        [
          "Question added successfully.",
          `ID: ${row.ID}`,
          `Subject: ${row.SUBJECT}`,
          `Answer: ${row.Correct_Answer}`
        ].join("\n")
      );
      return json({ ok: true }, 200);
    }

    await sendTelegramMessage(token, chatId, helpMessage());
    return json({ ok: true }, 200);
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "Unknown admin bot error";
    await sendTelegramMessage(token, chatId, `Request failed: ${messageText}`);
    return json({ ok: false, error: messageText }, 200);
  }
};

async function handleAuthorize(text) {
  const value = text.replace("/authorize", "").trim();
  if (!value) {
    throw new Error("Use /authorize @username or /authorize 123456789");
  }

  const isUsername = value.startsWith("@");
  const username = isUsername ? value.slice(1) : "";
  const telegramId = isUsername ? "" : value;

  await sheetDbRequest(`${getSheetDbBaseUrl()}?sheet=${encodeURIComponent(getAdminsSheet())}`, {
    method: "POST",
    body: JSON.stringify({
      data: [
        {
          Telegram_ID: telegramId,
          Username: username,
          Role: "admin",
          Active: "TRUE"
        }
      ]
    })
  });

  return isUsername
    ? `Authorized @${username} in the Admins sheet.`
    : `Authorized Telegram ID ${telegramId} in the Admins sheet.`;
}

async function parseQuestionPayload(text) {
  const compact = tryParseCompactQuestion(text);
  if (compact) {
    return compact;
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const fields = new Map();

  for (const line of lines.slice(1)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim().toUpperCase();
    const value = line.slice(separatorIndex + 1).trim();
    fields.set(key, value);
  }

  const payload = {
    subject: fields.get("SUBJECT") ?? "",
    question: fields.get("QUESTION") ?? "",
    optionA: fields.get("A") ?? fields.get("OPTION_A") ?? "",
    optionB: fields.get("B") ?? fields.get("OPTION_B") ?? "",
    optionC: fields.get("C") ?? fields.get("OPTION_C") ?? "",
    optionD: fields.get("D") ?? fields.get("OPTION_D") ?? "",
    correctAnswer: fields.get("ANSWER") ?? fields.get("CORRECT_ANSWER") ?? ""
  };

  validateQuestionPayload(payload);
  return payload;
}

function tryParseCompactQuestion(text) {
  const parts = text.split("|").map((part) => part.trim());
  if (parts.length !== 8) {
    return null;
  }

  const payload = {
    subject: parts[1],
    question: parts[2],
    optionA: parts[3],
    optionB: parts[4],
    optionC: parts[5],
    optionD: parts[6],
    correctAnswer: parts[7]
  };

  validateQuestionPayload(payload);
  return payload;
}

function validateQuestionPayload(payload) {
  if (
    !payload.subject ||
    !payload.question ||
    !payload.optionA ||
    !payload.optionB ||
    !payload.optionC ||
    !payload.optionD
  ) {
    throw new Error("Question payload is incomplete. Use /helpadmin for the format.");
  }

  if (!["Option_A", "Option_B", "Option_C", "Option_D"].includes(payload.correctAnswer)) {
    throw new Error("Correct answer must be Option_A, Option_B, Option_C, or Option_D.");
  }
}

async function isAuthorized(user) {
  const username = user.username?.toLowerCase() ?? "";
  const id = String(user.id);

  const envUsernames = (process.env.TELEGRAM_ADMIN_USERNAMES ?? "")
    .split(",")
    .map((value) => value.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean);
  const envIds = (process.env.TELEGRAM_ADMIN_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (envIds.includes(id) || (username && envUsernames.includes(username))) {
    return true;
  }

  try {
    const admins = await sheetDbRequest(
      `${getSheetDbBaseUrl()}?sheet=${encodeURIComponent(getAdminsSheet())}`
    );

    return admins.some((entry) => {
      const active = String(entry.Active ?? "TRUE").toLowerCase() !== "false";
      const sheetUsername = String(entry.Username ?? "")
        .trim()
        .replace(/^@/, "")
        .toLowerCase();
      const sheetId = String(entry.Telegram_ID ?? "").trim();
      return active && (sheetId === id || (username && sheetUsername === username));
    });
  } catch {
    return false;
  }
}

async function getNextQuestionId() {
  const rows = await sheetDbRequest(
    `${getSheetDbBaseUrl()}?sheet=${encodeURIComponent(getQuestionsSheet())}`
  );

  const maxId = rows.reduce((current, row) => {
    const id = Number.parseInt(String(row.ID ?? "0"), 10);
    return Number.isFinite(id) ? Math.max(current, id) : current;
  }, 0);

  return maxId + 1;
}

async function sendTelegramMessage(token, chatId, text) {
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram sendMessage failed: ${response.status} ${errorText}`);
  }
}

async function sheetDbRequest(url, init) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SheetDB request failed: ${response.status} ${text}`);
  }

  return response.json();
}

function getSheetDbBaseUrl() {
  return (
    process.env.SHEETDB_BASE_URL ??
    process.env.NEXT_PUBLIC_SHEETDB_BASE_URL ??
    (() => {
      throw new Error("Missing SHEETDB_BASE_URL");
    })()
  );
}

function getQuestionsSheet() {
  return process.env.SHEETDB_QUESTIONS_SHEET ?? "Questions";
}

function getAdminsSheet() {
  return process.env.SHEETDB_ADMINS_SHEET ?? "Admins";
}

function helpMessage() {
  return [
    "Admin bot commands:",
    "/whoami",
    "/authorize @username",
    "/authorize 123456789",
    "",
    "Add question with one message:",
    "/addquestion | Crop Science | What is Agriculture? | option a | option b | option c | option d | Option_D",
    "",
    "Or multiline format:",
    "/addquestion",
    "SUBJECT: Crop Science",
    "QUESTION: What is Agriculture?",
    "A: option a",
    "B: option b",
    "C: option c",
    "D: option d",
    "ANSWER: Option_D"
  ].join("\n");
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
