import { describe, expect, it } from "vitest";
import { QuestReportInput, questId, sameQuestName } from "./reports";

const valid = {
  name: "The Lost Satchel",
  zone_id: "elwynn-forest",
  min_level: "5",
  max_level: "9",
  faction: "alliance",
  est_minutes: "",
  notes: "",
  game: "classic-era",
  seen_on: "2026-10-27",
  credit_name: "",
};

describe("QuestReportInput", () => {
  it("accepts a form post and turns blanks into nulls", () => {
    const report = QuestReportInput.parse(valid);
    expect(report).toMatchObject({ min_level: 5, max_level: 9, notes: null, credit_name: null });
    expect(report.est_minutes).toBeUndefined();
  });

  it("checks the level range", () => {
    const result = QuestReportInput.safeParse({ ...valid, min_level: "12", max_level: "9" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["max_level"]);
  });

  it("refuses an email as a public credit", () => {
    const result = QuestReportInput.safeParse({ ...valid, credit_name: "me@example.com" });
    expect(result.error?.issues[0].path).toEqual(["credit_name"]);
  });

  it("keeps notes within the data file limit", () => {
    expect(QuestReportInput.safeParse({ ...valid, notes: "x".repeat(301) }).success).toBe(false);
  });
});

describe("questId", () => {
  it("makes the data/ id from the zone and name", () => {
    expect(questId("elwynn-forest", "The Lost Satchel")).toBe("elwynn-forest-the-lost-satchel");
    expect(questId("westfall", "Westfall Stew")).toBe("westfall-westfall-stew");
  });

  it("drops apostrophes and accents", () => {
    expect(questId("dun-morogh", "Grelin's Report")).toBe("dun-morogh-grelins-report");
    expect(questId("durotar", "Vile Familiars — Part Two!")).toBe(
      "durotar-vile-familiars-part-two",
    );
    expect(questId("teldrassil", "Élune’s Tear")).toBe("teldrassil-elunes-tear");
  });
});

describe("sameQuestName", () => {
  it("ignores case, spacing and apostrophes", () => {
    expect(sameQuestName("Grelin's Report", "grelins  report")).toBe(true);
    expect(sameQuestName("Grelin's Report", "Grelin's Return")).toBe(false);
  });
});
