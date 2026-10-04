import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FacetChips } from "../src/components/facet-chips";
import { ThumbnailField } from "../src/components/thumbnail-field";
import { GroupCreateRow, GroupRowActions, GroupSelector } from "../src/components/group-controls";
import { ScanStatusPanel } from "../src/components/scan-status-panel";

test("counted facets keep selected and disabled semantics, including an empty state", () => {
  const html = renderToStaticMarkup(<FacetChips label="Artists" items={[
    { key: "a", label: "Artist A", count: 12 },
    { key: "b", label: "Artist B", count: 0, disabled: true },
  ]} selectedKey="a" onSelect={() => {}} />);
  assert.match(html, /role="group" aria-label="Artists"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /Artist A/);
  assert.match(html, /\(12\)/);
  assert.match(html, /disabled=""/);
  assert.match(renderToStaticMarkup(<FacetChips label="Empty" items={[]} selectedKey={null} onSelect={() => {}} empty="No tags" />), /No tags/);
});

test("controlled thumbnail exposes preview, placeholder, busy and error independently", () => {
  const preview = renderToStaticMarkup(<ThumbnailField src="data:image/png;base64,AA==" alt="Cover art" />);
  assert.match(preview, /alt="Cover art"/);
  const empty = renderToStaticMarkup(<ThumbnailField alt="No cover" placeholder="Paste an image" busy error="Upload failed" />);
  assert.doesNotMatch(empty, /<img/);
  assert.match(empty, /aria-busy="true"/);
  assert.match(empty, /role="status"/);
  assert.match(empty, /role="alert"/);
});

test("group controls identify selection and prevent empty or disabled actions", () => {
  const selector = renderToStaticMarkup(<GroupSelector label="Folder group" selectedKey="a" onSelect={() => {}} options={[{ key: "a", label: "Movies", count: 4 }]} />);
  assert.match(selector, /aria-label="Folder group"/);
  assert.match(selector, /Movies \(4\)/);
  const create = renderToStaticMarkup(<GroupCreateRow label="New group" value=" " onChange={() => {}} onCreate={() => {}} />);
  assert.match(create, /type="submit" disabled=""/);
  const actions = renderToStaticMarkup(<GroupRowActions active onActivate={() => {}} onDelete={() => {}} deleteDisabled />);
  assert.match(actions, /aria-current="true"/);
  assert.match(actions, /aria-label="삭제"/);
  assert.match(actions, /disabled=""/);
});

test("scan status accepts unknown totals without a fabricated percentage", () => {
  const html = renderToStaticMarkup(<ScanStatusPanel phase="Inspecting" counts={[{ key: "found", label: "Found", value: 3 }]} path="/fixture/repo" error="Permission denied" onRetry={() => {}} />);
  assert.match(html, /Found:/);
  assert.match(html, /\/fixture\/repo/);
  assert.match(html, /role="alert"/);
  assert.doesNotMatch(html, /%/);
});
