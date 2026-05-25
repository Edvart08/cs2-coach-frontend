import { useState, useEffect } from "react";

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

const LEVEL_COLOR = {Новичок:"#ff4444",Средний:"#ffaa00",Хороший:"#f5c518",Про:"#00ff99"};

const css = `
  @keyframes blink{0%,100%{opacity:.15}50%{opacity:1}}
  @keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  *{box-sizing:border-box;} input:focus{outline:none;}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:#f5c518;}
  .hov-card:hover{border-color:#f5c51855 !important; background:#131308 !important;}
  .hov-row:hover{background:#0f0f06 !important;}
  .steam-btn:hover{background:#1e7ab8 !important;}
  .skip-link:hover{color:#f5c518 !important;}
`;

// ── Steam Popup ──────────────────────────────────────────────────────────────
function SteamPopup({ onLogin, onSkip }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn .3s ease"}}>
      <div style={{background:"#0d0d07",border:"1px solid #2a2a18",borderTop:"2px solid #f5c518",padding:"48px 44px",maxWidth:"400px",width:"90%",textAlign:"center",animation:"slideUp .35s ease",position:"relative"}}>
        <div style={{fontSize:"42px",marginBottom:"16px"}}>🎯</div>
        <div style={{fontSize:"10px",letterSpacing:"5px",color:"#f5c518",marginBottom:"10px"}}>CS2 AI ТРЕНЕР</div>
        <h2 style={{color:"#f0ead0",fontWeight:400,margin:"0 0 10px",fontSize:"22px",letterSpacing:"1px"}}>Войди через Steam</h2>
        <p style={{color:"#554f38",fontSize:"13px",lineHeight:1.7,margin:"0 0 28px"}}>
          Получи свои реальные статы из CS2 автоматически и попади в таблицу лидеров
        </p>
        <button className="steam-btn" onClick={onLogin} style={{
          width:"100%",padding:"15px",marginBottom:"14px",background:"#1b6090",
          color:"#fff",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:700,
          letterSpacing:"2px",fontFamily:"'Courier New',monospace",transition:"background .2s",
          display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z"/>
          </svg>
          ВОЙТИ ЧЕРЕЗ STEAM
        </button>
        <button className="skip-link" onClick={onSkip} style={{
          background:"transparent",border:"none",color:"#333328",cursor:"pointer",
          fontSize:"11px",letterSpacing:"2px",fontFamily:"'Courier New',monospace",
          padding:"6px",transition:"color .2s"
        }}>ПРОПУСТИТЬ</button>
      </div>
    </div>
  );
}

// ── Leaderboard ──────────────────────────────────────────────────────────────
function Leaderboard({ currentSteamId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND}/leaderboard`)
      .then(r => r.json())
      .then(d => { setData(d.leaderboard || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{textAlign:"center",padding:"70px",color:"#333"}}>
      <div style={{fontSize:"10px",letterSpacing:"3px",color:"#3a3a28",marginBottom:"16px"}}>ЗАГРУЗКА ЛИДЕРОВ</div>
      <div style={{display:"flex",justifyContent:"center",gap:"8px"}}>
        {[0,1,2].map(i=><div key={i} style={{width:"7px",height:"7px",background:"#f5c518",borderRadius:"50%",animation:`blink 1s ${i*.3}s infinite`}}/>)}
      </div>
    </div>
  );

  if (!data.length) return (
    <div style={{textAlign:"center",padding:"70px",color:"#333"}}>
      <div style={{fontSize:"36px",marginBottom:"14px"}}>🏆</div>
      <div style={{fontSize:"12px",letterSpacing:"3px",color:"#3a3a28"}}>ТАБЛИЦА ПУСТА</div>
      <div style={{fontSize:"12px",color:"#222",marginTop:"8px"}}>Войди через Steam и сделай анализ — попадёшь сюда автоматически</div>
    </div>
  );

  return (
    <div style={{animation:"up .4s ease both"}}>
      <div style={{display:"grid",gridTemplateColumns:"48px 1fr 100px 68px 68px 68px 90px",gap:"4px",padding:"8px 16px",fontSize:"9px",letterSpacing:"2px",color:"#333320",borderBottom:"1px solid #1a1a0e"}}>
        <div>#</div><div>ИГРОК</div><div>RANK</div><div>K/D</div><div>WIN%</div><div>HS%</div><div>УРОВЕНЬ</div>
      </div>

      {data.map((p, i) => {
        const lc = LEVEL_COLOR[p.level] || "#f5c518";
        const isMe = currentSteamId && p.steamid === currentSteamId;
        const isExp = expanded === i;
        const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
        return (
          <div key={i}>
            <div className="hov-row" onClick={()=>setExpanded(isExp?null:i)} style={{
              display:"grid",gridTemplateColumns:"48px 1fr 100px 68px 68px 68px 90px",
              gap:"4px",padding:"13px 16px",cursor:"pointer",
              borderBottom:"1px solid #1a1a0e",transition:"background .15s",
              background: isMe ? "#1a1a08" : isExp ? "#131308" : "transparent",
              borderLeft: isMe ? "2px solid #f5c518" : "2px solid transparent"
            }}>
              <div style={{color: i<3?"#f5c518":"#333320",fontSize:"14px",fontWeight:700}}>
                {medal || `${i+1}`}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                {p.avatar
                  ? <img src={p.avatar} alt="" style={{width:"30px",height:"30px",borderRadius:"2px",border:"1px solid #2a2a18"}}/>
                  : <div style={{width:"30px",height:"30px",background:"#1a1a10",border:"1px solid #2a2a18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px"}}>👤</div>
                }
                <span style={{fontSize:"14px",color: isMe?"#f5c518":"#c8b870",fontWeight: isMe?700:400}}>
                  {p.username}{isMe?" (ты)":""}
                </span>
              </div>
              <div style={{fontSize:"15px",color:"#f5c518",fontWeight:700}}>{p.stats?.rank||"—"}</div>
              <div style={{fontSize:"14px",color:"#a09060"}}>{p.stats?.kd||"—"}</div>
              <div style={{fontSize:"14px",color:"#a09060"}}>{p.stats?.winrate||"—"}%</div>
              <div style={{fontSize:"14px",color:"#a09060"}}>{p.stats?.hs||"—"}%</div>
              <div style={{padding:"3px 10px",background:lc+"18",color:lc,border:`1px solid ${lc}33`,fontSize:"10px",letterSpacing:"1px",display:"inline-flex",alignItems:"center"}}>
                {p.level}
              </div>
            </div>

            {isExp && (
              <div style={{background:"#0c0c05",borderBottom:"1px solid #1a1a0e",padding:"18px 20px",animation:"up .2s ease both"}}>
                <div style={{fontSize:"9px",letterSpacing:"3px",color:"#f5c518",marginBottom:"12px"}}>ВСЕ СТАТЫ</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:p.overall?"12px":"0"}}>
                  {FIELDS.map(f=>(
                    <div key={f.key} style={{background:"#111108",border:"1px solid #1e1e10",padding:"8px 14px",minWidth:"105px"}}>
                      <div style={{fontSize:"9px",color:"#333320",letterSpacing:"1px",marginBottom:"3px"}}>{f.label.toUpperCase()}</div>
                      <div style={{fontSize:"17px",color:"#f5c518",fontWeight:700}}>{p.stats?.[f.key]||"—"}</div>
                    </div>
                  ))}
                </div>
                {p.overall && (
                  <div style={{fontSize:"13px",color:"#554f38",borderLeft:"2px solid #f5c51833",paddingLeft:"12px",lineHeight:1.6,fontStyle:"italic"}}>
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
  const [subTab, setSubTab] = useState("weak");
  const [mainTab, setMainTab] = useState("coach");
  const [errorMsg, setErrorMsg] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [player, setPlayer] = useState(null);

  // Restore player from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cs2_player");
      if (saved) setPlayer(JSON.parse(saved));
      else setTimeout(() => setShowPopup(true), 1200);
    } catch { setTimeout(() => setShowPopup(true), 1200); }
  }, []);

  // Steam postMessage
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.player) {
        const p = e.data.player;
        setPlayer(p);
        try { localStorage.setItem("cs2_player", JSON.stringify(p)); } catch {}
        setStats(prev => {
          const s = {...prev};
          Object.entries(e.data.stats || {}).forEach(([k,v]) => { if(v && v !== "0") s[k]=v; });
          return s;
        });
        setShowPopup(false);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const openSteamLogin = () =>
    window.open(`${BACKEND}/auth/steam`, "steam-login", "width=600,height=700,left=400,top=100");

  const logout = () => {
    setPlayer(null);
    try { localStorage.removeItem("cs2_player"); } catch {}
    setShowPopup(true);
  };

  async function analyze() {
    setLoading(true); setAnalysis(null); setErrorMsg(null);
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
      for (let i=0;i<3;i++) {
        try { result = await call(); break; }
        catch(e) { lastErr=e; if(i<2) await new Promise(r=>setTimeout(r,700)); }
      }
      if (!result) throw lastErr;
      setAnalysis(result); setSubTab("weak");

      // Auto-add to leaderboard if logged in via Steam
      if (player) {
        fetch(`${BACKEND}/leaderboard/add`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            steamid: player.steamid, username: player.username,
            avatar: player.avatar, stats, level: result.level, overall: result.overall
          })
        }).catch(()=>{});
      }
    } catch(e) { setErrorMsg(e.message); }
    finally { setLoading(false); }
  }

  const lc = LEVEL_COLOR[analysis?.level] || "#f5c518";

  return (
    <div style={{minHeight:"100vh",background:"#080807",fontFamily:"'Courier New',monospace",color:"#b8b090"}}>
      <style>{css}</style>
      {showPopup && <SteamPopup onLogin={openSteamLogin} onSkip={()=>setShowPopup(false)}/>}

      {/* Top bar */}
      <div style={{height:"3px",background:"linear-gradient(90deg,#f5c518,#c9a000,#f5c518)"}}/>
      <div style={{background:"#0a0a06",borderBottom:"1px solid #1a1a0e",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"8px",height:"8px",background:"#f5c518",borderRadius:"50%",animation:"pulse 2s infinite"}}/>
          <span style={{fontSize:"11px",letterSpacing:"5px",color:"#f5c518",fontWeight:700}}>CS2 AI ТРЕНЕР</span>
        </div>
        {player ? (
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              {player.avatar && <img src={player.avatar} alt="" style={{width:"28px",height:"28px",borderRadius:"2px"}}/>}
              <span style={{fontSize:"12px",color:"#c8b870"}}>{player.username}</span>
            </div>
            <button onClick={logout} style={{background:"transparent",border:"1px solid #2a2a18",color:"#444438",cursor:"pointer",fontSize:"10px",letterSpacing:"1px",fontFamily:"'Courier New',monospace",padding:"4px 10px"}}>
              ВЫЙТИ
            </button>
          </div>
        ) : (
          <button onClick={openSteamLogin} style={{background:"#1b6090",color:"#fff",border:"none",padding:"8px 16px",cursor:"pointer",fontSize:"10px",fontWeight:700,letterSpacing:"2px",fontFamily:"'Courier New',monospace"}}>
            STEAM
          </button>
        )}
      </div>

      <div style={{maxWidth:"940px",margin:"0 auto",padding:"32px 20px 80px"}}>
        {/* Page title */}
        <div style={{marginBottom:"28px"}}>
          <h1 style={{fontSize:"clamp(28px,5vw,46px)",fontWeight:400,margin:"0 0 4px",color:"#f0e8c0",letterSpacing:"2px"}}>
            Разбор твоей игры
          </h1>
          <p style={{color:"#2a2a18",fontSize:"12px",margin:0,letterSpacing:"1px"}}>
            Введи статы → получи персональный план от AI-тренера
          </p>
        </div>

        {/* Main tabs */}
        <div style={{display:"flex",borderBottom:"1px solid #1a1a0e",marginBottom:"24px"}}>
          {[["coach","ТРЕНЕР"],["leaderboard","🏆 ЛИДЕРЫ"]].map(([t,l])=>(
            <button key={t} onClick={()=>setMainTab(t)} style={{
              padding:"11px 24px",background:"transparent",
              color:mainTab===t?"#f5c518":"#333320",border:"none",
              borderBottom:`2px solid ${mainTab===t?"#f5c518":"transparent"}`,
              cursor:"pointer",fontSize:"11px",letterSpacing:"2px",
              fontFamily:"'Courier New',monospace",marginBottom:"-1px",transition:"color .15s"
            }}>{l}</button>
          ))}
        </div>

        {/* ── COACH TAB ── */}
        {mainTab==="coach" && <>
          {/* Stats grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:"3px",marginBottom:"3px"}}>
            {FIELDS.map(f=>(
              <div key={f.key} className="hov-card" style={{background:"#0f0f08",border:"1px solid #1a1a0e",padding:"14px 16px",transition:"all .2s",cursor:"text"}}>
                <div style={{fontSize:"9px",letterSpacing:"2px",color:"#333320",marginBottom:"7px",textTransform:"uppercase"}}>{f.label}</div>
                <input value={stats[f.key]} onChange={e=>setStats(p=>({...p,[f.key]:e.target.value}))}
                  style={{width:"100%",background:"transparent",border:"none",color:"#f5c518",fontSize:"22px",fontFamily:"'Courier New',monospace",padding:0,fontWeight:700}}/>
              </div>
            ))}
          </div>

          {player && <div style={{fontSize:"10px",color:"#2a2a18",padding:"8px 2px",letterSpacing:"1px"}}>
            ↑ K/D, Win%, HS%, Matches загружены из Steam · HLTV, ADR, Clutch, Rank — заполни вручную
          </div>}

          <button onClick={analyze} disabled={loading} style={{
            width:"100%",padding:"17px",marginTop:"4px",marginBottom:"28px",
            background:loading?"#0f0f08":"#f5c518",color:loading?"#2a2a18":"#080807",
            border:`1px solid ${loading?"#1a1a0e":"#f5c518"}`,cursor:loading?"not-allowed":"pointer",
            fontSize:"13px",fontWeight:700,letterSpacing:"4px",
            fontFamily:"'Courier New',monospace",transition:"all .15s"
          }}>
            {loading?"АНАЛИЗИРУЮ...":"ПОЛУЧИТЬ РАЗБОР ОТ ТРЕНЕРА"}
          </button>

          {loading && (
            <div style={{textAlign:"center",padding:"40px",animation:"fadeIn .3s ease"}}>
              <div style={{fontSize:"11px",letterSpacing:"3px",color:"#2a2a18",marginBottom:"16px"}}>ТРЕНЕР ИЗУЧАЕТ СТАТИСТИКУ</div>
              <div style={{display:"flex",justifyContent:"center",gap:"8px"}}>
                {[0,1,2].map(i=><div key={i} style={{width:"8px",height:"8px",background:"#f5c518",borderRadius:"50%",animation:`blink 1.2s ${i*.35}s infinite`}}/>)}
              </div>
            </div>
          )}

          {errorMsg && (
            <div style={{border:"1px solid #ff444455",padding:"16px",color:"#ff7755",fontSize:"13px",background:"#ff440406",marginBottom:"16px"}}>
              ⚠ {errorMsg}
            </div>
          )}

          {analysis && (
            <div style={{animation:"up .4s ease both"}}>

              {/* Level banner */}
              <div style={{
                background:"#0f0f08",border:"1px solid #1a1a0e",
                borderLeft:`4px solid ${lc}`,padding:"24px 26px",marginBottom:"3px"
              }}>
                <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"14px",flexWrap:"wrap"}}>
                  <span style={{
                    padding:"5px 16px",fontSize:"12px",letterSpacing:"3px",fontWeight:700,
                    background:lc+"20",color:lc,border:`1px solid ${lc}55`
                  }}>{analysis.level?.toUpperCase()}</span>
                  <span style={{fontSize:"13px",color:"#3a3820"}}>→ Цель: {analysis.goal}</span>
                  {player && <span style={{marginLeft:"auto",fontSize:"10px",color:"#3a3a20",letterSpacing:"1px"}}>✓ добавлено в лидеры автоматически</span>}
                </div>
                <div style={{fontSize:"16px",color:"#d8cc90",lineHeight:1.7,marginBottom:"14px",fontWeight:400}}>
                  {analysis.overall}
                </div>
                <div style={{
                  background:"#ff440410",border:"none",borderLeft:"3px solid #ff5544",
                  padding:"12px 16px",fontSize:"14px",color:"#ff8866",lineHeight:1.6
                }}>
                  ⚠ Главная проблема: {analysis.mainProblem}
                </div>
              </div>

              {/* Sub-tabs */}
              <div style={{display:"flex",borderBottom:"1px solid #1a1a0e",marginBottom:"3px"}}>
                {[["weak","❌ СЛАБЫЕ МЕСТА"],["strong","✅ СИЛЬНЫЕ СТОРОНЫ"],["plan","📋 ПЛАН"]].map(([t,l])=>(
                  <button key={t} onClick={()=>setSubTab(t)} style={{
                    padding:"11px 20px",background:"transparent",
                    color:subTab===t?(t==="weak"?"#ff7755":t==="strong"?"#88dd88":"#f5c518"):"#333320",
                    border:"none",
                    borderBottom:`2px solid ${subTab===t?(t==="weak"?"#ff5544":t==="strong"?"#66cc66":"#f5c518"):"transparent"}`,
                    cursor:"pointer",fontSize:"11px",letterSpacing:"2px",
                    fontFamily:"'Courier New',monospace",marginBottom:"-1px",transition:"color .15s"
                  }}>{l}</button>
                ))}
              </div>

              {/* WEAK */}
              {subTab==="weak" && (
                <div style={{animation:"up .25s ease both"}}>
                  <div style={{fontSize:"11px",letterSpacing:"3px",color:"#ff6644",padding:"14px 0 10px"}}>
                    ЧТО МЕШАЕТ РАСТИ
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px"}}>
                    {analysis.weaknesses?.map((w,i)=>(
                      <div key={i} style={{background:"#0f0f08",border:"1px solid #2a1414",borderTop:"2px solid #ff5544",padding:"20px"}}>
                        <div style={{
                          display:"inline-block",padding:"3px 12px",
                          background:"#ff554420",color:"#ff7755",
                          fontSize:"11px",letterSpacing:"2px",fontWeight:700,
                          marginBottom:"12px"
                        }}>{w.stat?.toUpperCase()}</div>
                        <div style={{fontSize:"14px",color:"#886655",lineHeight:1.7,marginBottom:"12px"}}>
                          {w.problem}
                        </div>
                        <div style={{
                          background:"#f5c51810",border:"1px solid #f5c51830",
                          padding:"10px 14px",fontSize:"13px",color:"#f5c518",lineHeight:1.6
                        }}>
                          💡 {w.fix}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STRONG */}
              {subTab==="strong" && (
                <div style={{animation:"up .25s ease both"}}>
                  <div style={{fontSize:"11px",letterSpacing:"3px",color:"#66cc66",padding:"14px 0 10px"}}>
                    ТВОИ КОЗЫРИ
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px"}}>
                    {analysis.strengths?.map((s,i)=>(
                      <div key={i} style={{background:"#0f0f08",border:"1px solid #142414",borderTop:"2px solid #55aa55",padding:"20px"}}>
                        <div style={{
                          display:"inline-block",padding:"3px 12px",
                          background:"#55aa5520",color:"#88dd88",
                          fontSize:"11px",letterSpacing:"2px",fontWeight:700,
                          marginBottom:"12px"
                        }}>{s.stat?.toUpperCase()}</div>
                        <div style={{fontSize:"14px",color:"#558855",lineHeight:1.7}}>
                          {s.comment}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PLAN */}
              {subTab==="plan" && (
                <div style={{animation:"up .25s ease both"}}>
                  <div style={{fontSize:"11px",letterSpacing:"3px",color:"#f5c518",padding:"14px 0 10px"}}>
                    ТРЕНИРОВОЧНЫЙ ПЛАН
                  </div>
                  {analysis.plan?.map((day,i)=>(
                    <div key={i} style={{
                      background:"#0f0f08",border:"1px solid #1a1a0e",
                      padding:"18px 20px",marginBottom:"3px",
                      display:"flex",gap:"18px",alignItems:"flex-start"
                    }}>
                      <div style={{
                        minWidth:"32px",height:"32px",
                        background:"#f5c51818",border:"1px solid #f5c51840",
                        color:"#f5c518",display:"flex",alignItems:"center",
                        justifyContent:"center",fontSize:"14px",fontWeight:700,flexShrink:0
                      }}>{i+1}</div>
                      <div style={{fontSize:"15px",color:"#c0a860",lineHeight:1.7}}>{day}</div>
                    </div>
                  ))}
                  <div style={{marginTop:"3px",padding:"18px 20px",background:"#f5c51808",border:"1px solid #f5c51825",fontSize:"15px",color:"#f5c518",lineHeight:1.6}}>
                    🎯 <strong>Цель через месяц:</strong> {analysis.goal}
                  </div>
                </div>
              )}
            </div>
          )}
        </>}

        {/* ── LEADERBOARD TAB ── */}
        {mainTab==="leaderboard" && <Leaderboard currentSteamId={player?.steamid}/>}
      </div>

      <div style={{height:"2px",background:"linear-gradient(90deg,transparent,#f5c518,transparent)"}}/>
    </div>
  );
}
