import { describe, it, expect } from "vitest";
import { maidTypeLabel } from "@/lib/maid-type-label";

describe("maidTypeLabel", () => {
  it("shows the people-friendly label for each stored maid type", () => {
    expect(maidTypeLabel("NEW")).toBe("New Maid");
    expect(maidTypeLabel("TRANSFER")).toBe("Transfer Maid");
    expect(maidTypeLabel("EX_SINGAPORE")).toBe("Ex-Singapore Maid");
    expect(maidTypeLabel("EX_OTHERS")).toBe("Ex-Others Maid");
  });

  it("returns null when no maid type is set, and passes an unknown value through", () => {
    expect(maidTypeLabel(null)).toBeNull();
    expect(maidTypeLabel(undefined)).toBeNull();
    expect(maidTypeLabel("")).toBeNull();
    expect(maidTypeLabel("SOMETHING_ELSE")).toBe("SOMETHING_ELSE");
  });
});
