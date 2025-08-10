require("dotenv").config();

async function askGemini(question) {
  const apiKey = process.env.GEMINI_API_KEY;

  console.log("🔑 Loaded API KEY:", apiKey);
  console.log("📩 Question received:", question);

  if (!apiKey) {
    console.error("❌ API key not found in .env");
    return "Server Error: API key not loaded.";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        parts: [{ text: question }]
      }
    ]
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const status = res.status;
    const responseText = await res.text();

    console.log("📦 Raw Response:", status, responseText);

    if (status !== 200) {
      return `Gemini API Error: ${status}`;
    }

    const data = JSON.parse(responseText);
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply || "Gemini replied with empty response.";

  } catch (error) {
    console.error("🔥 ERROR contacting Gemini:", error);
    return "Error talking to Gemini chatbot.";
  }
}

module.exports = askGemini;
