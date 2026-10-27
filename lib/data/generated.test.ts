// Files generated from data/ must stay in sync with it. After editing data
// files or lib/data/schema.ts, run `pnpm data:generate` to rewrite them.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { z } from "zod";
import { loadGameData } from "./load";
import { ZoneFile } from "./schema";
import { seedSql } from "./seedSql";

const root = process.cwd();

function inSync(file: string, contents: string) {
  const path = join(root, file);
  if (process.env.UPDATE_DATA) writeFileSync(path, contents);
  expect(readFileSync(path, "utf8"), `${file} is out of date; run pnpm data:generate`).toBe(
    contents,
  );
}

it("data/zone.schema.json matches lib/data/schema.ts (editor autocomplete)", () => {
  const schema = z.toJSONSchema(ZoneFile, { io: "input" });
  inSync("data/zone.schema.json", `${JSON.stringify(schema, null, 2)}\n`);
});

it("supabase/seed.sql matches the data files", () => {
  const { data, errors } = loadGameData(join(root, "data/zones"));
  expect(errors).toEqual([]);
  inSync("supabase/seed.sql", seedSql(data));
});
