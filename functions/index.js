const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

const ALLOWLIST = [
  /(^|\.)youtube\.com$/i,
  /(^|\.)youtu\.be$/i,
  /(^|\.)vimeo\.com$/i,
  /(^|\.)dailymotion\.com$/i,
  /(^|\.)streamtape\.(com|net|to)$/i,
  /(^|\.)dood(stream)?\.(com|watch|to|la|li|pm|re|sh|yt|ws|wf|cx)$/i,
  /(^|\.)mixdrop\.(co|to|bz|ch|gl|sx|ag)$/i,
  /(^|\.)vidmoly\.(to|me|com)$/i,
  /(^|\.)upstream\.to$/i,
  /(^|\.)filemoon\.(sx|to|in|cc)$/i,
  /(^|\.)streamwish\.(to|com|site)$/i,
  /(^|\.)drive\.google\.com$/i,
  /(^|\.)ok\.ru$/i,
  /(^|\.)odnoklassniki\.(ru|ua|com)$/i
];

function safeUrl(raw) {
  if (!raw) return null;
  let u = String(raw).trim().replace(/\s+/g, '');
  try { u = decodeURIComponent(u); } catch {}
  try {
    const parsed = new URL(u);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    const host = parsed.hostname;
    if (!ALLOWLIST.some((re) => re.test(host))) return null;
    return parsed;
  } catch {
    return null;
  }
}

function resolveEmbed(urlObj) {
  const u = urlObj.toString();
  const host = urlObj.hostname.toLowerCase();

  // OK.ru: prefer videoembed when possible
  if (host.includes('ok.ru') || host.includes('odnoklassniki')) {
    const m = u.match(/ok\.ru\/(?:video|videoembed)\/([0-9]+)/i);
    if (m) return { kind: 'iframe', url: `https://ok.ru/videoembed/${m[1]}`, host: 'ok.ru' };
    return { kind: 'iframe', url: u, host: 'ok.ru' };
  }

  // Google Drive: rewrite to preview (still may be blocked; handled on frontend)
  if (host === 'drive.google.com') {
    const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|uc\?export=download&id=)([a-zA-Z0-9_-]+)/);
    if (m) return { kind: 'iframe', url: `https://drive.google.com/file/d/${m[1]}/preview`, host: 'drive.google.com' };
    return { kind: 'iframe', url: u, host: 'drive.google.com' };
  }

  // For most supported hosts, the frontend already knows the right embed form.
  // Return as iframe to allow client-side patterns.
  return { kind: 'iframe', url: u, host };
}

exports.resolve = onRequest(
  { region: 'us-central1', cors: false, maxInstances: 10 },
  (req, res) => cors(req, res, () => {
    try {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
      const urlObj = safeUrl(req.query.url);
      if (!urlObj) return res.status(400).json({ error: 'Invalid or disallowed url' });

      const result = resolveEmbed(urlObj);
      // Basic caching to reduce repeated resolver calls
      res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      return res.json({ ...result, notes: 'resolver_v1' });
    } catch (e) {
      logger.error('resolve failed', e);
      return res.status(500).json({ error: 'Internal error' });
    }
  })
);

// Contact: stores request in Firestore (email sending can be added later with a provider)
exports.contact = onRequest(
  { region: 'us-central1', cors: false, maxInstances: 5 },
  (req, res) => cors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const body = typeof req.body === 'object' ? req.body : {};
      const name = String(body.name || '').slice(0, 120);
      const email = String(body.email || '').slice(0, 200);
      const subject = String(body.subject || '').slice(0, 200);
      const message = String(body.message || '').slice(0, 5000);
      if (!subject && !message) return res.status(400).json({ error: 'Empty message' });

      await admin.firestore().collection('contactRequests').add({
        name,
        email,
        subject,
        message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        userAgent: String(req.get('user-agent') || '').slice(0, 400),
        ip: String(req.ip || '').slice(0, 80)
      });

      res.set('Cache-Control', 'no-store');
      return res.json({ ok: true });
    } catch (e) {
      logger.error('contact failed', e);
      return res.status(500).json({ error: 'Internal error' });
    }
  })
);

