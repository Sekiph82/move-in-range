type IconName = string;

export type OnboardingStepKey =
  | "welcome"
  | "goal"
  | "activity"
  | "limitations"
  | "equipment"
  | "pattern"
  | "review_complete";

export type LocalizedCopy = { en: string; tr: string };

export type OnboardingOption = {
  value: string;
  label: LocalizedCopy;
  detail: LocalizedCopy;
  icon: IconName;
};

export type OnboardingStepDefinition = {
  key: OnboardingStepKey;
  title: LocalizedCopy;
  subtitle: LocalizedCopy;
  multi?: boolean;
  options?: OnboardingOption[];
};

export type OnboardingDraft = {
  language: "en" | "tr";
  primaryGoal: string;
  activityLevel: string;
  limitations: string[];
  limitationBodyAreas: string[];
  equipment: string[];
  preferredDays: string;
  preferredMinutes: string;
  currentStep: number;
  submitted: boolean;
};

export const ONBOARDING_LOCAL_DRAFT_KEY = "moveinrange:onboarding:v2";
export const BODY_AREAS = ["Shoulder", "Neck", "Back", "Hip", "Knee", "Ankle", "Arm", "Wrist/Hand", "Other"];

export const ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  {
    key: "welcome",
    title: { en: "Welcome to MoveInRange", tr: "MoveInRange'e hos geldiniz" },
    subtitle: { en: "Set up a simple, safer starting plan in a few quick choices.", tr: "Birkaç hizli secimle daha guvenli bir baslangic plani olusturun." }
  },
  {
    key: "goal",
    title: { en: "What is your main goal?", tr: "Ana hedefiniz nedir?" },
    subtitle: { en: "Pick one focus for your first plan.", tr: "Ilk planiniz icin bir odak secin." },
    options: [
      { value: "mobility", label: { en: "Move better", tr: "Daha rahat hareket" }, detail: { en: "Range and control", tr: "Hareket araligi" }, icon: "move" },
      { value: "strength", label: { en: "Build strength", tr: "Guc kazan" }, detail: { en: "Gentle strength", tr: "Nazik guc" }, icon: "trending-up" },
      { value: "fitness", label: { en: "Improve fitness", tr: "Formu artir" }, detail: { en: "Low impact", tr: "Dusuk etkili" }, icon: "heart" },
      { value: "stiffness", label: { en: "Reduce stiffness", tr: "Tutuklugu azalt" }, detail: { en: "Easy mobility", tr: "Kolay mobilite" }, icon: "sunrise" },
      { value: "active", label: { en: "Stay active", tr: "Aktif kal" }, detail: { en: "Consistency", tr: "Sureklilik" }, icon: "calendar" }
    ]
  },
  {
    key: "activity",
    title: { en: "How active are you now?", tr: "Su an ne kadar aktifsiniz?" },
    subtitle: { en: "This sets the first plan intensity.", tr: "Bu, ilk plan siddetini belirler." },
    options: [
      { value: "starting", label: { en: "Starting out", tr: "Yeni basliyorum" }, detail: { en: "Very gentle", tr: "Cok hafif" }, icon: "circle" },
      { value: "light", label: { en: "Lightly active", tr: "Hafif aktif" }, detail: { en: "Some movement", tr: "Biraz hareket" }, icon: "activity" },
      { value: "regular", label: { en: "Regularly active", tr: "Duzenli aktif" }, detail: { en: "Steady routine", tr: "Duzenli rutin" }, icon: "repeat" },
      { value: "very", label: { en: "Very active", tr: "Cok aktif" }, detail: { en: "Frequent movement", tr: "Sik hareket" }, icon: "zap" }
    ]
  },
  {
    key: "limitations",
    title: { en: "Anything limiting movement?", tr: "Hareketinizi sinirlayan bir sey var mi?" },
    subtitle: { en: "Choose what should shape the first plan.", tr: "Ilk plani etkilemesi gerekenleri secin." },
    multi: true,
    options: [
      { value: "none", label: { en: "No major limitation", tr: "Belirgin kisit yok" }, detail: { en: "Start normally", tr: "Normal basla" }, icon: "check-circle" },
      { value: "mobility", label: { en: "Limited mobility", tr: "Sinirli hareket" }, detail: { en: "Gentler range", tr: "Daha nazik aralik" }, icon: "sliders" },
      { value: "balance", label: { en: "Balance concern", tr: "Denge kaygisi" }, detail: { en: "More support", tr: "Daha destekli" }, icon: "shield" },
      { value: "joint", label: { en: "Joint discomfort", tr: "Eklem rahatsizligi" }, detail: { en: "Avoid irritation", tr: "Zorlamadan" }, icon: "alert-circle" },
      { value: "injury", label: { en: "Recovering from injury", tr: "Yaralanma sonrasi" }, detail: { en: "Extra caution", tr: "Ek dikkat" }, icon: "alert-triangle" }
    ]
  },
  {
    key: "equipment",
    title: { en: "What equipment can you use?", tr: "Hangi ekipmanlari kullanabilirsiniz?" },
    subtitle: { en: "Select everything available most days.", tr: "Cogu gun erisebildiklerinizi secin." },
    multi: true,
    options: [
      { value: "body weight", label: { en: "Bodyweight only", tr: "Sadece vucut agirligi" }, detail: { en: "No tools", tr: "Ekipmansiz" }, icon: "user" },
      { value: "chair", label: { en: "Chair", tr: "Sandalye" }, detail: { en: "Support option", tr: "Destek secenegi" }, icon: "square" },
      { value: "resistance band", label: { en: "Resistance band", tr: "Direnc bandi" }, detail: { en: "Light resistance", tr: "Hafif direnc" }, icon: "minus" },
      { value: "light dumbbells", label: { en: "Dumbbells", tr: "Dambillar" }, detail: { en: "Light weights", tr: "Hafif agirlik" }, icon: "circle" },
      { value: "gym equipment", label: { en: "Gym equipment", tr: "Spor salonu" }, detail: { en: "More options", tr: "Daha fazla secenek" }, icon: "grid" }
    ]
  },
  {
    key: "pattern",
    title: { en: "How should the week feel?", tr: "Haftalik plan nasil olsun?" },
    subtitle: { en: "Pick a weekly rhythm and usual session length.", tr: "Haftalik sikligi ve sureyi secin." }
  },
  {
    key: "review_complete",
    title: { en: "Review your starting plan", tr: "Baslangic planini gozden gecirin" },
    subtitle: { en: "You can edit these later in Profile.", tr: "Bunlari daha sonra Profil'de degistirebilirsiniz." }
  }
];

