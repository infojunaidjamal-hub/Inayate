// MP4 file ki jaanch bina ffmpeg ke: sach mein MP4 hai ya nahi, kitne second ka hai, aur seedha (vertical) hai ya nahi.
// Phone ki video aksar "rotation" ke saath aati hai (width/height landscape, par dikhti portrait), isliye matrix bhi dekhte hain.
export function mp4Info(buf) {
  if (!buf || buf.length < 16 || buf.toString("latin1", 4, 8) !== "ftyp") return null;
  const boxes = (start, end) => {
    const out = [];
    let o = start;
    while (o + 8 <= end) {
      let size = buf.readUInt32BE(o), hdr = 8;
      const type = buf.toString("latin1", o + 4, o + 8);
      if (size === 1) { if (o + 16 > end) break; size = Number(buf.readBigUInt64BE(o + 8)); hdr = 16; }
      else if (size === 0) size = end - o;
      if (size < hdr || o + size > end) break;
      out.push({ type, start: o + hdr, end: o + size });
      o += size;
    }
    return out;
  };
  const moov = boxes(0, buf.length).find((b) => b.type === "moov");
  if (!moov) return null;
  const inMoov = boxes(moov.start, moov.end);

  const mvhd = inMoov.find((b) => b.type === "mvhd");
  if (!mvhd) return null;
  let seconds = 0;
  try {
    const v1 = buf[mvhd.start] === 1;
    const timescale = buf.readUInt32BE(mvhd.start + (v1 ? 20 : 12));
    const duration = v1 ? Number(buf.readBigUInt64BE(mvhd.start + 24)) : buf.readUInt32BE(mvhd.start + 16);
    seconds = timescale ? duration / timescale : 0;
  } catch { return null; }

  // pehla video track: width / height (rotation ke baad)
  let width = 0, height = 0;
  for (const trak of inMoov.filter((b) => b.type === "trak")) {
    const kids = boxes(trak.start, trak.end);
    const tkhd = kids.find((b) => b.type === "tkhd");
    if (!tkhd) continue;
    const mdia = kids.find((b) => b.type === "mdia");
    const hdlr = mdia && boxes(mdia.start, mdia.end).find((b) => b.type === "hdlr");
    const handler = hdlr ? buf.toString("latin1", hdlr.start + 8, hdlr.start + 12) : "";
    if (handler && handler !== "vide") continue;
    try {
      const v1 = buf[tkhd.start] === 1;
      const m = tkhd.start + (v1 ? 52 : 40); // matrix yahan se shuru
      const a = buf.readInt32BE(m), b = buf.readInt32BE(m + 4);
      let w = buf.readUInt32BE(m + 36) / 65536, h = buf.readUInt32BE(m + 40) / 65536;
      if (Math.abs(a) < Math.abs(b)) [w, h] = [h, w]; // 90 ya 270 degree ghumi hui
      if (w > 0 && h > 0) { width = w; height = h; break; }
    } catch { /* agla track */ }
  }
  return { seconds, width, height };
}
