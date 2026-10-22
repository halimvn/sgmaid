import { describe, it, expect } from "vitest";
import { parseCreateClientForm } from "@/lib/validation/client";

/**
 * Create Client Access collects only a client name, username and password (typed twice).
 * Pure tests, no DB.
 */
function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const VALID = { username: "ahmadtan", password: "a-long-enough-pass", confirmPassword: "a-long-enough-pass" };

describe("parseCreateClientForm", () => {
  it("accepts just a username and password", () => {
    const r = parseCreateClientForm(form(VALID));
    expect(r.success).toBe(true);
    if (r.success) expect(Object.keys(r.data).sort()).toEqual(["confirmPassword", "password", "username"]);
  });

  it("a client name is not collected — one that is submitted is ignored", () => {
    const r = parseCreateClientForm(form({ ...VALID, fullName: "Ahmad Tan" }));
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).not.toHaveProperty("fullName");
  });

  it("ignores a mobile number or email even if one is submitted — they are not collected", () => {
    const r = parseCreateClientForm(form({ ...VALID, mobileNumber: "+65 9123 4567", email: "not-an-email" }));
    expect(r.success).toBe(true); // an invalid email no longer blocks creation
    if (r.success) {
      expect(r.data).not.toHaveProperty("mobileNumber");
      expect(r.data).not.toHaveProperty("email");
    }
  });

  it("still requires a username and password, and matching passwords", () => {
    expect(parseCreateClientForm(form({ ...VALID, username: "" })).success).toBe(false);
    expect(parseCreateClientForm(form({ ...VALID, password: "", confirmPassword: "" })).success).toBe(false);
    expect(parseCreateClientForm(form({ ...VALID, confirmPassword: "something-else-entirely" })).success).toBe(false);
  });
});
