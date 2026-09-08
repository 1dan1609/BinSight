export class PEParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PEParseError";
  }
}

/**
 * Bounds-checked view over a PE file's bytes. Every other parser module reads
 * exclusively through this — a malformed/adversarial offset produces a typed
 * PEParseError instead of a crash or an out-of-bounds read returning garbage.
 */
export class SafeReader {
  private readonly view: DataView;
  readonly length: number;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
    this.length = buffer.byteLength;
  }

  private checkBounds(offset: number, size: number): void {
    if (offset < 0 || size < 0 || !Number.isFinite(offset)) {
      throw new PEParseError(`Invalid read offset ${offset}`);
    }
    if (offset + size > this.length) {
      throw new PEParseError(
        `Read out of bounds: offset=${offset} size=${size} length=${this.length}`,
      );
    }
  }

  u8(offset: number): number {
    this.checkBounds(offset, 1);
    return this.view.getUint8(offset);
  }

  u16(offset: number): number {
    this.checkBounds(offset, 2);
    return this.view.getUint16(offset, true);
  }

  u32(offset: number): number {
    this.checkBounds(offset, 4);
    return this.view.getUint32(offset, true);
  }

  /** Reads a 64-bit unsigned value as a JS number. Precision loss above 2^53 is acceptable here. */
  u64(offset: number): number {
    this.checkBounds(offset, 8);
    const low = this.view.getUint32(offset, true);
    const high = this.view.getUint32(offset + 4, true);
    return high * 2 ** 32 + low;
  }

  bytes(offset: number, size: number): Uint8Array {
    this.checkBounds(offset, size);
    return new Uint8Array(this.view.buffer, offset, size);
  }

  inBounds(offset: number, size = 0): boolean {
    return offset >= 0 && size >= 0 && offset + size <= this.length;
  }

  /** Reads a fixed-length, null-padded ASCII field (e.g. section names). */
  fixedAscii(offset: number, size: number): string {
    const raw = this.bytes(offset, size);
    let end = raw.length;
    while (end > 0 && raw[end - 1] === 0) end--;
    return Array.from(raw.subarray(0, end))
      .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : "."))
      .join("");
  }

  /** Reads a null-terminated ASCII string, capped at maxLength to bound adversarial input. */
  cString(offset: number, maxLength = 260): string {
    if (!this.inBounds(offset)) {
      throw new PEParseError(`cString offset out of bounds: ${offset}`);
    }
    let end = offset;
    const limit = Math.min(this.length, offset + maxLength);
    while (end < limit && this.view.getUint8(end) !== 0) {
      end++;
    }
    const raw = this.bytes(offset, end - offset);
    return Array.from(raw)
      .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : "."))
      .join("");
  }
}
