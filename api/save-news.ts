import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "redis";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Authentication Check (Admin Only)
  const requestEmployeeId = req.headers['x-employee-id'] as string | undefined;
  const adminEmployeeId = process.env.ADMIN_EMPLOYEE_ID;
  const isAdmin = requestEmployeeId && adminEmployeeId && requestEmployeeId === adminEmployeeId;

  if (!isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Validate Input
  const { category, news } = req.body;
  if (!category || !news || !Array.isArray(news)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  // 3. Connect to Redis
  const redisUrl = process.env.REDIS_URL || process.env.KV_REST_API_URL;
  if (!redisUrl) {
    return res.status(500).json({ error: 'Redis not configured' });
  }

  try {
    const clientOptions: any = { url: redisUrl };
    if (!process.env.REDIS_URL && process.env.KV_REST_API_TOKEN) {
        clientOptions.token = process.env.KV_REST_API_TOKEN;
    }

    const redis = createClient(clientOptions);
    redis.on('error', (err) => console.error('Redis Client Error', err));
    
    await redis.connect();

    // 4. Save to Redis
    await redis.set(`news:${category}`, JSON.stringify(news));
    await redis.disconnect();

    return res.status(200).json({ success: true, count: news.length });

  } catch (e: any) {
    console.error('Redis Save Error:', e);
    return res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
}
