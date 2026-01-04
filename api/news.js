export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const category = url.searchParams.get('category') || 'ALL';
    const KV_URL = process.env.KV_REST_API_URL;
    const KV_TOKEN = process.env.KV_REST_API_TOKEN;
    if (!KV_URL || !KV_TOKEN) {
      res.status(500).json({ error: 'KV not configured' });
      return;
    }
    const keys = category === 'ALL' ? ['COCKPIT', 'DRIVING', 'AI'] : [category];
    const fetchKey = async (key) => {
      const r = await fetch(`${KV_URL}/get/news:${key}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` },
      });
      if (!r.ok) return null;
      const text = await r.text();
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    };
    const results = await Promise.all(keys.map(fetchKey));
    const merged = results.filter(Boolean).flat();
    if (merged.length === 0) {
      res.status(404).json({ error: 'cache miss', category });
      return;
    }
    res.status(200).json(merged);
  } catch (e) {
    res.status(500).json({ error: e.message || 'internal error' });
  }
}
