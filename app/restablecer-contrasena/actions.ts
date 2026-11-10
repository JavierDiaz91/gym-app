"use server";
import { resetPassword } from "@/lib/password-reset";
export async function resetPasswordAction(token: string, password: string) {
  return resetPassword(token, password);
}
