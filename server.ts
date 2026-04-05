import express from "express";
import { createServer as createViteServer } from "vite";
import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';
import * as cheerio from 'cheerio';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
