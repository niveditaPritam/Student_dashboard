require("dotenv").config();

// Simple in-memory cache to avoid repeated API calls for identical questions
const cache = new Map(); // key -> { text, ts }
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

function maskKey(key) {
  if (!key) return '(none)';
  return key.length > 8 ? `${key.slice(0,4)}...${key.slice(-4)}` : key;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function askGemini(question) {
  const apiKey = process.env.GEMINI_API_KEY;

  console.log("📩 Question received:", question);
  console.log("🔑 API KEY loaded:", maskKey(apiKey));

  if (!apiKey) {
    console.error("❌ API key not found in .env");
    return "Server Error: API key not loaded.";
  }

  // Return cached answer if available and fresh
  const cached = cache.get(question);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
    console.log("🗄️  Returning cached response");
    return cached.text;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const body = {
    contents: [ { parts: [{ text: question }] } ]
  };

  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const status = res.status;
      const responseText = await res.text();
      console.log(`📦 Raw Response (attempt ${attempt}):`, status, responseText);

      if (status === 200) {
        const data = JSON.parse(responseText);
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        // cache and return
        cache.set(question, { text: reply, ts: Date.now() });
        return reply || "Gemini replied with empty response.";
      }

      // Handle rate limit specifically
      if (status === 429) {
        let retryMs = 1000 * Math.pow(2, attempt); // exponential backoff base
        // try to parse RetryInfo.retryDelay from body if provided
        try {
          const parsed = JSON.parse(responseText);
          const details = parsed?.error?.details || [];
          const retryInfo = details.find(d => d['@type'] && d['@type'].includes('RetryInfo'));
          const retryDelay = retryInfo?.retryDelay;
          if (retryDelay && typeof retryDelay === 'string') {
            // format is like '37s' or '46s' -> convert to ms
            const m = retryDelay.match(/(\d+)(s|ms)?/);
            if (m) {
              const val = Number(m[1]);
              retryMs = (m[2] === 'ms') ? val : val * 1000;
            }
          }
        } catch (e) {
          // ignore parse errors
        }

        if (attempt < maxAttempts) {
          console.warn(`⏳ Rate limited by Gemini (attempt ${attempt}). Waiting ${retryMs}ms before retry.`);
          await sleep(retryMs + Math.floor(Math.random() * 300));
          continue; // retry
        }

        // if last attempt, return helpful message
        return "Gemini API rate limit exceeded. Please try again later or check your API quota/billing.";
      }

      // For other non-200 statuses, return a concise message
      return `Gemini API Error: ${status}`;

    } catch (error) {
      console.error(`🔥 ERROR contacting Gemini (attempt ${attempt}):`, error);
      if (attempt < maxAttempts) {
        const backoff = 500 * Math.pow(2, attempt);
        await sleep(backoff + Math.floor(Math.random() * 200));
        continue;
      }
      return "Error talking to Gemini chatbot.";
    }
  }

  return "Error talking to Gemini chatbot.";
}

module.exports = askGemini;
