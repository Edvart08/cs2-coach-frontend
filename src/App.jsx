import { useState, useEffect } from "react";

const BACKEND = "https://cs2-coach-backend.onrender.com";

const FIELDS = [
  {key:"kd",label:"K/D Ratio",steam:true},
  {key:"winrate",label:"Win Rate %",steam:true},
  {key:"hltv",label:"HLTV Rating",steam:false},
  {key:"hs",label:"Headshot %",steam:true},
  {key:"adr",label:"ADR",steam:false},
  {key:"clutch1v1",label:"1v1 Clutch %",steam:false},
  {key:"entrySuccess",label:"Entry Success %",steam:false},
  {key:"rank",label:"Premier Rank",steam:false},
  {key:"matches",label:"Matches Played",steam:true},
];

const LEVEL_COLOR = {Новичок:"#ff5544",Средний:"#ffaa33",Хороший:"#f5c518",Про:"#44ddaa"};
const FACEIT_COLORS = ["","#f0f0f0","#f0f0f0","#1CE400","#1CE400","#FFC800","#FFC800","#FF6309","#FF6309","#FF0000","#FF0000"];

const css = `
  @keyframes blink{0%,100%{opacity:.15}50%{opacity:1}}
  @keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
  *{box-sizing:border-box;} input:focus{outline:none;}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:#f5c518;}
  .hov-row:hover{background:#0f0f06 !important;}
  .hov-card:hover{border-color:#f5c51844 !important;}
`;

function fmt(ts) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("ru-RU", {day:"2-digit",month:"2-digit",year:"numeric"});
}

