export type VoiceMode = "off" | "countdown_only" | "essential_cues" | "full_guidance";

export type WorkoutCue = {
  atSeconds: number;
  command: string;
  text: string;
};

export type WorkoutMedia = {
  uri: string;
  sourceType: string;
  licenseState: string;
  prefetchPolicy: "current_and_next_only";
};

const cueText = {
  en: {
    prepare: "Prepare",
    start: "Start",
    ten_seconds_remaining: "Ten seconds remaining",
    rest: "Rest",
    pain_means_stop: "Pain means stop",
    session_complete: "Session complete"
  },
  tr: {
    prepare: "Hazirlan",
    start: "Basla",
    ten_seconds_remaining: "On saniye kaldi",
    rest: "Dinlen",
    pain_means_stop: "Agri varsa dur",
    session_complete: "Seans tamamlandi"
  }
};

export function scheduleLocalVoiceCues(items: Array<{ name: string; durationSeconds: number; restSeconds: number }>, mode: VoiceMode, language: "en" | "tr"): WorkoutCue[] {
  if (mode === "off") return [];
  const allowed = mode === "countdown_only"
    ? new Set(["prepare", "start", "ten_seconds_remaining", "session_complete"])
    : mode === "essential_cues"
      ? new Set(["prepare", "start", "ten_seconds_remaining", "rest", "pain_means_stop", "session_complete"])
      : new Set(Object.keys(cueText.en));
  let cursor = 0;
  const cues: WorkoutCue[] = [{ atSeconds: 0, command: "prepare", text: cueText[language].prepare }];
  for (const [index, item] of items.entries()) {
    cues.push({ atSeconds: cursor + 5, command: "start", text: cueText[language].start });
    if (item.durationSeconds > 15) cues.push({ atSeconds: cursor + item.durationSeconds - 10, command: "ten_seconds_remaining", text: cueText[language].ten_seconds_remaining });
    if (index === 0) cues.push({ atSeconds: cursor + 15, command: "pain_means_stop", text: cueText[language].pain_means_stop });
    cursor += item.durationSeconds + item.restSeconds;
    if (index < items.length - 1) cues.push({ atSeconds: cursor, command: "rest", text: cueText[language].rest });
  }
  cues.push({ atSeconds: cursor, command: "session_complete", text: cueText[language].session_complete });
  return cues.filter((cue) => allowed.has(cue.command));
}

export function resolveWorkoutMedia(exercise: { id: string; slug?: string; media?: { gif?: string; image?: string; license_status?: string } }, reducedMotion = false, lowBandwidth = false): WorkoutMedia {
  const licenseState = exercise.media?.license_status ?? "external_terms_required";
  if (licenseState === "approved" && exercise.media?.gif && !reducedMotion && !lowBandwidth) {
    return { uri: exercise.media.gif, sourceType: "approved_licensed_animation", licenseState, prefetchPolicy: "current_and_next_only" };
  }
  if (licenseState === "approved" && exercise.media?.image) {
    return { uri: exercise.media.image, sourceType: "approved_licensed_static_image", licenseState, prefetchPolicy: "current_and_next_only" };
  }
  return { uri: `silhouette://${exercise.slug ?? exercise.id}`, sourceType: reducedMotion || lowBandwidth ? "internal_silhouette_static" : "internal_silhouette_animation", licenseState, prefetchPolicy: "current_and_next_only" };
}
