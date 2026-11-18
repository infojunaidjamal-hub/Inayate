// Orders list ke liye: har order ke items + chhoti photo (variant ki photo ho to wo, nahi to product ki cover). Server only.
import { all } from "@/lib/db";

// { [order_id]: [{ name, qty, image, colour_main, colour_dark, product_id }] }
export function itemsByOrder(orderIds) {
  if (!orderIds.length) return {};
  const cover = "(SELECT url FROM product_images WHERE product_id = oi.product_id ORDER BY position, id LIMIT 1)";
  const image = `COALESCE((SELECT pv.image FROM product_variants pv WHERE pv.id = oi.variant_id AND pv.image IS NOT NULL AND pv.image <> ''), ${cover})`;
  const rows = all(
    `SELECT oi.id AS item_id, oi.order_id, oi.name, oi.qty, oi.price, oi.variant_label, oi.product_id, p.colour_main, p.colour_dark, ${image} AS image
     FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id IN (${orderIds.map(() => "?").join(",")}) ORDER BY oi.id`,
    ...orderIds
  );
  const out = {};
  for (const r of rows) (out[r.order_id] ||= []).push(r);
  return out;
}
