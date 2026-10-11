import { describe, expect, it } from "vitest";
import {
  hammingDistance,
  imagesAreSimilar,
  perceptualHash,
  sha256Hex,
  fnv1aHex,
} from "@/lib/hashing";

describe("sha256Hex", () => {
  it("est déterministe et diffère selon le contenu", async () => {
    const a = new File(["bonjour"], "a.txt", { type: "text/plain" });
    const b = new File(["bonjour"], "b.txt", { type: "text/plain" });
    const c = new File(["au revoir"], "c.txt", { type: "text/plain" });
    const [ha, hb, hc] = await Promise.all([sha256Hex(a), sha256Hex(b), sha256Hex(c)]);
    expect(ha).toBe(hb);
    expect(ha).not.toBe(hc);
    expect(ha).toHaveLength(64);
  });
});

describe("hammingDistance", () => {
  it("vaut 0 pour des empreintes identiques", () => {
    expect(hammingDistance("ffffffffffffffff", "ffffffffffffffff")).toBe(0);
  });

  it("compte les bits différents", () => {
    expect(hammingDistance("0000000000000000", "000000000000000f")).toBe(4);
  });

  it("renvoie l'infini pour des longueurs différentes", () => {
    expect(hammingDistance("abcd", "abcdef")).toBe(Number.POSITIVE_INFINITY);
  });

  it("classe deux empreintes proches comme similaires", () => {
    expect(imagesAreSimilar("ffffffffffffffff", "fffffffffffffffe")).toBe(true);
    expect(imagesAreSimilar("ffffffffffffffff", "0000000000000000")).toBe(false);
  });
});

describe("perceptualHash", () => {
  it("ne plante pas quand le canvas est indisponible (jsdom)", async () => {
    const file = new File(["x"], "x.png", { type: "image/png" });
    const hash = await perceptualHash(file);
    expect(typeof hash).toBe("string");
  });
});

describe("fnv1aHex", () => {
  it("produit une empreinte stable", () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    expect(fnv1aHex(bytes)).toBe(fnv1aHex(bytes));
    expect(fnv1aHex(bytes)).toContain("fnv-");
  });
});
