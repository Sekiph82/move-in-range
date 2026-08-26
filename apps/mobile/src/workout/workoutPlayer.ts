export type WorkoutEvent = "pause" | "resume" | "skip" | "substitution" | "reduce_intensity" | "stop" | "pain_report" | "symptom_report";
export type TimerPhase = "work" | "rest" | "paused" | "stopped";
export type WorkoutSnapshot = {
  sessionId: string;
  currentIndex: number;
  currentSet: number;
  phase: TimerPhase;
  phaseStartMs: number | null;
  elapsedSeconds: number;
  timerInvalidated: boolean;
  submittedCompletionKeys: string[];
  lastSyncedEventId?: string;
};

export class GuidedWorkoutPlayerState {
  isPaused = false;
  currentIndex = 0;
  currentSet = 0;
  phase: TimerPhase = "work";
  timerInvalidated = false;
  events: { type: WorkoutEvent; at: string; payload?: Record<string, unknown> }[] = [];
  submittedCompletionKeys = new Set<string>();
  lastSyncedEventId?: string;
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
    this.phase = "paused";
    this.isPaused = true;
    this.record("pause");
  }

  resume() {
    if (this.timerInvalidated) return false;
    if (this.runningSinceMs === null) this.runningSinceMs = this.now();
    this.phase = "work";
    this.isPaused = false;
    this.record("resume");
    return true;
  }

  skip() {
    this.currentIndex += 1;
    this.currentSet = 0;
    this.record("skip", { currentIndex: this.currentIndex });
  }

  startRest() {
    this.phase = "rest";
    this.runningSinceMs = this.now();
  }

  reportPain(location: string, severity: number) {
    this.pause();
    this.record("pain_report", { location, severity });
    return severity >= 7 ? "stop" : "offer_approved_substitution";
  }
  reportSymptoms(symptoms: string[]) {
    this.pause();
    this.timerInvalidated = true;
    this.phase = "stopped";
    this.record("symptom_report", { symptoms });
    return "stop_and_show_safety_flow";
  }

  recordCompletionSubmitted(idempotencyKey: string) {
    if (this.submittedCompletionKeys.has(idempotencyKey)) return false;
    this.submittedCompletionKeys.add(idempotencyKey);
    return true;
  }

  snapshot(sessionId: string): WorkoutSnapshot {
    return {
      sessionId,
      currentIndex: this.currentIndex,
      currentSet: this.currentSet,
      phase: this.phase,
      phaseStartMs: this.runningSinceMs,
      elapsedSeconds: this.elapsedSeconds,
      timerInvalidated: this.timerInvalidated,
      submittedCompletionKeys: Array.from(this.submittedCompletionKeys),
      lastSyncedEventId: this.lastSyncedEventId
    };
  }

  static restore(snapshot: WorkoutSnapshot, now: () => number = () => Date.now()) {
    const player = new GuidedWorkoutPlayerState(now);
    player.currentIndex = snapshot.currentIndex;
    player.currentSet = snapshot.currentSet;
    player.phase = snapshot.phase;
    player.timerInvalidated = snapshot.timerInvalidated;
    player.accumulatedSeconds = Math.max(0, snapshot.elapsedSeconds);
    player.runningSinceMs = snapshot.timerInvalidated || snapshot.phase === "paused" || snapshot.phase === "stopped" ? null : now();
    player.isPaused = player.runningSinceMs === null;
    player.submittedCompletionKeys = new Set(snapshot.submittedCompletionKeys);
    player.lastSyncedEventId = snapshot.lastSyncedEventId;
    return player;
  }

  private record(type: WorkoutEvent, payload?: Record<string, unknown>) {
    this.events.push({ type, at: new Date().toISOString(), payload });
  }
}
