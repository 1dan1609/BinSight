import { describe, expect, it } from "vitest";
import { calculateHashes } from "../../src/parser/hashCalculator";

describe("calculateHashes", () => {
  it("matches known reference hashes for the ASCII string 'abc'", async () => {
    const bytes = new TextEncoder().encode("abc");
    const hashes = await calculateHashes(bytes);

    expect(hashes.md5).toBe("900150983cd24fb0d6963f7d28e17f72");
    expect(hashes.sha1).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
    expect(hashes.sha256).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("hashes a Uint8Array view over a larger backing buffer correctly (not the whole buffer)", async () => {
    const backing = new Uint8Array([0xff, 0xff, ...new TextEncoder().encode("abc"), 0xff, 0xff]);
    const view = backing.subarray(2, 5);
    const hashes = await calculateHashes(view);

    expect(hashes.md5).toBe("900150983cd24fb0d6963f7d28e17f72");
  });
});
