"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { fetchOrCreateUser, fetchQuestions, submitAnswerResult } from "@/lib/api";
import { QuestionRecord, QuestionMode, UserRecord } from "@/lib/types";
import { useTelegramProfile } from "@/components/telegram-provider";
import { joinMistakes } from "@/lib/game";

const correctReward = 1;
const wrongPenalty = 1;

export function QuizScreen() {
  const searchParams = useSearchParams();
  const { profile, ready } = useTelegramProfile();
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [user, setUser] = useState<UserRecord | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState(false);

  const mode = (searchParams.get("mode") ?? "standard") as QuestionMode;
  const subject = searchParams.get("subject") ?? undefined;
  const count = Number(searchParams.get("count") ?? "20");
  const mistakes = searchParams.get("mistakes") ?? "";

  useEffect(() => {
    if (!ready) {
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [loadedUser, loadedQuestions] = await Promise.all([
          fetchOrCreateUser(profile.telegramId, profile.username),
          fetchQuestions({
            mode,
            subject,
            count,
            mistakes
          })
        ]);

        setUser(loadedUser);
        setQuestions(loadedQuestions);
        setIndex(0);
        setSelected(null);
        setFeedback(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [count, mistakes, mode, profile.telegramId, profile.username, ready, subject]);

  const currentQuestion = questions[index];
  const swipeEnabled = feedback === "correct";
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0;

  const title = useMemo(() => {
    switch (mode) {
      case "mock":
        return `${subject ?? "Subject"} Mock Exam`;
      case "custom":
        return `Custom Exam · ${count} items`;
      case "review":
        return "Mistake Library";
      default:
        return "Standard Feed";
    }
  }, [count, mode, subject]);

  const modeRule = useMemo(() => {
    switch (mode) {
      case "mock":
        return `This mock exam uses 100 random ${subject ?? "subject"} questions. Each right answer adds 1 coin and each wrong answer removes 1 coin.`;
      case "custom":
        return `Short-form session with ${count} selected items and a maximum of ${count} possible coins.`;
      case "review":
        return "You are only seeing questions saved in your mistake library, and wrong answers can still pull your plant back down.";
      default:
        return "Swipe up stays locked until the answer on screen is correct. Right answers add 1 coin, wrong answers remove 1 coin.";
    }
  }, [count, mode, subject]);

  const handleAnswer = async (optionKey: string) => {
    if (!currentQuestion || !user || answering) {
      return;
    }

    setSelected(optionKey);
    const isCorrect = optionKey === currentQuestion.Correct_Answer;
    setFeedback(isCorrect ? "correct" : "wrong");
    setAnswering(true);

    try {
      const updatedMistakes = isCorrect
        ? user.Mistake_IDs
        : joinMistakes(user.Mistake_IDs, currentQuestion.ID);
      const updatedCorrectIds = isCorrect
        ? joinTrackedIds(user.Correct_IDs, currentQuestion.ID)
        : user.Correct_IDs;

      const updatedUser = await submitAnswerResult({
        telegramId: user.Telegram_ID,
        username: user.Username,
        coinDelta: isCorrect ? correctReward : -wrongPenalty,
        mistakeIds: updatedMistakes,
        correctIncrement: isCorrect ? 1 : 0,
        wrongIncrement: isCorrect ? 0 : 1,
        correctIds: updatedCorrectIds
      });

      setUser(updatedUser);
    } finally {
      setAnswering(false);
    }
  };

  const goNext = () => {
    if (!swipeEnabled || index >= questions.length - 1) {
      return;
    }

    setIndex((value) => value + 1);
    setSelected(null);
    setFeedback(null);
  };

  const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y < -120) {
      goNext();
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070b14] px-6 text-center text-white">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/45">
            Quiz Tree Feed
          </p>
          <h1 className="mt-4 text-4xl font-black">Loading your stream...</h1>
        </div>
      </main>
    );
  }

  if (!currentQuestion) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070b14] px-6">
        <div className="max-w-md rounded-[32px] border border-white/10 bg-white/5 p-6 text-center text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
            {title}
          </p>
          <h1 className="mt-3 text-3xl font-black">No questions found</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">
            Check your sheet data or make sure Review Mode has stored mistake IDs.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-full bg-white px-5 py-3 font-black text-black"
          >
            Back Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#070b14] text-white">
      <div className="relative mx-auto flex min-h-screen w-full max-w-xl flex-col px-3 py-3">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.16),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(34,211,238,0.14),transparent_24%),radial-gradient(circle_at_bottom,rgba(245,158,11,0.12),transparent_30%)]" />

        <header className="relative z-10 rounded-[28px] border border-white/10 bg-black/25 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/42">
                {title}
              </p>
              <p className="mt-1 text-lg font-black">
                {index + 1} / {questions.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/42">Coins</p>
              <p className="mt-1 text-xl font-black">{user?.Coins ?? 0}</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#f59e0b] via-[#f472b6] to-[#22d3ee]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        <div className="relative mt-3 flex-1 overflow-hidden rounded-[34px] border border-white/10 bg-black/20">
          <AnimatePresence mode="wait">
            <motion.article
              key={currentQuestion.ID}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={swipeEnabled ? 0.16 : 0.03}
              onDragEnd={onDragEnd}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -120 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <div className="relative flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#101827_0%,#090d16_100%)] p-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.18),transparent_26%),radial-gradient(circle_at_80%_20%,rgba(34,211,238,0.16),transparent_22%),radial-gradient(circle_at_bottom,rgba(245,158,11,0.14),transparent_28%)]" />

                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div className="max-w-[70%]">
                    <p className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
                      {currentQuestion.Subject}
                    </p>
                    <h2 className="mt-5 text-[2rem] font-black leading-[1.02]">
                      {currentQuestion.Question}
                    </h2>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <motion.div
                      animate={{ y: [0, -6, 0], scale: [1, 1.04, 1] }}
                      transition={{ duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                      className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-3xl backdrop-blur"
                    >
                      {user ? getStageIcon(user.Level) : "🌰"}
                    </motion.div>
                    <ActionPill label="coins" value={`+${correctReward}`} />
                    <ActionPill label="risk" value={`-${wrongPenalty}`} />
                    <ActionPill label="next" value={swipeEnabled ? "on" : "off"} />
                  </div>
                </div>

                <div className="relative z-10 mt-6 flex-1">
                  <div className="grid gap-3">
                    {questionOptions(currentQuestion).map(([key, value], optionIndex) => {
                      const active = selected === key;
                      const isCorrect = key === currentQuestion.Correct_Answer;
                      const showCorrect = Boolean(feedback) && isCorrect;
                      const showWrong = feedback === "wrong" && active && !isCorrect;

                      return (
                        <motion.button
                          key={key}
                          type="button"
                          disabled={answering}
                          onClick={() => handleAnswer(key)}
                          initial={{ opacity: 0, y: 24 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: optionIndex * 0.04 }}
                          className={[
                            "rounded-[26px] border px-4 py-4 text-left transition",
                            "border-white/10 bg-white/6 backdrop-blur",
                            active ? "ring-2 ring-white/25" : "",
                            showCorrect ? "border-emerald-400/60 bg-emerald-500/18" : "",
                            showWrong ? "border-rose-400/60 bg-rose-500/18" : ""
                          ].join(" ")}
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
                            {key.replace("_", " ")}
                          </p>
                          <p className="mt-2 text-lg font-semibold leading-7 text-white/92">
                            {value}
                          </p>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div className="relative z-10 mt-5 rounded-[28px] border border-white/10 bg-black/30 p-4 backdrop-blur">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/42">
                        Mode Rule
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/72">{modeRule}</p>
                    </div>
                    <div
                      className={[
                        "rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em]",
                        swipeEnabled
                          ? "bg-emerald-500/18 text-emerald-200"
                          : "bg-white/8 text-white/55"
                      ].join(" ")}
                    >
                      {swipeEnabled ? "Swipe Ready" : "Locked"}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Link
                      href="/"
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-3 font-bold text-white/80"
                    >
                      Exit
                    </Link>
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!swipeEnabled}
                      className="rounded-full bg-white px-5 py-3 font-black text-black disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40"
                    >
                      {index >= questions.length - 1 ? "Run Complete" : "Next Card"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

function questionOptions(question: QuestionRecord) {
  return [
    ["Option_A", question.Option_A],
    ["Option_B", question.Option_B],
    ["Option_C", question.Option_C],
    ["Option_D", question.Option_D]
  ] as const;
}

function ActionPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-16 flex-col items-center rounded-[22px] border border-white/10 bg-white/5 px-3 py-3 backdrop-blur">
      <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">{label}</p>
      <p className="mt-2 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function getStageIcon(level: number) {
  switch (level) {
    case 1:
      return "🌰";
    case 2:
      return "🌱";
    case 3:
      return "🌿";
    case 4:
      return "🪴";
    default:
      return "🌳";
  }
}

function joinTrackedIds(existing: string, nextId: string) {
  const set = new Set(
    existing
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
  set.add(nextId);
  return Array.from(set).join(",");
}
