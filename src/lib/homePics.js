// Home page ki photos: public/home folder mein photo rakhoge to wo apne aap dikhne lagegi.
// Photo na ho to sundar drawing dikhti hai. Naam bilkul sahi likhna (jpg, png ya webp chalega).
import fs from "node:fs";
import path from "node:path";

const EXT = ["jpg", "jpeg", "png", "webp", "avif"];

export function homePic(name) {
  for (const e of EXT) {
    if (fs.existsSync(path.join(process.cwd(), "public", "home", `${name}.${e}`))) {
      return `/home/${name}.${e}`;
    }
  }
  return null;
}

// "Tote Bags" -> "tote-bags"  (category photo ka naam: cat-tote-bags.jpg)
export const slug = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
