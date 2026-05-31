// Generates simple branded PWA icons (PNG) with no external dependencies,
// using Node's built-in zlib to encode raw RGBA pixels into a valid PNG.
// Design: deep navy background with a glowing accent "brain dot" cluster.
import zlib from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(size) {
  const bg = [15, 17, 21]; // #0f1115
  const accent = [108, 140, 255]; // #6c8cff
  const good = [62, 207, 142]; // #3ecf8e

  const raw = Buffer.alloc(size * (size * 4 + 1));
  const cx = size / 2;
  const cy = size / 2;
  // Three dots forming a little memory/brain cluster.
  const dots = [
    { x: cx, y: cy - size * 0.13, r: size * 0.13, c: accent },
    { x: cx - size * 0.16, y: cy + size * 0.12, r: size * 0.1, c: good },
    { x: cx + size * 0.16, y: cy + size * 0.12, r: size * 0.1, c: accent },
  ];

  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      let [r, g, b] = bg;
      for (const d of dots) {
        const dist = Math.hypot(x - d.x, y - d.y);
        const edge = d.r;
        if (dist < edge) {
          const t = Math.max(0, 1 - dist / edge); // soft glow
          const a = 0.35 + 0.65 * t;
          r = Math.round(r * (1 - a) + d.c[0] * a);
          g = Math.round(g * (1 - a) + d.c[1] * a);
          b = Math.round(b * (1 - a) + d.c[2] * a);
        }
      }
      const off = y * (size * 4 + 1) + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public", { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`public/icon-${size}.png`, makePng(size));
  console.log(`wrote public/icon-${size}.png`);
}
