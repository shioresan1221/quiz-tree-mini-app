import { NextRequest, NextResponse } from "next/server";
import { ensureUser, getUserByTelegramId, updateUserProgress } from "@/lib/sheets";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const telegramId = searchParams.get("telegramId");
  const username = searchParams.get("username") ?? "Player";

  if (!telegramId) {
    return NextResponse.json({ error: "telegramId is required" }, { status: 400 });
  }

  try {
    const existing = await getUserByTelegramId(telegramId);
    const user = existing ?? (await ensureUser({ telegramId, username }));
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await updateUserProgress(body);
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
