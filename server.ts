import express from "express";
import { createServer as createViteServer } from "vite";
import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';
import * as cheerio from 'cheerio';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || '' 
  });

  const checkApiKey = (res: express.Response) => {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      res.status(401).json({ error: "Gemini API key is not configured. Please set GEMINI_API_KEY in the Secrets panel." });
      return false;
    }
    return true;
  };

  app.post("/api/embeddings", async (req, res) => {
    if (!checkApiKey(res)) return;
    try {
      const { texts } = req.body;
      if (!texts || !Array.isArray(texts)) return res.status(400).json({ error: "texts array required" });

      const responses = await Promise.all(
        texts.map(text => ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: text
        }))
      );
      
      const embeddings = responses.map(r => r.embeddings[0].values);
      res.json({ embeddings });
    } catch (error) {
      console.error("Embedding error:", error);
      res.status(500).json({ error: "Failed to generate embeddings" });
    }
  });

  app.post("/api/recipes/learning-feedback", (req, res) => {
    // In a real app we would store originalData and correctedData in vector DB / fine-tuning dataset
    console.log("Feedback received. Original:", req.body.originalData?.title, "Corrected:", req.body.correctedData?.title);
    res.json({ success: true });
  });

  app.post("/api/recipes/scale/parse", async (req, res) => {
    if (!checkApiKey(res)) return;
    try {
      const { ingredients } = req.body;
      const prompt = `
      Parse the following list of recipe ingredients into structured data.
      For each ingredient, identify the numerical amount, the unit (if any), the name of the ingredient, and a boolean indicating if it's a spice/condiment/salt (which usually doesn't scale perfectly linearly).
      If there is no specific amount (e.g., "Salz und Pfeffer" or "etwas Öl"), set amount to null and unit to null.
      Normalize fractions to decimals (e.g., "1/2" -> 0.5).

      Format as JSON array:
      [
        {
          "original": "string",
          "amount": number or null,
          "unit": "string or null",
          "name": "string",
          "isSpiceOrCondiment": boolean
        }
      ]

      Ingredients to parse:
      ${JSON.stringify(ingredients, null, 2)}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      let text = response.text || "[]";
      const match = text.match(/```(?:json)?\n?([\s\S]*?)```/);
      if (match) text = match[1].trim();

      let parsed = ingredients.map((ing: string) => ({
        original: ing,
        amount: null,
        unit: null,
        name: ing,
        isSpiceOrCondiment: false
      }));
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse ingredients JSON:", text, e);
      }
      res.json({ parsed });
    } catch (error: any) {
      console.error("Scale parse error:", error);
      res.status(500).json({ error: error.message || "Failed to parse ingredients" });
    }
  });

  app.post("/api/recipes/scale/substitute", async (req, res) => {
    if (!checkApiKey(res)) return;
    try {
      const { ingredientName } = req.body;
      const prompt = `Give me 2-3 common substitutions for "${ingredientName}". Return a short, helpful explanation. No formatting, just plain text with bullets.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      res.json({ suggestions: response.text || "No suggestions available." });
    } catch (error: any) {
      console.error("Scale substitute error:", error);
      res.status(500).json({ error: error.message || "Failed to suggest substitutes" });
    }
  });

  app.post("/api/recipes/scale/tips", async (req, res) => {
    if (!checkApiKey(res)) return;
    try {
      const { originalServings, newServings, recipeTitle, instructions } = req.body;
      const prompt = `
      I am scaling a recipe called "${recipeTitle}" from ${originalServings} servings to ${newServings} servings.
      Original instructions:
      ${JSON.stringify(instructions)}

      Provide:
      1. An adjusted overall cooked duration string (e.g. "35 Minuten" if scaling up means longer bake/simmer times, or same time if it doesn't change).
      2. A list of tips for scaling these specific instructions (e.g. "Use a larger pan", "Baking time does not double, check after 40 mins").

      Return JSON:
      {
        "newDuration": "string",
        "tips": ["string"]
      }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      let text = response.text || "{}";
      const match = text.match(/```(?:json)?\n?([\s\S]*?)```/);
      if (match) text = match[1].trim();

      let data = { newDuration: "", tips: [] as string[] };
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse tips JSON:", text, e);
      }
      res.json(data);
    } catch (error: any) {
      console.error("Scale tips error:", error);
      res.status(500).json({ error: error.message || "Failed to adjust tips" });
    }
  });

  app.post("/api/recipes/scale/solve", async (req, res) => {
    if (!checkApiKey(res)) return;
    try {
      const { availableItem, originalIngredients, originalServings } = req.body;
      const prompt = `
      The user says: "${availableItem}" (e.g. "I only have 2 eggs").
      The recipe originally serves ${originalServings} and has these ingredients:
      ${JSON.stringify(originalIngredients)}

      Calculate the new serving size that matches the limited available item, and explain briefly.
      
      Return JSON:
      {
        "newServings": number,
        "explanation": "string"
      }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      let text = response.text || "{}";
      const match = text.match(/```(?:json)?\n?([\s\S]*?)```/);
      if (match) text = match[1].trim();

      let data = { newServings: originalServings, explanation: "Could not calculate." };
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Failed to solve inventory JSON:", text, e);
      }
      res.json(data);
    } catch (error: any) {
      console.error("Scale solve error:", error);
      res.status(500).json({ error: error.message || "Failed to solve inventory" });
    }
  });

  app.post("/api/recipes/smart-search", async (req, res) => {
    if (!checkApiKey(res)) return;
    try {
      const { query, context, recipes, imageBase64 } = req.body;
      
      let structuredFilter = null;
      let reasoning = "";
      let queryEmbedding = null;
      
      if (imageBase64) {
        // Image-based search
        const result = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            {
              inlineData: {
                data: imageBase64.split(',')[1] || imageBase64,
                mimeType: imageBase64.includes('jpeg') || imageBase64.includes('jpg') ? 'image/jpeg' : 'image/png'
              }
            },
            "Describe this food image in detail in a few sentences, focusing on ingredients and name. This is for a recipe search."
          ]
        });
        reasoning = "Based on the image: " + result.text;
        
        const embRes = await ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: result.text
        });
        queryEmbedding = embRes.embeddings[0].values;
        
      } else if (query) {
        // NLP search
        const prompt = `
          Analyze the following user query for a recipe search app.
          Context: ${JSON.stringify(context || {})}
          Query: "${query}"
          
          Return a JSON object with:
          1. "searchableText": A 2-3 sentence description of the idealized recipe that matches this query seamlessly including ingredients, mood, and context.
          2. "reasoning": A friendly string explaining why you will suggest certain recipes (e.g. "Since it's cold outside, here are some hearty soups with potatoes!").
          3. "keywords": string[] of main food keywords (ingredients, styles, cuisines).
          4. "filters": Optional object with { "maxTimeMinutes": number, "dietary": string[] } if mentioned. Provide null if none.
          
          Return ONLY valid JSON.
        `;
        
        const result = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        
        const parsed = JSON.parse(result.text);
        structuredFilter = parsed;
        reasoning = parsed.reasoning;
        
        const embRes = await ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: parsed.searchableText
        });
        queryEmbedding = embRes.embeddings[0].values;
      }
      
      // Calculate Cosine Similarity Manually if recipes are provided
      let rankedRecipes = [];
      if (recipes && queryEmbedding) {
         rankedRecipes = recipes
          .map((r: any) => {
            if (!r.embedding) {
               // Fallback: simple keyword/text matching score if embedding is missing
               let keywordScore = 0;
               const textToSearch = (r.title + ' ' + (r.ingredients || []).join(' ') + ' ' + (r.categories || []).join(' ')).toLowerCase();
               if (structuredFilter?.keywords) {
                 structuredFilter.keywords.forEach((kw: string) => {
                   if (textToSearch.includes(kw.toLowerCase())) keywordScore += 0.15;
                 });
               }
               return { ...r, similarity: Math.min(0.46 + keywordScore, 0.7) }; // Give a baseline so it shows up, but embeddings are better.
            }
            
            let dotProduct = 0;
            let normA = 0;
            let normB = 0;
            for (let i = 0; i < queryEmbedding.length; i++) {
              dotProduct += queryEmbedding[i] * r.embedding[i];
              normA += queryEmbedding[i] * queryEmbedding[i];
              normB += r.embedding[i] * r.embedding[i];
            }
            const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
            return { ...r, similarity };
          })
          .filter((r: any) => r.similarity > 0.45) // Threshold
          .sort((a: any, b: any) => b.similarity - a.similarity)
          .slice(0, 10);
      }

      res.json({ recipes: rankedRecipes.map((r: any) => { delete r.embedding; delete r.similarity; return r; }), reasoning, structuredFilter, queryEmbedding });
    } catch (error) {
      console.error("Smart search error:", error);
      res.status(500).json({ error: "Failed to perform smart search" });
    }
  });

  // API routes FIRST
  app.post("/api/youtube", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL required" });

      // Fetch description
      let description = '';
      try {
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);
        description = $('meta[name="description"]').attr('content') || '';
      } catch (e) {
        console.warn("Could not fetch description:", e);
      }
      
      // Fetch transcript
      let transcript = '';
      try {
        const transcriptItems = await YoutubeTranscript.fetchTranscript(url);
        transcript = transcriptItems.map(item => item.text).join(' ');
      } catch (e) {
        console.warn("Could not fetch transcript:", e);
      }

      res.json({ description, transcript });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to extract YouTube data" });
    }
  });

  const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  app.post("/api/instagram", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL required" });

      const match = url.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([^\/?#&]+)/);
      if (!match) return res.status(400).json({ error: "Invalid Instagram URL" });
      
      const shortcode = match[1];
      const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
      
      const response = await fetch(embedUrl, { headers: { 'User-Agent': USER_AGENT } });
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('script, style').remove();
      const caption = $('.Caption').text() || $('.CaptionText').text() || $('body').text();
      
      res.json({ caption: caption.replace(/\s+/g, ' ').trim().substring(0, 10000) });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to extract Instagram data" });
    }
  });

  app.post("/api/scrape", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL required" });

      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('script, style, noscript, iframe, img, svg, video, header, footer, nav').remove();
      const text = $('body').text().replace(/\s+/g, ' ').trim();
      
      res.json({ text: text.substring(0, 40000) });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to scrape URL" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
