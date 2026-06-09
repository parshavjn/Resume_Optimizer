export interface ResumeMatchRequest {
  masterResume: string;
  jobDescription: string;
  excelKeywords?: string[];
  targetRole: 'Product Manager' | 'Product Owner' | 'Solution Architect' | 'AI Product Manager';
}

export interface MatchAnalysisResult {
  matchPercentage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  analysisReport: string;
}

export async function analyzeResumeAlignment(req: ResumeMatchRequest): Promise<MatchAnalysisResult> {
  const response = await fetch("/api/analyze-resume", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Server error: ${errText}`);
  }

  return await response.json();
}

export interface TailoredResumeResult {
  optimizedResume: string;
  keywordsReference: string;
}

export async function generateOptimizedResume(req: ResumeMatchRequest): Promise<TailoredResumeResult> {
  const response = await fetch("/api/generate-resume", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Server error: ${errText}`);
  }

  return await response.json();
}
