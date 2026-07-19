export const ONBOARDING_STEPS = [
  { key: "welcome", en: "Welcome", tr: "Hos geldiniz" },
  { key: "product_boundary", en: "Product boundary", tr: "Urun siniri" },
  { key: "consent", en: "Consent", tr: "Onam" },
  { key: "preferred_name", en: "Preferred name", tr: "Tercih edilen ad" },
  { key: "date_of_birth", en: "Date of birth", tr: "Dogum tarihi" },
  { key: "gender", en: "Gender", tr: "Cinsiyet" },
  { key: "physiological_contexts", en: "Physiological contexts", tr: "Fizyolojik baglamlar" },
  { key: "height_weight", en: "Height and weight", tr: "Boy ve kilo" },
  { key: "locale", en: "Country, timezone, language", tr: "Ulke, saat dilimi, dil" },
  { key: "health_conditions", en: "Health conditions", tr: "Saglik durumlari" },
  { key: "sensitivity_regions", en: "Sensitivity regions", tr: "Hassas bolgeler" },
  { key: "clinician_restrictions", en: "Clinician restrictions", tr: "Klinisyen kisitlari" },
  { key: "injuries_surgery", en: "Previous injuries and surgery", tr: "Gecmis yaralanma ve ameliyat" },
  { key: "mobility_aids", en: "Mobility aids", tr: "Hareket yardimcilari" },
  { key: "activity_experience", en: "Activity and experience", tr: "Aktivite ve deneyim" },
  { key: "functional_capacity", en: "Functional capacity", tr: "Fonksiyonel kapasite" },
  { key: "goals", en: "Goals", tr: "Hedefler" },
  { key: "target_muscles", en: "Target muscles", tr: "Hedef kaslar" },
  { key: "environment_equipment", en: "Environment and equipment", tr: "Ortam ve ekipman" },
  { key: "schedule_time", en: "Schedule and time", tr: "Program ve sure" },
  { key: "diabetes_notifications", en: "Diabetes and notification settings", tr: "Diyabet ve bildirim ayarlari" },
  { key: "review_complete", en: "Review and complete", tr: "Gozden gecir ve tamamla" }
] as const;

export const GENDER_OPTIONS = ["Woman", "Man", "Non-binary", "Prefer not to say", "Self-described"];
export const PHYSIOLOGICAL_CONTEXTS = ["pregnancy", "postpartum", "menopause", "osteoporosis risk", "pelvic-floor sensitivity"];
export const BODY_REGIONS = ["neck", "shoulders", "elbows", "wrists", "hands", "upper back", "lower back", "hips", "knees", "ankles", "feet"];
export const CONDITIONS = ["type 2 diabetes", "hypertension", "arthritis", "osteoporosis risk", "cardiac rehab", "chronic pain", "balance concern"];
export const GOALS = ["mobility", "strength", "balance", "consistency", "energy", "pain-aware movement"];
export const MUSCLES = ["core", "back", "glutes", "quads", "hamstrings", "shoulders", "calves", "chest"];
export const EQUIPMENT = ["body weight", "chair", "wall", "resistance band", "light dumbbells"];
export const MOVEMENT_PATTERNS = ["squat", "lunge", "hinge", "twist", "push", "pull", "jump"];
export const POSITIONS = ["standing", "seated", "kneeling", "supine", "prone", "side lying"];
export const MOBILITY_AIDS = ["none", "cane", "crutches", "walker", "wheelchair", "brace", "prosthesis", "balance support", "other"];
export const EXPERIENCE_LEVELS = ["none", "beginner", "some experience", "confident"];
export const CAPACITY_LEVELS = ["not today", "with support", "limited", "comfortable"];

export type OnboardingDraft = {
  language: "en" | "tr";
  preferredName: string;
  dateOfBirth: string;
  gender: string;
  selfDescribe: string;
  contexts: string[];
  trimester: string;
  heightCm: string;
  weightKg: string;
  country: string;
  timezone: string;
  conditions: string[];
  sensitivityRegions: string[];
  side: string;
  severity: string;
  clinicianRestriction: boolean;
  prohibitedRegions: string[];
  prohibitedMovements: string[];
  prohibitedPositions: string[];
  maxDuration: string;
  maxIntensity: string;
  noFloor: boolean;
  noImpact: boolean;
  noOverhead: boolean;
  restrictionStartDate: string;
  restrictionReviewDate: string;
  injuryRegion: string;
  injurySide: string;
  injuryKind: string;
  injuryType: string;
  injuryDate: string;
  injuryStatus: string;
  injuryPainSeverity: string;
  injuryRomLimitation: string;
  injuryClinicianCleared: boolean;
  mobilityAids: string[];
  mobilityAidUse: string;
  mobilityAidSide: string;
  dailyStepRange: string;
  weeklyExerciseFrequency: string;
  lastRegularExerciseDate: string;
  strengthExperience: string;
  cardioExperience: string;
  mobilityExperience: string;
  balanceExperience: string;
  sedentaryHours: string;
  preferredIntensity: string;
  chairRise: string;
  floorRise: string;
  stairs: string;
  singleLegStanding: string;
  walkingTolerance: string;
  prolongedStanding: string;
  overheadReach: string;
  gripPerception: string;
  confidence: string;
  capacitySymptoms: string[];
  notes: string;
  goals: string[];
  targets: string[];
  equipment: string[];
  minutes: string;
  diabetesEnabled: boolean;
  quietHours: boolean;
};

