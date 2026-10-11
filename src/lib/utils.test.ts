import { describe, expect, it } from "vitest";
import { computeStreak, formatBytes, dayKey, pluralize, normalizeText } from "@/lib/utils";

describe("formatBytes", () => {
  it("formate les tailles courantes", () => {
    expect(formatBytes(0)).toBe("0 o");
    expect(formatBytes(1024)).toBe("1.0 Ko");
    expect(formatBytes(1024 * 1024 * 3)).toBe("3.0 Mo");
  });

  it("gère les valeurs invalides", () => {
    expect(formatBytes(Number.NaN)).toBe("0 o");
    expect(formatBytes(-10)).toBe("0 o");
  });
});

describe("computeStreak", () => {
  const DAY = 24 * 60 * 60 * 1000;

  it("renvoie 0 sans activité", () => {
    expect(computeStreak([])).toBe(0);
  });

  it("compte les jours consécutifs", () => {
    const now = Date.now();
    expect(computeStreak([now, now - DAY, now - 2 * DAY], now)).toBe(3);
  });

  it("tolère l'absence d'activité aujourd'hui", () => {
    const now = Date.now();
    expect(computeStreak([now - DAY, now - 2 * DAY], now)).toBe(2);
  });

  it("s'arrête à la première coupure", () => {
    const now = Date.now();
    expect(computeStreak([now, now - 3 * DAY], now)).toBe(1);
  });

  it("ne compte pas deux fois le même jour", () => {
    const now = Date.now();
    expect(computeStreak([now, now - 1000, now - 2000], now)).toBe(1);
  });
});

describe("dayKey", () => {
  it("produit une clé stable par jour", () => {
    const timestamp = new Date(2026, 2, 12, 15, 30).getTime();
    expect(dayKey(timestamp)).toBe("2026-03-12");
  });
});

describe("normalizeText", () => {
  it("retire les accents et la casse", () => {
    expect(normalizeText("Ingrédients ÉTÉ")).toBe("ingredients ete");
  });
});

describe("pluralize", () => {
  it("choisit le bon nombre", () => {
    expect(pluralize(1, "image", "images")).toBe("1 image");
    expect(pluralize(3, "image", "images")).toBe("3 images");
  });
});
