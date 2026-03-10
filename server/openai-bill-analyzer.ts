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

const MAX_STREAMS_TO_SCAN = 30;
const MAX_DECOMPRESSED_BYTES = 2 * 1024 * 1024;
const MAX_STREAM_RAW_BYTES = 500 * 1024;

function extractXfaData(fileBuffer: Buffer): string | null {
  const zlib = require("zlib");
  const str = fileBuffer.toString("binary");

  if (str.indexOf("XFA") === -1) return null;

  const streamPairs: { start: number; end: number }[] = [];
  const streamMarker = "stream\n";
  const streamMarkerR = "stream\r\n";
  const endMarker = "\nendstream";
  const endMarkerR = "\r\nendstream";
  let searchPos = 0;

  while (streamPairs.length < MAX_STREAMS_TO_SCAN) {
    let startIdx = str.indexOf(streamMarkerR, searchPos);
    let markerLen = streamMarkerR.length;
    if (startIdx === -1) {
      startIdx = str.indexOf(streamMarker, searchPos);
      markerLen = streamMarker.length;
    }
    if (startIdx === -1) break;

    const dataStart = startIdx + markerLen;
    let endIdx = str.indexOf(endMarkerR, dataStart);
    if (endIdx === -1) endIdx = str.indexOf(endMarker, dataStart);
    if (endIdx === -1) break;

    const size = endIdx - dataStart;
    if (size > 0 && size <= MAX_STREAM_RAW_BYTES) {
      streamPairs.push({ start: dataStart, end: endIdx });
    }
    searchPos = endIdx + 10;
  }

  const xmlParts: string[] = [];
  let totalDecompressed = 0;

  for (const pair of streamPairs) {
    const raw = fileBuffer.slice(pair.start, pair.end);
    try {
      const decompressed = zlib.inflateSync(raw, { maxOutputLength: MAX_DECOMPRESSED_BYTES });
      const text = decompressed.toString("utf-8");
      if (text.includes("<xfa:data") || text.includes("datasets")) {
        xmlParts.push(text);
        totalDecompressed += decompressed.length;
        if (totalDecompressed > MAX_DECOMPRESSED_BYTES) break;
      }
    } catch {}
  }

  if (xmlParts.length === 0) return null;

  const combined = xmlParts.join("\n");
  return combined.length > 100 ? combined : null;
}

async function analyzeWithPdfText(filePath: string): Promise<string> {
  const absolutePath = path.resolve(filePath);
  const fileBuffer = fs.readFileSync(absolutePath);
  let pdfText = "";
  let parser: InstanceType<typeof PDFParse> | null = null;

  try {
    parser = new PDFParse({ data: fileBuffer });
    const textResult = await parser.getText();
    pdfText = textResult.text || "";
  } catch (e) {
    console.log("[Bill Analyzer] PDF text extraction failed:", (e as Error).message);
  } finally {
    if (parser) {
      try { await parser.destroy(); } catch {}
    }
  }

  const isPlaceholder = pdfText.toLowerCase().includes("adobe reader") ||
    pdfText.toLowerCase().includes("requires adobe") ||
    pdfText.toLowerCase().includes("viewing environment");
  const hasUsefulText = pdfText.trim().length >= 50 && !isPlaceholder;

  if (!hasUsefulText) {
    const xfaData = extractXfaData(fileBuffer);
    if (xfaData) {
      console.log("[Bill Analyzer] Using XFA XML data extraction (" + xfaData.length + " chars)");
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Here is XML data extracted from a South African municipal/utility bill PDF (XFA format). Parse the XML fields to extract billing information and return the JSON analysis.\n\n---\n${xfaData.slice(0, 12000)}\n---`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      });
      return response.choices[0]?.message?.content || "";
    }

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

  const parsed = JSON.parse(cleaned) as any;

  if ((parsed as any).overcharges && !parsed.flaggedItems) {
    const oc = (parsed as any).overcharges;
    parsed.flaggedItems = {
      found: oc.found ?? false,
      items: (oc.items || []).map((item: any) => ({
        description: item.description || "",
        typicalRange: item.typicalRange || (item.expectedAmount != null ? `R${item.expectedAmount}` : "N/A"),
        chargedAmount: item.chargedAmount || 0,
        difference: item.difference || 0,
      })),
    };
    delete (parsed as any).overcharges;
  }

  if (!parsed.extracted || !parsed.flaggedItems || !parsed.savings) {
    console.log("[Bill Analyzer] Incomplete AI response keys:", Object.keys(parsed));
    throw new Error("Incomplete analysis result from AI");
  }

  if (typeof parsed.extracted.totalAmount !== "number" || parsed.extracted.totalAmount <= 0) {
    console.log("[Bill Analyzer] Invalid totalAmount:", parsed.extracted.totalAmount, "| extracted:", JSON.stringify(parsed.extracted).slice(0, 300));
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

  try {
    return parseAnalysisResponse(rawContent);
  } catch (e) {
    console.log("[Bill Analyzer] AI raw response (first 500 chars):", rawContent.slice(0, 500));
    throw e;
  }
}