// ── Steam Popup ──────────────────────────────────────────────────────────────
function SteamPopup({ onLogin, onSkip }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn .3s ease"}}>
      <div style={{background:"#0d0d07",border:"1px solid #252515",borderTop:"2px solid #f5c518",padding:"52px 48px",maxWidth:"400px",width:"90%",textAlign:"center",animation:"slideUp .35s ease"}}>
        <div style={{fontSize:"44px",marginBottom:"18px"}}>🎯</div>
        <div style={{fontSize:"10px",letterSpacing:"5px",color:"#f5c518",marginBottom:"10px"}}>CS2 AI ТРЕНЕР</div>
        <h2 style={{color:"#f0e8c0",fontWeight:400,margin:"0 0 12px",fontSize:"22px"}}>Войди через Steam</h2>
        <p style={{color:"#504838",fontSize:"13px",lineHeight:1.8,margin:"0 0 30px"}}>
          Данные загружаются автоматически из CS2 и FACEIT.<br/>
          Ручной ввод отключён — только честная статистика
        </p>
        <button onClick={onLogin} style={{
          width:"100%",padding:"15px",marginBottom:"14px",background:"#1b6090",
          color:"#fff",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:700,
          letterSpacing:"2px",fontFamily:"'Courier New',monospace",
          display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z"/>
          </svg>
          ВОЙТИ ЧЕРЕЗ STEAM
        </button>
        <button onClick={onSkip} style={{background:"transparent",border:"none",color:"#2a2a18",cursor:"pointer",fontSize:"10px",letterSpacing:"2px",fontFamily:"'Courier New',monospace",padding:"6px"}}>
          ТОЛЬКО СМОТРЕТЬ ЛИДЕРОВ →
        </button>
      </div>
    </div>
  );
}

// ── Profile Modal ─────────────────────────────────────────────────────────────
function ProfileModal({ steamid, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND}/profile/${steamid}`)
      .then(r => r.json())
      .then(d => { setProfile(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [steamid]);

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0d0d07",border:"1px solid #252515",borderTop:"2px solid #f5c518",maxWidth:"580px",width:"100%",maxHeight:"85vh",overflowY:"auto",animation:"slideUp .3s ease"}}>
        {loading ? (
          <div style={{padding:"60px",textAlign:"center"}}>
            <div style={{display:"flex",justifyContent:"center",gap:"8px"}}>
              {[0,1,2].map(i=><div key={i} style={{width:"7px",height:"7px",background:"#f5c518",borderRadius:"50%",animation:`blink 1s ${i*.3}s infinite`}}/>)}
            </div>
          </div>
        ) : profile ? (
          <div>
            {/* Header */}
            <div style={{padding:"28px",borderBottom:"1px solid #1a1a0e",display:"flex",gap:"18px",alignItems:"flex-start"}}>
              {profile.avatar
                ? <img src={profile.avatar} alt="" style={{width:"72px",height:"72px",borderRadius:"3px",border:"1px solid #f5c51844",flexShrink:0}}/>
                : <div style={{width:"72px",height:"72px",background:"#1a1a10",border:"1px solid #252515",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px",flexShrink:0}}>👤</div>
              }
              <div style={{flex:1}}>
                <div style={{fontSize:"20px",color:"#f0e8c0",fontWeight:700,marginBottom:"4px"}}>{profile.username}</div>
                <div style={{fontSize:"11px",color:"#3a3a28",letterSpacing:"1px",marginBottom:"8px"}}>
                  {profile.country && `🌍 ${profile.country}  ·  `}
                  Steam Lvl {profile.steam_level || "—"}
                  {profile.created && `  ·  C ${new Date(profile.created*1000).getFullYear()} года`}
                </div>
                {profile.faceit && (
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <div style={{
                      padding:"4px 14px",background:"#ff5500",color:"#fff",
                      fontSize:"11px",fontWeight:700,letterSpacing:"1px"
                    }}>FACEIT LVL {profile.faceit.faceit_level || "—"}</div>
                    <div style={{fontSize:"14px",color:FACEIT_COLORS[profile.faceit.faceit_level]||"#aaa",fontWeight:700}}>
                      {profile.faceit.faceit_elo || "—"} ELO
                    </div>
                  </div>
                )}
                {!profile.faceit && (
                  <div style={{fontSize:"11px",color:"#333",letterSpacing:"1px"}}>FACEIT: не найден</div>
                )}
              </div>
              <button onClick={onClose} style={{background:"transparent",border:"1px solid #2a2a18",color:"#444",cursor:"pointer",width:"28px",height:"28px",fontFamily:"monospace",fontSize:"14px",flexShrink:0}}>✕</button>
            </div>

            {/* CS2 Stats */}
            <div style={{padding:"20px 28px",borderBottom:"1px solid #1a1a0e"}}>
              <div style={{fontSize:"9px",letterSpacing:"3px",color:"#f5c518",marginBottom:"12px"}}>СТАТИСТИКА CS2</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"4px"}}>
                {[
                  {l:"K/D",v:profile.cs2?.kd},
                  {l:"WIN %",v:profile.cs2?.winrate?`${profile.cs2.winrate}%`:"—"},
                  {l:"HS %",v:profile.cs2?.hs?`${profile.cs2.hs}%`:"—"},
                  {l:"МАТЧИ",v:profile.cs2?.matches},
                  {l:"УБИЙСТВА",v:profile.cs2?.kills},
                  {l:"СМЕРТИ",v:profile.cs2?.deaths},
                  {l:"ПОБЕДЫ",v:profile.cs2?.wins},
                  {l:"MVP",v:profile.cs2?.mvps},
                ].map((s,i)=>(
                  <div key={i} style={{background:"#111108",border:"1px solid #1a1a0e",padding:"10px 12px"}}>
                    <div style={{fontSize:"8px",color:"#333320",letterSpacing:"1px",marginBottom:"4px"}}>{s.l}</div>
                    <div style={{fontSize:"16px",color:"#f5c518",fontWeight:700}}>{s.v||"—"}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* FACEIT Stats */}
            {profile.faceit && (
              <div style={{padding:"20px 28px",borderBottom:"1px solid #1a1a0e"}}>
                <div style={{fontSize:"9px",letterSpacing:"3px",color:"#ff5500",marginBottom:"12px"}}>FACEIT СТАТИСТИКА</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"4px"}}>
                  {[
                    {l:"ELO",v:profile.faceit.faceit_elo},
                    {l:"УРОВЕНЬ",v:profile.faceit.faceit_level},
                    {l:"K/D",v:profile.faceit.kd_ratio},
                    {l:"HS %",v:profile.faceit.hs_pct?`${profile.faceit.hs_pct}%`:"—"},
                    {l:"WIN %",v:profile.faceit.win_rate?`${profile.faceit.win_rate}%`:"—"},
                    {l:"МАТЧИ",v:profile.faceit.matches},
                  ].map((s,i)=>(
                    <div key={i} style={{background:"#111108",border:"1px solid #1a1a0e",padding:"10px 12px"}}>
                      <div style={{fontSize:"8px",color:"#333320",letterSpacing:"1px",marginBottom:"4px"}}>{s.l}</div>
                      <div style={{fontSize:"16px",color:"#ff7733",fontWeight:700}}>{s.v||"—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis history */}
            {profile.history?.length > 0 && (
              <div style={{padding:"20px 28px"}}>
                <div style={{fontSize:"9px",letterSpacing:"3px",color:"#f5c518",marginBottom:"12px"}}>ИСТОРИЯ РАЗБОРОВ</div>
                {profile.history.map((h,i)=>{
                  const lc = LEVEL_COLOR[h.result?.level] || "#f5c518";
                  return (
                    <div key={i} style={{background:"#111108",border:"1px solid #1a1a0e",borderLeft:`2px solid ${lc}`,padding:"12px 16px",marginBottom:"4px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                        <span style={{fontSize:"10px",color:lc,letterSpacing:"2px"}}>{h.result?.level?.toUpperCase()}</span>
                        <span style={{fontSize:"10px",color:"#333320"}}>{fmt(h.timestamp)}</span>
                      </div>
                      <div style={{fontSize:"12px",color:"#887860",lineHeight:1.5}}>{h.result?.overall}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div style={{padding:"40px",textAlign:"center",color:"#333320",fontSize:"12px"}}>Профиль не найден</div>
        )}
      </div>
    </div>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function Leaderboard({ currentSteamId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND}/leaderboard`)
      .then(r=>r.json())
      .then(d=>{setData(d.leaderboard||[]);setLoading(false);})
      .catch(()=>setLoading(false));
  }, []);

  if (loading) return (
    <div style={{textAlign:"center",padding:"70px"}}>
      <div style={{fontSize:"10px",letterSpacing:"3px",color:"#2a2a18",marginBottom:"16px"}}>ЗАГРУЗКА</div>
      <div style={{display:"flex",justifyContent:"center",gap:"8px"}}>
        {[0,1,2].map(i=><div key={i} style={{width:"7px",height:"7px",background:"#f5c518",borderRadius:"50%",animation:`blink 1s ${i*.3}s infinite`}}/>)}
      </div>
    </div>
  );

  if (!data.length) return (
    <div style={{textAlign:"center",padding:"70px",color:"#2a2a18"}}>
      <div style={{fontSize:"36px",marginBottom:"14px"}}>🏆</div>
      <div style={{fontSize:"12px",letterSpacing:"3px",marginBottom:"8px"}}>ТАБЛИЦА ПУСТА</div>
      <div style={{fontSize:"12px",color:"#222"}}>Войди через Steam и сделай анализ — попадёшь автоматически</div>
    </div>
  );

  return (
    <div>
      {profileId && <ProfileModal steamid={profileId} onClose={()=>setProfileId(null)}/>}
      <div style={{fontSize:"11px",color:"#2a2a18",marginBottom:"14px",letterSpacing:"1px"}}>
        Нажми на игрока, чтобы посмотреть его профиль
      </div>
      <div style={{display:"grid",gridTemplateColumns:"44px 1fr 100px 68px 68px 68px 90px",gap:"2px",padding:"8px 14px",fontSize:"9px",letterSpacing:"2px",color:"#2a2a18",borderBottom:"1px solid #1a1a0e"}}>
        <div>#</div><div>ИГРОК</div><div>RANK</div><div>K/D</div><div>WIN%</div><div>HS%</div><div>УРОВЕНЬ</div>
      </div>
      {data.map((p,i)=>{
        const lc = LEVEL_COLOR[p.level]||"#f5c518";
        const isMe = currentSteamId && p.steamid===currentSteamId;
        const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
        return (
          <div key={i} className="hov-row" onClick={()=>setProfileId(p.steamid)} style={{
            display:"grid",gridTemplateColumns:"44px 1fr 100px 68px 68px 68px 90px",
            gap:"2px",padding:"14px",cursor:"pointer",
            borderBottom:"1px solid #1a1a0e",transition:"background .15s",
            background:isMe?"#181808":"transparent",
            borderLeft:isMe?"2px solid #f5c518":"2px solid transparent"
          }}>
            <div style={{color:i<3?"#f5c518":"#333320",fontSize:"14px",fontWeight:700}}>{medal||`${i+1}`}</div>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              {p.avatar
                ?<img src={p.avatar} alt="" style={{width:"30px",height:"30px",borderRadius:"2px",border:"1px solid #252515"}}/>
                :<div style={{width:"30px",height:"30px",background:"#181810",border:"1px solid #252515",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px"}}>👤</div>
              }
              <span style={{fontSize:"14px",color:isMe?"#f5c518":"#c8b060",fontWeight:isMe?700:400}}>
                {p.username}{isMe?" (ты)":""}
              </span>
            </div>
            <div style={{fontSize:"15px",color:"#f5c518",fontWeight:700}}>{p.stats?.rank||"—"}</div>
            <div style={{fontSize:"14px",color:"#907860"}}>{p.stats?.kd||"—"}</div>
            <div style={{fontSize:"14px",color:"#907860"}}>{p.stats?.winrate||"—"}%</div>
            <div style={{fontSize:"14px",color:"#907860"}}>{p.stats?.hs||"—"}%</div>
            <div style={{padding:"3px 10px",background:lc+"18",color:lc,border:`1px solid ${lc}33`,fontSize:"10px",letterSpacing:"1px",display:"inline-flex",alignItems:"center",height:"fit-content"}}>
              {p.level}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── History ──────────────────────────────────────────────────────────────────
function HistoryTab({ steamid }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND}/history/${steamid}`)
      .then(r=>r.json())
      .then(d=>{setData(d.history||[]);setLoading(false);})
      .catch(()=>setLoading(false));
  }, [steamid]);

  if (loading) return (
    <div style={{textAlign:"center",padding:"50px"}}>
      <div style={{display:"flex",justifyContent:"center",gap:"8px"}}>
        {[0,1,2].map(i=><div key={i} style={{width:"7px",height:"7px",background:"#f5c518",borderRadius:"50%",animation:`blink 1s ${i*.3}s infinite`}}/>)}
      </div>
    </div>
  );

  if (!data.length) return (
    <div style={{textAlign:"center",padding:"60px",color:"#2a2a18"}}>
      <div style={{fontSize:"28px",marginBottom:"12px"}}>📋</div>
      <div style={{fontSize:"11px",letterSpacing:"3px"}}>ИСТОРИЯ ПУСТА</div>
      <div style={{fontSize:"12px",color:"#222",marginTop:"8px"}}>Сделай первый анализ</div>
    </div>
  );

  return (
    <div style={{animation:"up .4s ease both"}}>
      {data.map((h,i)=>{
        const lc = LEVEL_COLOR[h.result?.level]||"#f5c518";
        const isExp = expanded===i;
        return (
          <div key={i} style={{marginBottom:"3px"}}>
            <div onClick={()=>setExpanded(isExp?null:i)} className="hov-row" style={{
              background:"#0f0f08",border:"1px solid #1a1a0e",borderLeft:`3px solid ${lc}`,
              padding:"18px 20px",cursor:"pointer",transition:"background .15s"
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
                  <span style={{padding:"3px 12px",background:lc+"18",color:lc,border:`1px solid ${lc}33`,fontSize:"10px",letterSpacing:"2px",fontWeight:700}}>
                    {h.result?.level?.toUpperCase()}
                  </span>
                  <span style={{fontSize:"12px",color:"#3a3a28"}}>Rank {h.stats?.rank||"—"} · K/D {h.stats?.kd||"—"}</span>
                </div>
                <span style={{fontSize:"11px",color:"#2a2a18"}}>{fmt(h.timestamp)}</span>
              </div>
              <div style={{fontSize:"14px",color:"#907860",lineHeight:1.6}}>{h.result?.overall}</div>
            </div>

            {isExp && (
              <div style={{background:"#0c0c06",border:"1px solid #1a1a0e",borderTop:"none",padding:"18px 20px",animation:"up .2s ease both"}}>
                <div style={{color:"#ff7755",fontSize:"13px",marginBottom:"14px",borderLeft:"2px solid #ff4433",paddingLeft:"12px"}}>
                  ⚠ {h.result?.mainProblem}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px",marginBottom:"14px"}}>
                  {h.result?.weaknesses?.map((w,j)=>(
                    <div key={j} style={{background:"#111108",border:"1px solid #2a1010",padding:"12px 14px"}}>
                      <div style={{fontSize:"10px",color:"#ff6644",marginBottom:"4px",letterSpacing:"1px"}}>{w.stat?.toUpperCase()}</div>
                      <div style={{fontSize:"12px",color:"#665544",marginBottom:"6px",lineHeight:1.5}}>{w.problem}</div>
                      <div style={{fontSize:"12px",color:"#f5c518"}}>→ {w.fix}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:"11px",color:"#3a3820",borderTop:"1px solid #1a1a0e",paddingTop:"10px",letterSpacing:"1px"}}>
                  🎯 Цель: {h.result?.goal}
                </div>
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
  const [stats, setStats] = useState({kd:"—",winrate:"—",hltv:"—",hs:"—",adr:"—",clutch1v1:"—",entrySuccess:"—",rank:"—",matches:"—"});
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState("weak");
  const [mainTab, setMainTab] = useState("coach");
  const [errorMsg, setErrorMsg] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cs2_player");
      if (saved) { setPlayer(JSON.parse(saved)); }
      else setTimeout(()=>setShowPopup(true), 1200);
    } catch { setTimeout(()=>setShowPopup(true), 1200); }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (!e.data?.player) return;
      const p = e.data.player;
      setPlayer(p);
      try { localStorage.setItem("cs2_player", JSON.stringify(p)); } catch {}
      const s = e.data.stats || {};
      setStats({
        kd:          s.kd||"—",
        winrate:     s.winrate||"—",
        hltv:        s.hltv||"—",
        hs:          s.hs||"—",
        adr:         s.adr||"—",
        clutch1v1:   s.clutch1v1||"—",
        entrySuccess:s.entrySuccess||"—",
        rank:        s.rank||"—",
        matches:     s.matches||"—",
      });
      setShowPopup(false);
    };
    window.addEventListener("message", handler);
    return ()=>window.removeEventListener("message", handler);
  }, []);

  const openSteam = ()=>window.open(`${BACKEND}/auth/steam`,"steam-login","width=600,height=700,left=400,top=80");

  const logout = ()=>{
    setPlayer(null); setAnalysis(null);
    setStats({kd:"—",winrate:"—",hltv:"—",hs:"—",adr:"—",clutch1v1:"—",entrySuccess:"—",rank:"—",matches:"—"});
    try{localStorage.removeItem("cs2_player");}catch{}
    setShowPopup(true);
  };

  async function analyze() {
    if (!player) { setShowPopup(true); return; }
    setLoading(true); setAnalysis(null); setErrorMsg(null);
    const payload = {...stats, steamid: player.steamid};
    const call = async ()=>{
      const res = await fetch(`${BACKEND}/analyze`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const d = await res.json();
      if(d.error&&!d.result) throw new Error(d.error);
      const m=(d.result||"").match(/\{[\s\S]*\}/);
      if(!m) throw new Error("JSON не найден");
      return JSON.parse(m[0]);
    };
    try {
      let result=null,lastErr=null;
      for(let i=0;i<3;i++){try{result=await call();break;}catch(e){lastErr=e;if(i<2)await new Promise(r=>setTimeout(r,700));}}
      if(!result) throw lastErr;
      setAnalysis(result); setSubTab("weak");
      // Auto leaderboard
      fetch(`${BACKEND}/leaderboard/add`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({steamid:player.steamid,username:player.username,avatar:player.avatar||"",stats,level:result.level,overall:result.overall})}).catch(()=>{});
    } catch(e){setErrorMsg(e.message);}
    finally{setLoading(false);}
  }

  const lc = LEVEL_COLOR[analysis?.level]||"#f5c518";

  return (
    <div style={{minHeight:"100vh",background:"#080807",fontFamily:"'Courier New',monospace",color:"#b8b090"}}>
      <style>{css}</style>
      {showPopup && <SteamPopup onLogin={openSteam} onSkip={()=>setShowPopup(false)}/>}

      {/* Topbar */}
      <div style={{height:"3px",background:"linear-gradient(90deg,#f5c518,#c9a000,#f5c518)"}}/>
      <div style={{background:"#0a0a06",borderBottom:"1px solid #1a1a0e",padding:"12px 28px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"8px",height:"8px",background:"#f5c518",borderRadius:"50%",animation:"pulse 2s infinite"}}/>
          <span style={{fontSize:"11px",letterSpacing:"5px",color:"#f5c518",fontWeight:700}}>CS2 AI ТРЕНЕР</span>
        </div>
        {player ? (
          <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
            {player.faceit?.faceit_level && (
              <div style={{background:"#ff5500",color:"#fff",padding:"3px 10px",fontSize:"10px",fontWeight:700,letterSpacing:"1px"}}>
                FACEIT {player.faceit.faceit_level} · {player.faceit.faceit_elo} ELO
              </div>
            )}
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              {player.avatar&&<img src={player.avatar} alt="" style={{width:"28px",height:"28px",borderRadius:"2px"}}/>}
              <span style={{fontSize:"12px",color:"#c8b070"}}>{player.username}</span>
            </div>
            <button onClick={logout} style={{background:"transparent",border:"1px solid #2a2a18",color:"#3a3a28",cursor:"pointer",fontSize:"9px",letterSpacing:"1px",fontFamily:"'Courier New',monospace",padding:"4px 10px"}}>ВЫЙТИ</button>
          </div>
        ):(
          <button onClick={openSteam} style={{background:"#1b6090",color:"#fff",border:"none",padding:"8px 18px",cursor:"pointer",fontSize:"10px",fontWeight:700,letterSpacing:"2px",fontFamily:"'Courier New',monospace"}}>STEAM</button>
        )}
      </div>

      <div style={{maxWidth:"960px",margin:"0 auto",padding:"32px 20px 80px"}}>
        <div style={{marginBottom:"28px"}}>
          <h1 style={{fontSize:"clamp(28px,5vw,44px)",fontWeight:400,margin:"0 0 4px",color:"#f0e8c0",letterSpacing:"2px"}}>Разбор твоей игры</h1>
          <p style={{color:"#2a2a18",fontSize:"12px",margin:0,letterSpacing:"1px"}}>Только реальная статистика · Steam + FACEIT</p>
        </div>

        {/* Main tabs */}
        <div style={{display:"flex",borderBottom:"1px solid #1a1a0e",marginBottom:"24px"}}>
          {[["coach","ТРЕНЕР"],["history","📋 ИСТОРИЯ"],["leaderboard","🏆 ЛИДЕРЫ"]].map(([t,l])=>(
            <button key={t} onClick={()=>setMainTab(t)} style={{
              padding:"11px 22px",background:"transparent",
              color:mainTab===t?"#f5c518":"#333320",border:"none",
              borderBottom:`2px solid ${mainTab===t?"#f5c518":"transparent"}`,
              cursor:"pointer",fontSize:"11px",letterSpacing:"2px",
              fontFamily:"'Courier New',monospace",marginBottom:"-1px",transition:"color .15s"
            }}>{l}</button>
          ))}
        </div>

        {/* ── COACH ── */}
        {mainTab==="coach" && <>
          {/* Stats — READ ONLY */}
          {!player && (
            <div style={{background:"#1b1b0e",border:"1px solid #2a2a18",borderLeft:"3px solid #f5c518",padding:"20px 24px",marginBottom:"20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
              <div>
                <div style={{fontSize:"13px",color:"#c8b070",marginBottom:"4px",fontWeight:700}}>Войди через Steam для анализа</div>
                <div style={{fontSize:"11px",color:"#3a3a28",letterSpacing:"1px"}}>Ручной ввод отключён — только честная статистика из CS2</div>
              </div>
              <button onClick={openSteam} style={{background:"#1b6090",color:"#fff",border:"none",padding:"10px 20px",cursor:"pointer",fontSize:"11px",fontWeight:700,letterSpacing:"2px",fontFamily:"'Courier New',monospace"}}>
                ВОЙТИ ЧЕРЕЗ STEAM
              </button>
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:"3px",marginBottom:"16px"}}>
            {FIELDS.map(f=>(
              <div key={f.key} className="hov-card" style={{background:"#0f0f08",border:`1px solid ${player&&f.steam?"#252515":"#1a1a0e"}`,padding:"14px 16px",transition:"border-color .2s",position:"relative"}}>
                {player&&f.steam&&<div style={{position:"absolute",top:"8px",right:"8px",width:"5px",height:"5px",background:"#f5c518",borderRadius:"50%",opacity:.6}}/>}
                <div style={{fontSize:"9px",letterSpacing:"2px",color:"#2a2a18",marginBottom:"7px",textTransform:"uppercase"}}>{f.label}</div>
                <div style={{fontSize:"22px",color: player?"#f5c518":"#3a3820",fontWeight:700}}>
                  {stats[f.key]||"—"}
                </div>
              </div>
            ))}
          </div>

          {player && (
            <div style={{fontSize:"10px",color:"#2a2a18",marginBottom:"16px",letterSpacing:"1px",display:"flex",gap:"16px",flexWrap:"wrap"}}>
              <span>🟡 Steam: K/D, Win%, HS%, Матчи</span>
              <span>🟠 FACEIT: ELO в шапке</span>
              <span>⚪ ADR, HLTV, Clutch — обновятся если FACEIT API подключён</span>
            </div>
          )}

          <button onClick={analyze} disabled={loading||!player} style={{
            width:"100%",padding:"17px",marginBottom:"28px",
            background:(!player||loading)?"#0f0f08":"#f5c518",
            color:(!player||loading)?"#2a2a18":"#080807",
            border:`1px solid ${(!player||loading)?"#1a1a0e":"#f5c518"}`,
            cursor:(!player||loading)?"not-allowed":"pointer",
            fontSize:"13px",fontWeight:700,letterSpacing:"4px",
            fontFamily:"'Courier New',monospace",transition:"all .15s"
          }}>
            {loading?"АНАЛИЗИРУЮ...":!player?"ВОЙДИ ЧЕРЕЗ STEAM ДЛЯ АНАЛИЗА":"ПОЛУЧИТЬ РАЗБОР ОТ ТРЕНЕРА"}
          </button>

          {loading&&(
            <div style={{textAlign:"center",padding:"40px"}}>
              <div style={{fontSize:"11px",letterSpacing:"3px",color:"#2a2a18",marginBottom:"16px"}}>ТРЕНЕР ИЗУЧАЕТ СТАТИСТИКУ</div>
              <div style={{display:"flex",justifyContent:"center",gap:"8px"}}>
                {[0,1,2].map(i=><div key={i} style={{width:"8px",height:"8px",background:"#f5c518",borderRadius:"50%",animation:`blink 1.2s ${i*.35}s infinite`}}/>)}
              </div>
            </div>
          )}

          {errorMsg&&<div style={{border:"1px solid #ff444455",padding:"16px",color:"#ff7755",fontSize:"13px",background:"#ff440406",marginBottom:"16px"}}>⚠ {errorMsg}</div>}

          {analysis&&(
            <div style={{animation:"up .4s ease both"}}>
              <div style={{background:"#0f0f08",border:"1px solid #1a1a0e",borderLeft:`4px solid ${lc}`,padding:"24px 26px",marginBottom:"3px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"14px",flexWrap:"wrap"}}>
                  <span style={{padding:"5px 16px",fontSize:"12px",letterSpacing:"3px",fontWeight:700,background:lc+"20",color:lc,border:`1px solid ${lc}55`}}>{analysis.level?.toUpperCase()}</span>
                  <span style={{fontSize:"13px",color:"#3a3820"}}>→ {analysis.goal}</span>
                  <span style={{marginLeft:"auto",fontSize:"10px",color:"#2a2a18",letterSpacing:"1px"}}>✓ добавлено в лидеры</span>
                </div>
                <div style={{fontSize:"16px",color:"#d8cc90",lineHeight:1.7,marginBottom:"14px"}}>{analysis.overall}</div>
                <div style={{background:"#ff440410",borderLeft:"3px solid #ff5544",padding:"12px 16px",fontSize:"14px",color:"#ff8866",lineHeight:1.6}}>
                  ⚠ Главная проблема: {analysis.mainProblem}
                </div>
              </div>

              <div style={{display:"flex",borderBottom:"1px solid #1a1a0e",marginBottom:"3px"}}>
                {[["weak","❌ СЛАБЫЕ"],["strong","✅ СИЛЬНЫЕ"],["plan","📋 ПЛАН"]].map(([t,l])=>(
                  <button key={t} onClick={()=>setSubTab(t)} style={{
                    padding:"11px 20px",background:"transparent",
                    color:subTab===t?(t==="weak"?"#ff7755":t==="strong"?"#88dd88":"#f5c518"):"#333320",
                    border:"none",borderBottom:`2px solid ${subTab===t?(t==="weak"?"#ff5544":t==="strong"?"#55bb55":"#f5c518"):"transparent"}`,
                    cursor:"pointer",fontSize:"11px",letterSpacing:"2px",
                    fontFamily:"'Courier New',monospace",marginBottom:"-1px",transition:"color .15s"
                  }}>{l}</button>
                ))}
              </div>

              {subTab==="weak"&&(
                <div style={{animation:"up .25s ease both"}}>
                  <div style={{fontSize:"11px",letterSpacing:"3px",color:"#ff6644",padding:"14px 0 10px"}}>ЧТО МЕШАЕТ РАСТИ</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px"}}>
                    {analysis.weaknesses?.map((w,i)=>(
                      <div key={i} style={{background:"#0f0f08",border:"1px solid #2a1414",borderTop:"2px solid #ff5544",padding:"20px"}}>
                        <div style={{display:"inline-block",padding:"3px 12px",background:"#ff554420",color:"#ff7755",fontSize:"11px",letterSpacing:"2px",fontWeight:700,marginBottom:"12px"}}>{w.stat?.toUpperCase()}</div>
                        <div style={{fontSize:"14px",color:"#886655",lineHeight:1.7,marginBottom:"12px"}}>{w.problem}</div>
                        <div style={{background:"#f5c51810",border:"1px solid #f5c51830",padding:"10px 14px",fontSize:"13px",color:"#f5c518",lineHeight:1.6}}>💡 {w.fix}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {subTab==="strong"&&(
                <div style={{animation:"up .25s ease both"}}>
                  <div style={{fontSize:"11px",letterSpacing:"3px",color:"#66cc66",padding:"14px 0 10px"}}>ТВОИ КОЗЫРИ</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px"}}>
                    {analysis.strengths?.map((s,i)=>(
                      <div key={i} style={{background:"#0f0f08",border:"1px solid #142414",borderTop:"2px solid #55aa55",padding:"20px"}}>
                        <div style={{display:"inline-block",padding:"3px 12px",background:"#55aa5520",color:"#88dd88",fontSize:"11px",letterSpacing:"2px",fontWeight:700,marginBottom:"12px"}}>{s.stat?.toUpperCase()}</div>
                        <div style={{fontSize:"14px",color:"#558855",lineHeight:1.7}}>{s.comment}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {subTab==="plan"&&(
                <div style={{animation:"up .25s ease both"}}>
                  <div style={{fontSize:"11px",letterSpacing:"3px",color:"#f5c518",padding:"14px 0 10px"}}>ТРЕНИРОВОЧНЫЙ ПЛАН</div>
                  {analysis.plan?.map((day,i)=>(
                    <div key={i} style={{background:"#0f0f08",border:"1px solid #1a1a0e",padding:"18px 20px",marginBottom:"3px",display:"flex",gap:"18px",alignItems:"flex-start"}}>
                      <div style={{minWidth:"32px",height:"32px",background:"#f5c51818",border:"1px solid #f5c51840",color:"#f5c518",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",fontWeight:700,flexShrink:0}}>{i+1}</div>
                      <div style={{fontSize:"15px",color:"#c0a860",lineHeight:1.7}}>{day}</div>
                    </div>
                  ))}
                  <div style={{marginTop:"3px",padding:"18px 20px",background:"#f5c51808",border:"1px solid #f5c51825",fontSize:"15px",color:"#f5c518"}}>
                    🎯 Цель: {analysis.goal}
                  </div>
                </div>
              )}
            </div>
          )}
        </>}

        {mainTab==="history" && (player
          ? <HistoryTab steamid={player.steamid}/>
          : <div style={{textAlign:"center",padding:"60px",color:"#2a2a18"}}>
              <div style={{marginBottom:"12px",fontSize:"13px"}}>Войди через Steam, чтобы видеть историю</div>
              <button onClick={openSteam} style={{background:"#1b6090",color:"#fff",border:"none",padding:"10px 20px",cursor:"pointer",fontSize:"11px",fontWeight:700,letterSpacing:"2px",fontFamily:"'Courier New',monospace"}}>ВОЙТИ ЧЕРЕЗ STEAM</button>
            </div>
        )}

        {mainTab==="leaderboard" && <Leaderboard currentSteamId={player?.steamid}/>}
      </div>
      <div style={{height:"2px",background:"linear-gradient(90deg,transparent,#f5c518,transparent)"}}/>
    </div>
  );
}
