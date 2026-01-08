import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "redis";

// Define categories to match the frontend types
const CATEGORIES = ['COCKPIT', 'DRIVING', 'AI'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow GET for Cron Jobs, POST for manual admin refresh
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Authentication Check
  // Vercel Cron automatically adds Authorization header
  // Manual trigger requires checking Employee ID against Env Var
  
  // Check for Cron Job
  const isCron = req.headers['user-agent']?.includes('vercel-cron') || 
                 req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`;

  // Check for Manual Admin Refresh
  const requestEmployeeId = req.headers['x-employee-id'] as string | undefined;
  const adminEmployeeId = process.env.ADMIN_EMPLOYEE_ID;
  const isAdmin = requestEmployeeId && adminEmployeeId && requestEmployeeId === adminEmployeeId;

  if (!isCron && !isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Check Configuration
  const redisUrl = process.env.REDIS_URL || process.env.KV_REST_API_URL;
  const GEMINI_API_KEY = process.env.API_KEY;

  if (!redisUrl || !GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Missing environment variables (Redis or Gemini)' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    // Initialize Redis Client
    const clientOptions: any = { url: redisUrl };
    if (!process.env.REDIS_URL && process.env.KV_REST_API_TOKEN) {
        clientOptions.token = process.env.KV_REST_API_TOKEN;
    }

    const redis = createClient(clientOptions);
    
    redis.on('error', (err) => console.error('Redis Client Error', err));
    await redis.connect();

    // 3. Generate News for Each Category
    // Check if a specific category is requested
    const targetCategory = req.query.category as string;
    let categoriesToUpdate = CATEGORIES;
    
    if (targetCategory) {
      if (CATEGORIES.includes(targetCategory)) {
        categoriesToUpdate = [targetCategory];
      } else {
        await redis.disconnect();
        return res.status(400).json({ error: `Invalid category. Must be one of: ${CATEGORIES.join(', ')}` });
      }
    }

    // OPTIMIZATION: Run in PARALLEL to avoid Vercel Function Timeout (10s limit on Hobby tier)
    // Gemini calls take time, so parallelizing gives us the best chance to finish all 3 within the limit.
    const updatePromises = categoriesToUpdate.map(async (category) => {
      try {
        const prompt = generatePrompt(category);
        
        // Call Gemini
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        let rawText = response.text;
        if (!rawText) throw new Error("Empty response from Gemini");

        // Clean up Markdown
        rawText = rawText.trim();
        if (rawText.startsWith('```json')) {
          rawText = rawText.replace(/^```json/, '').replace(/```$/, '');
        } else if (rawText.startsWith('```')) {
          rawText = rawText.replace(/^```/, '').replace(/```$/, '');
        }

        // Validate JSON
        let parsedData;
        try {
            parsedData = JSON.parse(rawText);
        } catch (e) {
             const start = rawText.indexOf('[');
             const end = rawText.lastIndexOf(']');
             if (start !== -1 && end !== -1) {
                parsedData = JSON.parse(rawText.substring(start, end + 1));
             } else {
                 throw new Error("Invalid JSON format");
             }
        }

        if (!Array.isArray(parsedData)) throw new Error("Response is not an array");

        // Post-process (Add IDs, dates)
        const processedNews = parsedData.map((item, index) => ({
          id: `${category}_${Date.now()}_${index}`,
          category: category,
          title: item.title || "No Title",
          summary: item.summary || "No Summary",
          valueAnalysis: item.valueAnalysis || "No Analysis",
          rating: typeof item.rating === 'number' ? item.rating : 3,
          url: item.url || '#',
          source: item.source || 'Web',
          publishedAt: item.publishedDate || new Date().toISOString().split('T')[0]
        })).slice(0, 20); // Keep top 20

        // 4. Save to Vercel KV using Redis Client
        await redis.set(`news:${category}`, JSON.stringify(processedNews));

        return { category, status: 'success', count: processedNews.length };

      } catch (error: any) {
        console.error(`Error updating ${category}:`, error);
        return { category, status: 'error', error: error.message };
      }
    });

    // Wait for all updates to complete (or fail)
    const outcomes = await Promise.all(updatePromises);
    
    await redis.disconnect();

    return res.status(200).json({ 
      message: 'Update process completed', 
      timestamp: new Date().toISOString(),
      results: outcomes 
    });

  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
}

// Helper: Generate Prompt
function generatePrompt(category: string): string {
  let query = "";
  switch (category) {
    case 'COCKPIT':
      query = "latest news, product launches, and technical analysis in Automotive Smart Cabin (智能座舱), IVI systems, HUD, and car HMI experiences. Focus on recent updates from 36Kr, CNET, and expert tech reviews.";
      break;
    case 'DRIVING':
      query = "latest breaking news and technical breakthroughs in Autonomous Driving (NOA, FSD, L3/L4), LiDAR updates, and ADAS chips. Focus on technical blogs, GitHub repos, and industry news.";
      break;
    case 'AI':
      query = "latest breaking AI news, specific model releases (LLMs), open source library updates on GitHub Trending, and major corporate AI announcements (OpenAI, Google, Anthropic). Avoid generic 'trends' articles. Focus on factual events, releases, and updates from sources like aibase.com, 36Kr, Engadget, and top AI influencers on X/Twitter.";
      break;
    default:
      query = "Technology news";
  }

  const sevenDaysAgoDate = new Date();
  sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
  const dateStr = sevenDaysAgoDate.toISOString().split('T')[0];

  return `
      You are an expert tech news editor for "HMATC Insider Daily".
      Please perform a deep search for: ${query}.
      
      Sources to prioritize:
      1. GitHub Trending (https://github.com/trending)
      2. AI/Tech News Sites (news.aibase.com, 36Kr, CNET, Engadget, Technology Review)
      3. High-quality content from AI practitioners on X, Facebook, and YouTube.

      IMPORTANT TIMEFRAME CONSTRAINT:
      Only select news items published on or after ${dateStr} (within the last 7 days).

      Task:
      Select the top 25 most valuable *specific news items* (not general articles).
      
      For each item, provide:
      1. A translated Chinese title (max 20 chars).
      2. A brief summary (in Chinese).
      3. A value judgment/analysis of why this is important for the industry (in Chinese).
      4. An importance rating from 1 to 5 (integer, 5 being highest impact).
      5. The source name and original URL.
      6. The publication date in "YYYY-MM-DD" format.
      
      STRICT OUTPUT FORMAT:
      You must return a valid JSON array of objects.
      Do not wrap the output in markdown (NO \`\`\`json).
      Return ONLY the raw JSON string.
      
      The JSON objects must follow this structure:
      {
        "title": "string",
        "summary": "string",
        "valueAnalysis": "string",
        "rating": number,
        "url": "string (URL of the source)",
        "source": "string (Name of the source)",
        "publishedDate": "string (YYYY-MM-DD)"
      }
    `;
}