export const initialOnboardingDraft: OnboardingDraft = {
  language: "en",
  preferredName: "",
  dateOfBirth: "",
  gender: "Prefer not to say",
  selfDescribe: "",
  contexts: [],
  trimester: "",
  heightCm: "",
  weightKg: "",
  country: "",
  timezone: "",
  conditions: [],
  sensitivityRegions: [],
  side: "bilateral",
  severity: "0",
  clinicianRestriction: false,
  prohibitedRegions: [],
  prohibitedMovements: [],
  prohibitedPositions: [],
  maxDuration: "",
  maxIntensity: "",
  noFloor: false,
  noImpact: false,
  noOverhead: false,
  restrictionStartDate: "",
  restrictionReviewDate: "",
  injuryRegion: "",
  injurySide: "bilateral",
  injuryKind: "injury",
  injuryType: "",
  injuryDate: "",
  injuryStatus: "",
  injuryPainSeverity: "0",
  injuryRomLimitation: "",
  injuryClinicianCleared: false,
  mobilityAids: [],
  mobilityAidUse: "sometimes",
  mobilityAidSide: "bilateral",
  dailyStepRange: "",
  weeklyExerciseFrequency: "",
  lastRegularExerciseDate: "",
  strengthExperience: "beginner",
  cardioExperience: "beginner",
  mobilityExperience: "beginner",
  balanceExperience: "beginner",
  sedentaryHours: "",
  preferredIntensity: "low",
  chairRise: "with support",
  floorRise: "with support",
  stairs: "with support",
  singleLegStanding: "with support",
  walkingTolerance: "",
  prolongedStanding: "",
  overheadReach: "with support",
  gripPerception: "comfortable",
  confidence: "3",
  capacitySymptoms: [],
  notes: "",
  goals: [],
  targets: [],
  equipment: [],
  minutes: "15",
  diabetesEnabled: false,
  quietHours: true
};

export function validateOnboardingStepPayload(stepKey: string, draft: OnboardingDraft) {
  const errors: string[] = [];
  if (stepKey === "preferred_name" && draft.preferredName.trim().length < 2) errors.push("preferred_name_required");
  if (stepKey === "date_of_birth" && !/^\d{4}-\d{2}-\d{2}$/.test(draft.dateOfBirth)) errors.push("date_of_birth_iso_required");
  if (stepKey === "gender" && draft.gender === "Self-described" && draft.selfDescribe.trim().length === 0) errors.push("self_description_required");
  if (stepKey === "physiological_contexts" && draft.contexts.includes("pregnancy") && !draft.trimester) errors.push("trimester_required_when_pregnancy_selected");
  if (stepKey === "height_weight" && (!Number(draft.heightCm) || !Number(draft.weightKg))) errors.push("height_weight_required");
  if (stepKey === "locale" && (!draft.country || !draft.timezone || !draft.language)) errors.push("locale_required");
  if (stepKey === "sensitivity_regions" && draft.sensitivityRegions.length > 0 && !draft.side) errors.push("side_required");
  if (stepKey === "goals" && draft.goals.length === 0) errors.push("goal_required");
  if (stepKey === "target_muscles" && draft.targets.length === 0) errors.push("target_required");
  if (stepKey === "schedule_time" && Number(draft.minutes) < 5) errors.push("minimum_five_minutes");
  if (stepKey === "clinician_restrictions" && draft.clinicianRestriction && !draft.restrictionReviewDate) errors.push("restriction_review_date_required");
  if (stepKey === "injuries_surgery" && draft.injuryRegion && !draft.injuryStatus) errors.push("injury_status_required");
  if (stepKey === "mobility_aids" && draft.mobilityAids.length > 0 && !draft.mobilityAidUse) errors.push("mobility_aid_use_required");
  if (stepKey === "activity_experience" && Number(draft.sedentaryHours) > 24) errors.push("sedentary_hours_invalid");
  if (stepKey === "functional_capacity" && Number(draft.confidence) < 1) errors.push("confidence_required");
  return errors;
}
