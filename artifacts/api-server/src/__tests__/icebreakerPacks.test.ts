// Unit tests for the icebreaker pack/turn logic — the 6-turn (3-each) exchange.
// Pure module (no DB), runnable with: pnpm --filter @workspace/api-server test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PACKS, TONES, TOTAL_TURNS, getPackById, turnOptions, type Tone,
} from "../icebreakerPacks";

test("a full icebreaker is 6 turns (3 messages each)", () => {
  assert.equal(TOTAL_TURNS, 6);
});

test("every turn (1-6) resolves a body for any tone path", () => {
  const pack = PACKS[0];
  // Pick 'flirty' at every turn and walk all 6 turns.
  const tones: (Tone | undefined)[] = [];
  for (let turn = 1; turn <= TOTAL_TURNS; turn++) {
    const opts = turnOptions(pack, turn, tones);
    assert.ok(opts, `turn ${turn} should have options`);
    for (const t of TONES) {
      assert.equal(typeof opts![t], "string", `turn ${turn} missing tone ${t}`);
      assert.ok(opts![t].length > 0, `turn ${turn} tone ${t} empty`);
    }
    tones[turn - 1] = "flirty";
  }
});

test("turn options branch on the previous turn's tone", () => {
  const pack = PACKS[0];
  // Turn 2 options differ depending on turn-1 tone.
  const afterFlirty = turnOptions(pack, 2, ["flirty"]);
  const afterNeutral = turnOptions(pack, 2, ["neutral"]);
  assert.ok(afterFlirty && afterNeutral);
  assert.notDeepEqual(afterFlirty, afterNeutral);
});

test("turnOptions returns null when the required prior tone is missing", () => {
  const pack = PACKS[0];
  assert.equal(turnOptions(pack, 2, []), null);
  assert.equal(turnOptions(pack, 6, ["flirty", "flirty", "flirty", "flirty"]), null);
});

test("getPackById round-trips every seeded pack", () => {
  for (const p of PACKS) assert.equal(getPackById(p.id)?.id, p.id);
});
