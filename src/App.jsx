import { useState } from "react";

const BACKEND = "https://cs2-coach-backend.onrender.com";

const DEFAULT_STATS = {
  kd: "0.75", winrate: "23", hltv: "0.88", hs: "39",
  adr: "72", clutch1v1: "25", entrySuccess: "13", rank: "7974", matches: "22",
};

const FIELDS = [
  { key: "kd", label: "K/D Ratio" },
  { key: "winrate", label: "Win Rate %" },
  { key: "hltv", label: "HLTV Rating" },
  { key: "hs", label: "Headshot %" },
  { key: "adr", label: "ADR" },
  { key: "clutch1v1", label: "1v1 Clutch %" },
  { key: "entrySuccess", label: "Entry Success %" },
  { key: "rank", label: "Premier Rank" },
  { key: "matches", label: "Matches Played" },
];

const LEVEL_COLOR = { "Новичок": "#ff4444", "Средний": "#ffaa00", "Хороший": "#44ff88", "Про": "#00aaff" };

export default function App() {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("overview");
  const [errorMsg, setErrorMsg] = useState(null);

  async function analyze() {
    setLoading(true);
    setAnalysis(null);
    setErrorMsg(null);

    const callAPI = async () => {
      const res = await fetch(`${BACKEND}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stats)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const raw = data.result || "";
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("JSON не найден");
      return JSON.parse(m[0]);
    };

    try {
      let result = null, lastError = null;
      for (let i = 1; i <= 3; i++) {
        try { result = await callAPI(); break; }
        catch (e) { lastError = e; if (i < 3) await new Promise(r => setTimeout(r, 600)); }
      }
      if (!result) throw lastError;
      setAnalysis(result);
      setTab("overview");
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  const lc = LEVEL_COLOR[analysis?.level] || "#00ff66";

  return (
    <div style={{ minHeight: "100vh", background: "#060810", fontFamily: "'Courier New', monospace", color: "#c8d0e0" }}>
      <style>{`
        @keyframes blink{0%,100%{opacity:.1}50%{opacity:1}}
        @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "36px 16px 80px" }}>

        <div style={{ marginBottom: "32px", borderBottom: "1px solid #1a2030", paddingBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{ width: "7px", height: "7px", background: "#00ff66", borderRadius: "50%", boxShadow: "0 0 8px #00ff66" }} />
            <span style={{ fontSize: "11px", letterSpacing: "4px", color: "#00ff66" }}>CS2 AI ТРЕНЕР</span>
          </div>
          <h1 style={{ fontSize: "clamp(24px, 5vw, 40px)", fontWeight: 400, margin: "0 0 4px", color: "#e8eef8" }}>Разбор твоей игры</h1>
          <p style={{ color: "#445", fontSize: "12px", margin: 0 }}>Введи статы → получи план от AI-тренера</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(165px,1fr))", gap: "10px", marginBottom: "18px" }}>
          {FIELDS.map(f => (
            <div key={f.key} style={{ background: "#0c1018", border: "1px solid #1a2030", padding: "10px 12px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#445", marginBottom: "4px", textTransform: "uppercase" }}>{f.label}</div>
              <input value={stats[f.key]} onChange={e => setStats(p => ({ ...p, [f.key]: e.target.value }))}
                style={{ width: "100%", background: "transparent", border: "none", color: "#00ff66", fontSize: "18px", fontFamily: "'Courier New',monospace", outline: "none", padding: 0 }} />
            </div>
          ))}
        </div>

        <button onClick={analyze} disabled={loading} style={{
          width: "100%", padding: "15px", marginBottom: "24px",
          background: loading ? "#0c1018" : "#00ff66", color: loading ? "#445" : "#060810",
          border: `1px solid ${loading ? "#1a2030" : "#00ff66"}`,
          cursor: loading ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 700,
          letterSpacing: "3px", fontFamily: "'Courier New',monospace", transition: "all .2s"
        }}>
          {loading ? "АНАЛИЗИРУЮ..." : "ПОЛУЧИТЬ РАЗБОР ОТ ТРЕНЕРА"}
        </button>

        {loading && (
          <div style={{ textAlign: "center", padding: "32px", color: "#334" }}>
            <div style={{ fontSize: "11px", letterSpacing: "2px", marginBottom: "12px" }}>ТРЕНЕР ИЗУЧАЕТ СТАТИСТИКУ</div>
            <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
              {[0,1,2].map(i => <div key={i} style={{ width: "6px", height: "6px", background: "#00ff66", borderRadius: "50%", animation: `blink 1s ${i*.3}s infinite` }} />)}
            </div>
          </div>
        )}

        {errorMsg && (
          <div style={{ border: "1px solid #ff4444", padding: "14px", color: "#ff4444", fontSize: "12px" }}>
            Ошибка: {errorMsg}
          </div>
        )}

        {analysis && (
          <div style={{ animation: "up .4s ease both" }}>
            <div style={{ background: "#0c1018", border: "1px solid #1a2030", borderLeft: `3px solid ${lc}`, padding: "20px", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <span style={{ padding: "3px 10px", fontSize: "11px", letterSpacing: "2px", background: lc + "22", color: lc, border: `1px solid ${lc}` }}>
                  {analysis.level?.toUpperCase()}
                </span>
                <span style={{ fontSize: "12px", color: "#445" }}>→ {analysis.goal}</span>
              </div>
              <div style={{ fontSize: "15px", color: "#e8eef8", marginBottom: "10px" }}>{analysis.overall}</div>
              <div style={{ fontSize: "13px", color: "#ff6644", background: "#ff664411", padding: "9px 12px", borderLeft: "2px solid #ff6644" }}>
                ⚠ {analysis.mainProblem}
              </div>
            </div>

            <div style={{ display: "flex", marginBottom: "12px", borderBottom: "1px solid #1a2030" }}>
              {[["overview","СЛАБЫЕ / СИЛЬНЫЕ"],["plan","ПЛАН НА НЕДЕЛЮ"]].map(([t,l]) => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "8px 16px", background: "transparent", color: tab === t ? "#00ff66" : "#445",
                  border: "none", borderBottom: `2px solid ${tab === t ? "#00ff66" : "transparent"}`,
                  cursor: "pointer", fontSize: "11px", letterSpacing: "2px", fontFamily: "'Courier New',monospace", marginBottom: "-1px"
                }}>{l}</button>
              ))}
            </div>

            {tab === "overview" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#ff6644", marginBottom: "8px" }}>СЛАБЫЕ МЕСТА</div>
                  {analysis.weaknesses?.map((w, i) => (
                    <div key={i} style={{ background: "#0c1018", border: "1px solid #1a2030", borderLeft: "2px solid #ff6644", padding: "12px", marginBottom: "8px" }}>
                      <div style={{ fontSize: "11px", color: "#ff6644", marginBottom: "4px" }}>{w.stat?.toUpperCase()}</div>
                      <div style={{ fontSize: "12px", color: "#778", marginBottom: "6px", lineHeight: 1.5 }}>{w.problem}</div>
                      <div style={{ fontSize: "12px", color: "#00ff66", lineHeight: 1.5 }}>→ {w.fix}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#00ff66", marginBottom: "8px" }}>СИЛЬНЫЕ СТОРОНЫ</div>
                  {analysis.strengths?.map((s, i) => (
                    <div key={i} style={{ background: "#0c1018", border: "1px solid #1a2030", borderLeft: "2px solid #00ff66", padding: "12px", marginBottom: "8px" }}>
                      <div style={{ fontSize: "11px", color: "#00ff66", marginBottom: "4px" }}>{s.stat?.toUpperCase()}</div>
                      <div style={{ fontSize: "12px", color: "#778", lineHeight: 1.5 }}>{s.comment}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "plan" && (
              <div>
                <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#00aaff", marginBottom: "12px" }}>ПЛАН ТРЕНИРОВОК</div>
                {analysis.plan?.map((day, i) => (
                  <div key={i} style={{ background: "#0c1018", border: "1px solid #1a2030", padding: "13px 16px", marginBottom: "8px", display: "flex", gap: "13px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: "22px", height: "22px", background: "#00aaff22", border: "1px solid #00aaff44", color: "#00aaff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>{i+1}</div>
                    <div style={{ fontSize: "13px", color: "#c8d0e0", lineHeight: 1.6 }}>{day}</div>
                  </div>
                ))}
                <div style={{ marginTop: "14px", padding: "13px", background: "#00aaff11", border: "1px solid #00aaff33", fontSize: "13px", color: "#00aaff" }}>
                  🎯 Цель через месяц: {analysis.goal}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
