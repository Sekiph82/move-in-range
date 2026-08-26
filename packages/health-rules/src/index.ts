import type {
  DailyPlan,
  DiabetesExerciseContextInput,
  Exercise,
  HealthProfile,
  ReadinessInput,
  SafetyDecision,
  SafetyOutcome
} from "@moveinrange/shared-types";

export const EMERGENCY_MESSAGE =
  "MoveInRange is not an emergency service. If you have severe symptoms or believe you may be experiencing a medical emergency, stop exercising and contact local emergency services.";

export const policyVersion = "draft-2026-07-18";

export type PolicyRule = {
  id: string;
  outcome: SafetyOutcome;
  explanation: string;
  source: string;
  clinicalReviewState: "draft" | "reviewed" | "published";
};

export const conditionPolicies: PolicyRule[] = [
  {
    id: "symptom.chest_discomfort",
    outcome: "BLOCK_AND_SHOW_SAFETY_MESSAGE",
    explanation: "Chest discomfort requires stopping exercise and seeking appropriate care.",
    source: "clinical-safety-boundary",
    clinicalReviewState: "draft"
  },
  {
    id: "symptom.dizziness_or_breathlessness",
    outcome: "DELAY_AND_RECHECK",
    explanation: "Dizziness or unusual shortness of breath requires delaying exercise and rechecking readiness.",
    source: "clinical-safety-boundary",
    clinicalReviewState: "draft"
  },
  {
    id: "restriction.cardiac_rehab",
    outcome: "FOLLOW_CLINICIAN_PLAN",
    explanation: "Cardiac rehabilitation support is clinician-supervised or restricted mode.",
    source: "condition-policy",
    clinicalReviewState: "draft"
  },
  {
    id: "readiness.low_energy_or_pain",
    outcome: "LOW_INTENSITY_ONLY",
    explanation: "Low readiness or elevated pain limits the plan to low-intensity mobility and recovery work.",
    source: "readiness-policy",
    clinicalReviewState: "draft"
  },
  {
    id: "diabetes.recent_low_or_symptoms",
    outcome: "DELAY_AND_RECHECK",
    explanation: "Recent low glucose or symptoms call for delaying exercise and following the user's clinician plan.",
    source: "diabetes-context-policy",
    clinicalReviewState: "draft"
  },
  {
    id: "diabetes.fast_carbs_missing",
    outcome: "READY_WITH_MODIFICATIONS",
    explanation: "Keep intensity conservative until fast-acting carbohydrates are available.",
    source: "diabetes-context-policy",
    clinicalReviewState: "draft"
  }
];

const severity: Record<SafetyOutcome, number> = {
  READY: 0,
  READY_WITH_MODIFICATIONS: 1,
  LOW_INTENSITY_ONLY: 2,
  DELAY_AND_RECHECK: 3,
  FOLLOW_CLINICIAN_PLAN: 4,
  BLOCK_AND_SHOW_SAFETY_MESSAGE: 5
};

export class MedicalSafetyPolicyEngine {
  evaluate(profile: HealthProfile, readiness: ReadinessInput, diabetes?: DiabetesExerciseContextInput): SafetyDecision {
    const triggered: PolicyRule[] = [];

    if (readiness.chestDiscomfort) triggered.push(findRule("symptom.chest_discomfort"));
    if (readiness.dizziness || readiness.unusualShortnessOfBreath || readiness.newInjury || readiness.recentFall) {
      triggered.push(findRule("symptom.dizziness_or_breathlessness"));
    }
    if (profile.conditions.includes("cardiac_rehabilitation_support") || profile.medicalClearance === "clinician_supervised" || profile.medicalClearance === "restricted") {
      triggered.push(findRule("restriction.cardiac_rehab"));
    }
    if (readiness.energy <= 2 || readiness.pain >= 6 || readiness.illness) {
      triggered.push(findRule("readiness.low_energy_or_pain"));
    }
    if (diabetes?.enabled && (diabetes.recentLow || diabetes.symptoms)) {
      triggered.push(findRule("diabetes.recent_low_or_symptoms"));
    }
    if (diabetes?.enabled && diabetes.fastCarbsAvailable === false && diabetes.plannedIntensity !== "low") {
      triggered.push(findRule("diabetes.fast_carbs_missing"));
    }

    const rule = triggered.sort((a, b) => severity[b.outcome] - severity[a.outcome])[0];
    const action = rule?.outcome ?? "READY";
    const explanation = rule
      ? [rule.explanation, action === "BLOCK_AND_SHOW_SAFETY_MESSAGE" ? EMERGENCY_MESSAGE : ""].filter(Boolean).join(" ")
      : "Readiness inputs are within the current draft policy range for a controlled movement session.";

    return {
      policyVersion,
      triggeredRuleIds: triggered.map((r) => r.id),
      relevantInputs: {
        conditions: profile.conditions,
        medicalClearance: profile.medicalClearance,
        readiness,
        diabetes
      },
      action,
      explanation,
      timestamp: new Date().toISOString(),
      outcomeClassification: action
    };
  }
}

