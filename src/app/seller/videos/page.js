import { requirePerm } from "@/lib/auth";
import { all } from "@/lib/db";
import { VISIBLE_SQL } from "@/lib/catalog";
import { MAX_LIVE, LINE_MAX, RATIO, RATIO_LABEL, RATIO_TOL, RATIO_HINT } from "@/lib/styleVideos";
import { toggleLive, moveVideo, saveVideo, deleteVideo } from "./actions";
import VideoForm from "./VideoForm";
import Confirm from "./Confirm";
import "./videos.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Style videos – Seller Panel" };

// Home page ke "Watch The Style Story" ki videos. Price, MRP aur % off product se live aate hain.
export default async function StyleVideos({ searchParams }) {
  await requirePerm("products");
  const sp = await searchParams;
  const list = all(
    `SELECT v.*, p.name AS pname, p.status AS pstatus, p.stock AS pstock, (p.id IS NOT NULL) AS has_p
     FROM style_videos v LEFT JOIN products p ON p.id = v.product_id ORDER BY v.position, v.id`
  );
  const ids = [...new Set(list.map((v) => v.product_id))];
  const visible = new Set(ids.length ? all(`SELECT id FROM products WHERE id IN (${ids.map(() => "?").join(",")}) AND ${VISIBLE_SQL}`, ...ids).map((r) => r.id) : []);
  const products = all("SELECT id, name FROM products WHERE status = 'Active' ORDER BY name LIMIT 500");
  const liveCount = list.filter((v) => v.live).length;

  // Live hai par home page par kyun nahi dikh raha
  const skipReason = (v) => {
    if (!v.live) return "";
    if (!v.has_p) return "the product was deleted";
    if (v.pstatus !== "Active") return "the product is hidden";
    if (!(v.pstock > 0)) return "the product is out of stock";
    if (!visible.has(v.product_id)) return "the product's category is hidden";
    return "";
  };
  const showing = list.filter((v) => v.live && !skipReason(v)).length;

  return (
    <>
      <h2 style={{ marginBottom: 4 }}>Style videos</h2>
      <p className="mut" style={{ margin: "0 0 14px" }}>Videos shown in “Watch The Style Story” on the home page. Show 4 to {MAX_LIVE} at a time. Live now: {liveCount} of {MAX_LIVE}{showing !== liveCount ? ` (${showing} showing)` : ""}.</p>
      {sp.err && <p className="err" role="alert">{sp.err}</p>}
      {sp.ok && <p className="vd-ok" role="status">{sp.ok}</p>}

      <div className="vd-grid" style={{ "--vd-ar": `${RATIO.w} / ${RATIO.h}` }}>
        <div>
          {list.length === 0 ? <div className="card pad"><p className="mut" style={{ margin: 0 }}>No videos yet. Add your first one on the right.</p></div> : (
            <div className="card tw">
              <table>
                <thead><tr><th>#</th><th>Video</th><th>Caption lines</th><th>Linked product</th><th>Live</th><th></th></tr></thead>
                <tbody>
                  {list.map((v, i) => {
                    const why = skipReason(v);
                    return (
                      <tr key={v.id}>
                        <td className="mut">{i + 1}</td>
                        <td>{v.poster ? <img className="vd-thumb" src={v.poster} alt="" loading="lazy" /> : <span className="vd-thumb" />}</td>
                        <td style={{ wordBreak: "break-word" }}>
                          <b>{v.line1}</b>{v.line2 ? <><br />{v.line2}</> : null}
                          <br /><small className="mut">{v.duration || "?"} s · {v.bytes ? (v.bytes / 1048576).toFixed(1) : "?"} MB</small>
                          <details className="vd-d"><summary>Preview</summary><video src={v.file} poster={v.poster || undefined} controls playsInline preload="none" /></details>
                          <details className="vd-d"><summary>Edit</summary>
                            <form action={saveVideo} className="vd-edit">
                              <input type="hidden" name="id" value={v.id} />
                              <label>Caption line 1<input name="line1" defaultValue={v.line1} maxLength={LINE_MAX} required /></label>
                              <label>Caption line 2<input name="line2" defaultValue={v.line2} maxLength={LINE_MAX} /></label>
                              <label>Linked product
                                <select name="product_id" defaultValue={v.product_id}>
                                  {!products.some((p) => p.id === v.product_id) && <option value={v.product_id}>{v.pname || "(deleted product)"}</option>}
                                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              </label>
                              <button className="btn a s">Save changes</button>
                            </form>
                          </details>
                        </td>
                        <td>{v.pname || <span className="mut">(deleted)</span>}{why && <><br /><span className="tag y" style={{ whiteSpace: "normal" }}>Not shown: {why}</span></>}</td>
                        <td>
                          <form action={toggleLive}><input type="hidden" name="id" value={v.id} />
                            <button className={"vd-sw" + (v.live ? " on" : "")} aria-label={v.live ? "Turn off" : "Turn on"} aria-pressed={!!v.live}><i /></button>
                          </form>
                        </td>
                        <td>
                          <div className="vd-acts">
                            <form action={moveVideo}><input type="hidden" name="id" value={v.id} /><input type="hidden" name="dir" value="up" /><button className="btn o s" disabled={i === 0} aria-label="Move up">↑</button></form>
                            <form action={moveVideo}><input type="hidden" name="id" value={v.id} /><input type="hidden" name="dir" value="down" /><button className="btn o s" disabled={i === list.length - 1} aria-label="Move down">↓</button></form>
                            <form action={deleteVideo}><input type="hidden" name="id" value={v.id} /><Confirm className="btn r s" message="Delete this video? The file will be removed.">Delete</Confirm></form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <VideoForm products={products} ratio={{ w: RATIO.w, h: RATIO.h, label: RATIO_LABEL, tol: RATIO_TOL, hint: RATIO_HINT }} />
          <div className="vd-info">Videos should be {RATIO_LABEL} (width : height){RATIO_HINT ? ", " + RATIO_HINT.replace(/^For e/, "e").replace(/\.$/, "") : ""}, so they fit the cards on the home page without cropping. Price, MRP and % off are read live from the linked product, so they never go out of date. If the product is out of stock or hidden, its video is skipped on the home page automatically.</div>
        </div>
      </div>
    </>
  );
}
