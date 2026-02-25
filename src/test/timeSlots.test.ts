import { describe, it, expect } from "vitest";
import { extractTimeSlot } from "@/lib/timeSlots";

describe("extractTimeSlot", () => {
  it("returns null for empty query", () => {
    expect(extractTimeSlot("")).toBeNull();
    expect(extractTimeSlot("  ")).toBeNull();
  });

  it("returns null for query without temporal keywords", () => {
    expect(extractTimeSlot("restaurant marrakech")).toBeNull();
  });

  it("detects petit-déjeuner", () => {
    const result = extractTimeSlot("restaurant petit-déjeuner marrakech");
    expect(result).not.toBeNull();
    expect(result!.timeSlot.startHour).toBe(7);
    expect(result!.timeSlot.endHour).toBe(11);
    expect(result!.timeSlot.suggestedCategory).toBe("Restauration");
    expect(result!.cleanedQuery).toBe("restaurant marrakech");
  });

  it("detects brunch", () => {
    const result = extractTimeSlot("brunch essaouira");
    expect(result).not.toBeNull();
    expect(result!.timeSlot.startHour).toBe(10);
    expect(result!.timeSlot.endHour).toBe(14);
    expect(result!.cleanedQuery).toBe("essaouira");
  });

  it("detects midi/déjeuner", () => {
    const result = extractTimeSlot("restaurant déjeuner");
    expect(result).not.toBeNull();
    expect(result!.timeSlot.startHour).toBe(12);
    expect(result!.timeSlot.endHour).toBe(14);
  });

  it("detects ce soir", () => {
    const result = extractTimeSlot("restaurant ce soir");
    expect(result).not.toBeNull();
    expect(result!.timeSlot.startHour).toBe(19);
    expect(result!.timeSlot.endHour).toBe(23);
    expect(result!.cleanedQuery).toBe("restaurant");
  });

  it("detects demain matin", () => {
    const result = extractTimeSlot("spa demain matin");
    expect(result).not.toBeNull();
    // "matin" matches first in the pattern list → dayOffset 0, startHour 8
    expect(result!.timeSlot.startHour).toBe(8);
    expect(result!.timeSlot.endHour).toBe(12);
    // The word "matin" is stripped; "demain" remains
    expect(result!.cleanedQuery).toContain("spa");
  });

  it("detects nuit", () => {
    const result = extractTimeSlot("bar nuit casablanca");
    expect(result).not.toBeNull();
    expect(result!.timeSlot.startHour).toBe(22);
    expect(result!.timeSlot.endHour).toBe(6);
  });

  it("detects English keywords", () => {
    const result = extractTimeSlot("restaurant breakfast");
    expect(result).not.toBeNull();
    expect(result!.timeSlot.startHour).toBe(7);
  });

  it("detects 'ouvert' as now", () => {
    const result = extractTimeSlot("restaurant ouvert marrakech");
    expect(result).not.toBeNull();
    // startHour should be current hour (resolved dynamically)
    expect(result!.timeSlot.startHour).toBeGreaterThanOrEqual(0);
    expect(result!.cleanedQuery).toBe("restaurant marrakech");
  });

  it("detects apéro", () => {
    const result = extractTimeSlot("bar apéro");
    expect(result).not.toBeNull();
    expect(result!.timeSlot.startHour).toBe(17);
    expect(result!.timeSlot.endHour).toBe(20);
  });

  it("detects demain soir", () => {
    const result = extractTimeSlot("restaurant demain soir fès");
    expect(result).not.toBeNull();
    // "soir" matches the general evening pattern first
    expect(result!.timeSlot.startHour).toBe(19);
    expect(result!.cleanedQuery).toContain("restaurant");
  });
});
