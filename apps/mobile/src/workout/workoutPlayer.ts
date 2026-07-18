export type WorkoutEvent = "pause" | "resume" | "skip" | "substitution" | "reduce_intensity" | "stop" | "pain_report" | "symptom_report";

export class GuidedWorkoutPlayerState {
  isPaused = false;
  currentIndex = 0;
  elapsedSeconds = 0;
  events: { type: WorkoutEvent; at: string; payload?: Record<string, unknown> }[] = [];

  pause() { this.isPaused = true; this.record("pause"); }
  resume() { this.isPaused = false; this.record("resume"); }
  reportPain(location: string, severity: number) {
    this.pause();
    this.record("pain_report", { location, severity });
    return severity >= 7 ? "stop" : "offer_approved_substitution";
  }
  reportSymptoms(symptoms: string[]) {
    this.pause();
    this.record("symptom_report", { symptoms });
    return "stop_and_show_safety_flow";
  }
  private record(type: WorkoutEvent, payload?: Record<string, unknown>) {
    this.events.push({ type, at: new Date().toISOString(), payload });
  }
}
