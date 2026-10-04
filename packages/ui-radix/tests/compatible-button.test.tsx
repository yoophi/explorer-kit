import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CompatibleButton, compatibleButtonVariants } from "../src/components/compatible-button";

test("Movie/Repo button geometry and variants keep their previous class contract", () => {
  const basic = compatibleButtonVariants();
  assert.match(basic, /rounded-md/);
  assert.match(basic, /h-8 gap-1\.5 px-2\.5/);
  assert.match(basic, /hover:bg-primary\/85/);
  assert.match(compatibleButtonVariants({ variant: "secondary", size: "icon-sm" }), /size-7/);
  const html = renderToStaticMarkup(<CompatibleButton disabled aria-label="Scan">Scan</CompatibleButton>);
  assert.match(html, /<button/);
  assert.match(html, /disabled=""/);
  assert.match(html, /aria-label="Scan"/);
});
