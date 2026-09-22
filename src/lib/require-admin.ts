import { auth } from "@/auth";

export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user?.isRegistered || session.user.role !== "admin") {
    return null;
  }
  return session;
}
