import { createClient } from "redis";

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const category = url.searchParams.get('category') || 'ALL';
    
    // Check configuration
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      res.status(500).json({ error: 'KV not configured' });
      return;
    }

    // Initialize Redis client using Vercel KV env vars
    const redis = createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    
    // Handle Redis connection errors
    redis.on('error', (err) => console.error('Redis Client Error', err));
    await redis.connect();

    const keys = category === 'ALL' ? ['COCKPIT', 'DRIVING', 'AI'] : [category];
    
    const fetchKey = async (key) => {
      try {
        // Redis GET returns the object directly if stored as JSON string
        // but we stored it as stringified JSON in update-news.ts
        const data = await redis.get(`news:${key}`);
        // Depending on how redis client handles JSON, it might be string or object
        // Vercel KV via REST often returns the object if using @vercel/kv, 
        // but standard redis client returns string. Let's assume string or null.
        return typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        console.error(`Error fetching key ${key}:`, e);
        return null;
      }
    };

    const results = await Promise.all(keys.map(fetchKey));
    
    // Clean up connection
    await redis.disconnect();

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
