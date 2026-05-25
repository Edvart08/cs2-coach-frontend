import { useState, useEffect, useRef } from "react";

const BACKEND = "https://cs2-coach-backend.onrender.com";

const DEFAULT_STATS = {
  kd:"0.75", winrate:"23", hltv:"0.88", hs:"39",
  adr:"72", clutch1v1:"25", entrySuccess:"13", rank:"7974", matches:"22",
};

const FIELDS = [
  {key:"kd",label:"K/D Ratio"},{key:"winrate",label:"Win Rate %"},
  {key:"hltv",label:"HLTV Rating"},{key:"hs",label:"Headshot %"},
  {key:"adr",label:"ADR"},{key:"clutch1v1",label:"1v1 Clutch %"},
  {key:"entrySuccess",label:"Entry Success %"},{key:"rank",label:"Premier Rank"},
  {key:"matches",label:"Matches Played"},
];

const LEVEL_COLOR = {Новичок:"#ff4444",Средний:"#f5c518",Хороший:"#f5c518",Про:"#f5c518"};

const css = `
  @keyframes blink{0%,100%{opacity:.1}50%{opacity:1}}
  @keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{box-shadow:0 0 6px #f5c518aa}50%{box-shadow:0 0 18px #f5c518}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  *{box-sizing:border-box;} input:focus{outline:none;}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:#0a0a0a;}
  ::-webkit-scrollbar-thumb{background:#f5c518;}
  .stat-card:hover{border-color:#f5c51844 !important;}
  .tab-btn:hover{color:#f5c518aa !important;}
  .lb-row:hover{background:#161608 !important;}
  .skip-btn:hover{color:#f5c518 !important;}
  .steam-btn:hover{background:#2a6496 !important; transform:scale(1.02);}
  .analyze-btn:hover:not(:disabled){background:#ffd900 !important;}
`;

// ── Steam Popup ──────────────────────────────────────────────────────────────
function SteamPopup({ onLogin, onSkip }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center",
      animation:"fadeIn .3s ease"
    }}>
      <div style={{
        background:"#0e0e08", border:"1px solid #f5c51833",
        borderTop:"2px solid #f5c518", padding:"44px 40px", maxWidth:"420px",
        width:"90%", textAlign:"center", animation:"slideUp .4s ease",
        position:"relative"
      }}>
        {/* CS2 logo placeholder */}
        <div style={{marginBottom:"24px"}}>
          <div style={{
            width:"60px", height:"60px", margin:"0 auto 16px",
            background:"#f5c51814", border:"1px solid #f5c51844",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"28px"
          }}>🎯</div>
          <div style={{fontSize:"10px", letterSpacing:"5px", color:"#f5c518", marginBottom:"8px"}}>
            CS2 AI ТРЕНЕР
          </div>
          <h2 style={{color:"#f0ead0", fontWeight:400, margin:"0 0 8px", fontSize:"20px", letterSpacing:"1px"}}>
            Войди через Steam
          </h2>
          <p style={{color:"#3a3a28", fontSize:"12px", lineHeight:1.6, margin:0}}>
            Получи свои реальные статы из CS2 автоматически — K/D, Win Rate, Headshot % и другие
          </p>
        </div>

        {/* Steam button */}
        <button className="steam-btn" onClick={onLogin} style={{
          width:"100%", padding:"14px", marginBottom:"12px",
          background:"#1b6090", color:"#fff", border:"none",
          cursor:"pointer", fontSize:"13px", fontWeight:700,
          letterSpacing:"2px", fontFamily:"'Courier New',monospace",
          transition:"all .2s", display:"flex", alignItems:"center",
          justifyContent:"center", gap:"10px"
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z"/>
          </svg>
          ВОЙТИ ЧЕРЕЗ STEAM
        </button>

        <button className="skip-btn" onClick={onSkip} style={{
          background:"transparent", border:"none", color:"#2a2a18",
          cursor:"pointer", fontSize:"11px", letterSpacing:"2px",
          fontFamily:"'Courier New',monospace", padding:"8px",
          transition:"color .2s"
        }}>
          ПРОПУСТИТЬ → ВВЕСТИ ВРУЧНУЮ
        </button>

        <div style={{
          marginTop:"20px", paddingTop:"16px", borderTop:"1px solid #1a1a10",
          fontSize:"10px", color:"#2a2a18", letterSpacing:"1px"
        }}>
          Нужен Steam API ключ в настройках сервера для загрузки статов
        </div>
      </div>
    </div>
  );
}