export class SafetyEligibilityFilter {
  filter(exercises: Exercise[], profile: HealthProfile, readiness: ReadinessInput): { eligible: Exercise[]; rejected: { exercise: Exercise; reasons: string[] }[] } {
    const rejected: { exercise: Exercise; reasons: string[] }[] = [];
    const eligible = exercises.filter((exercise) => {
      const reasons: string[] = [];
      if (profile.clinicianRestrictions.some((restriction) => exercise.name.toLowerCase().includes(restriction.toLowerCase()))) reasons.push("clinician restriction");
      if (readiness.pain >= 5 && exercise.derivedTags.impact !== "low") reasons.push("current pain excludes non-low-impact movement");
      if (profile.sensitivities.knees >= 5 && exercise.derivedTags.kneeFlexionDemand === "high") reasons.push("knee sensitivity");
      if (profile.sensitivities.wrists >= 5 && exercise.derivedTags.wristLoading === "high") reasons.push("wrist loading");
      if (profile.environment === "chair" && !exercise.derivedTags.chairSupportedCompatible) reasons.push("not chair compatible");
      if (!profile.equipment.includes(exercise.equipment) && exercise.equipment !== "body weight") reasons.push("equipment unavailable");
      if (reasons.length) rejected.push({ exercise, reasons });
      return reasons.length === 0;
    });
    return { eligible, rejected };
  }
}

export class DailyPlanningEngine {
  generate(profile: HealthProfile, readiness: ReadinessInput, exercises: Exercise[], requestedMinutes = readiness.availableMinutes): DailyPlan {
    const safety = new MedicalSafetyPolicyEngine().evaluate(profile, readiness, profile.diabetes);
    const minutes = normalizeDuration(requestedMinutes);
    const { eligible } = new SafetyEligibilityFilter().filter(exercises, profile, readiness);
    const pool = safety.action === "LOW_INTENSITY_ONLY" || safety.action === "DELAY_AND_RECHECK"
      ? eligible.filter((exercise) => exercise.derivedTags.impact === "low" && exercise.derivedTags.complexity !== "high")
      : eligible;
    const selected = pool.slice(0, Math.max(3, Math.min(8, Math.round(minutes / 5))));
    const totalSeconds = minutes * 60;
    const warmup = Math.round(totalSeconds * 0.2);
    const cooldown = Math.round(totalSeconds * 0.2);
    const mainEach = Math.max(60, Math.floor((totalSeconds - warmup - cooldown) / Math.max(1, selected.length)));
    const items = selected.map((exercise, index) => ({
      exerciseId: exercise.id,
      name: exercise.name,
      block: index === 0 ? "warmup" as const : index === selected.length - 1 ? "cooldown" as const : "main" as const,
      durationSeconds: index === 0 ? warmup : index === selected.length - 1 ? cooldown : mainEach,
      restSeconds: index === 0 || index === selected.length - 1 ? 20 : 30,
      sets: exercise.derivedTags.cardioDemand === "high" ? 1 : 2,
      reps: exercise.derivedTags.cardioDemand === "high" ? undefined : 8,
      modification: safety.action === "READY_WITH_MODIFICATIONS" || safety.action === "LOW_INTENSITY_ONLY" ? "Use a comfortable range, slow tempo, and stop for symptoms or increasing pain." : undefined
    }));
    return {
      id: `plan-${Date.now()}`,
      totalMinutes: minutes,
      phase: "adaptation",
      safetyDecision: safety,
      items: fitDurations(items, totalSeconds),
      explanation: buildExplanation(safety, minutes, selected.length)
    };
  }
}

