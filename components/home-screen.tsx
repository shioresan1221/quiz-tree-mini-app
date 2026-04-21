"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchOrCreateUser, syncTapReward } from "@/lib/api";
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

const SUBJECTS = ["Math", "Science", "History", "English", "General Knowledge"];

export function HomeScreen() {
  const { profile, ready } = useTelegramProfile();
  const [user, setUser] = useState<UserRecord | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("Math");

  useEffect(() => {
    if (!ready) {
      return;
    }

    const load = async () => {
      const loaded = await fetchOrCreateUser(profile.telegramId, profile.username);
      setUser(loaded);
    };

    void load();
  }, [profile.telegramId, profile.username, ready]);

  const stage = useMemo(() => getTreeStage(user?.Coins ?? 0), [user?.Coins]);
  const progress = useMemo(
    () =>
      user
        ? Math.min(
            100,
            Math.round(((user.Coins - stage.minCoins) / (stage.maxCoins - stage.minCoins || 1)) * 100)
          )
        : 0,
    [stage, user]
  );

  const handleTap = async () => {
    if (!user || isSyncing) {
      return;
    }

    setIsSyncing(true);
    try {
      const updated = await syncTapReward(user.Telegram_ID, user.Username, 10);
      setUser(updated);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-5 text-ink">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <section className="rounded-[28px] border border-white/70 bg-white/70 p-5 shadow-bloom backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-moss/70">
                Quiz Tree
              </p>
              <h1 className="mt-2 text-3xl font-black">
                {ready ? `Hi, ${profile.firstName}` : "Loading Telegram profile..."}
              </h1>
              <p className="mt-2 text-sm text-moss/80">
                Tap to farm Knowledge Coins, then roll into the swipe quiz feed.
              </p>
            </div>
            <div className="rounded-full bg-mist px-3 py-2 text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-moss/60">Level</p>
              <p className="text-lg font-bold">{coinsToLevel(user?.Coins ?? 0)}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <StatCard label="Coins" value={String(user?.Coins ?? 0)} />
            <StatCard label="Tree Form" value={stage.name} />
            <StatCard label="Mistakes" value={formatMistakeCount(user?.Mistake_IDs ?? "")} />
          </div>

          <div className="mt-5 rounded-[24px] bg-canopy p-5 text-center shadow-inner">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-moss/70">
              Farming Home
            </p>
            <button
              type="button"
              onClick={handleTap}
              className="mt-4 inline-flex h-44 w-44 items-center justify-center rounded-full border-8 border-white/80 bg-white/80 text-7xl shadow-bloom transition active:scale-95"
            >
              {stage.icon}
            </button>
            <p className="mt-4 text-xl font-bold">{stage.name}</p>
            <p className="mt-2 text-sm text-moss/80">
              Each tap sends `+10` coins to the Users sheet.
            </p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/70">
              <div
                className="h-full rounded-full bg-leaf transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-moss/70">
              {stage.maxCoins === Number.POSITIVE_INFINITY
                ? "Max form reached"
                : `${stage.maxCoins - (user?.Coins ?? 0)} coins to ${LEVELS[stage.index + 1]?.name}`}
            </p>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-bloom">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-moss/70">
                Quiz Modes
              </p>
              <h2 className="mt-2 text-2xl font-black">Launch a run</h2>
            </div>
            <Link
              href="/quiz?mode=standard"
              className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white"
            >
              Open Feed
            </Link>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <ModeLink
              href="/quiz?mode=standard"
              title="Standard Feed"
              subtitle="TikTok-style vertical quiz. Swipe stays locked until the answer is correct."
            />
            <ModeLink
              href={`/quiz?mode=mock&subject=${encodeURIComponent(selectedSubject)}&count=100`}
              title="Mock Exam"
              subtitle="Pull 100 random questions from a single subject."
            />
            <ModeLink
              href={`/quiz?mode=review&mistakes=${encodeURIComponent(user?.Mistake_IDs ?? "")}`}
              title="Review Mode"
              subtitle="Only questions from the user’s mistake library."
            />
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-moss/70">
              Subject for Mock Exam
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
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-moss/70">
              Custom Exam
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {CUSTOM_COUNTS.map((count) => (
                <Link
                  key={count}
                  href={`/quiz?mode=custom&count=${count}&subject=${encodeURIComponent(selectedSubject)}`}
                  className="rounded-2xl border border-moss/10 bg-mist px-3 py-4 text-center font-bold transition hover:bg-white"
                >
                  {count}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-mist p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-moss/70">{label}</p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}

function ModeLink({
  href,
  title,
  subtitle
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[22px] border border-moss/10 bg-mist p-4 transition hover:bg-white"
    >
      <p className="text-lg font-bold">{title}</p>
      <p className="mt-1 text-sm text-moss/80">{subtitle}</p>
    </Link>
  );
}
