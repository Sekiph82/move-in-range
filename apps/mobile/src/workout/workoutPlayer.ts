export type WorkoutEvent = "pause" | "resume" | "skip" | "substitution" | "reduce_intensity" | "stop" | "pain_report" | "symptom_report";

export class GuidedWorkoutPlayerState {
  isPaused = false;
  currentIndex = 0;
  timerInvalidated = false;
  events: { type: WorkoutEvent; at: string; payload?: Record<string, unknown> }[] = [];
  private accumulatedSeconds = 0;
  private runningSinceMs: number | null;
  private readonly now: () => number;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
    this.runningSinceMs = this.now();
  }

  get elapsedSeconds() {
    if (this.runningSinceMs === null) return this.accumulatedSeconds;
    return this.accumulatedSeconds + Math.floor((this.now() - this.runningSinceMs) / 1000);
  }

  set elapsedSeconds(value: number) {
    this.accumulatedSeconds = Math.max(0, Math.floor(value));
    if (this.runningSinceMs !== null) this.runningSinceMs = this.now();
  }

  pause() {
    if (this.runningSinceMs !== null) {
      this.accumulatedSeconds = this.elapsedSeconds;
      this.runningSinceMs = null;
    }
    this.isPaused = true;
    this.record("pause");
  }

  resume() {
    if (this.timerInvalidated) return false;
    if (this.runningSinceMs === null) this.runningSinceMs = this.now();
    this.isPaused = false;
    this.record("resume");
    return true;
  }

  skip() {
    this.currentIndex += 1;
    this.record("skip", { currentIndex: this.currentIndex });
  }

  reportPain(location: string, severity: number) {
    this.pause();
    this.record("pain_report", { location, severity });
    return severity >= 7 ? "stop" : "offer_approved_substitution";
  }
  reportSymptoms(symptoms: string[]) {
    this.pause();
    this.timerInvalidated = true;
    this.record("symptom_report", { symptoms });
    return "stop_and_show_safety_flow";
  }
  private record(type: WorkoutEvent, payload?: Record<string, unknown>) {
    this.events.push({ type, at: new Date().toISOString(), payload });
  }
}
