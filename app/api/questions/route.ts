import { NextRequest, NextResponse } from "next/server";
import { getQuestionSet } from "@/lib/sheets";
import { QuestionMode } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get("subject") ?? undefined;
  const rawCount = Number(searchParams.get("count") ?? "20");
  const count = Number.isFinite(rawCount) ? rawCount : 20;
  const mode = (searchParams.get("mode") ?? "standard") as QuestionMode;
  const mistakes = searchParams.get("mistakes")?.split(",").filter(Boolean) ?? [];

  try {
    const questions = await getQuestionSet({
      mode,
      subject,
      count,
      mistakeIds: mistakes
    });

    return NextResponse.json({ questions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load questions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
