"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { TelegramUser, UserProfile } from "@/lib/types";
import { getFallbackProfile, getTelegramProfile } from "@/lib/telegram";

type TelegramContextValue = {
  profile: UserProfile;
  ready: boolean;
};

const TelegramContext = createContext<TelegramContextValue>({
  profile: getFallbackProfile(),
  ready: false
});

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(getFallbackProfile());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const telegramUser: TelegramUser | null = await getTelegramProfile();
        if (telegramUser) {
          setProfile({
            telegramId: String(telegramUser.id),
            username:
              telegramUser.username ||
              [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ") ||
              "Player",
            firstName: telegramUser.first_name ?? "Player"
          });
        }
      } finally {
        setReady(true);
      }
    };

    void bootstrap();
  }, []);

  const value = useMemo(() => ({ profile, ready }), [profile, ready]);

  return (
    <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>
  );
}

export function useTelegramProfile() {
  return useContext(TelegramContext);
}
