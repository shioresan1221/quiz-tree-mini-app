"use client";

import { useEffect, useState } from "react";
import { fetchAccessState } from "@/lib/api";
import { useTelegramProfile } from "@/components/telegram-provider";

export function AccessGate({ children }: { children: React.ReactNode }) {
  const { profile, ready } = useTelegramProfile();
  const [status, setStatus] = useState<"checking" | "authorized" | "pending" | "blocked">(
    "checking"
  );

  useEffect(() => {
    if (!ready) {
      return;
    }

    const load = async () => {
      try {
        const result = await fetchAccessState(profile.telegramId, profile.username);
        setStatus(result.authorized ? "authorized" : result.pending ? "pending" : "blocked");
      } catch {
        setStatus("blocked");
      }
    };

    void load();
  }, [profile.telegramId, profile.username, ready]);

  if (status === "authorized") {
    return <>{children}</>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070b14] px-6 text-white">
      <div className="max-w-md rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-white/45">
          Access Control
        </p>
        <h1 className="mt-3 text-3xl font-black">
          {status === "checking" ? "Checking access..." : "Approval required"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/68">
          {status === "checking"
            ? "Verifying your Telegram account."
            : "This app is private. Your Telegram account must be approved before you can use it."}
        </p>
        <div className="mt-5 rounded-[22px] border border-white/10 bg-black/25 p-4 text-sm leading-6 text-white/75">
          <div>Username: @{profile.username || "unknown"}</div>
          <div>Telegram ID: {profile.telegramId}</div>
          <div className="mt-2">
            {status === "pending"
              ? "Your access request has been recorded. Wait for the owner to authorize you."
              : "Ask the owner to authorize your account first."}
          </div>
        </div>
      </div>
    </main>
  );
}
