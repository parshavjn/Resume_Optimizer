import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Helper function to call Gemini with retry & exponential backoff on transient errors
async function generateContentWithRetry(
  ai: GoogleGenAI,
  options: { model: string; contents: string; [key: string]: any },
  retries = 2,
  delayMs = 800
): Promise<any> {
  const fallbackModel = options.model === "gemini-2.5-flash" ? "gemini-2.0-flash" : "gemini-2.5-flash";

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await ai.models.generateContent(options);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      const isTransient = 
        error?.status === 503 ||
        error?.status === 504 ||
        error?.status === 429 ||
        error?.status === "UNAVAILABLE" || 
        error?.status === "RESOURCE_EXHAUSTED" ||
        errorMsg.includes("503") || 
        errorMsg.includes("UNAVAILABLE") ||
        errorMsg.includes("high demand") ||
        errorMsg.includes("RESOURCE_EXHAUSTED") ||
        errorMsg.includes("429");

      if (isTransient) {
        if (options.model !== fallbackModel) {
          console.warn(`Attempt ${attempt} failed for ${options.model}. Retrying immediately with fallback model ${fallbackModel}...`);
          options.model = fallbackModel;
          continue;
        }

        if (attempt < retries) {
          console.warn(`Attempt ${attempt} failed with transient error: ${errorMsg}. Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 1.5;
          continue;
        }
      }
      throw error;
    }
  }
}

const app = express();

app.use(express.json({ limit: "50mb" }));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "API is connected and running!",
    hasApiKey: !!process.env.GEMINI_API_KEY 
  });
});

// API routes first
app.post("/api/analyze-resume", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).send("GEMINI_API_KEY is not configured on Vercel. Please add it in Vercel Project Settings > Environment Variables.");
    }
    const { masterResume, jobDescription, excelKeywords, targetRole } = req.body;
    
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
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

    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
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
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).send("GEMINI_API_KEY is not configured on Vercel. Please add it in Vercel Project Settings > Environment Variables.");
    }
    const { masterResume, jobDescription, excelKeywords, targetRole } = req.body;

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
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

    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
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

export default app;
