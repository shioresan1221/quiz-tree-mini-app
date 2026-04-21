"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { fetchOrCreateUser, fetchQuestions, submitAnswerResult } from "@/lib/api";
import { QuestionRecord, QuestionMode, UserRecord } from "@/lib/types";
import { useTelegramProfile } from "@/components/telegram-provider";
import { joinMistakes } from "@/lib/game";

const correctReward = 100;
const wrongPenalty = 50;

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

      const updatedUser = await submitAnswerResult({
        telegramId: user.Telegram_ID,
        username: user.Username,
        coinDelta: isCorrect ? correctReward : -wrongPenalty,
        mistakeIds: updatedMistakes
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
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-moss/70">
            Quiz Tree
          </p>
          <h1 className="mt-3 text-3xl font-black">Loading quiz feed...</h1>
        </div>
      </main>
    );
  }

  if (!currentQuestion) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md rounded-[28px] bg-white/80 p-6 text-center shadow-bloom">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-moss/70">
            {title}
          </p>
          <h1 className="mt-3 text-3xl font-black">No questions found</h1>
          <p className="mt-3 text-sm text-moss/80">
            Check your sheet data or make sure Review Mode has mistake IDs stored.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-full bg-ink px-5 py-3 font-bold text-white"
          >
            Back Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-4">
      <div className="mx-auto flex max-w-xl flex-col gap-3">
        <header className="rounded-[24px] bg-white/75 p-4 shadow-bloom backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-moss/70">
                {title}
              </p>
              <h1 className="mt-2 text-2xl font-black">
                {index + 1} / {questions.length}
              </h1>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-moss/70">Coins</p>
              <p className="text-xl font-bold">{user?.Coins ?? 0}</p>
            </div>
          </div>
        </header>

        <div className="relative h-[72vh] overflow-hidden rounded-[32px]">
          <AnimatePresence mode="wait">
            <motion.article
              key={currentQuestion.ID}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={swipeEnabled ? 0.14 : 0.02}
              onDragEnd={onDragEnd}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -120 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="absolute inset-0 rounded-[32px] bg-white/90 p-5 shadow-bloom backdrop-blur"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-3">
                  <p className="rounded-full bg-mist px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-moss/70">
                    {currentQuestion.Subject}
                  </p>
                  <p className="text-sm font-medium text-moss/80">
                    Correct: +{correctReward} / Wrong: -{wrongPenalty}
                  </p>
                </div>

                <div className="mt-6 flex-1">
                  <h2 className="text-3xl font-black leading-tight">
                    {currentQuestion.Question}
                  </h2>

                  <div className="mt-6 grid gap-3">
                    {questionOptions(currentQuestion).map(([key, value]) => {
                      const active = selected === key;
                      const isCorrect = key === currentQuestion.Correct_Answer;
                      const showCorrect = feedback && isCorrect;
                      const showWrong = feedback === "wrong" && active && !isCorrect;

                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={answering}
                          onClick={() => handleAnswer(key)}
                          className={[
                            "rounded-[24px] border px-4 py-4 text-left transition",
                            "border-moss/10 bg-mist",
                            active ? "ring-2 ring-ink/20" : "",
                            showCorrect ? "border-leaf bg-green-100" : "",
                            showWrong ? "border-red-300 bg-red-100" : ""
                          ].join(" ")}
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss/70">
                            {key.replace("_", " ")}
                          </p>
                          <p className="mt-2 text-lg font-semibold">{value}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 rounded-[22px] bg-ink px-4 py-4 text-white">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
                    Feed Rule
                  </p>
                  <p className="mt-2 text-sm">
                    Swipe up is locked until the answer is correct. Wrong answers stay on this card and save the ID into the mistake library.
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Link href="/" className="rounded-full bg-white/15 px-4 py-2 font-bold">
                      Exit
                    </Link>
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!swipeEnabled}
                      className="rounded-full bg-white px-4 py-2 font-bold text-ink disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-white/60"
                    >
                      {index >= questions.length - 1 ? "Run Complete" : "Next Question"}
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
