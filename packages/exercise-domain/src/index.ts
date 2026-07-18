import type { Exercise, ExerciseDerivedTags } from "@moveinrange/shared-types";

export type RawExercise = {
  id: string;
  name: string;
  category: string;
  body_part: string;
  equipment: string;
  instructions: Record<string, string>;
  instruction_steps: Record<string, string[]>;
  muscle_group: string;
  secondary_muscles: string[];
  target: string;
  media_id: string;
  image: string;
  gif_url: string;
  attribution: string;
  created_at: string;
};

export function slugify(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function normalizeExercise(raw: RawExercise): Exercise {
  return {
    id: `exercise-${raw.id}`,
    slug: `${raw.id}-${slugify(raw.name)}`,
    name: raw.name,
    bodyPart: raw.body_part,
    equipment: normalizeEquipment(raw.equipment),
    target: raw.target,
    secondaryMuscles: raw.secondary_muscles,
    instructions: raw.instructions,
    instructionSteps: raw.instruction_steps,
    media: {
      image: raw.image,
      gif: raw.gif_url,
      mediaId: raw.media_id,
      attribution: raw.attribution
    },
    derivedTags: classifyExercise(raw)
  };
}

export function normalizeEquipment(value: string): string {
  const equipment = value.trim().toLowerCase();
  if (equipment === "bodyweight") return "body weight";
  if (equipment.includes("dumbbell")) return "dumbbell";
  if (equipment.includes("barbell")) return "barbell";
  return equipment;
}

export function classifyExercise(raw: RawExercise): ExerciseDerivedTags {
  const text = `${raw.name} ${raw.body_part} ${raw.equipment} ${raw.instructions.en}`.toLowerCase();
  const floor = /lie|lying|floor|sit-up|crunch|plank/.test(text);
  const jump = /jump|burpee|plyo|sprint/.test(text);
  const overhead = /overhead|shoulder press|raise/.test(text);
  const wrist = /push-up|plank|handstand|dip/.test(text);
  const knee = /squat|lunge|step-up|leg press/.test(text);
  const cardio = raw.body_part === "cardio" || /run|jog|jump|cardio/.test(text);
  return {
    movementPattern: inferPattern(text),
    impact: jump ? "high" : cardio ? "moderate" : "low",
    balanceDemand: /single|unilateral|lunge/.test(text) ? "moderate" : "low",
    floorTransferRequired: floor,
    standingRequired: !floor,
    gripDemand: raw.equipment === "body weight" ? "low" : "moderate",
    wristLoading: wrist ? "high" : raw.equipment.includes("dumbbell") ? "moderate" : "low",
    kneeFlexionDemand: knee ? "high" : "low",
    spinalFlexion: /sit-up|crunch|bend/.test(text),
    spinalExtension: /back extension|cobra|superman/.test(text),
    overheadMovement: overhead,
    unilateralLoading: /single|one arm|one leg|unilateral/.test(text),
    cardioDemand: cardio ? "high" : "low",
    complexity: /snatch|clean|jerk|handstand/.test(text) ? "high" : "moderate",
    beginnerSuitability: !/snatch|clean|jerk|handstand|muscle-up/.test(text),
    chairSupportedCompatible: !floor && raw.equipment === "body weight",
    warmupSuitable: raw.equipment === "body weight" && !jump,
    cooldownSuitable: /stretch|mobility/.test(text) || raw.equipment === "body weight",
    provenance: "rule_classifier",
    confidence: 0.72,
    manualReviewStatus: "pending",
    classifierVersion: "rule-classifier-2026-07-18"
  };
}

export function searchExercises(exercises: Exercise[], query: string, filters: { bodyPart?: string; equipment?: string; impact?: string } = {}): Exercise[] {
  const q = query.trim().toLowerCase();
  return exercises.filter((exercise) => {
    if (q && ![exercise.name, exercise.target, exercise.bodyPart].some((value) => value.toLowerCase().includes(q))) return false;
    if (filters.bodyPart && exercise.bodyPart !== filters.bodyPart) return false;
    if (filters.equipment && exercise.equipment !== filters.equipment) return false;
    if (filters.impact && exercise.derivedTags.impact !== filters.impact) return false;
    return true;
  });
}

function inferPattern(text: string): string {
  if (/squat|lunge|leg press/.test(text)) return "squat";
  if (/deadlift|hinge|good morning/.test(text)) return "hinge";
  if (/row|pull-up|pulldown|curl/.test(text)) return "pull";
  if (/press|push-up|dip/.test(text)) return "push";
  if (/walk|run|jog|jump/.test(text)) return "locomotion";
  return "mobility-control";
}
