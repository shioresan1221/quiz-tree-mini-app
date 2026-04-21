# Quiz Tree Mini App

A Telegram Mini App quiz game with:

- Tap-to-earn farming home
- TikTok-style vertical quiz feed with swipe lock
- Mock exams by subject
- Custom exam lengths
- Review mode from the user's mistake library
- Google Sheets backend through SheetDB

## Stack

- Next.js 15 + React 19
- Tailwind CSS
- Framer Motion
- Telegram Mini Apps SDK
- Google Sheets via SheetDB

Note on the Telegram SDK:
As of April 21, 2026, the official Telegram Mini Apps docs are centered on the `@tma.js/sdk` package. This project uses that current package instead of the older `@telegram-apps/sdk` name from your prompt so the integration matches the current docs.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill in `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
SHEETDB_BASE_URL=https://sheetdb.io/api/v1/YOUR_SHEETDB_ID
SHEETDB_QUESTIONS_SHEET=Questions
SHEETDB_USERS_SHEET=Users
```

4. Start the app:

```bash
npm run dev
```

If `SHEETDB_BASE_URL` is missing, the app falls back to a small in-memory demo dataset so the UI still loads.

## What is implemented

### Home / farming

- Big evolving tree icon
- Tap button that awards `+10` coins per tap
- Auto-creates a user row in the `Users` sheet
- Level icon progression:
  - `0-499`: Seed `🌱`
  - `500-1499`: Sprout `🌿`
  - `1500-3499`: Sapling `🪴`
  - `3500-6999`: Mature Tree `🌳`
  - `7000+`: Ancient Tree `👑`

### Quiz modes

- `standard`: vertical feed, swipe locked until the question is answered correctly
- `mock`: 100 random questions from one subject
- `custom`: choose `15, 20, 30, 50, 60, 70, 80, 90`
- `review`: filters only the user's `Mistake_IDs`

### Rewards and penalties

- Correct answer: `+100 coins`
- Wrong answer: `-50 coins`
- Wrong answer adds the question ID into `Mistake_IDs`

## Google Sheet format

Create one Google Spreadsheet with these exact sheet names:

### Sheet 1: `Questions`

Use row 1 as headers:

| ID | Subject | Question | Option_A | Option_B | Option_C | Option_D | Correct_Answer |
|---|---|---|---|---|---|---|---|
| 1 | Math | What is 2+2? | 3 | 4 | 5 | 6 | Option_B |

Rules:

- `ID` must be unique
- `Subject` should match your subject names exactly
- `Correct_Answer` must be one of `Option_A`, `Option_B`, `Option_C`, `Option_D`
- Add all 1,000 questions under the header row

### Sheet 2: `Users`

Use row 1 as headers:

| Telegram_ID | Username | Coins | Level | Mistake_IDs |
|---|---|---|---|---|
| 123456789 | sampleuser | 450 | 1 | 14,25,62 |

Rules:

- `Telegram_ID` must be unique per user
- `Coins` and `Level` should be numbers
- `Mistake_IDs` is a comma-separated list like `14,25,62`

## How to connect SheetDB

1. Create the Google Sheet.
2. Make sure both tabs are named exactly `Questions` and `Users`.
3. Go to [SheetDB](https://sheetdb.io/).
4. Create a new API and connect your spreadsheet.
5. Copy the API base URL. It will look similar to:

```text
https://sheetdb.io/api/v1/abc123xyz
```

6. Put that URL in `.env.local` as `SHEETDB_BASE_URL`.
7. Keep:

```env
SHEETDB_QUESTIONS_SHEET=Questions
SHEETDB_USERS_SHEET=Users
```

The app uses these SheetDB operations:

- `GET /?sheet=Questions` to load questions
- `GET /search?sheet=Users&Telegram_ID=...` to load a user
- `POST /?sheet=Users` to create a user
- `PATCH /Telegram_ID/<id>?sheet=Users` to update coins, level, and mistakes

## How to register the Telegram bot and Mini App

1. Open Telegram and start a chat with [@BotFather](https://t.me/BotFather).
2. Run `/newbot`.
3. Give your bot a name and username.
4. Copy the bot token and keep it private.
5. Host this Next.js app on a public HTTPS URL.
6. In BotFather, open your bot settings and configure the Mini App URL.

Typical BotFather flow:

- `/mybots`
- Select your bot
- `Bot Settings`
- `Menu Button` or `Configure Mini App`
- Paste your public HTTPS URL

7. Open your bot inside Telegram and launch the app from the button/menu.

Important:

- Telegram Mini Apps require HTTPS in production
- Localhost works only for local development/testing outside Telegram unless you tunnel it
- For device testing, use a tunnel like ngrok or deploy to Vercel

## Recommended deployment

The easiest path is Vercel:

1. Push this project to GitHub.
2. Import the repo into [Vercel](https://vercel.com/).
3. Add the same environment variables from `.env.local`.
4. Deploy.
5. Copy the production URL into BotFather.

## Project structure

```text
app/
  api/
    questions/route.ts
    users/route.ts
  quiz/page.tsx
  globals.css
  layout.tsx
  page.tsx
components/
  home-screen.tsx
  quiz-screen.tsx
  subject-chip.tsx
  telegram-provider.tsx
lib/
  api.ts
  game.ts
  sheets.ts
  telegram.ts
  types.ts
```

## Key logic locations

- Home farming UI: [app/page.tsx](C:/Users/Admin/Documents/New%20project/app/page.tsx)
- Quiz feed UI: [app/quiz/page.tsx](C:/Users/Admin/Documents/New%20project/app/quiz/page.tsx)
- Question API: [app/api/questions/route.ts](C:/Users/Admin/Documents/New%20project/app/api/questions/route.ts)
- User API: [app/api/users/route.ts](C:/Users/Admin/Documents/New%20project/app/api/users/route.ts)
- Leveling logic: [lib/game.ts](C:/Users/Admin/Documents/New%20project/lib/game.ts)
- SheetDB logic: [lib/sheets.ts](C:/Users/Admin/Documents/New%20project/lib/sheets.ts)
