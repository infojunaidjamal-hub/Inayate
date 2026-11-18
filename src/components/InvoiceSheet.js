import "./invoice.css";

const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = (d) => new Date(String(d).replace(" ", "T") + "Z").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

// GST invoice ya credit note ka ek A4 page.  doc = invoices / credit_notes ki row (data JSON parse hokar)
// kind: "invoice" | "credit".  order = orders row.  biz = business() settings.
export default function InvoiceSheet({ kind, doc, order, biz }) {
  const d = doc.data;
  const inter = d.type === "inter";
  const credit = kind === "credit";
  return (
    <section className="inv-sheet" aria-label={credit ? `Credit note ${doc.no}` : `Invoice ${doc.no}`}>
      <header className="inv-head">
        <div>
          <b className="inv-brand">{biz.legal || biz.name}</b>
          <div className="inv-sm">{biz.address}</div>
          <div className="inv-sm">GSTIN: {biz.gstin ? <b>{biz.gstin}</b> : <i>(not added yet)</i>} · State: {biz.state}</div>
          {(biz.email || biz.phone) && <div className="inv-sm">{[biz.email, biz.phone].filter(Boolean).join(" · ")}</div>}
        </div>
        <div className="inv-right">
          <b className="inv-title">{credit ? "CREDIT NOTE" : "TAX INVOICE"}</b>
          <div className="inv-sm">No: <b>{doc.no}</b></div>
          <div className="inv-sm">Date: {when(doc.issued_at)}</div>
          {credit && <div className="inv-sm">Against invoice: <b>{d.invoiceNo}</b></div>}
        </div>
      </header>

      <div className="inv-two">
        <div>
          <div className="inv-lab">Bill to / Ship to</div>
          <b>{d.buyer?.name || order.ship_name}</b>
          <div className="inv-sm">{d.buyer?.address || order.ship_address}</div>
          <div className="inv-sm">{d.buyer?.mobile || order.ship_mobile}</div>
        </div>
        <div>
          <div className="inv-lab">Order details</div>
          <div className="inv-sm">Order: <b>{order.order_no}</b></div>
          <div className="inv-sm">Order date: {when(order.created_at)}</div>
          <div className="inv-sm">Place of supply: {d.buyerState || "-"}{d.stateKnown === false ? " (not detected)" : ""}</div>
          <div className="inv-sm">Payment: {order.pay_method === "COD" ? "Cash on delivery" : "Online"}</div>
        </div>
      </div>

      <div className="inv-scroll">
        <table className="inv-tab">
          <thead>
            <tr>
              <th>#</th><th className="l">Item</th><th>HSN</th><th>Qty</th><th>Taxable</th>
              {inter ? <th>IGST</th> : <><th>CGST</th><th>SGST</th></>}
              <th>{credit ? "Credit" : "Amount"}</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((l, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td className="l">{l.name}{l.sku ? <div className="inv-sm">SKU {l.sku}</div> : null}</td>
                <td>{l.hsn || "-"}</td>
                <td>{l.qty}</td>
                <td>{money(l.taxable)}</td>
                {inter ? <td>{money(l.igst)}<div className="inv-sm">{l.rate}%</div></td> : <><td>{money(l.cgst)}<div className="inv-sm">{l.rate / 2}%</div></td><td>{money(l.sgst)}<div className="inv-sm">{l.rate / 2}%</div></td></>}
                <td>{money(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="inv-tot">
        {d.totals.discount > 0 && <div><span>Discount already applied</span><span>{money(d.totals.discount)}</span></div>}
        <div><span>Taxable value</span><span>{money(d.totals.taxable)}</span></div>
        {inter ? <div><span>IGST</span><span>{money(d.totals.igst)}</span></div> : <><div><span>CGST</span><span>{money(d.totals.cgst)}</span></div><div><span>SGST</span><span>{money(d.totals.sgst)}</span></div></>}
        <div className="inv-grand"><span>{credit ? "Credit note total" : "Invoice total"}</span><b>{money(d.totals.total)}</b></div>
      </div>

      {credit && d.reason && <p className="inv-sm" style={{ marginTop: 14 }}>Reason: {d.reason}</p>}
      <footer className="inv-foot">
        <span>{credit ? "This credit note reduces the value of the invoice above." : "Prices are inclusive of GST. This is a computer generated invoice."}</span>
        <span>For {biz.legal || biz.name}</span>
      </footer>
    </section>
  );
}
