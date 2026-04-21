import { Suspense } from "react";
import { QuizScreen } from "@/components/quiz-screen";

export default function QuizPage() {
  return (
    <Suspense fallback={null}>
      <QuizScreen />
    </Suspense>
  );
}
