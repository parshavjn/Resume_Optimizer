import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// API routes first
app.post("/api/analyze-resume", async (req, res) => {
  try {
    const { masterResume, jobDescription, excelKeywords, targetRole } = req.body;
    
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const keywordsList = excelKeywords && excelKeywords.length > 0 
      ? excelKeywords.join(", ") 
      : "automatic extraction from Job Description";

    const prompt = `
Act as a premier Executive recruiter and Lead Technical Recruiter specializing in Product Management, Product Ownership, Solutions Architecture, and AI Technology.
Compare the candidate's Master Resume with the target Job Description (JD) for the role of: "${targetRole}".

Master Resume:
${masterResume}

Target Job Description:
${jobDescription}

Relevant Keywords (from spreadsheet/input parameters):
${keywordsList}

Your objective:
1. Provide a rigorous, realistic MATCH PERCENTAGE (0-100%) indicating how close the master resume complies with this target Job Description. 
2. Match actual vocabulary from the Master Resume with target JD requirements and spreadsheet keywords.
3. Identify exactly which keywords/skills match and which ones are currently missing.
4. Prepare a raw JSON block at the start of your response, followed by a professional Markdown analysis.

The response MUST start exactly with a JSON block in this schema:
\`\`\`json
{
  "matchPercentage": 75,
  "matchedKeywords": ["Product Roadmap", "KPIs", "User Stories"],
  "missingKeywords": ["A/B Testing", "AI models", "Cloud Migration"]
}
\`\`\`
And then immediately follow with a premium Markdown section containing check-points:
- **Role Alignment Assessment**: Critique of the current master resume against the "${targetRole}" title.
- **Critical Experience Gap Analysis**: What major architectural or business delivery factors are absent.
- **Optimization Backlog**: Direct actions required to bring the match percentage close to 95%+.

Respond exactly matching this layout.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const text = response.text || "";
    
    // Extract the JSON block
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    let parsedJson = {
      matchPercentage: 50,
      matchedKeywords: [] as string[],
      missingKeywords: [] as string[]
    };

    if (jsonMatch) {
      try {
        parsedJson = JSON.parse(jsonMatch[1].trim());
      } catch (err) {
        console.error("JSON parsing error inside resume align response", err);
      }
    }

    // Clean markdown text (remove the JSON block so we can display it cleanly)
    const cleanedReport = text.replace(/```json\s*[\s\S]*?\s*```/, '').trim();

    res.json({
      matchPercentage: parsedJson.matchPercentage || 50,
      matchedKeywords: parsedJson.matchedKeywords || [],
      missingKeywords: parsedJson.missingKeywords || [],
      analysisReport: cleanedReport || text
    });
  } catch (error: any) {
    console.error("Error analyzing resume alignment:", error);
    res.status(500).send(error.message || "Internal server error");
  }
});

app.post("/api/generate-resume", async (req, res) => {
  try {
    const { masterResume, jobDescription, excelKeywords, targetRole } = req.body;

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    
    const keywordsList = excelKeywords && excelKeywords.length > 0 
      ? excelKeywords.join(", ") 
      : "automatic";

    const prompt = `
Act as a professional CV writer, Career Coach, and Technical Recruiter.
You are tasked with reworking the candidate's Master Resume to perfectly match the target Job Description (JD) and target Role of: "${targetRole}".

Master Resume:
${masterResume}

Target Job Description:
${jobDescription}

Mandatory Excel Keywords to integrate:
${keywordsList}

CRITICAL RULES:
1. STRICT FORMAT MAINTENANCE: You MUST strictly adopt and reproduce the original resume's structural format (including sections like Contact Info, Executive Summary, Career History in order with exact Employer names, employment dates, and Education history).
2. DO NOT FABRICATE EXPERIENCE: Do not invent false companies, fake dates, or imaginary credentials. Rewrite existing bullet points to accentuate, rephrase, and align experience with high-priority JD keywords/requirements (e.g. if the JD asks for KPI-driven metrics under ${targetRole}, highlight existing metrics in the style of the target JD).
3. INTEGRATE KEYWORDS: Seamlessly inject relevant keywords from the Excel list and the JD text into the active bullet points.
4. Professional tone is a absolute must.
5. Provide the output in a clean, elegant Markdown resume format ready for exporting to Word or PDF. Do not write commentaries or introductory notes - output ONLY the optimized markdown resume directly.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({
      optimizedResume: response.text || "Failed to generate optimized resume."
    });
  } catch (error: any) {
    console.error("Error generating optimized resume:", error);
    res.status(500).send(error.message || "Internal server error");
  }
});

// Vite middleware setup
async function startServer() {
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
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
