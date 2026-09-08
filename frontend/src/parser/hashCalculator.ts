import SparkMD5 from "spark-md5";
import type { Hashes } from "@pe-analyzer/shared-types";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * MD5 via spark-md5 (SubtleCrypto has no MD5 support); SHA1/SHA256 via the
 * platform's Web Crypto API, available in both the main thread and workers.
 */
export async function calculateHashes(bytes: Uint8Array): Promise<Hashes> {
  const ownedBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const md5 = SparkMD5.ArrayBuffer.hash(ownedBuffer);
  const [sha1Buf, sha256Buf] = await Promise.all([
    crypto.subtle.digest("SHA-1", ownedBuffer),
    crypto.subtle.digest("SHA-256", ownedBuffer),
  ]);

  return {
    md5,
    sha1: toHex(sha1Buf),
    sha256: toHex(sha256Buf),
  };
}