export class WeeklyPlanningEngine {
  generate(profile: HealthProfile, readiness: ReadinessInput, exercises: Exercise[]): DailyPlan[] {
    const days = profile.preferredTrainingDays.length ? profile.preferredTrainingDays : ["Mon", "Wed", "Fri"];
    return days.slice(0, 7).map((_, index) => new DailyPlanningEngine().generate(profile, readiness, rotate(exercises, index), profile.dailyAvailableMinutes));
  }
}

export class MonthlyProgressionEngine {
  phases = ["adaptation", "duration_progression", "modest_progression", "recovery_review"] as const;
  progressionAllowed(previous: { painIncrease: boolean; repeatedLowReadiness: boolean; concerningSymptoms: boolean; incompleteSessions: number; safetyBlocks: number; clinicianRestricted: boolean }): boolean {
    return !previous.painIncrease && !previous.repeatedLowReadiness && !previous.concerningSymptoms && previous.incompleteSessions < 2 && previous.safetyBlocks === 0 && !previous.clinicianRestricted;
  }
}

export class DiabetesExerciseContextEngine {
  toCanonicalMgDl(value: number, unit: "mg/dL" | "mmol/L"): number {
    return unit === "mmol/L" ? Math.round(value * 18.0182) : value;
  }

  insight(entries: { preMgDl: number; postMgDl: number; occurredAt: string; category: string; timeOfDay: string }[], minSamples = 5) {
    if (entries.length < minSamples) {
      return { status: "INSUFFICIENT_DATA", sampleCount: entries.length, message: "More logged sessions are needed before summarizing glucose response patterns." };
    }
    const changes = entries.map((entry) => entry.postMgDl - entry.preMgDl).sort((a, b) => a - b);
    const mean = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const median = changes[Math.floor(changes.length / 2)];
    const variance = changes.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0) / changes.length;
    return {
      status: "READY",
      sampleCount: entries.length,
      dateRange: [entries[0].occurredAt, entries[entries.length - 1].occurredAt],
      medianChange: median,
      meanChange: Number(mean.toFixed(1)),
      variability: Number(Math.sqrt(variance).toFixed(1)),
      exerciseCategory: entries[0].category,
      timeOfDayGroup: entries[0].timeOfDay,
      confidence: entries.length >= minSamples * 2 ? "moderate" : "low",
      disclaimer: "This summary is informational and should be discussed with a clinician for repeated or concerning patterns."
    };
  }
}

export class SafeCoachingNarrativeService {
  rewrite(input: string): string {
    return input.replace(/guarantee/gi, "support");
  }
}

export class AIOutputSafetyValidator {
  validate(output: string): { allowed: boolean; reasons: string[] } {
    const forbidden = [/insulin\s*(unit|dose|reduction|increase|percent)/i, /diagnos/i, /medication change/i, /basal/i, /bolus/i];
    const reasons = forbidden.filter((pattern) => pattern.test(output)).map((pattern) => `Forbidden medical output: ${pattern.source}`);
    return { allowed: reasons.length === 0, reasons };
  }
}

function findRule(id: string): PolicyRule {
  const rule = conditionPolicies.find((candidate) => candidate.id === id);
  if (!rule) throw new Error(`Missing policy rule ${id}`);
  return rule;
}

function normalizeDuration(minutes: number): number {
  const allowed = [5, 10, 15, 20, 30, 45, 60];
  return allowed.reduce((best, candidate) => Math.abs(candidate - minutes) < Math.abs(best - minutes) ? candidate : best, allowed[0]);
}

function fitDurations<T extends { durationSeconds: number }>(items: T[], totalSeconds: number): T[] {
  const current = items.reduce((sum, item) => sum + item.durationSeconds, 0);
  const delta = totalSeconds - current;
  if (items.length) items[items.length - 1].durationSeconds += delta;
  return items;
}

function buildExplanation(safety: SafetyDecision, minutes: number, count: number): string {
  return `${safety.explanation} The generated session uses ${count} exercises over ${minutes} minutes with controlled warm-up, work, and cooldown blocks.`;
}

function rotate<T>(items: T[], amount: number): T[] {
  return items.slice(amount).concat(items.slice(0, amount));
}
