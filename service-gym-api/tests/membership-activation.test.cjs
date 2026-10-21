const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const dbPath = path.resolve(__dirname, "../dist/db/neon.js");
const servicePath = path.resolve(__dirname, "../dist/services/membership.service.js");
let lastQuery;
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: { sql: async (strings, ...values) => {
    lastQuery = { text: strings.join("?"), values };
    return [];
  } }
};
const { updateGymPlan } = require(servicePath);

test("activation update contains a database-side flexible-plan guard", async () => {
  await updateGymPlan(3, 9, { isActive: true });
  assert.match(lastQuery.text, /COALESCE\(access_mode, 'monthly'\) NOT IN \('entry_pack', 'fixed_days'\)/);
  assert.ok(lastQuery.values.includes(true));
  assert.ok(lastQuery.values.includes(9));
  assert.ok(lastQuery.values.includes(3));
});

test("deactivation is allowed by the guard parameter", async () => {
  await updateGymPlan(3, 9, { isActive: false });
  assert.ok(lastQuery.values.includes(false));
  assert.match(lastQuery.text, /AND \(\? = false OR COALESCE/);
});

test("no activation flag leaves the guard disabled", async () => {
  await updateGymPlan(3, 9, { name: "Nuevo nombre" });
  assert.ok(lastQuery.values.includes(false));
  assert.ok(lastQuery.values.includes("Nuevo nombre"));
});
