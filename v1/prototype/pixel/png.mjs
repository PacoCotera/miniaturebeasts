import { deflateSync } from 'node:zlib';

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  name.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return result;
}

// Indexed PNG output retains the authored palette, including the two-color study.
export function encodePng(frame, scale = 1) {
  if (!Number.isInteger(scale) || scale < 1 || scale > 8) {
    throw new RangeError('Scale must be an integer from 1 to 8');
  }
  const width = frame.width * scale;
  const height = frame.height * scale;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 3;
  const palette = Buffer.from(frame.palette.flatMap(color =>
    [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16))
  ));
  const scanlines = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      scanlines[y * (width + 1) + 1 + x] = frame.pixels[
        Math.floor(y / scale) * frame.width + Math.floor(x / scale)
      ];
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('PLTE', palette),
    chunk('IDAT', deflateSync(scanlines)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
