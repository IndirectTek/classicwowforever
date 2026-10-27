import { describe, expect, it } from "vitest";
import { WaitlistInput } from "./waitlist";

describe("WaitlistInput", () => {
  it("trims and lowercases the email", () => {
    const result = WaitlistInput.parse({ email: "  Thrall@Orgrimmar.Example " });
    expect(result.email).toBe("thrall@orgrimmar.example");
  });

  it("rejects something that isn't an email", () => {
    const result = WaitlistInput.safeParse({ email: "not an email" });
    expect(result.success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    const result = WaitlistInput.safeParse({ email: "a@b.example", website: "spam.example" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["website"]);
  });

  it("accepts an empty honeypot", () => {
    expect(WaitlistInput.safeParse({ email: "a@b.example", website: "" }).success).toBe(true);
  });
});
