"use client";

import { useRef, useState } from "react";
import { Button, Dialog, Field, NativeSelect, Portal, Text, VStack } from "@chakra-ui/react";

import { PHYSICIANS } from "@/lib/physicians";
import { NURSES } from "@/lib/nurses";

const POSITION_LABEL: Record<string, string> = {
  doctor: "แพทย์",
  nurse: "พยาบาล",
};

export function RegisterForm({
  action,
  previewMode = false,
}: {
  action: (formData: FormData) => Promise<void>;
  previewMode?: boolean;
}) {
  const [position, setPosition] = useState("");
  const [name, setName] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleReviewClick() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;
    setConfirmOpen(true);
  }

  function handleConfirm() {
    setConfirmOpen(false);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={formRef} action={action}>
        <input type="hidden" name="previewMode" value={previewMode ? "1" : "0"} />
        <VStack gap={4} align="stretch">
          <Field.Root>
            <Field.Label>ตำแหน่ง</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                name="position"
                value={position}
                onChange={(e) => {
                  setPosition(e.target.value);
                  setName("");
                }}
              >
                <option value="" disabled>
                  เลือกตำแหน่ง
                </option>
                <option value="doctor">แพทย์</option>
                <option value="nurse">พยาบาล</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>

          {position === "doctor" && (
            <Field.Root>
              <Field.Label>ชื่อ-นามสกุล</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  name="doctorName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                >
                  <option value="" disabled>
                    เลือกชื่อแพทย์
                  </option>
                  {PHYSICIANS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
          )}

          {position === "nurse" && (
            <Field.Root>
              <Field.Label>ชื่อ-นามสกุล</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  name="nurseName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                >
                  <option value="" disabled>
                    เลือกชื่อพยาบาล
                  </option>
                  {NURSES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
          )}

          <Button
            type="button"
            onClick={handleReviewClick}
            colorPalette="brand"
            disabled={!position || !name}
          >
            บันทึก
          </Button>
        </VStack>
      </form>

      <Dialog.Root open={confirmOpen} onOpenChange={(e) => setConfirmOpen(e.open)}>
        <Portal>
          <Dialog.Backdrop backdropFilter="blur(4px)" />
          <Dialog.Positioner>
            <Dialog.Content
              bg="glass.solid"
              backdropFilter="blur(16px)"
              borderWidth="1px"
              borderColor="glass.border"
            >
              <Dialog.Header>
                <Dialog.Title>ยืนยันข้อมูลลงทะเบียน</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text color="fg.muted" mb={3}>
                  กรุณาตรวจสอบข้อมูลก่อนยืนยัน เนื่องจากไม่สามารถแก้ไขได้ภายหลัง
                </Text>
                <VStack align="stretch" gap={1} bg="bg.muted" p={4} borderRadius="lg" fontSize="sm">
                  <Text>
                    <Text as="span" color="fg.muted">
                      ตำแหน่ง:{" "}
                    </Text>
                    {POSITION_LABEL[position]}
                  </Text>
                  <Text>
                    <Text as="span" color="fg.muted">
                      ชื่อ-นามสกุล:{" "}
                    </Text>
                    {name}
                  </Text>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
                  แก้ไขข้อมูล
                </Button>
                <Button colorPalette="brand" onClick={handleConfirm}>
                  ยืนยัน
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}
