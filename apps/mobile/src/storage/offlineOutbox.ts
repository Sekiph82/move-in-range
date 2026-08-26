export type OutboxItem = {
  id: string;
  accountId: string;
  type: "readiness" | "glucose" | "workout_event" | "feedback";
  payload: Record<string, unknown>;
  createdAt: string;
  attemptCount: number;
  status: "pending" | "syncing" | "failed";
  lastError?: string;
  nextAttemptAt?: string;
};

export class OfflineOutbox {
  private items: OutboxItem[] = [];
  private accountId: string;
  private readonly now: () => number;

  constructor(accountId = "local-dev-user", now: () => number = () => Date.now()) {
    this.accountId = accountId;
    this.now = now;
  }

  enqueue(type: OutboxItem["type"], payload: Record<string, unknown>) {
    const item = { id: `outbox-${this.now()}-${this.items.length}`, accountId: this.accountId, type, payload, createdAt: new Date(this.now()).toISOString(), attemptCount: 0, status: "pending" as const };
    this.items.push(item);
    return item;
  }

  pending() {
    return this.items.filter((item) => item.accountId === this.accountId && (item.status === "pending" || item.status === "failed"));
  }

  retryDue() {
    return this.pending().filter((item) => !item.nextAttemptAt || Date.parse(item.nextAttemptAt) <= this.now());
  }

  markSyncing(id: string) {
    const item = this.findCurrentAccountItem(id);
    if (item) item.status = "syncing";
  }

  markFailed(id: string, error = "sync_failed") {
    const item = this.findCurrentAccountItem(id);
    if (item) {
      item.status = "failed";
      item.attemptCount += 1;
      item.lastError = error;
      const backoffSeconds = Math.min(300, 2 ** Math.min(item.attemptCount, 8));
      item.nextAttemptAt = new Date(this.now() + backoffSeconds * 1000).toISOString();
    }
  }

  manualRetry(id: string) {
    const item = this.findCurrentAccountItem(id);
    if (item) {
      item.status = "pending";
      item.nextAttemptAt = undefined;
    }
  }

  markSynced(id: string) {
    this.items = this.items.filter((item) => item.id !== id || item.accountId !== this.accountId);
  }

  switchAccount(accountId: string) {
    this.accountId = accountId;
  }

  queueCount() {
    return this.pending().length;
  }

  clearCurrentAccount() {
    this.items = this.items.filter((item) => item.accountId !== this.accountId);
  }

  private findCurrentAccountItem(id: string) {
    return this.items.find((candidate) => candidate.id === id && candidate.accountId === this.accountId);
  }
}
