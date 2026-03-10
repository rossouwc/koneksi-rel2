import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface BillAnalysisResult {
  extracted: {
    provider: string;
    accountNumber: string;
    billingPeriod: string;
    totalAmount: number;
    usageKwh?: number;
    usageKl?: number;
    tariffRate?: number;
    category: string;
  };
  flaggedItems: {
    found: boolean;
    items: { description: string; typicalRange: string; chargedAmount: number; difference: number }[];
  };
  savings: {
    tips: { title: string; description: string; potentialSaving: number }[];
    totalPotentialSaving: number;
  };
}

const SYSTEM_PROMPT = `You are a South African utility bill analysis expert. You will receive either an image or extracted text from a utility bill (electricity, water, or municipal bill).

Analyze the bill and return a JSON object with this EXACT structure:

{
  "extracted": {
    "provider": "Name of the utility provider (e.g., City Power, Rand Water, Eskom, municipality name)",
    "accountNumber": "The account or meter number from the bill",
    "billingPeriod": "The billing period (e.g., 'Feb 2026 - Mar 2026')",
    "totalAmount": 1234.56,
    "usageKwh": 500,
    "usageKl": 15.5,
    "tariffRate": 2.85,
    "category": "electricity or water or municipal"
  },
  "flaggedItems": {
    "found": true,
    "items": [
      {
        "description": "Why this charge may be worth reviewing — use cautious language like 'may be higher than typical' or 'worth checking against your tariff schedule'",
        "typicalRange": "R80 - R150",
        "chargedAmount": 150.00,
        "difference": 50.00
      }
    ]
  },
  "savings": {
    "tips": [
      {
        "title": "Short actionable title",
        "description": "Detailed explanation of how to save money, specific to South African context",
        "potentialSaving": 200.00
      }
    ],
    "totalPotentialSaving": 500.00
  }
}

Rules:
- totalAmount must be a number in Rands (ZAR), not cents
- usageKwh: only include if electricity usage is shown
- usageKl: only include if water usage in kilolitres is shown
- tariffRate: the per-unit rate if visible
- category: must be "electricity", "water", or "municipal"
- For flaggedItems: only flag charges when you have reasonable grounds to believe they may be higher than typical. Use cautious, advisory language — say "may be higher than typical" or "worth checking", never state definitively that something is an overcharge. For typicalRange, provide a realistic range (e.g. "R80 - R150") rather than a single expected amount, and acknowledge that municipal tariffs vary significantly by area, property size, zoning, and tariff block. If nothing looks unusual, set found to false and items to an empty array. Err on the side of NOT flagging — only flag items where the difference is significant.
- For savings: provide 2-5 practical tips specific to South African households. Include potential monthly savings estimates in Rands.
- totalPotentialSaving must equal the sum of all tip potentialSaving values
- If you cannot read parts of the bill, make reasonable estimates and note uncertainty in descriptions
- Return ONLY valid JSON, no markdown fences or extra text`;

async function analyzeWithImage(filePath: string): Promise<string> {
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
            text: "Analyze this South African utility bill. Extract all visible data, flag any charges worth reviewing, and provide savings tips. Return the JSON analysis.",
          },
        ],
      },
    ],
    max_tokens: 2000,
    temperature: 0.2,
  });

  return response.choices[0]?.message?.content || "";
}

async function analyzeWithPdfText(filePath: string): Promise<string> {
  const absolutePath = path.resolve(filePath);
  const fileBuffer = fs.readFileSync(absolutePath);
  const parser = new PDFParse({ data: fileBuffer });
  const textResult = await parser.getText();
  const pdfText = textResult.text;
  await parser.destroy();

  if (!pdfText || pdfText.trim().length < 20) {
    throw new Error("Could not extract readable text from this PDF. Try uploading an image or a clearer PDF.");
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Here is the extracted text from a South African utility bill PDF. Analyze it and return the JSON analysis.\n\n---\n${pdfText.slice(0, 8000)}\n---`,
      },
    ],
    max_tokens: 2000,
    temperature: 0.2,
  });

  return response.choices[0]?.message?.content || "";
}

function parseAnalysisResponse(content: string): BillAnalysisResult {
  let cleaned = content.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned) as BillAnalysisResult;

  if (!parsed.extracted || !parsed.flaggedItems || !parsed.savings) {
    throw new Error("Incomplete analysis result from AI");
  }

  if (typeof parsed.extracted.totalAmount !== "number" || parsed.extracted.totalAmount <= 0) {
    throw new Error("Could not extract a valid total amount from the bill");
  }

  parsed.savings.totalPotentialSaving = parsed.savings.tips.reduce((sum, tip) => sum + (tip.potentialSaving || 0), 0);

  return parsed;
}

export async function analyzeBillImage(filePath: string): Promise<BillAnalysisResult> {
  const ext = path.extname(filePath).toLowerCase();
  const isPdf = ext === ".pdf";

  const rawContent = isPdf
    ? await analyzeWithPdfText(filePath)
    : await analyzeWithImage(filePath);

  return parseAnalysisResponse(rawContent);
}
