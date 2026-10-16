import test from "node:test";
import assert from "node:assert/strict";
import { shouldCheckSaaSAccess } from "../src/middlewares/saasPilotPolicy";

test("gate disabled by default and when test gym is absent", () => {
  assert.equal(shouldCheckSaaSAccess("admin", 3, undefined, "3"), false);
  assert.equal(shouldCheckSaaSAccess("admin", 3, "true", undefined), false);
  assert.equal(shouldCheckSaaSAccess("admin", 3, "false", "3"), false);
});

test("only the exact test gym admin is subject to the gate", () => {
  assert.equal(shouldCheckSaaSAccess("admin", 3, "true", "3"), true);
  assert.equal(shouldCheckSaaSAccess("admin", 4, "true", "3"), false);
  assert.equal(shouldCheckSaaSAccess("trainer", 3, "true", "3"), false);
  assert.equal(shouldCheckSaaSAccess("member", 3, "true", "3"), false);
  assert.equal(shouldCheckSaaSAccess("superadmin", 3, "true", "3"), false);
});

test("malformed and invalid IDs never enable the gate", () => {
  assert.equal(shouldCheckSaaSAccess("admin", 3, "true", "3abc"), false);
  assert.equal(shouldCheckSaaSAccess("admin", 3, "true", "0"), false);
  assert.equal(shouldCheckSaaSAccess("admin", null, "true", "3"), false);
  assert.equal(shouldCheckSaaSAccess("admin", -3, "true", "-3"), false);
});
