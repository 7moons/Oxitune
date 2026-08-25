import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createRgbaPng(width: number, height: number): Buffer {
  const rawData: number[] = [];
  
  for (let y = 0; y < height; y++) {
    rawData.push(0); // Filter byte: None
    for (let x = 0; x < width; x++) {
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const radius = width * 0.45;
      const innerRadius = width * 0.22;
      
      if (dist <= radius && dist >= innerRadius) {
        // Red ring (YouTube Music style)
        rawData.push(235, 30, 40, 255);
      } else if (dist < innerRadius) {
        // Play triangle
        const nx = (x - cx) / innerRadius;
        const ny = (y - cy) / innerRadius;
        if (nx >= -0.3 && nx <= 0.5 && Math.abs(ny) <= (0.5 - nx * 0.5)) {
          rawData.push(255, 255, 255, 255); // White play icon
        } else {
          rawData.push(235, 30, 40, 255); // Red center
        }
      } else if (dist <= radius + 1) {
        // Antialiased edge
        rawData.push(235, 30, 40, 120);
      } else {
        // Transparent background
        rawData.push(0, 0, 0, 0);
      }
    }
  }

  const deflated = zlib.deflateSync(Buffer.from(rawData));
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk (Color Type 6 = RGBA)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth: 8
  ihdr[9] = 6; // color type: 6 (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (-(c & 1) & 0xedb88320);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve('src-tauri/icons');
const icon32 = createRgbaPng(32, 32);
const icon128 = createRgbaPng(128, 128);
const icon512 = createRgbaPng(512, 512);

fs.writeFileSync(path.join(iconsDir, '32x32.png'), icon32);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), icon128);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), icon512);
fs.writeFileSync(path.join(iconsDir, 'icon.png'), icon512);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icon32);
console.log('RGBA icons generated successfully.');
