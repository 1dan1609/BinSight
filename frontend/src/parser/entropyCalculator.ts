/** Shannon entropy in bits/byte, range [0, 8]. Empty input has zero entropy. */
export function calculateShannonEntropy(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;

  const counts = new Uint32Array(256);
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) counts[byte]!++;
  }

  let entropy = 0;
  const total = bytes.length;
  for (const count of counts) {
    if (count === 0) continue;
    const p = count / total;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}
