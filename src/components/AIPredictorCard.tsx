import React, { useState, useEffect } from "react";
import { AIPrediction } from "../types";
import { Brain, ShieldAlert, Cpu, HelpCircle, Activity, Gauge, HelpCircle as Help } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AIPredictorCardProps {
  history: number[];
  balance: number;
  currentBet: number;
  autoCashout: number;
}

export default function AIPredictorCard({ history, balance, currentBet, autoCashout }: AIPredictorCardProps) {
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoScan, setAutoScan] = useState(true);

  const fetchAIPrediction = async () => {
    if (history.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: history.slice(-20),
          currentBalance: balance,
          currentBet,
          autoCashout,
        }),
      });

      if (!response.ok) {
        throw new Error("Telemetry sync interrupted. Check connection.");
      }

      const data = await response.json();
      setPrediction(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to parse prediction telemetry.");
    } finally {
      setLoading(false);
    }
  };

  // Triggers prediction fetch whenever history updates
  useEffect(() => {
    if (autoScan && history.length > 0) {
      fetchAIPrediction();
    }
  }, [history.length, autoScan]);

  return (
    <div className="bg-zinc-900/90 border border-emerald-500/30 rounded-xl p-5 shadow-2xl relative overflow-hidden scanline-effect backdrop-blur-md" id="ai-predictor-card">
      {/* Background scan grid */}
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-emerald-500/20 pb-3 mb-4 relative z-10 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1 px-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 crt-flicker">
            <Brain className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-emerald-100 tracking-wide uppercase">AI Telemetry Predictor</h2>
            <p className="font-mono text-[10px] text-emerald-500/70">MODEL: gemini-3.5-flash // RADAR MODE</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScan}
              onChange={(e) => setAutoScan(e.target.checked)}
              className="sr-only peer"
            />
            <span className="w-3 h-3 rounded-full border border-emerald-500/50 bg-zinc-850 peer-checked:bg-emerald-500 inline-block peer-checked:shadow-[0_0_8px_#10b981] transition-all"></span>
            <span className="font-mono text-xs text-emerald-400">AUTO-SCAN</span>
          </label>

          <button
            onClick={fetchAIPrediction}
            disabled={loading}
            className="px-3 py-1 font-mono text-xs font-semibold rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-300 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.05)] cursor-pointer"
            id="ai-scan-trigger"
          >
            <Activity className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "CALIBRATING..." : "SCAN TELEMETRY"}
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="relative z-10 min-h-[220px] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {loading && !prediction ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10"
              key="loading-state"
            >
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full border border-emerald-500/10 animate-ping"></div>
                <div className="absolute inset-2 rounded-full border-t border-emerald-400/80 animate-spin"></div>
                <div className="absolute inset-4 rounded-full border-r border-emerald-300/40 animate-reverse-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-emerald-400 animate-pulse" />
                </div>
              </div>
              <p className="font-mono text-xs text-emerald-400 text-center tracking-widest animate-pulse">
                RECEIVING SHIELD PROPULSION FEEDBACK...<br />
                <span className="text-[10px] text-emerald-500/60 font-normal">DECRYPTING QUANTUM PROBABILITIES</span>
              </p>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 rounded-lg bg-red-950/20 border border-red-500/30 text-red-350 text-center space-y-2 py-8"
              key="error-state"
            >
              <ShieldAlert className="w-8 h-8 text-red-400 mx-auto animate-bounce" />
              <p className="font-mono text-sm uppercase tracking-wider font-bold">Telemetry Disruption</p>
              <p className="font-mono text-xs text-red-400/80 max-w-sm mx-auto">{error}</p>
              <p className="font-mono text-[9px] text-red-500/50">Ensure valid GEMINI_API_KEY environment variable is configured for real-time AI modeling. Currently defaulting to active backup sensors.</p>
            </motion.div>
          ) : prediction ? (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
              key="prediction-results"
            >
              {/* Telemetry overview ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-black/40 border border-zinc-800/80 p-3 rounded-lg font-mono">
                <div className="text-center sm:border-r sm:border-emerald-500/10">
                  <span className="text-[10px] block text-emerald-500/60 uppercase">PROGNOSTIC CAP</span>
                  <span className="text-xl font-bold font-display text-emerald-300">
                    {prediction.predictedMultiplier.toFixed(2)}x
                  </span>
                </div>
                <div className="text-center sm:border-r sm:border-emerald-500/10">
                  <span className="text-[10px] block text-emerald-500/60 uppercase">CONFIDENCE</span>
                  <span className={`text-xl font-bold font-display ${
                    prediction.confidence > 75 ? "text-emerald-400" :
                    prediction.confidence > 50 ? "text-yellow-400" : "text-amber-400"
                  }`}>
                    {prediction.confidence}%
                  </span>
                </div>
                <div className="text-center sm:border-r sm:border-emerald-500/10">
                  <span className="text-[10px] block text-emerald-500/60 uppercase">DRAFT SPEED</span>
                  <span className="text-xs font-bold text-zinc-300 truncate block px-1 pt-1.5" title={prediction.trendType}>
                    {prediction.trendType}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] block text-emerald-500/60 uppercase">STRATEGIC POSE</span>
                  <span className="text-xs font-bold text-emerald-400 block pt-1.5 truncate px-1" title={prediction.recommendedBetStrategy}>
                    {prediction.recommendedBetStrategy}
                  </span>
                </div>
              </div>

              {/* Rationale feedback */}
              <div className="bg-emerald-950/10 border border-emerald-500/20 p-3 rounded-lg">
                <span className="text-[9px] font-mono text-emerald-400 font-bold block uppercase mb-1 tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  AI PILOT COGNITIVE LOG
                </span>
                <p className="font-sans text-xs text-emerald-100/90 leading-relaxed italic">
                  &ldquo;{prediction.explanation}&rdquo;
                </p>
              </div>

              {/* Crash Risk Probabilities */}
              <div>
                <span className="text-[10px] font-mono text-emerald-500/70 uppercase block mb-2 tracking-wider">
                  STATISTICAL FLIGHT VACUUM COLLAPSE PROBABILITY
                </span>
                <div className="space-y-2 font-mono">
                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-300 mb-0.5">
                      <span>CRASH BELOW 1.50x (Low-Altitude Risk)</span>
                      <span className={prediction.probabilities.crashBelow1_5 > 45 ? "text-red-400" : "text-emerald-400"}>
                        {prediction.probabilities.crashBelow1_5}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          prediction.probabilities.crashBelow1_5 > 45 ? "bg-red-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${prediction.probabilities.crashBelow1_5}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-300 mb-0.5">
                      <span>CRASH BELOW 2.00x (Standard Flight)</span>
                      <span className={prediction.probabilities.crashBelow2_0 > 65 ? "text-red-400" : "text-emerald-400"}>
                        {prediction.probabilities.crashBelow2_0}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500 bg-emerald-500/80 rounded-full"
                        style={{ width: `${prediction.probabilities.crashBelow2_0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-300 mb-0.5">
                      <span>CRASH BELOW 5.00x (High-Altitude Threat)</span>
                      <span className="text-emerald-400">
                        {prediction.probabilities.crashBelow5_0}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500 bg-emerald-600/50 rounded-full"
                        style={{ width: `${prediction.probabilities.crashBelow5_0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-10"
              key="empty-state"
            >
              <HelpCircle className="w-10 h-10 text-emerald-500/30 mb-2 animate-bounce" />
              <p className="font-mono text-xs text-zinc-500 text-center uppercase tracking-wider">
                FLIGHT LOGGER STANDBY
              </p>
              <p className="font-sans text-[11px] text-zinc-600 text-center max-w-xs mt-1">
                Launches predictions automatically once the flight simulation registers active crash rounds.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Retro indicator flash in lower margin */}
      <div className="mt-4 pt-3 border-t border-emerald-500/10 font-mono text-[9px] text-emerald-500/50 flex justify-between tracking-widest relative z-10 uppercase">
        <span>RADAR SCAN: ACTIVE</span>
        <span>SYS STATUS: SYNCHRONIZED</span>
      </div>
    </div>
  );
}
