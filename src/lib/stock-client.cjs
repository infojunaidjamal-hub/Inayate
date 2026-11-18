/**
 * Central Stock client for your website's Node backend.
 *
 * Needs Node 18 or newer (uses the built-in fetch). No packages to install.
 * Works with both `require` and `import`:
 *     const { StockClient } = require('./stock-client.cjs');
 *     import { StockClient } from './stock-client.cjs';
 *
 * Use it on the SERVER only. The API key must never be sent to the browser.
 */

class StockApiError extends Error {
  constructor(status, body) {
    super((body && body.message) || `Stock API error ${status}`);
    this.name = 'StockApiError';
    this.status = status;             // HTTP status, or 0 if the stock app could not be reached
    this.code = (body && body.error) || 'error';
    this.body = body || {};           // full response (e.g. body.items for insufficient_stock)
  }
}

class StockClient {
  /**
   * @param {object} opts
   * @param {string} opts.baseUrl  e.g. 'http://localhost:8000/api/v1'
   * @param {string} opts.apiKey   from the stock app: System page -> Website API key
   * @param {number} [opts.timeoutMs=8000]
   */
  constructor({ baseUrl, apiKey, timeoutMs = 8000 }) {
    if (!baseUrl || !apiKey) throw new Error('StockClient needs baseUrl and apiKey');
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  async _request(method, path, body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let res;
    try {
      res = await fetch(this.baseUrl + path, {
        method,
        headers: { 'X-API-Key': this.apiKey, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
    } catch (err) {
      throw new StockApiError(0, { error: 'unreachable', message: `Could not reach the stock app: ${err.message}` });
    } finally {
      clearTimeout(timer);
    }
    let data = null;
    try { data = await res.json(); } catch (_) { /* non-JSON error page */ }
    if (!res.ok) throw new StockApiError(res.status, data);
    return data;
  }

  /** Connection test. Resolves { ok: true, ... } */
  ping() { return this._request('GET', '/ping'); }

  /** One SKU -> { sku, name, variant, available, active } */
  getStock(sku) { return this._request('GET', `/stock/${encodeURIComponent(sku)}`); }

  /** Many SKUs (up to 200) -> { items: [...], not_found: [...] } */
  getStockMany(skus) {
    const q = skus.map((s) => `sku=${encodeURIComponent(s)}`).join('&');
    return this._request('GET', `/stock?${q}`);
  }

  /** Look up by your website's own product ids (set on each product's "Website" listing ID). */
  getStockByListingIds(ids) {
    const q = ids.map((s) => `listing_id=${encodeURIComponent(s)}`).join('&');
    return this._request('GET', `/stock?${q}`);
  }

  /** Everything, one page at a time -> { items, page, pages, total } */
  listStock({ page = 1, perPage = 100 } = {}) {
    return this._request('GET', `/stock?page=${page}&per_page=${perPage}`);
  }

  /**
   * Report a placed order. Call it when the customer's order is accepted.
   * items: [{ sku: 'TSHIRT-RED-M', qty: 2 }]   (or { listing_id: 'prod_77', qty: 1 })
   *
   * Resolves { status: 'recorded' | 'duplicate', ... }. A repeated orderId is safe: it returns
   * 'duplicate' and deducts nothing.
   * Throws StockApiError with code 'insufficient_stock' (status 409) when any item is short:
   * nothing is deducted, and err.body.items says how many are available.
   * Pass { force: true } only to record an order you have already confirmed to the customer.
   */
  reportSale(orderId, items, { force = false } = {}) {
    return this._request('POST', '/sales', { order_id: String(orderId), items, ...(force ? { force: true } : {}) });
  }

  /** Cancel a whole order and put its stock back. Safe to repeat. */
  cancelOrder(orderId) {
    return this._request('POST', '/cancellations', { order_id: String(orderId) });
  }
}

exports.StockClient = StockClient;
exports.StockApiError = StockApiError;
