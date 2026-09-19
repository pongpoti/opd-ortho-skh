import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { PHYSICIANS } from "@/lib/physicians";

import { RegisterForm } from "./register-form";

export const metadata = {
  title: "ลงทะเบียนผู้ใช้งาน — OPD Ortho SKH",
};

async function registerAction(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user?.lineUserId) redirect("/login");

  const position = String(formData.get("position") ?? "");

  let firstName = "";
  let lastName = "";

  if (position === "doctor") {
    const doctorName = String(formData.get("doctorName") ?? "").trim();
    if (!PHYSICIANS.includes(doctorName as (typeof PHYSICIANS)[number])) {
      redirect("/register?error=1");
    }
    const spaceIndex = doctorName.indexOf(" ");
    firstName = doctorName.slice(0, spaceIndex);
    lastName = doctorName.slice(spaceIndex + 1);
  } else if (position === "nurse") {
    firstName = String(formData.get("firstName") ?? "").trim();
    lastName = String(formData.get("lastName") ?? "").trim();
  } else {
    redirect("/register?error=1");
  }

  if (!firstName || !lastName) {
    redirect("/register?error=1");
  }

  await db.insert(users).values({
    lineUserId: session.user.lineUserId,
    displayName: session.user.lineDisplayName,
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

          <RegisterForm action={registerAction} />
        </div>
      </div>
    </div>
  );
}
