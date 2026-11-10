"use server";
import { requestPasswordReset } from "@/lib/password-reset";
export async function requestResetAction(email: string) {
  return requestPasswordReset(email);
}
