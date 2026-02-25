import { describe, it, expect } from "vitest";
import { formatDayHours } from "@/lib/formatOpeningHours";

describe("formatDayHours", () => {
  it("returns dash for null/undefined", () => {
    expect(formatDayHours(null)).toBe("—");
    expect(formatDayHours(undefined)).toBe("—");
  });

  it("returns Fermé when closed (fr)", () => {
    expect(formatDayHours({ closed: true })).toBe("Fermé");
  });

  it("returns Closed when closed (en)", () => {
    expect(formatDayHours({ closed: true }, { language: "en" })).toBe("Closed");
  });

  it("returns مغلق when closed (ar)", () => {
    expect(formatDayHours({ closed: true }, { language: "ar" })).toBe("مغلق");
  });

  it("returns dash if open/close missing", () => {
    expect(formatDayHours({ open: "09:00" })).toBe("—");
    expect(formatDayHours({ close: "18:00" })).toBe("—");
  });

  it("formats single slot", () => {
    expect(formatDayHours({ open: "09:00", close: "18:00" })).toBe("09:00 - 18:00");
  });

  it("adds continuous label in french", () => {
    expect(formatDayHours({ open: "09:00", close: "18:00", continuous: true })).toBe("09:00 - 18:00 (continu)");
  });

  it("adds continuous label in english", () => {
    expect(formatDayHours({ open: "09:00", close: "18:00", continuous: true }, { language: "en" })).toBe("09:00 - 18:00 (continuous)");
  });

  it("hides continuous label when showContinuous=false", () => {
    expect(formatDayHours({ open: "09:00", close: "18:00", continuous: true }, { showContinuous: false })).toBe("09:00 - 18:00");
  });

  it("formats dual slots", () => {
    expect(formatDayHours({ open: "09:00", close: "12:00", open2: "14:00", close2: "18:00" })).toBe("09:00 - 12:00 / 14:00 - 18:00");
  });

  it("ignores second slot when continuous", () => {
    expect(formatDayHours({ open: "09:00", close: "18:00", open2: "20:00", close2: "23:00", continuous: true })).toBe("09:00 - 18:00 (continu)");
  });
});
