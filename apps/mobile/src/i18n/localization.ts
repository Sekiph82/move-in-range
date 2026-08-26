export type AppLanguage = "en" | "tr";

export type TranslationKey =
  | "tabs.home"
  | "tabs.program"
  | "tabs.move"
  | "tabs.progress"
  | "tabs.profile"
  | "settings.language"
  | "settings.english"
  | "settings.turkish"
  | "settings.workoutVoice"
  | "settings.haptics"
  | "settings.voiceAuto"
  | "readiness.title"
  | "readiness.subtitle"
  | "readiness.ready"
  | "readiness.modified"
  | "readiness.delayed"
  | "readiness.blocked"
  | "workout.start"
  | "workout.checkReadinessStart"
  | "workout.reviewAdjustments"
  | "workout.recheckReadiness"
  | "workout.pause"
  | "workout.resume"
  | "workout.skip"
  | "workout.substitute"
  | "workout.pain"
  | "workout.finish"
  | "workout.exit"
  | "workout.confirmFinish"
  | "workout.confirmExit";

const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: {
    "tabs.home": "Home",
    "tabs.program": "Program",
    "tabs.move": "Move",
    "tabs.progress": "Progress",
    "tabs.profile": "Profile",
    "settings.language": "Language",
    "settings.english": "English",
    "settings.turkish": "Türkçe",
    "settings.workoutVoice": "Workout voice",
    "settings.haptics": "Haptics",
    "settings.voiceAuto": "Automatic voice",
    "readiness.title": "Readiness check",
    "readiness.subtitle": "A short pre-workout check-in.",
    "readiness.ready": "Ready",
    "readiness.modified": "Ready with adjustments",
    "readiness.delayed": "Delay and recheck",
    "readiness.blocked": "Do not start workout",
    "workout.start": "Start guided session",
    "workout.checkReadinessStart": "Check readiness & start",
    "workout.reviewAdjustments": "Review adjustments",
    "workout.recheckReadiness": "Recheck readiness",
    "workout.pause": "Pause",
    "workout.resume": "Resume",
    "workout.skip": "Skip",
    "workout.substitute": "Substitute",
    "workout.pain": "Pain",
    "workout.finish": "Finish",
    "workout.exit": "Exit",
    "workout.confirmFinish": "Finish this session early?",
    "workout.confirmExit": "Exit this workout?"
  },
  tr: {
    "tabs.home": "Ana sayfa",
    "tabs.program": "Program",
    "tabs.move": "Hareket",
    "tabs.progress": "İlerleme",
    "tabs.profile": "Profil",
    "settings.language": "Dil",
    "settings.english": "English",
    "settings.turkish": "Türkçe",
    "settings.workoutVoice": "Antrenman sesi",
    "settings.haptics": "Titreşim",
    "settings.voiceAuto": "Otomatik ses",
    "readiness.title": "Hazırlık kontrolü",
    "readiness.subtitle": "Antrenman öncesi kısa kontrol.",
    "readiness.ready": "Hazır",
    "readiness.modified": "Ayarlamayla hazır",
    "readiness.delayed": "Ertele ve tekrar kontrol et",
    "readiness.blocked": "Antrenmanı başlatma",
    "workout.start": "Rehberli antrenmanı başlat",
    "workout.checkReadinessStart": "Hazırlığı kontrol et ve başlat",
    "workout.reviewAdjustments": "Ayarlamaları incele",
    "workout.recheckReadiness": "Hazırlığı tekrar kontrol et",
    "workout.pause": "Duraklat",
    "workout.resume": "Devam et",
    "workout.skip": "Atla",
    "workout.substitute": "Değiştir",
    "workout.pain": "Ağrı",
    "workout.finish": "Bitir",
    "workout.exit": "Çık",
    "workout.confirmFinish": "Bu antrenmanı erken bitir?",
    "workout.confirmExit": "Bu antrenmandan çık?"
  }
};

export function translate(language: AppLanguage, key: TranslationKey) {
  return translations[language][key] ?? translations.en[key];
}

export function speechLanguage(language: AppLanguage) {
  return language === "tr" ? "tr-TR" : "en-US";
}
