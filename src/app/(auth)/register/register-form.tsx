"use client";

import { useState } from "react";

import { PHYSICIANS } from "@/lib/physicians";
import { NURSES } from "@/lib/nurses";

export function RegisterForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [position, setPosition] = useState("");

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="form-control w-full">
        <div className="label">
          <span className="label-text">ตำแหน่ง</span>
        </div>
        <select
          name="position"
          required
          value={position}
          onChange={(e) => setPosition(e.target.value)}
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
            defaultValue=""
            className="select select-bordered w-full"
          >
            <option value="" disabled>
              เลือกชื่อแพทย์
            </option>
            {PHYSICIANS.map((name) => (
              <option key={name} value={name}>
                {name}
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
            defaultValue=""
            className="select select-bordered w-full"
          >
            <option value="" disabled>
              เลือกชื่อพยาบาล
            </option>
            {NURSES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}

      <button type="submit" className="btn btn-primary" disabled={!position}>
        บันทึก
      </button>
    </form>
  );
}
