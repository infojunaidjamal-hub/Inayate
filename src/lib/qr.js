// QR code banane wala (byte mode, error level M, version 1 se 10). Koi package nahi chahiye.
const EC = { // version: [ec codewords per block, [[blocks, data codewords per block], ...]]
  1: [10, [[1, 16]]], 2: [16, [[1, 28]]], 3: [26, [[1, 44]]], 4: [18, [[2, 32]]], 5: [24, [[2, 43]]],
  6: [16, [[4, 27]]], 7: [18, [[4, 31]]], 8: [22, [[2, 38], [2, 39]]], 9: [22, [[3, 36], [2, 37]]], 10: [26, [[4, 43], [1, 44]]],
};
const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };

function gfMul(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z; }
function rsDivisor(deg) {
  const r = Array(deg - 1).fill(0).concat([1]); let root = 1;
  for (let i = 0; i < deg; i++) { for (let j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = gfMul(root, 2); }
  return r;
}
function rsRemainder(data, div) {
  const r = Array(div.length).fill(0);
  for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= gfMul(c, f); }); }
  return r;
}
const dataCap = (v) => EC[v][1].reduce((s, [n, d]) => s + n * d, 0);

function encode(bytes) {
  let v = 1;
  for (; v <= 10; v++) { const cc = v < 10 ? 8 : 16; if (4 + cc + bytes.length * 8 <= dataCap(v) * 8) break; }
  if (v > 10) throw new Error("QR ke liye text bahut lamba hai");
  const bits = [];
  const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach((b) => put(b, 8));
  const cap = dataCap(v) * 8;
  put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
  const cw = []; for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let p = 0xec; cw.length < dataCap(v); p ^= 0xec ^ 0x11) cw.push(p);
  // blocks + error correction + interleave
  const [ecLen, groups] = EC[v], div = rsDivisor(ecLen), blocks = []; let pos = 0;
  for (const [n, d] of groups) for (let i = 0; i < n; i++) { const data = cw.slice(pos, pos + d); pos += d; blocks.push({ data, ec: rsRemainder(data, div) }); }
  const out = [], maxD = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxD; i++) blocks.forEach((b) => { if (i < b.data.length) out.push(b.data[i]); });
  for (let i = 0; i < ecLen; i++) blocks.forEach((b) => out.push(b.ec[i]));
  return { v, out };
}

const MASKS = [
  (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function penalty(m, size) {
  let p = 0;
  const line = (get) => {
    for (let a = 0; a < size; a++) {
      let run = 1;
      for (let b = 1; b <= size; b++) {
        if (b < size && get(a, b) === get(a, b - 1)) run++; else { if (run >= 5) p += 3 + run - 5; run = 1; }
      }
      let s = ""; for (let b = 0; b < size; b++) s += get(a, b) ? "1" : "0";
      for (const pat of ["10111010000", "00001011101"]) { let i = -1; while ((i = s.indexOf(pat, i + 1)) >= 0) p += 40; }
    }
  };
  line((a, b) => m[a][b]); line((a, b) => m[b][a]);
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3; }
  let dark = 0; for (const r of m) for (const c of r) if (c) dark++;
  const total = size * size; p += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  return p;
}

export function qrMatrix(text) {
  const { v, out } = encode(Array.from(new TextEncoder().encode(text)));
  const size = 17 + 4 * v;
  const m = Array.from({ length: size }, () => Array(size).fill(false));
  const fn = Array.from({ length: size }, () => Array(size).fill(false));
  const set = (x, y, d) => { if (x >= 0 && y >= 0 && x < size && y < size) { m[y][x] = d; fn[y][x] = true; } };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]])
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)); set(cx + dx, cy + dy, d !== 2 && d !== 4); }
  const al = ALIGN[v];
  for (let i = 0; i < al.length; i++) for (let j = 0; j < al.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  const bit = (n, i) => ((n >>> i) & 1) !== 0;
  const format = (mask) => {
    const data = (0 << 3) | mask; // error level M = 00
    let rem = data; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) set(8, i, bit(bits, i));
    set(8, 7, bit(bits, 6)); set(8, 8, bit(bits, 7)); set(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(bits, i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(bits, i));
    set(8, size - 8, true);
  };
  format(0);
  if (v >= 7) {
    let rem = v; for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (v << 12) | rem;
    for (let i = 0; i < 18; i++) { const a = size - 11 + (i % 3), b = Math.floor(i / 3); set(a, b, bit(bits, i)); set(b, a, bit(bits, i)); }
  }
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
      if (!fn[y][x] && i < out.length * 8) { m[y][x] = bit(out[i >>> 3], 7 - (i & 7)); i++; }
    }
  }
  const apply = (k) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[k](x, y)) m[y][x] = !m[y][x]; };
  let best = 0, bestP = Infinity;
  for (let k = 0; k < 8; k++) { apply(k); format(k); const p = penalty(m, size); if (p < bestP) { bestP = p; best = k; } apply(k); }
  apply(best); format(best);
  return m;
}

// SVG string: safed background (dark mode mein bhi scan ho), kaale dibbe
export function qrSvg(text, { margin = 4, label = "QR code" } = {}) {
  const m = qrMatrix(text), n = m.length + margin * 2;
  let d = "";
  m.forEach((row, y) => row.forEach((c, x) => { if (c) d += `M${x + margin},${y + margin}h1v1h-1z`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" role="img" aria-label="${label}" shape-rendering="crispEdges" style="width:100%;height:auto;display:block"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
