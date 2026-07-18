import test from "node:test";
import assert from "node:assert/strict";
const { OfflineOutbox } = await import("../apps/mobile/src/storage/offlineOutbox.ts");
const { GuidedWorkoutPlayerState } = await import("../apps/mobile/src/workout/workoutPlayer.ts");

test("offline queue never silently discards pending health records", () => {
  const outbox = new OfflineOutbox();
  const item = outbox.enqueue("glucose", { value: 110, unit: "mg/dL" });
  outbox.markFailed(item.id);
  assert.equal(outbox.pending().length, 1);
});

test("pain flow pauses and offers substitution or stop", () => {
  const player = new GuidedWorkoutPlayerState();
  const action = player.reportPain("knee", 5);
  assert.equal(player.isPaused, true);
  assert.equal(action, "offer_approved_substitution");
});
