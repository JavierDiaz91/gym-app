import test from "node:test";
import assert from "node:assert/strict";
import { calendarBillingPeriod, evaluateInvoiceAccess } from "../lib/saas-billing-rules.ts";

test("calendar billing uses first through last day, due on 10th", () => {
  assert.deepEqual(calendarBillingPeriod("2026-11-15"), {
    start: "2026-11-01", end: "2026-11-30", due: "2026-11-10"
  });
  assert.deepEqual(calendarBillingPeriod("2028-02-29"), {
    start: "2028-02-01", end: "2028-02-29", due: "2028-02-10"
  });
  assert.throws(() => calendarBillingPeriod("2026-02-29"));
});

test("unpaid gym stays active through day 10", () => {
  assert.equal(evaluateInvoiceAccess([
    { status: "pending", dueDate: "2026-11-10" }
  ], "2026-11-10", Date.UTC(2026, 10, 10)), true);
});

test("unpaid gym is restricted from day 11", () => {
  assert.equal(evaluateInvoiceAccess([
    { status: "pending", dueDate: "2026-11-10" }
  ], "2026-11-11", Date.UTC(2026, 10, 11)), false);
});

test("provisional access expires at exactly 48h", () => {
  const until = Date.UTC(2026, 10, 13, 12);
  const invoices = [{
    status: "overdue" as const, dueDate: "2026-11-10",
    transferStatus: "under_review" as const, provisionalUntil: until
  }];
  assert.equal(evaluateInvoiceAccess(invoices, "2026-11-13", until - 1), true);
  assert.equal(evaluateInvoiceAccess(invoices, "2026-11-13", until), false);
});

test("rejection ends provisional access immediately", () => {
  assert.equal(evaluateInvoiceAccess([{
    status: "overdue", dueDate: "2026-11-10",
    transferStatus: "rejected", provisionalUntil: Date.UTC(2026, 10, 20)
  }], "2026-11-12", Date.UTC(2026, 10, 12)), false);
});

test("all overdue invoices must be covered", () => {
  assert.equal(evaluateInvoiceAccess([
    { status: "paid", dueDate: "2026-10-10" },
    { status: "overdue", dueDate: "2026-11-10", transferStatus: "under_review", provisionalUntil: Date.UTC(2026, 10, 15) },
    { status: "overdue", dueDate: "2026-09-10" }
  ], "2026-11-12", Date.UTC(2026, 10, 12)), false);
});
