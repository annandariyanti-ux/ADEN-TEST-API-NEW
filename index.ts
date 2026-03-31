import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Gemini Setup
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Aden Generator API is running" });
  });

  app.get("/api/docs", (req, res) => {
    res.json({
      name: "Aden Generator API",
      version: "1.0.0",
      endpoints: [
        {
          path: "/api/generate-toc",
          method: "POST",
          description: "Generate a Table of Contents for an eBook",
          body: {
            topic: "string",
            author: "string",
            pageCount: "number (optional)",
            tone: "string (optional)"
          }
        },
        {
          path: "/api/generate-chapter",
          method: "POST",
          description: "Generate content for a specific chapter",
          body: {
            chapterTitle: "string",
            topic: "string",
            author: "string",
            tone: "string",
            previousChapters: "string[] (optional)"
          }
        }
      ]
    });
  });

  app.post("/api/generate-toc", async (req, res) => {
    const { topic, pageCount, tone, author } = req.body;
    
    if (!topic || !author) {
      return res.status(400).json({ error: "Topic and Author are required" });
    }

    try {
      const model = "gemini-3.1-pro-preview";
      const prompt = `
        Buatlah Daftar Isi (Table of Contents) untuk eBook profesional dalam Bahasa Indonesia.
        Topik: ${topic}
        Target Halaman: ${pageCount}
        Nada/Gaya: ${tone}
        Penulis: ${author}

        Berikan daftar judul bab yang logis dan mendalam. Minimal 8-12 bab untuk mencakup target halaman.
        Kembalikan hanya dalam format JSON array of strings.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      res.json(JSON.parse(response.text || "[]"));
    } catch (error) {
      console.error("ToC Generation Error:", error);
      res.status(500).json({ error: "Failed to generate Table of Contents" });
    }
  });

  app.post("/api/generate-chapter", async (req, res) => {
    const { chapterTitle, topic, tone, author, previousChapters } = req.body;

    if (!chapterTitle || !topic) {
      return res.status(400).json({ error: "Chapter Title and Topic are required" });
    }

    try {
      const model = "gemini-3.1-pro-preview";
      const prompt = `
        Tuliskan isi lengkap untuk bab eBook berikut dalam Bahasa Indonesia yang sangat mendalam, profesional, dan praktis.
        
        Judul Bab: ${chapterTitle}
        Topik Utama eBook: ${topic}
        Nada/Gaya: ${tone}
        Penulis: ${author}
        
        Konteks Bab Sebelumnya (Judul): ${previousChapters?.join(", ") || "None"}
        
        Instruksi:
        1. Gunakan format Markdown (Heading, Bold, List).
        2. Pastikan konten sangat detail (minimal 1000-1500 kata per bab jika memungkinkan untuk mencapai target halaman).
        3. Berikan contoh praktis, tips, dan langkah-langkah yang bisa langsung diterapkan.
        4. Bahasa harus mengalir dan enak dibaca oleh pemula maupun profesional.
        5. Jangan mengulang-ulang informasi dari bab sebelumnya.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      res.json({ content: response.text || "" });
    } catch (error) {
      console.error("Chapter Generation Error:", error);
      res.status(500).json({ error: "Failed to generate chapter content" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only listen if not running as a Vercel function
  if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

const appPromise = startServer();
export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
