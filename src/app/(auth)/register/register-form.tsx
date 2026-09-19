"use client";

import { useRef, useState } from "react";

import { PHYSICIANS } from "@/lib/physicians";
import { NURSES } from "@/lib/nurses";

const POSITION_LABEL: Record<string, string> = {
  doctor: "แพทย์",
  nurse: "พยาบาล",
};

export function RegisterForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [position, setPosition] = useState("");
  const [name, setName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function handleReviewClick() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;
    dialogRef.current?.showModal();
  }

  function handleConfirm() {
    dialogRef.current?.close();
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={formRef} action={action} className="flex flex-col gap-4">
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">ตำแหน่ง</span>
          </div>
          <select
            name="position"
            required
            value={position}
            onChange={(e) => {
              setPosition(e.target.value);
              setName("");
            }}
            className="select select-bordered w-full"
          >
            <option value="" disabled>
              เลือกตำแหน่ง
            </option>
            <option value="doctor">แพทย์</option>
            <option value="nurse">พยาบาล</option>
          </select>
        </label>

        {position === "doctor" && (
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">ชื่อ-นามสกุล</span>
            </div>
            <select
              name="doctorName"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="select select-bordered w-full"
            >
              <option value="" disabled>
                เลือกชื่อแพทย์
              </option>
              {PHYSICIANS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}

        {position === "nurse" && (
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">ชื่อ-นามสกุล</span>
            </div>
            <select
              name="nurseName"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="select select-bordered w-full"
            >
              <option value="" disabled>
                เลือกชื่อพยาบาล
              </option>
              {NURSES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={handleReviewClick}
          className="btn btn-primary"
          disabled={!position || !name}
        >
          บันทึก
        </button>
      </form>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">ยืนยันข้อมูลลงทะเบียน</h3>
          <p className="py-2 text-base-content/70">
            กรุณาตรวจสอบข้อมูลก่อนยืนยัน เนื่องจากไม่สามารถแก้ไขได้ภายหลัง
          </p>
          <div className="flex flex-col gap-1 rounded-lg bg-base-200 p-4 text-sm">
            <p>
              <span className="text-base-content/60">ตำแหน่ง: </span>
              {POSITION_LABEL[position]}
            </p>
            <p>
              <span className="text-base-content/60">ชื่อ-นามสกุล: </span>
              {name}
            </p>
          </div>
          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => dialogRef.current?.close()}
            >
              แก้ไขข้อมูล
            </button>
            <button type="button" className="btn btn-primary" onClick={handleConfirm}>
              ยืนยัน
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}
