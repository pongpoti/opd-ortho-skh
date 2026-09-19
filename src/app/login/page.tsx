import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";

export const metadata = {
  title: "เข้าสู่ระบบ — OPD Ortho SKH",
};

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect(session.user.isRegistered ? "/" : "/register");

  return (
    <div className="mx-auto max-w-sm">
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body items-center gap-4 text-center">
          <h1 className="card-title">เข้าสู่ระบบ</h1>
          <p className="text-base-content/70">กรุณาเข้าสู่ระบบด้วยบัญชี LINE เพื่อใช้งาน</p>
          <form
            action={async () => {
              "use server";
              await signIn("line", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="btn text-white hover:opacity-90"
              style={{ backgroundColor: "#06C755" }}
            >
              เข้าสู่ระบบด้วย LINE
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
