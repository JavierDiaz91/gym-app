/**
 * Pure SaaS billing rules. Dates are calendar dates (YYYY-MM-DD).
 * No database or timezone dependencies in these helpers.
 */
export function calendarBillingPeriod(isoDate: string): {
  start: string;
  end: string;
  due: string;
} {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new Error("Invalid ISO date");
  const [year, month, day] = isoDate.split("-").map(Number);
  const input = new Date(Date.UTC(year, month - 1, day));
  if (input.getUTCFullYear() !== year || input.getUTCMonth() !== month - 1 || input.getUTCDate() !== day) {
    throw new Error("Invalid calendar date");
  }
  const prefix = `${year.toString().padStart(4, "0")}-${String(month).padStart(2, "0")}`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${prefix}-01`,
    end: `${prefix}-${String(lastDay).padStart(2, "0")}`,
    due: `${prefix}-10`
  };
}

export type InvoiceAccessState = {
  status: "pending" | "overdue" | "paid" | "cancelled";
  dueDate: string | null;
  transferStatus?: "under_review" | "approved" | "rejected" | "expired" | null;
  provisionalUntil?: number | null;
};

/**
 * Preview policy: all overdue invoices need an active provisional grant.
 * The production gate uses the corresponding PostgreSQL function and
 * database server time; this pure version is for regression tests.
 */
export function evaluateInvoiceAccess(
  invoices: InvoiceAccessState[],
  todayIso: string,
  nowMs: number
): boolean {
  calendarBillingPeriod(todayIso);
  return invoices.every((invoice) => {
    if (invoice.status === "paid" || invoice.status === "cancelled") return true;
    if (!invoice.dueDate || invoice.dueDate >= todayIso) return true;
    return invoice.transferStatus === "under_review" &&
      typeof invoice.provisionalUntil === "number" &&
      invoice.provisionalUntil > nowMs;
  });
}
