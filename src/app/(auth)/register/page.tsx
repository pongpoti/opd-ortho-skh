import { and, eq } from "drizzle-orm";
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

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let i = 0; i < 4 && current; i++) {
    if (typeof current === "object" && current !== null && "code" in current) {
      if ((current as { code?: string }).code === "23505") return true;
    }
    if (current instanceof Error && /unique|duplicate key/i.test(current.message)) {
      return true;
    }
    current =
      typeof current === "object" && current !== null && "cause" in current
        ? (current as { cause: unknown }).cause
        : null;
  }
  return false;
}

async function registerAction(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user?.lineUserId) redirect("/login");

  // Already registered (e.g. JWT lag after a prior success) — don't insert again.
  const existingSelf = await db.query.users.findFirst({
    where: eq(users.lineUserId, session.user.lineUserId),
  });
  if (existingSelf) redirect("/");

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

  const claimedByOther = await db.query.users.findFirst({
    where: and(eq(users.firstName, firstName), eq(users.lastName, lastName)),
  });
  if (claimedByOther) {
    redirect("/register?error=duplicate");
  }

  try {
    await db.insert(users).values({
      lineUserId: session.user.lineUserId,
      displayName: session.user.lineDisplayName,
      firstName,
      lastName,
      position,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      // Name taken by a concurrent registrant, or line_user_id already exists.
      const selfAgain = await db.query.users.findFirst({
        where: eq(users.lineUserId, session.user.lineUserId),
      });
      if (selfAgain) redirect("/");
      redirect("/register?error=duplicate");
    }
    throw error;
  }

  redirect("/");
}

const ERROR_MESSAGES: Record<string, string> = {
  duplicate: "ชื่อนี้มีผู้ลงทะเบียนไปแล้ว หากนี่คือข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ",
};
const DEFAULT_ERROR_MESSAGE = "กรุณากรอกข้อมูลให้ครบถ้วนและเลือกตำแหน่ง";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.isRegistered) redirect("/");

  const { error } = await searchParams;

  return (
    <GlassCard p={8} maxW="md" w="full">
      <VStack gap={4} align="stretch">
        <VStack gap={1} align="start">
          <Heading size="lg">ลงทะเบียนผู้ใช้งาน</Heading>
          <Text color="fg.muted">กรอกข้อมูลของคุณก่อนเริ่มใช้งานครั้งแรก</Text>
        </VStack>

        {error && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{ERROR_MESSAGES[error] ?? DEFAULT_ERROR_MESSAGE}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        <RegisterForm action={registerAction} />
      </VStack>
    </GlassCard>
  );
}
