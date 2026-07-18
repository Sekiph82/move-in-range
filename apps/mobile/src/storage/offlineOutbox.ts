export type OutboxItem = {
  id: string;
  type: "readiness" | "glucose" | "workout_event" | "feedback";
  payload: Record<string, unknown>;
  createdAt: string;
  attemptCount: number;
  status: "pending" | "syncing" | "failed";
};

export class OfflineOutbox {
  private items: OutboxItem[] = [];

  enqueue(type: OutboxItem["type"], payload: Record<string, unknown>) {
    const item = { id: `outbox-${Date.now()}-${this.items.length}`, type, payload, createdAt: new Date().toISOString(), attemptCount: 0, status: "pending" as const };
    this.items.push(item);
    return item;
  }

  pending() {
    return this.items.filter((item) => item.status === "pending" || item.status === "failed");
  }

  markFailed(id: string) {
    const item = this.items.find((candidate) => candidate.id === id);
    if (item) {
      item.status = "failed";
      item.attemptCount += 1;
    }
  }

  markSynced(id: string) {
    this.items = this.items.filter((item) => item.id !== id);
  }
}
