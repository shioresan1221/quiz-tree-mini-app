"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  fetchLeaderboard,
  fetchOrCreateUser,
  updateDisplayName
} from "@/lib/api";
import {
  CUSTOM_COUNTS,
  LEVELS,
  coinsToLevel,
  formatMistakeCount,
  getTreeStage
} from "@/lib/game";
import { SubjectChip } from "@/components/subject-chip";
import { useTelegramProfile } from "@/components/telegram-provider";
import { UserRecord } from "@/lib/types";

const SUBJECTS = [
  "All_Questions",
  "Agricultural Economics and Marketing",
  "Agricultural Extension and Communication",
  "Animal Science",
  "Crop Protection",
  "Crop Science",
  "Soil Science"
];

type ModePreset = {
  mode: "standard" | "mock" | "custom" | "review";
  title: string;
  eyebrow: string;
  summary: string;
  accent: string;
  getHref: () => string;
  rules: string[];
};

export function HomeScreen() {
  const router = useRouter();
  const { profile, ready } = useTelegramProfile();
  const [user, setUser] = useState<UserRecord | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserRecord[]>([]);
  const [isSavingName, setIsSavingName] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("All_Questions");
  const [selectedCustomCount, setSelectedCustomCount] = useState<number>(CUSTOM_COUNTS[0]);
  const [activePreset, setActivePreset] = useState<ModePreset | null>(null);
  const [draftName, setDraftName] = useState("");
  const [showNameEditor, setShowNameEditor] = useState(false);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const load = async () => {
      const [loaded, board] = await Promise.all([
        fetchOrCreateUser(profile.telegramId, profile.username),
        fetchLeaderboard()
      ]);
      setUser(loaded);
      setDraftName(loaded.Username || profile.username);
      setLeaderboard(board);
    };

    void load();
  }, [profile.telegramId, profile.username, ready]);

  const stage = useMemo(() => getTreeStage(user?.Coins ?? 0), [user?.Coins]);
  const progress = useMemo(() => {
    if (!user) {
      return 0;
    }

    if (stage.maxCoins === Number.POSITIVE_INFINITY) {
      return 100;
    }

    return Math.min(
      100,
      Math.round(((user.Coins - stage.minCoins) / (stage.maxCoins - stage.minCoins || 1)) * 100)
    );
  }, [stage, user]);

  const modePresets = useMemo<ModePreset[]>(
    () => [
      {
        mode: "standard",
        title: "Standard Feed",
        eyebrow: "Swipe Mode",
        summary:
          "Vertical learning stream. Your plant score mirrors your performance in real time.",
        accent: "from-fuchsia-500/30 via-rose-400/10 to-cyan-400/20",
        getHref: () => "/quiz?mode=standard",
        rules: [
          "Swipe stays locked until you answer the current card correctly.",
          "Correct answers give +1 coin.",
          "Wrong answers remove 1 coin and keep you on the same card."
        ]
      },
      {
        mode: "mock",
        title: "Mock Exam",
        eyebrow: "100 Questions",
        summary:
          selectedSubject === "All_Questions"
            ? "Mock exam using 100 random questions from the full bank."
            : `Mock exam using 100 random ${selectedSubject} questions.`,
        accent: "from-cyan-500/30 via-sky-400/10 to-blue-500/25",
        getHref: () =>
          `/quiz?mode=mock&subject=${encodeURIComponent(selectedSubject)}&count=100`,
        rules: [
          selectedSubject === "All_Questions"
            ? "Loads 100 random questions from the full question bank."
            : `Loads 100 random questions from ${selectedSubject}.`,
          "The maximum score for this run is 100 coins.",
          "Wrong answers remove 1 coin and also go into your mistake library."
        ]
      },
      {
        mode: "review",
        title: "Mistake Library",
        eyebrow: "Repair Mode",
        summary: "Replay only the questions you previously missed.",
        accent: "from-amber-500/35 via-orange-400/10 to-red-500/20",
        getHref: () =>
          `/quiz?mode=review&mistakes=${encodeURIComponent(user?.Mistake_IDs ?? "")}`,
        rules: [
          "Only questions listed in your Mistake_IDs are shown.",
          "Correct answers still give +1 coin.",
          "Wrong answers remove 1 coin, so the plant can downgrade here too."
        ]
      },
      {
        mode: "custom",
        title: "Custom Exam",
        eyebrow: `${selectedCustomCount} Questions`,
        summary:
          selectedSubject === "All_Questions"
            ? `Build a shorter mixed session with ${selectedCustomCount} random questions.`
            : `Build a shorter ${selectedSubject} session with a fixed question count.`,
        accent: "from-emerald-500/30 via-lime-400/10 to-teal-500/20",
        getHref: () =>
          `/quiz?mode=custom&count=${selectedCustomCount}&subject=${encodeURIComponent(selectedSubject)}`,
        rules: [
          `Loads exactly ${selectedCustomCount} random questions.`,
          `Current subject filter: ${selectedSubject === "All_Questions" ? "None, using all topics" : selectedSubject}.`,
          `The maximum score for this run is ${selectedCustomCount} coins.`
        ]
      }
    ],
    [selectedCustomCount, selectedSubject, user?.Mistake_IDs]
  );

  const handleSaveName = async () => {
    const nextName = draftName.trim();
    if (!user || !nextName || isSavingName) {
      return;
    }

    setIsSavingName(true);
    try {
      const updated = await updateDisplayName(user.Telegram_ID, nextName);
      setUser(updated);
      setLeaderboard((current) => upsertLeaderboard(current, updated));
      setShowNameEditor(false);
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden px-4 py-5 text-white">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[#0a0d18]/90 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_24%),radial-gradient(circle_at_75%_25%,rgba(236,72,153,0.18),transparent_28%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.14),transparent_30%)]" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                  Quiz Tree Feed
                </p>
                <h1 className="mt-3 max-w-[12ch] text-4xl font-black leading-none">
                  Learn like a live stream.
                </h1>
                <p className="mt-3 max-w-[32ch] text-sm leading-6 text-white/65">
                  {ready
                    ? `${profile.firstName}, your plant now grows from quiz performance. Correct answers add coins, while wrong answers pull the plant back down automatically.`
                    : "Connecting your Telegram profile and loading your quiz room."}
                </p>
                <button
                  type="button"
                  onClick={() => setShowNameEditor(true)}
                  className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/78"
                >
                  Player: {user?.Username || "Choose Name"}
                </button>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-right backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">Level</p>
                <p className="mt-2 text-2xl font-black">{coinsToLevel(user?.Coins ?? 0)}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <StatCard label="Coins" value={String(user?.Coins ?? 0)} />
              <StatCard label="Tree Form" value={stage.name} />
              <StatCard label="Mistakes" value={formatMistakeCount(user?.Mistake_IDs ?? "")} />
            </div>

            <div className="mt-5 grid gap-4 rounded-[32px] border border-white/10 bg-white/5 p-4 backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
                  Plant Progress
                </p>
                <h2 className="mt-3 text-2xl font-black">{stage.name}</h2>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Each correct question gives `+1` coin. Each wrong answer takes `1` coin back, so the plant can upgrade or downgrade based on your answers.
                </p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#f59e0b] via-[#f472b6] to-[#22d3ee] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] uppercase tracking-[0.28em] text-white/35">
                  {stage.maxCoins === Number.POSITIVE_INFINITY
                    ? "Max growth unlocked"
                    : `${stage.maxCoins - (user?.Coins ?? 0)} coins to ${LEVELS[stage.index + 1]?.name}`}
                </p>
              </div>

              <div className="relative flex items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6">
                <div className="absolute h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl" />
                <div className="absolute h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl" />
                <div className="relative inline-flex h-44 w-44 items-center justify-center rounded-full border border-white/15 bg-black/35 text-8xl shadow-[0_0_0_12px_rgba(255,255,255,0.04),0_20px_50px_rgba(0,0,0,0.45)]">
                  <span className="absolute inset-3 rounded-full border border-white/10" />
                  <span className="relative">{stage.icon}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-white/10 bg-[#0b1020]/85 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/45">
                Select A Run
              </p>
              <h2 className="mt-2 text-3xl font-black">Choose your mode.</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.25em] text-white/45">
              Rules first
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {modePresets.map((preset) => (
              <button
                key={preset.mode}
                type="button"
                onClick={() => setActivePreset(preset)}
                className={`relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br ${preset.accent} p-4 text-left transition hover:scale-[1.01]`}
              >
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))]" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/55">
                      {preset.eyebrow}
                    </p>
                    <p className="mt-2 text-2xl font-black">{preset.title}</p>
                    <p className="mt-2 max-w-[36ch] text-sm leading-6 text-white/72">
                      {preset.summary}
                    </p>
                  </div>
                  <div className="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/75">
                    View rules
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
              Subject Filter
            </p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {SUBJECTS.map((subject) => (
                <SubjectChip
                  key={subject}
                  active={selectedSubject === subject}
                  onClick={() => setSelectedSubject(subject)}
                >
                  {subject}
                </SubjectChip>
              ))}
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
                Custom Exam Size
              </p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {CUSTOM_COUNTS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      setSelectedCustomCount(count);
                      setActivePreset(modePresets.find((preset) => preset.mode === "custom") ?? null);
                    }}
                    className={[
                      "rounded-2xl border px-3 py-4 text-center text-sm font-black transition",
                      selectedCustomCount === count
                        ? "border-fuchsia-400/60 bg-fuchsia-500/20 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    ].join(" ")}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-white/10 bg-[#0b1020]/85 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/45">
                Top Board
              </p>
              <h2 className="mt-2 text-3xl font-black">Leaderboard</h2>
            </div>
            <button
              type="button"
              onClick={async () => setLeaderboard(await fetchLeaderboard())}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.24em] text-white/58"
            >
              Refresh
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            {leaderboard.length ? (
              leaderboard.map((entry, entryIndex) => (
                <div
                  key={entry.Telegram_ID}
                  className="flex items-center justify-between rounded-[26px] border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-black">
                      #{entryIndex + 1}
                    </div>
                    <div>
                      <p className="text-lg font-black">{entry.Username}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.24em] text-white/40">
                        Level {entry.Level}
                        {entry.Telegram_ID === user?.Telegram_ID ? " · You" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black">{entry.Coins}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.24em] text-white/40">coins</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[26px] border border-white/10 bg-white/5 px-4 py-5 text-sm leading-6 text-white/65">
                No leaderboard entries yet. Save your name and answer questions correctly to appear here.
              </div>
            )}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showNameEditor ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 backdrop-blur md:items-center md:justify-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg overflow-hidden rounded-[34px] border border-white/10 bg-[#0a0d18] text-white shadow-[0_40px_100px_rgba(0,0,0,0.55)]"
            >
              <div className="bg-gradient-to-br from-fuchsia-500/30 via-cyan-400/10 to-amber-400/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-white/55">
                  Choose Your Name
                </p>
                <h3 className="mt-2 text-3xl font-black">Set your leaderboard name.</h3>
                <p className="mt-2 text-sm leading-6 text-white/78">
                  This name is shown on the top board and in your player card.
                </p>
              </div>

              <div className="p-5">
                <input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  maxLength={24}
                  placeholder="Enter your player name"
                  className="w-full rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-lg font-semibold text-white outline-none placeholder:text-white/30"
                />
                <p className="mt-2 text-xs uppercase tracking-[0.24em] text-white/35">
                  Max 24 characters
                </p>

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftName(user?.Username || profile.username);
                      setShowNameEditor(false);
                    }}
                    className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 font-bold text-white/75"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={!draftName.trim() || isSavingName}
                    className="flex-1 rounded-full bg-white px-5 py-3 font-black text-black disabled:cursor-not-allowed disabled:bg-white/25 disabled:text-white/40"
                  >
                    {isSavingName ? "Saving..." : "Save Name"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {activePreset ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 backdrop-blur md:items-center md:justify-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg overflow-hidden rounded-[34px] border border-white/10 bg-[#0a0d18] text-white shadow-[0_40px_100px_rgba(0,0,0,0.55)]"
            >
              <div className={`bg-gradient-to-br ${activePreset.accent} p-5`}>
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-white/55">
                  Mode Rules
                </p>
                <h3 className="mt-2 text-3xl font-black">{activePreset.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/78">{activePreset.summary}</p>
              </div>

              <div className="p-5">
                <div className="grid gap-3">
                  {activePreset.rules.map((rule) => (
                    <div
                      key={rule}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white/78"
                    >
                      {rule}
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActivePreset(null)}
                    className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 font-bold text-white/75"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextHref = activePreset.getHref();
                      setActivePreset(null);
                      router.push(nextHref);
                    }}
                    className="flex-1 rounded-full bg-white px-5 py-3 font-black text-black"
                  >
                    Start Mode
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-3 backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.28em] text-white/38">{label}</p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function upsertLeaderboard(current: UserRecord[], updated: UserRecord) {
  const next = [
    ...current.filter((entry) => entry.Telegram_ID !== updated.Telegram_ID),
    updated
  ];

  return next.sort((left, right) => right.Coins - left.Coins).slice(0, 8);
}