// ── Leaderboard ──────────────────────────────────────────────────────────────
function Leaderboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND}/leaderboard`)
      .then(r => r.json())
      .then(d => { setData(d.leaderboard || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{textAlign:"center", padding:"60px", color:"#3a3a28"}}>
      <div style={{fontSize:"10px", letterSpacing:"3px", marginBottom:"14px"}}>ЗАГРУЗКА ЛИДЕРОВ</div>
      <div style={{display:"flex", justifyContent:"center", gap:"8px"}}>
        {[0,1,2].map(i=>(
          <div key={i} style={{width:"7px",height:"7px",background:"#f5c518",borderRadius:"50%",animation:`blink 1s ${i*.3}s infinite`}}/>
        ))}
      </div>
    </div>
  );

  if (data.length === 0) return (
    <div style={{textAlign:"center", padding:"60px", color:"#3a3a28"}}>
      <div style={{fontSize:"32px", marginBottom:"12px"}}>🏆</div>
      <div style={{fontSize:"11px", letterSpacing:"3px"}}>ТАБЛИЦА ПУСТА</div>
      <div style={{fontSize:"11px", color:"#2a2a18", marginTop:"8px"}}>
        Войди через Steam и добавь себя в лидеры
      </div>
    </div>
  );

  return (
    <div style={{animation:"up .4s ease both"}}>
      {/* Header */}
      <div style={{
        display:"grid", gridTemplateColumns:"40px 1fr 90px 70px 70px 70px 80px",
        gap:"8px", padding:"8px 14px",
        fontSize:"9px", letterSpacing:"2px", color:"#3a3a28", borderBottom:"1px solid #1e1e12"
      }}>
        <div>#</div><div>ИГРОК</div><div>RANK</div>
        <div>K/D</div><div>WIN%</div><div>HS%</div><div>УРОВЕНЬ</div>
      </div>

      {data.map((p, i) => {
        const lc = LEVEL_COLOR[p.level] || "#f5c518";
        return (
          <div key={i}>
            <div className="lb-row" onClick={() => setSelected(selected === i ? null : i)} style={{
              display:"grid", gridTemplateColumns:"40px 1fr 90px 70px 70px 70px 80px",
              gap:"8px", padding:"12px 14px", cursor:"pointer",
              borderBottom:"1px solid #1e1e12", transition:"background .15s",
              background: selected === i ? "#161608" : "transparent"
            }}>
              <div style={{color:"#3a3a28", fontSize:"13px"}}>{i+1}</div>
              <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
                {p.avatar
                  ? <img src={p.avatar} alt="" style={{width:"28px",height:"28px",borderRadius:"2px",border:"1px solid #f5c51833"}}/>
                  : <div style={{width:"28px",height:"28px",background:"#f5c51814",border:"1px solid #f5c51833",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px"}}>👤</div>
                }
                <span style={{fontSize:"13px", color:"#c8b870"}}>{p.username}</span>
              </div>
              <div style={{fontSize:"13px", color:"#f5c518"}}>{p.stats?.rank || "—"}</div>
              <div style={{fontSize:"13px", color:"#c8b870"}}>{p.stats?.kd || "—"}</div>
              <div style={{fontSize:"13px", color:"#c8b870"}}>{p.stats?.winrate || "—"}%</div>
              <div style={{fontSize:"13px", color:"#c8b870"}}>{p.stats?.hs || "—"}%</div>
              <div style={{padding:"2px 8px", background:lc+"18", color:lc, border:`1px solid ${lc}44`, fontSize:"9px", letterSpacing:"2px", display:"inline-block"}}>
                {p.level}
              </div>
            </div>

            {/* Expanded row */}
            {selected === i && (
              <div style={{
                background:"#0c0c06", borderBottom:"1px solid #1e1e12",
                padding:"16px", animation:"up .2s ease both"
              }}>
                <div style={{fontSize:"9px", letterSpacing:"3px", color:"#f5c518", marginBottom:"10px"}}>ПОЛНЫЕ СТАТЫ</div>
                <div style={{display:"flex", flexWrap:"wrap", gap:"8px", marginBottom:"10px"}}>
                  {FIELDS.map(f => (
                    <div key={f.key} style={{background:"#111108", border:"1px solid #1e1e12", padding:"8px 12px", minWidth:"110px"}}>
                      <div style={{fontSize:"9px", color:"#3a3a28", letterSpacing:"1px", marginBottom:"3px"}}>{f.label.toUpperCase()}</div>
                      <div style={{fontSize:"16px", color:"#f5c518"}}>{p.stats?.[f.key] || "—"}</div>
                    </div>
                  ))}
                </div>
                {p.overall && (
                  <div style={{fontSize:"12px", color:"#4a4a38", borderLeft:"2px solid #f5c51833", paddingLeft:"10px", fontStyle:"italic"}}>
                    "{p.overall}"
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("overview");
  const [mainTab, setMainTab] = useState("coach"); // "coach" | "leaderboard"
  const [errorMsg, setErrorMsg] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [player, setPlayer] = useState(null);
  const [addedToLB, setAddedToLB] = useState(false);

  // Show popup after 1.2s
  useEffect(() => {
    const t = setTimeout(() => setShowPopup(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // Listen for Steam postMessage
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.player) {
        setPlayer(e.data.player);
        setStats(prev => {
          const s = {...prev};
          Object.entries(e.data.stats || {}).forEach(([k,v]) => { if(v && v !== "0") s[k] = v; });
          return s;
        });
        setShowPopup(false);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const openSteamLogin = () => {
    window.open(`${BACKEND}/auth/steam`, "steam-login", "width=600,height=700,left=400,top=100");
  };

  async function analyze() {
    setLoading(true); setAnalysis(null); setErrorMsg(null); setAddedToLB(false);
    const call = async () => {
      const res = await fetch(`${BACKEND}/analyze`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(stats)
      });
      const d = await res.json();
      if (d.error && !d.result) throw new Error(d.error);
      const m = (d.result||"").match(/\{[\s\S]*\}/);
      if (!m) throw new Error("JSON не найден");
      return JSON.parse(m[0]);
    };
    try {
      let result = null, lastErr = null;
      for (let i=0; i<3; i++) {
        try { result = await call(); break; }
        catch(e) { lastErr=e; if(i<2) await new Promise(r=>setTimeout(r,600)); }
      }
      if (!result) throw lastErr;
      setAnalysis(result); setTab("overview");
    } catch(e) { setErrorMsg(e.message); }
    finally { setLoading(false); }
  }

  async function addToLeaderboard() {
    if (!player || !analysis) return;
    await fetch(`${BACKEND}/leaderboard/add`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        steamid: player.steamid, username: player.username,
        avatar: player.avatar, stats, level: analysis.level, overall: analysis.overall
      })
    });
    setAddedToLB(true);
  }

  const lc = LEVEL_COLOR[analysis?.level] || "#f5c518";

  return (
    <div style={{minHeight:"100vh", background:"#0a0a0a", fontFamily:"'Courier New',monospace", color:"#c8c8b0"}}>
      <style>{css}</style>

      {showPopup && <SteamPopup onLogin={openSteamLogin} onSkip={() => setShowPopup(false)} />}

      <div style={{height:"3px", background:"linear-gradient(90deg,#f5c518,#c9a000,#f5c518)"}}/>

      <div style={{maxWidth:"900px", margin:"0 auto", padding:"36px 20px 80px"}}>

        {/* Header */}
        <div style={{marginBottom:"28px", display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:"12px"}}>
          <div>
            <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px"}}>
              <div style={{width:"8px",height:"8px",background:"#f5c518",borderRadius:"50%",animation:"pulse 2s infinite"}}/>
              <span style={{fontSize:"11px", letterSpacing:"5px", color:"#f5c518", fontWeight:700}}>CS2 AI ТРЕНЕР</span>
            </div>
            <h1 style={{fontSize:"clamp(24px,5vw,40px)", fontWeight:400, margin:"0 0 4px", color:"#f0ead0", letterSpacing:"2px"}}>
              Разбор твоей игры
            </h1>
          </div>

          {/* Player badge (if logged in) */}
          {player ? (
            <div style={{display:"flex", alignItems:"center", gap:"10px", background:"#111108", border:"1px solid #f5c51833", padding:"10px 14px"}}>
              {player.avatar && <img src={player.avatar} alt="" style={{width:"32px",height:"32px",borderRadius:"2px"}}/>}
              <div>
                <div style={{fontSize:"9px", letterSpacing:"2px", color:"#f5c518"}}>STEAM</div>
                <div style={{fontSize:"13px", color:"#c8b870"}}>{player.username}</div>
              </div>
            </div>
          ) : (
            <button onClick={openSteamLogin} style={{
              background:"#1b6090", color:"#fff", border:"none",
              padding:"10px 18px", cursor:"pointer", fontSize:"11px",
              fontWeight:700, letterSpacing:"2px", fontFamily:"'Courier New',monospace"
            }}>ВОЙТИ ЧЕРЕЗ STEAM</button>
          )}
        </div>

        {/* Main tabs */}
        <div style={{display:"flex", borderBottom:"1px solid #1e1e12", marginBottom:"20px"}}>
          {[["coach","ТРЕНЕР"],["leaderboard","🏆 ЛИДЕРЫ"]].map(([t,l])=>(
            <button key={t} className="tab-btn" onClick={()=>setMainTab(t)} style={{
              padding:"10px 22px", background:"transparent",
              color: mainTab===t ? "#f5c518" : "#3a3a28",
              border:"none", borderBottom:`2px solid ${mainTab===t?"#f5c518":"transparent"}`,
              cursor:"pointer", fontSize:"11px", letterSpacing:"2px",
              fontFamily:"'Courier New',monospace", marginBottom:"-1px", transition:"color .15s"
            }}>{l}</button>
          ))}
        </div>

        {/* ── Coach Tab ── */}
        {mainTab === "coach" && (
          <>
            {/* Stats grid */}
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:"2px", marginBottom:"2px"}}>
              {FIELDS.map(f=>(
                <div key={f.key} className="stat-card" style={{
                  background:"#111108", border:"1px solid #1e1e12", padding:"12px 14px", transition:"border-color .2s"
                }}>
                  <div style={{fontSize:"9px", letterSpacing:"2px", color:"#3a3a28", marginBottom:"6px", textTransform:"uppercase"}}>{f.label}</div>
                  <input value={stats[f.key]} onChange={e=>setStats(p=>({...p,[f.key]:e.target.value}))}
                    style={{width:"100%",background:"transparent",border:"none",color:"#f5c518",fontSize:"20px",fontFamily:"'Courier New',monospace",padding:0}}/>
                </div>
              ))}
            </div>

            {player && (
              <div style={{fontSize:"10px", color:"#3a3a28", padding:"8px 0", letterSpacing:"1px"}}>
                ↑ K/D, Win%, HS% загружены из Steam · HLTV, ADR, Clutch — заполни вручную
              </div>
            )}

            <button className="analyze-btn" onClick={analyze} disabled={loading} style={{
              width:"100%", padding:"16px", marginTop:"4px", marginBottom:"24px",
              background: loading?"#111108":"#f5c518", color: loading?"#3a3a28":"#0a0a0a",
              border:`1px solid ${loading?"#1e1e12":"#f5c518"}`,
              cursor: loading?"not-allowed":"pointer", fontSize:"12px", fontWeight:700,
              letterSpacing:"4px", fontFamily:"'Courier New',monospace", transition:"all .15s"
            }}>
              {loading ? "АНАЛИЗИРУЮ..." : "ПОЛУЧИТЬ РАЗБОР ОТ ТРЕНЕРА"}
            </button>

            {loading && (
              <div style={{textAlign:"center", padding:"32px"}}>
                <div style={{fontSize:"10px", letterSpacing:"3px", color:"#3a3a28", marginBottom:"14px"}}>ТРЕНЕР ИЗУЧАЕТ СТАТИСТИКУ</div>
                <div style={{display:"flex", justifyContent:"center", gap:"8px"}}>
                  {[0,1,2].map(i=><div key={i} style={{width:"7px",height:"7px",background:"#f5c518",borderRadius:"50%",animation:`blink 1s ${i*.3}s infinite`}}/>)}
                </div>
              </div>
            )}

            {errorMsg && (
              <div style={{border:"1px solid #ff444466", padding:"14px", color:"#ff6644", fontSize:"12px", background:"#ff444408"}}>
                ⚠ {errorMsg}
              </div>
            )}

            {analysis && (
              <div style={{animation:"up .4s ease both"}}>
                {/* Overview card */}
                <div style={{background:"#111108", border:"1px solid #1e1e12", borderLeft:`3px solid ${lc}`, padding:"22px", marginBottom:"2px"}}>
                  <div style={{display:"flex", alignItems:"center", gap:"12px", marginBottom:"14px", flexWrap:"wrap"}}>
                    <span style={{padding:"4px 12px", fontSize:"10px", letterSpacing:"3px", fontWeight:700, background:lc+"18", color:lc, border:`1px solid ${lc}44`}}>
                      {analysis.level?.toUpperCase()}
                    </span>
                    <span style={{fontSize:"11px", color:"#3a3a28"}}>→ {analysis.goal}</span>

                    {/* Add to leaderboard */}
                    {player && !addedToLB && (
                      <button onClick={addToLeaderboard} style={{
                        marginLeft:"auto", padding:"4px 14px", background:"#f5c51814",
                        border:"1px solid #f5c51844", color:"#f5c518",
                        cursor:"pointer", fontSize:"10px", letterSpacing:"2px",
                        fontFamily:"'Courier New',monospace"
                      }}>+ В ЛИДЕРЫ</button>
                    )}
                    {addedToLB && <span style={{marginLeft:"auto", fontSize:"10px", color:"#f5c518", letterSpacing:"2px"}}>✓ ДОБАВЛЕНО В ЛИДЕРЫ</span>}
                  </div>
                  <div style={{fontSize:"14px", color:"#d0c890", marginBottom:"12px", lineHeight:1.6}}>{analysis.overall}</div>
                  <div style={{fontSize:"12px", color:"#ff7755", background:"#ff440009", padding:"10px 14px", borderLeft:"2px solid #ff554433"}}>
                    ⚠ {analysis.mainProblem}
                  </div>
                </div>

                {/* Sub-tabs */}
                <div style={{display:"flex", borderBottom:"1px solid #1e1e12", marginBottom:"2px"}}>
                  {[["overview","СЛАБЫЕ / СИЛЬНЫЕ"],["plan","ПЛАН НА НЕДЕЛЮ"]].map(([t,l])=>(
                    <button key={t} className="tab-btn" onClick={()=>setTab(t)} style={{
                      padding:"10px 20px", background:"transparent",
                      color: tab===t?"#f5c518":"#3a3a28",
                      border:"none", borderBottom:`2px solid ${tab===t?"#f5c518":"transparent"}`,
                      cursor:"pointer", fontSize:"10px", letterSpacing:"2px",
                      fontFamily:"'Courier New',monospace", marginBottom:"-1px", transition:"color .15s"
                    }}>{l}</button>
                  ))}
                </div>

                {tab === "overview" && (
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"2px"}}>
                    <div>
                      <div style={{fontSize:"9px", letterSpacing:"3px", color:"#ff6644", padding:"10px 0 8px"}}>СЛАБЫЕ МЕСТА</div>
                      {analysis.weaknesses?.map((w,i)=>(
                        <div key={i} style={{background:"#111108", border:"1px solid #1e1e12", borderLeft:"2px solid #ff554433", padding:"14px", marginBottom:"2px"}}>
                          <div style={{fontSize:"10px", color:"#ff7755", marginBottom:"5px", letterSpacing:"1px"}}>{w.stat?.toUpperCase()}</div>
                          <div style={{fontSize:"12px", color:"#4a4a38", marginBottom:"7px", lineHeight:1.5}}>{w.problem}</div>
                          <div style={{fontSize:"12px", color:"#f5c518", lineHeight:1.5}}>→ {w.fix}</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{fontSize:"9px", letterSpacing:"3px", color:"#f5c518", padding:"10px 0 8px"}}>СИЛЬНЫЕ СТОРОНЫ</div>
                      {analysis.strengths?.map((s,i)=>(
                        <div key={i} style={{background:"#111108", border:"1px solid #1e1e12", borderLeft:"2px solid #f5c51833", padding:"14px", marginBottom:"2px"}}>
                          <div style={{fontSize:"10px", color:"#f5c518", marginBottom:"5px", letterSpacing:"1px"}}>{s.stat?.toUpperCase()}</div>
                          <div style={{fontSize:"12px", color:"#4a4a38", lineHeight:1.5}}>{s.comment}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === "plan" && (
                  <div>
                    <div style={{fontSize:"9px", letterSpacing:"3px", color:"#f5c518", padding:"10px 0 12px"}}>ПЛАН ТРЕНИРОВОК</div>
                    {analysis.plan?.map((day,i)=>(
                      <div key={i} style={{background:"#111108", border:"1px solid #1e1e12", padding:"14px 18px", marginBottom:"2px", display:"flex", gap:"16px", alignItems:"flex-start"}}>
                        <div style={{minWidth:"24px",height:"24px",background:"#f5c51814",border:"1px solid #f5c51833",color:"#f5c518",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:700,flexShrink:0}}>{i+1}</div>
                        <div style={{fontSize:"13px", color:"#c0b878", lineHeight:1.6}}>{day}</div>
                      </div>
                    ))}
                    <div style={{marginTop:"2px", padding:"14px 18px", background:"#f5c51808", border:"1px solid #f5c51822", fontSize:"13px", color:"#f5c518"}}>
                      🎯 Цель: {analysis.goal}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Leaderboard Tab ── */}
        {mainTab === "leaderboard" && <Leaderboard />}
      </div>

      <div style={{height:"2px", background:"linear-gradient(90deg,transparent,#f5c518,transparent)"}}/>
    </div>
  );
}
