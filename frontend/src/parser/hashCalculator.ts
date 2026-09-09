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
export async function calculateHashes(bytes: Uint8Array<ArrayBuffer>): Promise<Hashes> {
  // SubtleCrypto accepts a view directly, so only SparkMD5 needs a standalone ArrayBuffer — and
  // when the view already spans its whole buffer (the normal case: a Uint8Array over the file)
  // even that copy is avoidable. Copying unconditionally doubled peak memory on large files.
  const spansWholeBuffer =
    bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength;
  const md5Input = spansWholeBuffer
    ? bytes.buffer
    : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

  const md5 = SparkMD5.ArrayBuffer.hash(md5Input);
  const [sha1Buf, sha256Buf] = await Promise.all([
    crypto.subtle.digest("SHA-1", bytes),
    crypto.subtle.digest("SHA-256", bytes),
  ]);

  return {
    md5,
    sha1: toHex(sha1Buf),
    sha256: toHex(sha256Buf),
  };
}
