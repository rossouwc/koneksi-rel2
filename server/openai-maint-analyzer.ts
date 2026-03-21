import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface MaintIssue {
  title: string;
  description: string;
  category: string;
  tasks: string[];
}

export interface MaintAnalysisResult {
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "urgent";
  issues: MaintIssue[];
}

const VALID_CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Pool Maintenance",
  "Solar Installation",
  "Gardening",
  "Pest Control",
  "Painting",
  "General Maintenance",
  "Leak Detection",
  "Water Purification",
  "Building",
];

const SYSTEM_PROMPT = `You are a South African home maintenance expert and building inspector. You will receive a photo of a home maintenance issue.

Analyze the photo and return a JSON object with this EXACT structure:

{
  "title": "Short title describing the main problem (e.g. 'Water damage from leaking pipe')",
  "description": "2-3 sentences describing what you observe and the likely root cause. Be specific about what you can see in the photo.",
  "severity": "low|medium|high|urgent",
  "issues": [
    {
      "title": "Name of this specific problem area (e.g. 'Leaking pipe at wall entry')",
      "description": "One sentence about this specific issue",
      "category": "The trade needed to fix it",
      "tasks": ["Specific task 1", "Specific task 2", "Specific task 3"]
    }
  ]
}

Rules:
- severity meanings: low=cosmetic only, medium=should address within weeks, high=address within days, urgent=immediate safety risk
- category MUST be one of these exact values: ${VALID_CATEGORIES.join(", ")}
- issues array: identify 1-3 distinct trade categories needed. If one trade can fix everything, only list 1 issue.
- tasks: 2-4 specific, actionable tasks for each trade. Be concise (3-6 words each).
- Focus on what is VISIBLE in the photo. Do not invent problems that aren't visible.
- Use South African context where relevant (e.g. IBR roofing, face brick, plaster, etc.)
- If the image does not show a home maintenance issue, set title to "No maintenance issue detected", description to what you see, severity to "low", and issues to an empty array.
- Return ONLY valid JSON, no markdown fences or extra text.`;

function parseMaintResponse(content: string): MaintAnalysisResult {
  let cleaned = content.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned) as any;

  if (!parsed.title || !parsed.description || !parsed.severity || !Array.isArray(parsed.issues)) {
    throw new Error("Incomplete maintenance analysis result from AI");
  }

  const validSeverities = ["low", "medium", "high", "urgent"];
  if (!validSeverities.includes(parsed.severity)) {
    parsed.severity = "medium";
  }

  parsed.issues = parsed.issues.map((issue: any) => ({
    title: issue.title || "Issue",
    description: issue.description || "",
    category: VALID_CATEGORIES.includes(issue.category) ? issue.category : "General Maintenance",
    tasks: Array.isArray(issue.tasks) ? issue.tasks.slice(0, 4) : [],
  }));

  return parsed as MaintAnalysisResult;
}

export async function analyzeMaintenancePhoto(filePath: string): Promise<MaintAnalysisResult> {
  const absolutePath = path.resolve(filePath);
  const fileBuffer = fs.readFileSync(absolutePath);
  const base64Image = fileBuffer.toString("base64");

  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: "high",
            },
          },
          {
            type: "text",
            text: "Analyze this home maintenance issue photo. Identify what is wrong, how severe it is, and which trades are needed to fix it. Return the JSON analysis.",
          },
        ],
      },
    ],
    max_tokens: 1500,
    temperature: 0.2,
  });

  const rawContent = response.choices[0]?.message?.content || "";

  try {
    return parseMaintResponse(rawContent);
  } catch (e) {
    console.log("[mAInt] AI raw response (first 500 chars):", rawContent.slice(0, 500));
    throw e;
  }
}
