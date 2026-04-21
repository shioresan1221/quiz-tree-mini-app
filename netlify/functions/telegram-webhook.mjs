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

    if (text.startsWith("/allowuser")) {
      const result = await handleAllowUser(text, from);
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

    if (text.startsWith("/addcsv")) {
      const rows = await parseCsvPayload(text);
      const nextId = await getNextQuestionId();
      const preparedRows = rows.map((row, index) => ({
        ID: String(nextId + index),
        SUBJECT: row.SUBJECT,
        Question: row.Question,
        Option_A: row.Option_A,
        Option_B: row.Option_B,
        Option_C: row.Option_C,
        Option_D: row.Option_D,
        Correct_Answer: row.Correct_Answer
      }));

      await sheetDbRequest(
        `${getSheetDbBaseUrl()}?sheet=${encodeURIComponent(getQuestionsSheet())}`,
        {
          method: "POST",
          body: JSON.stringify({ data: preparedRows })
        }
      );

      await sendTelegramMessage(
        token,
        chatId,
        [
          `Imported ${preparedRows.length} question${preparedRows.length === 1 ? "" : "s"}.`,
          `ID range: ${preparedRows[0].ID} - ${preparedRows[preparedRows.length - 1].ID}`,
          `First subject: ${preparedRows[0].SUBJECT}`
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

async function handleAllowUser(text, from) {
  const value = text.replace("/allowuser", "").trim();
  if (!value) {
    throw new Error("Use /allowuser @username or /allowuser 123456789");
  }

  const isUsername = value.startsWith("@");
  const username = isUsername ? value.slice(1) : "";
  const telegramId = isUsername ? "" : value;

  await sheetDbRequest(`${getSheetDbBaseUrl()}?sheet=${encodeURIComponent(getAccessSheet())}`, {
    method: "POST",
    body: JSON.stringify({
      data: [
        {
          Telegram_ID: telegramId,
          Username: username,
          Active: "TRUE",
          Approved_By: from.username ?? String(from.id)
        }
      ]
    })
  });

  return isUsername
    ? `Authorized app access for @${username}.`
    : `Authorized app access for Telegram ID ${telegramId}.`;
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

async function parseCsvPayload(text) {
  const csvText = text.replace("/addcsv", "").trim();
  if (!csvText) {
    throw new Error("Paste CSV rows after /addcsv.");
  }

  const table = parseCsv(csvText);
  if (!table.length) {
    throw new Error("No CSV rows found.");
  }

  const firstRow = table[0].map((value) => value.trim());
  const hasHeader = firstRow[0]?.toUpperCase() === "ID" && firstRow[1]?.toUpperCase() === "SUBJECT";
  const header = hasHeader
    ? firstRow
    : ["ID", "SUBJECT", "Question", "Option_A", "Option_B", "Option_C", "Option_D", "Correct_Answer"];
  const dataRows = hasHeader ? table.slice(1) : table;

  if (header.length < 8) {
    throw new Error("CSV must include 8 columns: ID,SUBJECT,Question,Option_A,Option_B,Option_C,Option_D,Correct_Answer");
  }

  const normalizedHeader = header.map((value) => value.trim());
  const requiredHeader = [
    "ID",
    "SUBJECT",
    "Question",
    "Option_A",
    "Option_B",
    "Option_C",
    "Option_D",
    "Correct_Answer"
  ];

  for (let index = 0; index < requiredHeader.length; index += 1) {
    if (normalizedHeader[index] !== requiredHeader[index]) {
      throw new Error(`CSV header mismatch at column ${index + 1}. Expected ${requiredHeader[index]}.`);
    }
  }

  const rows = dataRows
    .filter((row) => row.some((value) => value.trim()))
    .map((row) => {
      if (row.length < 8) {
        throw new Error("A CSV row is incomplete. Each row needs 8 columns.");
      }

      const mapped = {
        SUBJECT: row[1]?.trim() ?? "",
        Question: row[2]?.trim() ?? "",
        Option_A: row[3]?.trim() ?? "",
        Option_B: row[4]?.trim() ?? "",
        Option_C: row[5]?.trim() ?? "",
        Option_D: row[6]?.trim() ?? "",
        Correct_Answer: row[7]?.trim() ?? ""
      };

      validateQuestionPayload({
        subject: mapped.SUBJECT,
        question: mapped.Question,
        optionA: mapped.Option_A,
        optionB: mapped.Option_B,
        optionC: mapped.Option_C,
        optionD: mapped.Option_D,
        correctAnswer: mapped.Correct_Answer
      });

      return mapped;
    });

  if (!rows.length) {
    throw new Error("CSV payload only contained a header row.");
  }

  return rows;
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

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
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

function getAccessSheet() {
  return process.env.SHEETDB_ACCESS_SHEET ?? "Authorized_Users";
}

function helpMessage() {
  return [
    "Admin bot commands:",
    "/whoami",
    "/authorize @username",
    "/authorize 123456789",
    "/allowuser @username",
    "/allowuser 123456789",
    "/addcsv",
    "",
    "Add question with one message:",
    "/addquestion | Crop Science | What is Agriculture? | option a | option b | option c | option d | Option_D",
    "",
    "Bulk import from CSV:",
    "/addcsv",
    "ID,SUBJECT,Question,Option_A,Option_B,Option_C,Option_D,Correct_Answer",
    "1,Crop Science,What is Agriculture?,option a,option b,option c,option d,Option_D",
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
