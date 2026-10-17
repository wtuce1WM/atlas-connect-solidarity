import { describe, expect, it } from "vitest";
import { resolveShowcaseGroupLayout } from "@/components/showcase/groupLayout";

describe("showcase group layout", () => {
  it("defaults existing showcases to carousel", () => {
    expect(resolveShowcaseGroupLayout(undefined)).toBe("carousel");
    expect(resolveShowcaseGroupLayout(null)).toBe("carousel");
  });
  it("preserves the stacking cards choice", () => {
    expect(resolveShowcaseGroupLayout("stacking_cards")).toBe("stacking_cards");
  });
});