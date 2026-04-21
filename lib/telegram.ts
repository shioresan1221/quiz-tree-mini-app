import { init } from "@tma.js/sdk";
import { TelegramUser, UserProfile } from "@/lib/types";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
        initDataUnsafe?: {
          user?: TelegramUser;
        };
      };
    };
  }
}

export async function getTelegramProfile(): Promise<TelegramUser | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    init();
  } catch {
    // Ignore repeated or non-Telegram init calls.
  }

  const webApp = window.Telegram?.WebApp;
  webApp?.ready?.();
  webApp?.expand?.();

  return webApp?.initDataUnsafe?.user ?? null;
}

export function getFallbackProfile(): UserProfile {
  return {
    telegramId: "demo-user",
    username: "Demo Player",
    firstName: "Demo"
  };
}
