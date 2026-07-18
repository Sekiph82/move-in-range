import test from "node:test";
import assert from "node:assert/strict";

const { MedicalSafetyPolicyEngine, DailyPlanningEngine, DiabetesExerciseContextEngine, AIOutputSafetyValidator } = await import("../packages/health-rules/src/index.ts");

const profile = {
  userId: "u1",
  preferredName: "Sam",
  units: "metric",
  country: "US",
  timezone: "America/New_York",
  language: "en",
  conditions: [],
  clinicianRestrictions: [],
  sensitivities: { knees: 0, wrists: 0 },
  equipment: ["body weight"],
  environment: "home",
  activityLevel: "beginner",
  preferredTrainingDays: ["Mon"],
  dailyAvailableMinutes: 15,
  goals: ["mobility"],
  medicalClearance: "cleared",
  consentAccepted: true
};

const readiness = {
  energy: 4,
  sleepQuality: 4,
  pain: 1,
  newInjury: false,
  dizziness: false,
  chestDiscomfort: false,
  unusualShortnessOfBreath: false,
  illness: false,
  recentFall: false,
  availableMinutes: 15,
  desiredSessionType: "mixed",
  stress: 2
};

const exercise = {
  id: "e1",
  slug: "chair-march",
  name: "Chair-supported march",
  bodyPart: "cardio",
  equipment: "body weight",
  target: "cardio",
  secondaryMuscles: [],
  instructions: { en: "March" },
  instructionSteps: { en: ["March"] },
  media: { image: "", gif: "", mediaId: "", attribution: "" },
  derivedTags: { impact: "low", complexity: "low", cardioDemand: "moderate", kneeFlexionDemand: "low", wristLoading: "none", chairSupportedCompatible: true }
};

test("safety precedence blocks chest discomfort", () => {
  const decision = new MedicalSafetyPolicyEngine().evaluate(profile, { ...readiness, chestDiscomfort: true });
  assert.equal(decision.action, "BLOCK_AND_SHOW_SAFETY_MESSAGE");
  assert.match(decision.explanation, /not an emergency service/i);
});

test("cardiac rehab is clinician supervised or restricted mode", () => {
  const decision = new MedicalSafetyPolicyEngine().evaluate({ ...profile, conditions: ["cardiac_rehabilitation_support"], medicalClearance: "clinician_supervised" }, readiness);
  assert.equal(decision.action, "FOLLOW_CLINICIAN_PLAN");
});

test("daily plan durations match requested total", () => {
  const plan = new DailyPlanningEngine().generate(profile, readiness, [exercise], 15);
  assert.equal(plan.items.reduce((sum, item) => sum + item.durationSeconds, 0), 15 * 60);
});

test("diabetes conversion and insight sample size", () => {
  const engine = new DiabetesExerciseContextEngine();
  assert.equal(engine.toCanonicalMgDl(5.5, "mmol/L"), 99);
  assert.equal(engine.insight([], 5).status, "INSUFFICIENT_DATA");
});

test("AI validator rejects insulin recommendations", () => {
  const result = new AIOutputSafetyValidator().validate("reduce insulin dose by 20 percent");
  assert.equal(result.allowed, false);
});
