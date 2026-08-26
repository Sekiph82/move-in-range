import { AppLanguage, speechLanguage } from "../i18n/localization";

export type SpeechCueKey =
  | "workout.getReady"
  | "countdown.three"
  | "countdown.two"
  | "countdown.one"
  | "workout.start"
  | "workout.fiveSeconds"
  | "workout.rest"
  | "workout.nextMovement"
  | "workout.paused"
  | "workout.resumed"
  | "workout.completed";

const cueText: Record<AppLanguage, Record<SpeechCueKey, string>> = {
  en: {
    "workout.getReady": "Get ready",
    "countdown.three": "Three",
    "countdown.two": "Two",
    "countdown.one": "One",
    "workout.start": "Start",
    "workout.fiveSeconds": "Five seconds",
    "workout.rest": "Rest",
    "workout.nextMovement": "Next movement",
    "workout.paused": "Paused",
    "workout.resumed": "Resumed",
    "workout.completed": "Session complete"
  },
  tr: {
    "workout.getReady": "Hazır ol",
    "countdown.three": "Üç",
    "countdown.two": "İki",
    "countdown.one": "Bir",
    "workout.start": "Başla",
    "workout.fiveSeconds": "Beş saniye",
    "workout.rest": "Dinlen",
    "workout.nextMovement": "Sıradaki hareket",
    "workout.paused": "Duraklatıldı",
    "workout.resumed": "Devam ediyor",
    "workout.completed": "Antrenman tamamlandı"
  }
};

let lastSpokenKey = "";

export function resolveSpeechCue(language: AppLanguage, key: SpeechCueKey) {
  return { text: cueText[language][key], language: speechLanguage(language) };
}

export function resetSpeechCueHistory() {
  lastSpokenKey = "";
}

export function speakCue(key: SpeechCueKey, options: { language: AppLanguage; enabled: boolean; rate?: number }) {
  if (!options.enabled) return;
  const resolved = resolveSpeechCue(options.language, key);
  const duplicateKey = `${resolved.language}:${key}:${resolved.text}`;
  if (duplicateKey === lastSpokenKey) return;
  lastSpokenKey = duplicateKey;
  void import("expo-speech").then((Speech) => {
    Speech.stop();
    Speech.speak(resolved.text, { language: resolved.language, rate: options.rate ?? 0.94 });
  }).catch(() => undefined);
}

export function cueForCountdown(seconds: number): SpeechCueKey | null {
  if (seconds === 3) return "countdown.three";
  if (seconds === 2) return "countdown.two";
  if (seconds === 1) return "countdown.one";
  return null;
}
