// =====================================================================
// BULLSEYE - product share page.  You never edit this file.
//
// When someone opens  yoursite.com/p/<product-id>  Vercel runs this file.
// It looks up the product and returns a tiny page that carries the
// product's PICTURE, NAME and PRICE. That is what WhatsApp reads to draw
// the picture preview under an order message. People who tap the link
// are sent straight to the product on your shop.
//
// It reads your Supabase address and public key from your own config.js
// (the same file the shop already uses), so there is nothing to set up.
// =====================================================================

var UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
var cached = null;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function withTimeout(url, options, ms) {
  var ctl = new AbortController();
  var t = setTimeout(function () { ctl.abort(); }, ms);
  options = Object.assign({}, options, { signal: ctl.signal });
  return fetch(url, options).finally(function () { clearTimeout(t); });
}

function siteBase(req) {
  var host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return '';
  var proto = /^localhost|^127\./.test(host) ? 'http' : 'https';
  return proto + '://' + host;
}

// Finds the Supabase address + public key.
// 1) optional Vercel settings  2) the shop's own config.js
function loadConfig(base) {
  if (cached) return Promise.resolve(cached);
  var envUrl = process.env.SUPABASE_URL, envKey = process.env.SUPABASE_ANON_KEY;
  if (envUrl && envKey) { cached = { url: envUrl, key: envKey }; return Promise.resolve(cached); }
  if (!base) return Promise.resolve(null);
  return withTimeout(base + '/config.js', {}, 4000)
    .then(function (r) { return r.ok ? r.text() : ''; })
    .then(function (txt) {
      var u = /SUPABASE_URL\s*:\s*["']([^"']+)["']/.exec(txt);
      var k = /SUPABASE_ANON_KEY\s*:\s*["']([^"']+)["']/.exec(txt);
      if (!u || !k || /PASTE_/.test(u[1] + k[1])) return null;
      cached = { url: u[1].replace(/\/+$/, ''), key: k[1] };
      return cached;
    })
    .catch(function () { return null; });
}

function rest(cfg, path) {
  var headers = { apikey: cfg.key, Accept: 'application/json' };
  if (/^eyJ/.test(cfg.key)) headers.Authorization = 'Bearer ' + cfg.key;
  return withTimeout(cfg.url + '/rest/v1/' + path, { headers: headers }, 4500)
    .then(function (r) { return r.ok ? r.json() : []; })
    .catch(function () { return []; });
}

function money(n, sym) {
  var v = Number(n) || 0;
  return sym + v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

function cut(s, n) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1).trim() + '…' : s;
}

function page(o) {
  var target = '/#p=' + o.id;
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(o.title) + '</title>' +
    '<meta name="description" content="' + esc(o.desc) + '">' +
    '<meta property="og:type" content="product">' +
    '<meta property="og:site_name" content="Bullseye">' +
    '<meta property="og:title" content="' + esc(o.title) + '">' +
    '<meta property="og:description" content="' + esc(o.desc) + '">' +
    '<meta property="og:url" content="' + esc(o.url) + '">' +
    '<meta property="og:image" content="' + esc(o.image) + '">' +
    '<meta property="og:image:alt" content="' + esc(o.name) + '">' +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + esc(o.title) + '">' +
    '<meta name="twitter:image" content="' + esc(o.image) + '">' +
    '<style>body{margin:0;background:#F4F1EA;color:#0B0B0B;font-family:Arial,Helvetica,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}' +
    '.c{max-width:420px;width:100%;text-align:center}img{max-width:100%;max-height:60vh;display:block;margin:0 auto 18px;background:#DDD6C7}' +
    'h1{font-size:22px;margin:0 0 6px;text-transform:uppercase}p{margin:0 0 18px;color:#5B574E}' +
    'a{display:inline-block;background:#0B0B0B;color:#F4F1EA;padding:14px 22px;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:13px}</style>' +
    '</head><body><div class="c">' +
    (o.hasPhoto ? '<img src="' + esc(o.image) + '" alt="' + esc(o.name) + '">' : '') +
    '<h1>' + esc(o.name) + '</h1><p>' + esc(o.price) + '</p>' +
    '<a href="' + esc(target) + '">View on Bullseye</a></div>' +
    '<script>location.replace(' + JSON.stringify(target).replace(/</g, '\\u003c') + ');</script>' +
    '</body></html>';
}

module.exports = function handler(req, res) {
  var q = req.query || {};
  var id = String(Array.isArray(q.id) ? q.id[0] : q.id || '').trim();
  var base = siteBase(req);

  function home() {
    res.statusCode = 302;
    res.setHeader('Location', '/');
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.end();
  }
  if (!UUID.test(id) || !base) return home();

  return loadConfig(base).then(function (cfg) {
    if (!cfg) return home();
    return Promise.all([
      rest(cfg, 'products?id=eq.' + encodeURIComponent(id) + '&select=id,name,price,description,images,in_stock&limit=1'),
      rest(cfg, 'settings?key=eq.currency_symbol&select=key,value&limit=1')
    ]).then(function (rows) {
      var p = (rows[0] || [])[0];
      if (!p) return home();
      var sym = ((rows[1] || [])[0] || {}).value || '₦';
      var img = (Array.isArray(p.images) ? p.images : []).filter(function (u) { return /^https:\/\//i.test(String(u)); })[0];
      var hasPhoto = !!img;
      var price = money(p.price, sym);
      var desc = (p.in_stock === false ? 'Sold out. ' : '') + (cut(p.description, 140) || 'See sizes and colours, then order on Bullseye.');
      var html = page({
        id: id,
        name: p.name,
        price: price,
        title: p.name + ' — ' + price + ' | Bullseye',
        desc: desc,
        url: base + '/p/' + id,
        image: img || (base + '/logo-mark.png'),
        hasPhoto: hasPhoto
      });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
      res.end(req.method === 'HEAD' ? '' : html);
    });
  }).catch(function () { home(); });
};
