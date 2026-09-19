import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export const metadata = {
  title: "ลงทะเบียนผู้ใช้งาน — OPD Ortho SKH",
};

async function registerAction(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user?.lineUserId) redirect("/login");

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const position = String(formData.get("position") ?? "");

  if (!firstName || !lastName || (position !== "doctor" && position !== "nurse")) {
    redirect("/register?error=1");
  }

  await db.insert(users).values({
    lineUserId: session.user.lineUserId,
    displayName: session.user.firstName,
    firstName,
    lastName,
    position,
  });

  redirect("/");
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.isRegistered) redirect("/");

  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-md">
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <div>
            <h1 className="card-title">ลงทะเบียนผู้ใช้งาน</h1>
            <p className="text-base-content/70">
              กรอกข้อมูลของคุณก่อนเริ่มใช้งานครั้งแรก
            </p>
          </div>

          {error && (
            <div role="alert" className="alert alert-error">
              <span>กรุณากรอกข้อมูลให้ครบถ้วนและเลือกตำแหน่ง</span>
            </div>
          )}

          <form action={registerAction} className="flex flex-col gap-4">
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">ชื่อ</span>
              </div>
              <input name="firstName" required className="input input-bordered w-full" />
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">นามสกุล</span>
              </div>
              <input name="lastName" required className="input input-bordered w-full" />
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">ตำแหน่ง</span>
              </div>
              <select
                name="position"
                required
                defaultValue=""
                className="select select-bordered w-full"
              >
                <option value="" disabled>
                  เลือกตำแหน่ง
                </option>
                <option value="doctor">แพทย์</option>
                <option value="nurse">พยาบาล</option>
              </select>
            </label>

            <button type="submit" className="btn btn-primary">
              บันทึก
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
