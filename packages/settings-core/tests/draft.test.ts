import { test } from "node:test";
import assert from "node:assert/strict";
import { createSettingsDraft, editSettingsDraft, syncSettingsDraft, planSettingsDraft, confirmSettingsDraft } from "../src/draft";

test("clean Movie glob follows external updates; dirty text survives and confirms only after save", () => {
  let draft = createSettingsDraft("**/*.mp4", String);
  draft = syncSettingsDraft(draft, "**/*.mkv", String);
  assert.equal(draft.text, "**/*.mkv");
  draft = editSettingsDraft(draft, "**/*.avi", String);
  draft = syncSettingsDraft(draft, "**/*.mov", String);
  assert.deepEqual(planSettingsDraft(draft, (text) => text), { value: "**/*.avi", needsWrite: true });
  assert.equal(draft.text, "**/*.avi"); // failed write retains draft
  draft = confirmSettingsDraft(draft, "**/*.avi", String);
  assert.equal(draft.dirty, false);
});

test("Repo depth keeps empty and invalid intermediate text out of persistence", () => {
  const parse = (text: string) => /^(0|[1-9]\d*)$/.test(text) && Number(text) <= 20 ? Number(text) : null;
  let draft = editSettingsDraft(createSettingsDraft(4, String), "", String);
  assert.deepEqual(planSettingsDraft(draft, parse), { value: null, needsWrite: false });
  draft = syncSettingsDraft(draft, 7, String);
  assert.equal(draft.text, "");
  draft = editSettingsDraft(draft, "7", String);
  assert.deepEqual(planSettingsDraft(draft, parse), { value: 7, needsWrite: false });
  draft = editSettingsDraft(draft, "21", String);
  assert.equal(planSettingsDraft(draft, parse).value, null);
});
