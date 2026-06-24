import { describe, expect, it } from "vitest";
import {
  addDays,
  dayLabel,
  fmtG,
  fmtKcal,
  fmtKg,
  fmtKgSigned,
  isoDate,
  progress,
  ratio,
} from "@/lib/format";

describe("format helpers", () => {
  it("groups thousands in kcal", () => {
    expect(fmtKcal(2500)).toBe("2 500");
    expect(fmtKcal(950.6)).toBe("951");
    expect(fmtKcal(0)).toBe("0");
  });

  it("formats grams and kg", () => {
    expect(fmtG(144.4)).toBe("144 g");
    expect(fmtKg(79.45)).toBe("79.5 kg");
  });

  it("signs kg with a real minus glyph", () => {
    expect(fmtKgSigned(0.3)).toBe("+0.3 kg");
    expect(fmtKgSigned(-1.2)).toBe("−1.2 kg");
  });

  it("clamps progress to [0,1]", () => {
    expect(progress(50, 100)).toBe(0.5);
    expect(progress(150, 100)).toBe(1);
    expect(progress(-10, 100)).toBe(0);
    expect(progress(10, 0)).toBe(0);
  });

  it("ratio is unclamped (detects overage)", () => {
    expect(ratio(150, 100)).toBeCloseTo(1.5);
    expect(ratio(10, 0)).toBe(0);
  });
});

describe("date helpers", () => {
  it("isoDate has no timezone shift", () => {
    expect(isoDate(new Date(2026, 5, 24))).toBe("2026-06-24");
  });

  it("addDays crosses month boundaries", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("labels today / yesterday / tomorrow", () => {
    const today = isoDate();
    expect(dayLabel(today)).toBe("Today");
    expect(dayLabel(addDays(today, -1))).toBe("Yesterday");
    expect(dayLabel(addDays(today, 1))).toBe("Tomorrow");
  });
});