export const DAY_OPTIONS: OnboardingOption[] = [
  { value: "2", label: { en: "2 days", tr: "2 gun" }, detail: { en: "Easy rhythm", tr: "Kolay ritim" }, icon: "calendar" },
  { value: "3", label: { en: "3 days", tr: "3 gun" }, detail: { en: "Balanced", tr: "Dengeli" }, icon: "calendar" },
  { value: "4", label: { en: "4 days", tr: "4 gun" }, detail: { en: "More frequent", tr: "Daha sik" }, icon: "calendar" },
  { value: "flexible", label: { en: "Flexible", tr: "Esnek" }, detail: { en: "Adapt weekly", tr: "Haftaya uyarla" }, icon: "shuffle" }
];

export const MINUTE_OPTIONS: OnboardingOption[] = [
  { value: "10", label: { en: "10 min", tr: "10 dk" }, detail: { en: "Quick", tr: "Kisa" }, icon: "clock" },
  { value: "15", label: { en: "15 min", tr: "15 dk" }, detail: { en: "Default", tr: "Varsayilan" }, icon: "clock" },
  { value: "30", label: { en: "30 min", tr: "30 dk" }, detail: { en: "Steady", tr: "Dengeli" }, icon: "clock" },
  { value: "45", label: { en: "45 min", tr: "45 dk" }, detail: { en: "Longer", tr: "Daha uzun" }, icon: "clock" }
];

export const initialOnboardingDraft: OnboardingDraft = {
  language: "en",
  primaryGoal: "mobility",
  activityLevel: "starting",
  limitations: ["none"],
  limitationBodyAreas: [],
  equipment: ["body weight"],
  preferredDays: "3",
  preferredMinutes: "15",
  currentStep: 0,
  submitted: false
};

export function copyText(copy: LocalizedCopy, language: "en" | "tr") {
  return copy[language] ?? copy.en;
}

export function toggleMulti(values: string[], value: string) {
  if (value === "none") return values.includes("none") ? [] : ["none"];
  const withoutNone = values.filter((item) => item !== "none");
  return withoutNone.includes(value) ? withoutNone.filter((item) => item !== value) : [...withoutNone, value];
}

export function onboardingNeedsBodyAreas(draft: OnboardingDraft) {
  return draft.limitations.includes("joint") || draft.limitations.includes("injury");
}

export function validateOnboardingStepPayload(stepKey: string, draft: OnboardingDraft) {
  const errors: string[] = [];
  if (stepKey === "goal" && !draft.primaryGoal) errors.push("goal_required");
  if (stepKey === "activity" && !draft.activityLevel) errors.push("activity_required");
  if (stepKey === "limitations" && draft.limitations.length === 0) errors.push("limitation_required");
  if (stepKey === "equipment" && draft.equipment.length === 0) errors.push("equipment_required");
  if (stepKey === "pattern" && (!draft.preferredDays || !draft.preferredMinutes)) errors.push("pattern_required");
  return errors;
}

export function onboardingPayload(draft: OnboardingDraft) {
  const preferredDays = draft.preferredDays === "flexible" ? ["Mon", "Wed", "Fri"] : Number(draft.preferredDays) >= 4 ? ["Mon", "Tue", "Thu", "Sat"] : Number(draft.preferredDays) === 2 ? ["Tue", "Fri"] : ["Mon", "Wed", "Fri"];
  return {
    goals: [draft.primaryGoal],
    activity_level: draft.activityLevel,
    conditions: draft.limitations.filter((item) => item !== "none"),
    movement_limitations: draft.limitations,
    limitation_body_areas: draft.limitationBodyAreas,
    equipment: draft.equipment,
    preferred_training_days: preferredDays,
    preferred_days_per_week: draft.preferredDays,
    preferred_minutes: Number(draft.preferredMinutes),
    consent_accepted: true,
    onboarding_complete: true
  };
}
