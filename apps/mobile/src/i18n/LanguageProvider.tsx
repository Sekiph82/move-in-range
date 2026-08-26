import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { AppLanguage, translate, type TranslationKey } from "./localization";

const LANGUAGE_KEY = "mir_app_language";
const VOICE_KEY = "mir_workout_voice_enabled";
const HAPTICS_KEY = "mir_haptics_enabled";

type LanguageContextValue = {
  language: AppLanguage;
  voiceEnabled: boolean;
  hapticsEnabled: boolean;
  ready: boolean;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setVoiceEnabled: (enabled: boolean) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  voiceEnabled: true,
  hapticsEnabled: true,
  ready: false,
  setLanguage: async () => undefined,
  setVoiceEnabled: async () => undefined,
  setHapticsEnabled: async () => undefined,
  t: (key) => translate("en", key)
});

function initialLanguage(): AppLanguage {
  const code = Localization.getLocales()[0]?.languageCode?.toLowerCase();
  return code === "tr" ? "tr" : "en";
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, updateLanguage] = useState<AppLanguage>(initialLanguage());
  const [voiceEnabled, updateVoiceEnabled] = useState(true);
  const [hapticsEnabled, updateHapticsEnabled] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(LANGUAGE_KEY), AsyncStorage.getItem(VOICE_KEY), AsyncStorage.getItem(HAPTICS_KEY)])
      .then(([savedLanguage, savedVoice, savedHaptics]) => {
        if (!active) return;
        if (savedLanguage === "en" || savedLanguage === "tr") updateLanguage(savedLanguage);
        if (savedVoice === "false") updateVoiceEnabled(false);
        if (savedHaptics === "false") updateHapticsEnabled(false);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    voiceEnabled,
    hapticsEnabled,
    ready,
    setLanguage: async (next) => {
      updateLanguage(next);
      await AsyncStorage.setItem(LANGUAGE_KEY, next);
    },
    setVoiceEnabled: async (enabled) => {
      updateVoiceEnabled(enabled);
      await AsyncStorage.setItem(VOICE_KEY, String(enabled));
    },
    setHapticsEnabled: async (enabled) => {
      updateHapticsEnabled(enabled);
      await AsyncStorage.setItem(HAPTICS_KEY, String(enabled));
    },
    t: (key) => translate(language, key)
  }), [hapticsEnabled, language, ready, voiceEnabled]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useAppLanguage() {
  return useContext(LanguageContext);
}
