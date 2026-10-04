import assert from "node:assert/strict";
import { test } from "node:test";
import { toAbsolutePath, toTreeId } from "../src/lib/paths";

test("POSIX slash root keeps a single separator and excludes the root itself", () => {
  assert.equal(toTreeId("/tmp", "/"), "tmp/");
  assert.equal(toTreeId("/tmp/nested/", "/"), "tmp/nested/");
  assert.equal(toAbsolutePath("tmp/", "/"), "/tmp");
  assert.equal(toAbsolutePath("tmp/nested/", "/"), "/tmp/nested");
  assert.equal(toTreeId("/", "/"), null);
  assert.equal(toAbsolutePath("", "/"), "/");
});

test("ordinary roots and trailing separators have the same descendant boundary", () => {
  for (const root of ["/home/user", "/home/user/", "/home/user///"]) {
    assert.equal(toTreeId("/home/user/Documents", root), "Documents/");
    assert.equal(toTreeId("/home/user/Documents///", root), "Documents/");
    assert.equal(toAbsolutePath("Documents/", root), "/home/user/Documents");
    assert.equal(toAbsolutePath("Documents///", root), "/home/user/Documents");
    assert.equal(toTreeId("/home/user", root), null);
    assert.equal(toTreeId("/home/user/", root), null);
    assert.equal(toAbsolutePath("", root), "/home/user");
    assert.equal(toTreeId("/home/username/Documents", root), null);
  }
});

test("tree IDs roundtrip for nested descendants without changing POSIX paths", () => {
  for (const [root, path] of [
    ["/", "/tmp/deep/folder"],
    ["/home/user", "/home/user/Documents/Projects"],
    ["/home/user/", "/home/user/Documents/Projects/"],
  ]) {
    const id = toTreeId(path, root);
    assert.notEqual(id, null);
    assert.equal(toAbsolutePath(id!, root), path.replace(/\/+$/, ""));
  }
});

test("Windows backslash paths remain outside the current POSIX contract", () => {
  assert.equal(toTreeId("C:\\Users\\me\\Documents", "C:\\Users\\me"), null);
});
