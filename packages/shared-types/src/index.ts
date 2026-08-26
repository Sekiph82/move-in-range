export type ConditionCode =
  | "type_1_diabetes"
  | "type_2_diabetes"
  | "prediabetes"
  | "hypertension"
  | "obesity_weight_management"
  | "arthritis"
  | "lower_back_sensitivity"
  | "neck_sensitivity"
  | "shoulder_sensitivity"
  | "knee_sensitivity"
  | "ankle_sensitivity"
  | "hand_wrist_sensitivity"
  | "general_deconditioning"
  | "older_adult_mobility"
  | "cardiac_rehabilitation_support";

export type SafetyOutcome =
  | "READY"
  | "READY_WITH_MODIFICATIONS"
  | "LOW_INTENSITY_ONLY"
  | "DELAY_AND_RECHECK"
  | "FOLLOW_CLINICIAN_PLAN"
  | "BLOCK_AND_SHOW_SAFETY_MESSAGE";

export type GlucoseUnit = "mg/dL" | "mmol/L";
export type TrendArrow = "rising_fast" | "rising" | "steady" | "falling" | "falling_fast" | "unknown";

export type ReadinessInput = {
  energy: number;
  sleepQuality: number;
  pain: number;
  newInjury: boolean;
  dizziness: boolean;
  chestDiscomfort: boolean;
  unusualShortnessOfBreath: boolean;
  illness: boolean;
  recentFall: boolean;
  availableMinutes: number;
  desiredSessionType: "mobility" | "strength" | "cardio" | "mixed" | "recovery";
  stress: number;
  restingHeartRate?: number;
};

export type DiabetesExerciseContextInput = {
  enabled: boolean;
  diabetesType?: "type_1" | "type_2" | "prediabetes";
  glucose?: number;
  unit?: GlucoseUnit;
  trend?: TrendArrow;
  source?: "sensor" | "fingerstick" | "manual";
  activeInsulinNoted?: boolean;
  timeSinceMealMinutes?: number;
  recentLow?: boolean;
  symptoms?: boolean;
  fastCarbsAvailable?: boolean;
  plannedIntensity?: "low" | "moderate" | "high";
};

export type HealthProfile = {
  userId: string;
  preferredName: string;
  age?: number;
  units: "metric" | "imperial";
  country: string;
  timezone: string;
  language: "en" | "tr";
  conditions: ConditionCode[];
  clinicianRestrictions: string[];
  sensitivities: Record<string, number>;
  equipment: string[];
  environment: "home" | "gym" | "outdoors" | "chair" | "bed";
  activityLevel: "new" | "beginner" | "returning" | "active";
  preferredTrainingDays: string[];
  dailyAvailableMinutes: number;
  goals: string[];
  medicalClearance: "unknown" | "cleared" | "clinician_supervised" | "restricted";
  consentAccepted: boolean;
  diabetes?: DiabetesExerciseContextInput;
};

export type SafetyDecision = {
  policyVersion: string;
  triggeredRuleIds: string[];
  relevantInputs: Record<string, unknown>;
  action: SafetyOutcome;
  explanation: string;
  timestamp: string;
  outcomeClassification: SafetyOutcome;
};

export type Exercise = {
  id: string;
  slug: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles: string[];
  instructions: Record<string, string>;
  instructionSteps: Record<string, string[]>;
  media: {
    image: string;
    gif: string;
    mediaId: string;
    attribution: string;
  };
  derivedTags: ExerciseDerivedTags;
};

export type ExerciseDerivedTags = {
  movementPattern: string;
  impact: "low" | "moderate" | "high";
  balanceDemand: "low" | "moderate" | "high";
  floorTransferRequired: boolean;
  standingRequired: boolean;
  gripDemand: "low" | "moderate" | "high";
  wristLoading: "none" | "low" | "moderate" | "high";
  kneeFlexionDemand: "low" | "moderate" | "high";
  spinalFlexion: boolean;
  spinalExtension: boolean;
  overheadMovement: boolean;
  unilateralLoading: boolean;
  cardioDemand: "low" | "moderate" | "high";
  complexity: "low" | "moderate" | "high";
  beginnerSuitability: boolean;
  chairSupportedCompatible: boolean;
  warmupSuitable: boolean;
  cooldownSuitable: boolean;
  provenance: "rule_classifier";
  confidence: number;
  manualReviewStatus: "pending" | "approved" | "rejected";
  classifierVersion: string;
};

export type PlanItem = {
  exerciseId: string;
  name: string;
  block: "warmup" | "main" | "cardio" | "cooldown";
  durationSeconds: number;
  restSeconds: number;
  sets?: number;
  reps?: number;
  modification?: string;
};

export type DailyPlan = {
  id: string;
  totalMinutes: number;
  phase: "adaptation" | "duration_progression" | "modest_progression" | "recovery_review";
  safetyDecision: SafetyDecision;
  items: PlanItem[];
  explanation: string;
};
