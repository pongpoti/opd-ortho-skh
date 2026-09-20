import { redirect } from "next/navigation";
import { Alert, Heading, Text, VStack } from "@chakra-ui/react";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { PHYSICIANS } from "@/lib/physicians";
import { NURSES } from "@/lib/nurses";
import { GlassCard } from "@/components/ui/glass-card";

import { RegisterForm } from "./register-form";

export const metadata = {
  title: "ลงทะเบียนผู้ใช้งาน — OPD Ortho SKH",
};

async function registerAction(formData: FormData) {
  "use server";

  if (formData.get("previewMode") === "1") {
    // Preview/test mode: exercise the client flow only, no real auth or DB write.
    redirect("/register?preview=1&submitted=1");
  }

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
    const nurseName = String(formData.get("nurseName") ?? "").trim();
    if (!NURSES.includes(nurseName as (typeof NURSES)[number])) {
      redirect("/register?error=1");
    }
    const spaceIndex = nurseName.indexOf(" ");
    firstName = nurseName.slice(0, spaceIndex);
    lastName = nurseName.slice(spaceIndex + 1);
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
  searchParams: Promise<{ error?: string; preview?: string; submitted?: string }>;
}) {
  const { error, preview, submitted } = await searchParams;
  const isPreview = preview === "1";

  if (!isPreview) {
    const session = await auth();
    if (session?.user?.isRegistered) redirect("/");
  }

  return (
    <GlassCard p={8} maxW="md" w="full">
      <VStack gap={4} align="stretch">
        {isPreview && (
          <Alert.Root status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>
                โหมดทดสอบ — หน้านี้ไม่ผูกกับบัญชี LINE จริงและจะไม่บันทึกข้อมูลลงฐานข้อมูล
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {isPreview && submitted === "1" && (
          <Alert.Root status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>
                ทดสอบสำเร็จ — ในการใช้งานจริง ระบบจะพาไปหน้าแรกหลังลงทะเบียน
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        <VStack gap={1} align="start">
          <Heading size="lg">ลงทะเบียนผู้ใช้งาน</Heading>
          <Text color="fg.muted">กรอกข้อมูลของคุณก่อนเริ่มใช้งานครั้งแรก</Text>
        </VStack>

        {error && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>กรุณากรอกข้อมูลให้ครบถ้วนและเลือกตำแหน่ง</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        <RegisterForm action={registerAction} previewMode={isPreview} />
      </VStack>
    </GlassCard>
  );
}
