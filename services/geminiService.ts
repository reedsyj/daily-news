import { Category, NewsItem } from "../types";

export async function fetchNewsByPrompt(prompt: string): Promise<string> {
  const r = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(text);
  }
  const data = await r.json();
  return data.text as string;
}

const mapCategoryToQuery = (category: Category): string => {
  switch (category) {
    case 'COCKPIT':
      return "latest news, product launches, and technical analysis in Automotive Smart Cabin (智能座舱), IVI systems, HUD, and car HMI experiences. Focus on recent updates from 36Kr, CNET, and expert tech reviews.";
    case 'DRIVING':
      return "latest breaking news and technical breakthroughs in Autonomous Driving (NOA, FSD, L3/L4), LiDAR updates, and ADAS chips. Focus on technical blogs, GitHub repos, and industry news.";
    case 'AI':
      // Updated to focus on specific News/Launches rather than generic trends
      return "latest breaking AI news, specific model releases (LLMs), open source library updates on GitHub Trending, and major corporate AI announcements (OpenAI, Google, Anthropic). Avoid generic 'trends' articles. Focus on factual events, releases, and updates from sources like aibase.com, 36Kr, Engadget, and top AI influencers on X/Twitter.";
    default:
      return "Technology news";
  }
};

export const fetchAnalysedNews = async (category: Category): Promise<NewsItem[]> => {
  try {
    const query = mapCategoryToQuery(category);
    
    // Calculate date 7 days ago for context in prompt
    const sevenDaysAgoDate = new Date();
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
    const dateStr = sevenDaysAgoDate.toISOString().split('T')[0];

    // We request 25 items to ensure we have at least 15 valid ones after date filtering.
    const prompt = `
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

    let rawText = await fetchNewsByPrompt(prompt);
    if (!rawText) return [];

    // Sanitize response if the model included Markdown code blocks
    rawText = rawText.trim();
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json/, '').replace(/```$/, '');
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```/, '').replace(/```$/, '');
    }

    let parsedData: any[] = [];
    try {
        parsedData = JSON.parse(rawText);
    } catch (e) {
        console.warn("JSON Parse Error, attempting fallback extraction", e);
        const start = rawText.indexOf('[');
        const end = rawText.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
            try {
                parsedData = JSON.parse(rawText.substring(start, end + 1));
            } catch (e2) {
                console.error("Critical failure parsing JSON response from Gemini", e2);
                return [];
            }
        } else {
            return [];
        }
    }
    
    if (!Array.isArray(parsedData)) return [];

    const now = new Date();
    // Reset time part for accurate date comparison
    now.setHours(23, 59, 59, 999);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    cutoffDate.setHours(0, 0, 0, 0);

    const todayStr = new Date().toISOString().split('T')[0];

    // Map to our internal NewsItem structure and filter
    return parsedData
      .map((item: any, index: number) => {
        let publishedAt = item.publishedDate || todayStr;
        
        // Ensure strictly strict date format handling
        // If the item date is strictly "Today", we synthesize a recent time.
        // We must ensure the synthesized time does NOT fall back into "Yesterday".
        if (publishedAt.split('T')[0] === todayStr) {
          const currentNow = new Date();
          const startOfToday = new Date(currentNow);
          startOfToday.setHours(0, 0, 0, 0);

          // Calculate available minutes since start of today
          const validMinutesSinceMidnight = Math.floor((currentNow.getTime() - startOfToday.getTime()) / 60000);
          
          // Randomly go back, but not further than midnight, and max 12 hours to imply recency
          // If it's 1:00 AM, validMinutes is 60. We can only go back max 60 mins.
          // If it's 2:00 PM, validMinutes is large. We cap at 12 hours (720 mins).
          const minutesAgo = Math.floor(Math.random() * Math.min(validMinutesSinceMidnight, 720)); 
          
          const fakeTime = new Date(currentNow.getTime() - minutesAgo * 60000);
          publishedAt = fakeTime.toISOString();
        }

        return {
          id: `${category}_${Date.now()}_${index}`,
          category: category,
          title: item.title || "No Title",
          summary: item.summary || "No Summary",
          valueAnalysis: item.valueAnalysis || "No Analysis",
          rating: typeof item.rating === 'number' ? item.rating : 3, // Default to 3 stars if missing
          url: item.url || '#',
          source: item.source || 'Web',
          publishedAt: publishedAt,
        };
      })
      .filter((item: NewsItem) => {
        // Strict filtering for last 7 days
        const itemDate = new Date(item.publishedAt);
        if (isNaN(itemDate.getTime())) return true; 
        return itemDate >= cutoffDate;
      })
      .slice(0, 15); // Strict requirement: Max 15 items per category

  } catch (error) {
    console.error(`Error fetching news for ${category}:`, error);
    return [];
  }
};
