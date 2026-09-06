require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
  try {
    const apiKey = process.env.GEMINI_API_KEY.trim();
    console.log("API Key exists:", !!apiKey);
    const genAI = new GoogleGenerativeAI(apiKey);
    const generativeModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const { pool } = require('./src/db');
    const [promptRows] = await pool.query("SELECT value FROM master_data WHERE category = 'BotPrompt' LIMIT 1");
    let currentPrompt = "";
    if (promptRows.length > 0) {
      currentPrompt = promptRows[0].value;
    }
    
    console.log("Current Prompt length:", currentPrompt.length);
    
    const promptContext = currentPrompt + "\n\nคำถามจากลูกค้า: ทำไร\nตอบลูกค้า:";
    
    const result = await generativeModel.generateContent(promptContext);
    console.log("Response:", result.response.text());
    
    process.exit(0);
  } catch(e) {
    console.error("Error:", e);
    process.exit(1);
  }
}

testGemini();
