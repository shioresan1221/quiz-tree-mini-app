import { QuizScreen } from "@/components/quiz-screen";

export default async function QuizPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <QuizScreen searchParams={params} />;
}
