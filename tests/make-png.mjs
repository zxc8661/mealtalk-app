import { crc32, deflateSync } from 'node:zlib';

function chunk(type, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), body])), 0);
  return Buffer.concat([head, body, crc]);
}

/**
 * Builds a real RGB PNG of the requested size.
 *
 * The photo pipeline decodes actual bytes and resizes by real dimensions, so a
 * fixture has to be a genuine image of a genuine size; a stub byte string would
 * only prove that the code runs, not that a large photo is bounded.
 */
export function makePng(width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour RGB
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y += 1) {
    const row = y * (1 + width * 3);
    raw[row] = 0; // no filter
    for (let x = 0; x < width; x += 1) {
      const pixel = row + 1 + x * 3;
      raw[pixel] = (x * 255) / width;
      raw[pixel + 1] = (y * 255) / height;
      raw[pixel + 2] = 128;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
