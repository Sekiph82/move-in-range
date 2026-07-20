export type ExerciseMedia = {
  image?: string;
  gif?: string;
  mp4?: string;
  thumbnail?: string;
  playable?: boolean;
  playable_type?: string;
  fallback_type?: string | null;
  validation_state?: string;
  license_status?: string;
  raw_image_path_present?: boolean;
  raw_gif_path_present?: boolean;
};

export type PlanExerciseItem = {
  id?: string;
  exercise_id: string;
  source_id?: string;
  name: string;
  body_part?: string;
  description?: string;
  section?: string;
  block?: string;
  category?: string;
  target?: string;
  targets?: string[];
  muscles?: string[];
  equipment?: string;
  position?: string;
  difficulty?: string;
  impact?: string;
  unilateral?: boolean;
  side_switch?: boolean;
  preparation_seconds?: number;
  duration_seconds?: number;
  work_seconds?: number;
  rest_seconds?: number;
  sets?: number;
  reps?: number | null;
  tempo?: string;
  instructions?: string[];
  instruction_steps?: string[];
  breathing_cue?: string;
  mistakes?: string[];
  safety_notes?: string[];
  approved_substitutions?: string[];
  media?: ExerciseMedia;
  availability?: string;
  validation_state?: string;
  order?: number;
};

export type MovementPlan = {
  id: string;
  total_minutes?: number;
  total_duration?: number;
  total_seconds?: number;
  intensity?: string;
  phase?: string;
  sections?: string[];
  movement_count?: number;
  media_summary?: { playable?: number; fallback?: number };
  items?: PlanExerciseItem[];
  safety_decision?: { action?: string; explanation?: string };
  explanation?: string;
};

export type ProgramDay = {
  day: string;
  date?: string;
  day_index?: number;
  focus?: string;
  session_type?: string;
  planned_duration?: number;
  duration_minutes?: number;
  intensity?: string;
  status?: string;
  safety_modified?: boolean;
  items?: PlanExerciseItem[];
  actions?: string[];
};

export type MonthWeek = {
  week: number;
  phase: string;
  progression_reason?: string;
  hold?: boolean;
  status?: string;
  planned_sessions?: number;
  recovery_days?: number;
  focus?: string[];
  days?: ProgramDay[];
};
