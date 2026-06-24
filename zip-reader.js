const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

function asUint8Array(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw new TypeError('Unsupported ZIP input');
}

function decodeFilename(bytes, utf8 = true) {
  try {
    return new TextDecoder(utf8 ? 'utf-8' : 'windows-1252').decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('เบราว์เซอร์นี้ไม่รองรับ DecompressionStream กรุณาใช้ Chrome หรือ Edge รุ่นใหม่');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export class ZipArchive {
  constructor(input) {
    this.bytes = asUint8Array(input);
    this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
    this.entries = this.#readCentralDirectory();
  }

  #u16(offset) {
    return this.view.getUint16(offset, true);
  }

  #u32(offset) {
    return this.view.getUint32(offset, true);
  }

  #findEocd() {
    const minimum = Math.max(0, this.bytes.length - 0xffff - 22);
    for (let offset = this.bytes.length - 22; offset >= minimum; offset -= 1) {
      if (this.#u32(offset) === SIG_EOCD) return offset;
    }
    throw new Error('ไม่พบ End of Central Directory: ไฟล์อาจไม่ใช่ ZIP หรือเสียหาย');
  }

  #readCentralDirectory() {
    const eocd = this.#findEocd();
    const totalEntries = this.#u16(eocd + 10);
    const directoryOffset = this.#u32(eocd + 16);
    const entries = new Map();
    let cursor = directoryOffset;

    for (let i = 0; i < totalEntries; i += 1) {
      if (this.#u32(cursor) !== SIG_CENTRAL) {
        throw new Error(`โครงสร้าง ZIP ผิดปกติที่รายการ ${i + 1}`);
      }
      const flags = this.#u16(cursor + 8);
      const method = this.#u16(cursor + 10);
      const compressedSize = this.#u32(cursor + 20);
      const uncompressedSize = this.#u32(cursor + 24);
      const nameLength = this.#u16(cursor + 28);
      const extraLength = this.#u16(cursor + 30);
      const commentLength = this.#u16(cursor + 32);
      const localOffset = this.#u32(cursor + 42);
      const nameBytes = this.bytes.slice(cursor + 46, cursor + 46 + nameLength);
      const name = decodeFilename(nameBytes, Boolean(flags & 0x0800));
      entries.set(name, {
        name,
        flags,
        method,
        compressedSize,
        uncompressedSize,
        localOffset,
        isDirectory: name.endsWith('/'),
      });
      cursor += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
  }

  list() {
    return [...this.entries.values()];
  }

  find(predicate) {
    return this.list().find(predicate) || null;
  }

  async read(name, output = 'uint8array') {
    const entry = this.entries.get(name);
    if (!entry) throw new Error(`ไม่พบไฟล์ ${name} ใน ZIP`);
    if (entry.isDirectory) return new Uint8Array();
    if (entry.flags & 0x0001) throw new Error(`ไฟล์ ${name} ถูกเข้ารหัสและยังไม่รองรับ`);

    const offset = entry.localOffset;
    if (this.#u32(offset) !== SIG_LOCAL) throw new Error(`Local header ของ ${name} ไม่ถูกต้อง`);
    const nameLength = this.#u16(offset + 26);
    const extraLength = this.#u16(offset + 28);
    const dataOffset = offset + 30 + nameLength + extraLength;
    const compressed = this.bytes.slice(dataOffset, dataOffset + entry.compressedSize);

    let data;
    if (entry.method === 0) data = compressed;
    else if (entry.method === 8) data = await inflateRaw(compressed);
    else throw new Error(`ZIP compression method ${entry.method} ยังไม่รองรับ (${name})`);

    if (output === 'text') return new TextDecoder('utf-8').decode(data);
    if (output === 'arraybuffer') return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    return data;
  }
}

export async function readZipFile(file) {
  return new ZipArchive(await file.arrayBuffer());
}
