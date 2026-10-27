// Shared setup for generated link-preview images (next/og). Satori, which
// renders them, needs TTF fonts read from disk rather than next/font.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const ogSize = { width: 1200, height: 630 };

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));

export async function ogFonts() {
  const [cinzel, inter, interSemiBold] = await Promise.all([
    font("Cinzel-Bold.ttf"),
    font("Inter-Regular.ttf"),
    font("Inter-SemiBold.ttf"),
  ]);
  return [
    { name: "Cinzel", data: cinzel, weight: 700 as const, style: "normal" as const },
    { name: "Inter", data: inter, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: interSemiBold, weight: 600 as const, style: "normal" as const },
  ];
}
