require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const axios = require('axios');
  try {
    const res = await axios.get(url);
    const models = res.data.models.filter(m => m.supportedGenerationMethods.includes('generateContent')).map(m => m.name);
    console.log("Available models for generateContent:");
    console.log(models);
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
listModels();
