import OpenAI from "openai";
import fs from "fs";
import path from "path";

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
  overcharges: {
    found: boolean;
    items: { description: string; expectedAmount: number; chargedAmount: number; difference: number }[];
  };
  savings: {
    tips: { title: string; description: string; potentialSaving: number }[];
    totalPotentialSaving: number;
  };
}

const SYSTEM_PROMPT = `You are a South African utility bill analysis expert. You will receive an image of a utility bill (electricity, water, or municipal bill).

Analyze the bill image and return a JSON object with this EXACT structure:

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
  "overcharges": {
    "found": true,
    "items": [
      {
        "description": "Clear description of the overcharge",
        "expectedAmount": 100.00,
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
- For overcharges: compare line items against known South African municipal tariff guidelines. Flag service charges, VAT calculations, or rates that seem excessive. If nothing suspicious, set found to false and items to an empty array.
- For savings: provide 2-5 practical tips specific to South African households. Include potential monthly savings estimates in Rands.
- totalPotentialSaving must equal the sum of all tip potentialSaving values
- If you cannot read parts of the bill, make reasonable estimates and note uncertainty in descriptions
- Return ONLY valid JSON, no markdown fences or extra text`;

export async function analyzeBillImage(filePath: string): Promise<BillAnalysisResult> {
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
            text: "Analyze this South African utility bill. Extract all visible data, check for overcharges, and provide savings tips. Return the JSON analysis.",
          },
        ],
      },
    ],
    max_tokens: 2000,
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content || "";

  let cleaned = content.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned) as BillAnalysisResult;

  if (!parsed.extracted || !parsed.overcharges || !parsed.savings) {
    throw new Error("Incomplete analysis result from AI");
  }

  if (typeof parsed.extracted.totalAmount !== "number" || parsed.extracted.totalAmount <= 0) {
    throw new Error("Could not extract a valid total amount from the bill");
  }

  parsed.savings.totalPotentialSaving = parsed.savings.tips.reduce((sum, tip) => sum + (tip.potentialSaving || 0), 0);

  return parsed;
}
