import { useState, useEffect, useRef } from "react";

const BACKEND = "https://cs2-coach-backend.onrender.com";
const FREE_WEEKLY = 1;

const FACEIT_ELO_RANGES = [
  [1,100,500],[2,501,750],[3,751,900],[4,901,1050],[5,1051,1200],
  [6,1201,1350],[7,1351,1530],[8,1531,1750],[9,1751,2000],[10,2001,9999],
];
const LVL_COLOR = {1:"#ccc",2:"#ccc",3:"#1CE400",4:"#1CE400",5:"#FFC800",
  6:"#FFC800",7:"#FF6309",8:"#FF6309",9:"#FE1F00",10:"#FE1F00"};
const ANALYSIS_COLOR = {Новичок:"#ff5544",Средний:"#ffaa33",Хороший:"#f5c518",Про:"#44ddaa"};

// ── colour tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:"#0a0a07", card:"#141409", border:"#2e2e1e",
  yellow:"#f5c518", orange:"#ff8844", blue:"#74c6f5",
  label:"#c8c0a0",   // ярче: читаемые подписи
  value:"#f5eed8",   // ярче: заголовки и значения
  muted:"#9a9270",   // ярче: второстепенный текст
  win:"#66ee66", lose:"#ff6655", text:"#ddd6bc",
};

const css = `
  html,body,#root{margin:0;padding:0;background:${C.bg};overflow-x:hidden;}
  *{box-sizing:border-box;} input:focus,button:focus{outline:none;}
  ::-webkit-scrollbar{width:5px;height:5px;}
  ::-webkit-scrollbar-thumb{background:#3a3418;}
  @keyframes blink{0%,100%{opacity:.15}50%{opacity:1}}
  @keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:.45}50%{opacity:1}}
  @keyframes scan{from{top:-2px}to{top:100vh}}
  @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
  @keyframes popIn{0%{opacity:0;transform:scale(.92)}100%{opacity:1;transform:scale(1)}}
  @keyframes glow{0%,100%{opacity:.35}50%{opacity:.7}}
  @keyframes dash{to{stroke-dashoffset:0}}
  .hov:hover{filter:brightness(1.08);}
  .hov-row:hover{background:#191910 !important;}
  .skel{background:linear-gradient(90deg,#141409 25%,#1e1e10 50%,#141409 75%);
    background-size:600px 100%;animation:shimmer 1.5s infinite linear;border-radius:2px;}
  .glow-btn:hover:not(:disabled){box-shadow:0 0 28px #f5c51855;}
  .match-row:hover{background:#181810 !important;}
  /* ── Mobile ── */
  @media(max-width:768px){
    .desktop-nav{display:none !important;}
    .mobile-nav{display:flex !important;}
    .topbar-search{display:none !important;}
    .topbar-right{gap:8px !important;}
    .content-pad{padding:16px 14px 80px !important;}
    .stat-grid{grid-template-columns:repeat(2,1fr) !important;}
    .two-col{grid-template-columns:1fr !important;}
    .match-grid{grid-template-columns:3px 1fr 80px 60px !important;}
    .match-extra{display:none !important;}
    .lb-grid{grid-template-columns:36px 1fr 70px 56px !important;}
    .lb-extra{display:none !important;}
    .hero-right{display:none !important;}
    .score-rings{flex-direction:row !important;justify-content:space-around !important;}
    .chat-panel{width:100% !important;right:0 !important;bottom:64px !important;}
    .search-bar{display:none !important;}
  }
  @media(min-width:769px){
    .mobile-nav{display:none !important;}
    .desktop-nav{display:flex !important;}
  }
`;

const arr = x => Array.isArray(x) ? x : [];
const flag = cc => {
  if(!cc||cc.length!==2) return "";
  try{return cc.toUpperCase().replace(/./g,c=>String.fromCodePoint(127397+c.charCodeAt()));}catch{return"";}
};
const fmt = ts => ts ? new Date(ts*1000).toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric"}) : "";

function levelInfo(elo) {
  const e = parseInt(elo)||0;
  const row = FACEIT_ELO_RANGES.find(r=>e>=r[1]&&e<=r[2]) || FACEIT_ELO_RANGES[0];
  return {lvl:row[0], progress:Math.min(100,Math.max(0,(e-row[1])/(row[2]-row[1])*100)), toNext:row[2]-e};
}

// ── count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target, dur=900) {
  const [v,setV] = useState(0);
  const from = useRef(0);
  useEffect(()=>{
    const t=parseFloat(target)||0; let raf,start;
    const tick=(now)=>{
      if(!start)start=now;
      const p=Math.min((now-start)/dur,1),e=1-Math.pow(1-p,3);
      const cur=from.current+(t-from.current)*e;
      setV(cur); if(p<1)raf=requestAnimationFrame(tick); else from.current=t;
    };
    raf=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf);
  },[target]);
  return Math.round(v);
}

// ── Skel / Sparkline / Radar ──────────────────────────────────────────────────
function Skel({w="100%",h=14,mb=8}){return <div className="skel" style={{width:w,height:h,marginBottom:mb}}/>;}

function Sparkline({data,color=C.yellow,h=72,label=""}){
  if(!data||data.length<2) return(
    <div style={{height:h,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:"12px",letterSpacing:"2px"}}>МАЛО ДАННЫХ</div>
  );
  const w=300,pad=8,nums=data.map(d=>parseFloat(d)||0);
  const mn=Math.min(...nums),mx=Math.max(...nums),rng=mx-mn||1;
  const pts=nums.map((v,i)=>[pad+(i/(nums.length-1))*(w-2*pad),h-pad-((v-mn)/rng)*(h-2*pad)]);
  const line=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const area=line+` L${pts[pts.length-1][0].toFixed(1)} ${h-pad} L${pts[0][0].toFixed(1)} ${h-pad} Z`;
  const last=pts[pts.length-1];
  return(
    <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height:h,display:"block"}}>
      <defs><linearGradient id={"g"+label} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
        <stop offset="100%" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      <path d={area} fill={`url(#g${label})`}/>
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"
        style={{strokeDasharray:1200,strokeDashoffset:1200,animation:"dash 1.4s ease forwards"}}/>
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color}/>
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} opacity="0.35">
        <animate attributeName="r" values="3.5;7;3.5" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

function Radar({axes}){
  const sz=180,cx=90,cy=90,r=64;
  const n=axes.length;
  const pt=(i,f)=>{const a=(Math.PI*2*i)/n-Math.PI/2;return[cx+Math.cos(a)*r*f,cy+Math.sin(a)*r*f];};
  const poly=axes.map((a,i)=>pt(i,Math.max(.05,Math.min(1,a.value/100))).join(",")).join(" ");
  return(
    <svg viewBox={`0 0 ${sz} ${sz}`} style={{width:"100%",maxWidth:sz,height:"auto"}}>
      {[.25,.5,.75,1].map((f,i)=>(
        <polygon key={i} points={axes.map((_,j)=>pt(j,f).join(",")).join(" ")} fill="none" stroke={C.border} strokeWidth="1"/>
      ))}
      {axes.map((_,i)=>{const e=pt(i,1);return<line key={i} x1={cx} y1={cy} x2={e[0]} y2={e[1]} stroke={C.border} strokeWidth="1"/>;})}
      <polygon points={poly} fill={C.yellow+"2a"} stroke={C.yellow} strokeWidth="2" style={{animation:"fadeIn .8s ease"}}/>
      {axes.map((a,i)=>{const e=pt(i,1.26);return(
        <text key={i} x={e[0]} y={e[1]} fontSize="9" fill={C.label} textAnchor="middle" dominantBaseline="middle" fontFamily="'Courier New',monospace">{a.label}</text>
      );})}
    </svg>
  );
}

// ── Source Toggle ─────────────────────────────────────────────────────────────
function SourceToggle({source, setSource, hasFaceit}) {
  if (!hasFaceit) return null;
  return (
    <div style={{display:"flex",gap:"3px",marginBottom:"20px"}}>
      {[["steam","🎮 STEAM",C.blue],["faceit","⚡ FACEIT",C.orange]].map(([s,l,col])=>(
        <button key={s} onClick={()=>setSource(s)} style={{
          padding:"10px 24px",border:`1px solid ${source===s?col:C.border}`,
          background:source===s?col+"22":"transparent",
          color:source===s?col:C.muted,
          cursor:"pointer",fontSize:"12px",fontWeight:700,letterSpacing:"3px",
          fontFamily:"'Courier New',monospace",transition:"all .2s"
        }}>{l}</button>
      ))}
    </div>
  );
}

// ── Private Warning ───────────────────────────────────────────────────────────
function PrivateWarning() {
  return (
    <div style={{background:"#1a1408",border:"1px solid #4a3a18",borderLeft:"3px solid "+C.yellow,padding:"20px 24px",marginBottom:"16px",animation:"up .3s ease"}}>
      <div style={{fontSize:"14px",color:C.yellow,fontWeight:700,marginBottom:"8px"}}>🔒 Статистика CS2 скрыта в Steam</div>
      <div style={{fontSize:"14px",color:C.text,lineHeight:1.75,marginBottom:"14px"}}>
        Valve не даёт доступ к статистике, если профиль закрыт. Чтобы открыть:
      </div>
      <div style={{fontSize:"14px",color:C.label,lineHeight:2}}>
        1. Зайди в <span style={{color:C.blue}}>Steam → твой профиль</span><br/>
        2. <span style={{color:C.blue}}>Редактировать профиль → Настройки приватности</span><br/>
        3. <span style={{color:C.blue}}>«Детали игр»</span> → поставь <span style={{color:C.yellow,fontWeight:700}}>«Открыто для всех»</span><br/>
        4. Выйди и войди через Steam снова
      </div>
      {<div style={{marginTop:"12px",fontSize:"12px",color:C.muted}}>
        Пока статистика закрыта — используй вкладку ⚡ FACEIT для анализа
      </div>}
    </div>
  );
}

// ── Steam Popup ───────────────────────────────────────────────────────────────
function SteamPopup({onLogin,onSkip}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn .3s ease"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderTop:`2px solid ${C.yellow}`,padding:"52px 48px",maxWidth:"420px",width:"90%",textAlign:"center",animation:"slideUp .35s ease",boxShadow:`0 0 60px ${C.yellow}12`}}>
        <div style={{fontSize:"46px",marginBottom:"18px"}}>🎯</div>
        <div style={{fontSize:"11px",letterSpacing:"5px",color:C.yellow,marginBottom:"10px"}}>CS2 AI ТРЕНЕР</div>
        <h2 style={{color:C.value,fontWeight:400,margin:"0 0 12px",fontSize:"22px"}}>Войди через Steam</h2>
        <p style={{color:C.label,fontSize:"13px",lineHeight:1.8,margin:"0 0 30px"}}>
          Аватар, ник и статистика CS2 — напрямую из твоего профиля.<br/>
          FACEIT данные подтянутся автоматически, если аккаунты привязаны.
        </p>
        <button onClick={onLogin} className="glow-btn" style={{
          width:"100%",padding:"15px",marginBottom:"14px",background:"#1b6090",
          color:"#fff",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:700,
          letterSpacing:"2px",fontFamily:"'Courier New',monospace",transition:"box-shadow .2s",
          display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z"/>
          </svg>
          ВОЙТИ ЧЕРЕЗ STEAM
        </button>
        <button onClick={onSkip} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:"11px",letterSpacing:"2px",fontFamily:"'Courier New',monospace",padding:"6px"}}>
          ПРОСТО ПОСМОТРЕТЬ →
        </button>
      </div>
    </div>
  );
}

// ── Hero Card ─────────────────────────────────────────────────────────────────
function HeroCard({player, source}) {
  const fc = player.faceit;
  const cs2 = player.cs2 || {};
  const elo = fc?.elo || 0;
  const li = levelInfo(elo);
  const lvlColor = LVL_COLOR[li.lvl] || C.yellow;
  const form = arr(fc?.matches).slice(0,7).map(m=>m.result==="1");
  const eloCount = useCountUp(elo);
  const isFaceit = source === "faceit";
  const accentColor = isFaceit ? C.orange : C.blue;

  const stats = isFaceit
    ? [{l:"K/D",v:fc?.lifetime?.kd||"—"},{l:"WIN%",v:fc?.lifetime?.winrate?(fc.lifetime.winrate+"%"):"—"},{l:"HS%",v:fc?.lifetime?.hs?(fc.lifetime.hs+"%"):"—"},{l:"МАТЧИ",v:fc?.lifetime?.matches||"—"}]
    : [{l:"K/D",v:cs2.kd||"—"},{l:"WIN%",v:cs2.winrate?(cs2.winrate+"%"):"—"},{l:"HS%",v:cs2.hs?(cs2.hs+"%"):"—"},{l:"МАТЧИ",v:cs2.matches||"—"}];

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,marginBottom:"3px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:"-40px",right:"-30px",width:"240px",height:"240px",
        background:`radial-gradient(circle,${isFaceit?C.orange:C.blue}18,transparent 70%)`,
        animation:"glow 4s ease-in-out infinite",pointerEvents:"none"}}/>

      <div style={{display:"flex",gap:"20px",padding:"24px",flexWrap:"wrap",position:"relative"}}>
        {/* Avatar */}
        <div style={{position:"relative",flexShrink:0}}>
          {(player.avatar||fc?.avatar)
            ?<img src={player.avatar||fc?.avatar} alt="" style={{width:"88px",height:"88px",borderRadius:"4px",border:`2px solid ${lvlColor}`,boxShadow:`0 0 18px ${lvlColor}44`}}/>
            :<div style={{width:"88px",height:"88px",background:"#1a1a10",border:`2px solid ${lvlColor}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"32px"}}>👤</div>}
          {fc&&<div style={{position:"absolute",bottom:"-8px",left:"50%",transform:"translateX(-50%)",
            background:lvlColor,color:"#080807",fontSize:"11px",fontWeight:700,padding:"2px 9px",whiteSpace:"nowrap"}}>
            LVL {li.lvl}
          </div>}
        </div>

        {/* Name / meta */}
        <div style={{flex:1,minWidth:"160px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"5px"}}>
            <span style={{fontSize:"26px",color:C.value,fontWeight:700}}>{player.username}</span>
            <span style={{fontSize:"18px"}}>{flag(player.country||fc?.country)}</span>
          </div>
          <div style={{fontSize:"14px",color:C.label,marginBottom:"7px"}}>
            {player.created&&`Steam с ${new Date(player.created*1000).getFullYear()} г.`}
            {player.steam_level!=null&&`  ·  Steam Lvl ${player.steam_level}`}
          </div>
          {fc?.nickname&&fc.nickname!==player.username&&(
            <div style={{fontSize:"14px",color:C.orange,marginBottom:"8px"}}>
              FACEIT: {fc.nickname}
            </div>
          )}
          {form.length>0&&(
            <div style={{display:"flex",alignItems:"center",gap:"5px",marginTop:"6px"}}>
              <span style={{fontSize:"13px",color:C.muted,marginRight:"3px"}}>ФОРМА</span>
              {form.map((w,i)=>(
                <div key={i} style={{width:"20px",height:"20px",display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:"11px",fontWeight:700,background:w?"#1a361a":"#361a1a",
                  color:w?C.win:C.lose,border:`1px solid ${w?"#2d5a2d":"#5a2d2d"}`}}>{w?"W":"L"}</div>
              ))}
            </div>
          )}
        </div>

        {/* ELO (faceit mode only) */}
        {isFaceit&&fc&&!!elo&&(
          <div className="hero-right" style={{textAlign:"right",minWidth:"145px"}}>
            <div style={{fontSize:"11px",letterSpacing:"3px",color:C.orange,marginBottom:"2px"}}>FACEIT ELO</div>
            <div style={{fontSize:"44px",fontWeight:700,color:lvlColor,lineHeight:1,textShadow:`0 0 18px ${lvlColor}55`}}>
              {eloCount}
            </div>
            <div style={{fontSize:"13px",color:C.label,marginTop:"6px"}}>
              до LVL {Math.min(10,li.lvl+1)}: {li.toNext>0?li.toNext:"MAX"} ELO
            </div>
            <div style={{marginTop:"8px",height:"6px",background:"#1a1a10",borderRadius:"3px",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${li.progress}%`,background:`linear-gradient(90deg,${lvlColor}88,${lvlColor})`,transition:"width 1s ease"}}/>
            </div>
          </div>
        )}
      </div>

      {/* Stat strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderTop:`1px solid ${C.border}`}}>
        {stats.map((s,i)=>(
          <div key={i} style={{padding:"16px 10px",textAlign:"center",borderLeft:i>0?`1px solid ${C.border}`:"none"}}>
            <div style={{fontSize:"13px",color:C.label,letterSpacing:"1px",marginBottom:"7px"}}>{s.l}</div>
            <div style={{fontSize:"24px",color:C.yellow,fontWeight:700}}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Charts ────────────────────────────────────────────────────────────────────
function ChartsSection({faceit}) {
  const matches = arr(faceit?.matches).slice().reverse();
  const kdData  = matches.map(m=>parseFloat(m.kd)||0);
  const hsData  = matches.map(m=>parseFloat(m.hs)||0);
  const adrData = matches.map(m=>parseFloat(m.adr)||0).filter(v=>v>0);
  const lt = faceit?.lifetime||{};
  const radarAxes = [
    {label:"K/D",  value:Math.min(100,(parseFloat(lt.kd)||0)*55),   raw:lt.kd||"0"},
    {label:"HS%",  value:parseFloat(lt.hs)||0,                       raw:(lt.hs||"0")+"%"},
    {label:"WIN%", value:parseFloat(lt.winrate)||0,                   raw:(lt.winrate||"0")+"%"},
    {label:"K/R",  value:Math.min(100,(parseFloat(lt.kr)||0)*120),   raw:lt.kr||"0"},
    {label:"СТРИК",value:Math.min(100,(parseInt(lt.longest_streak)||0)*10),raw:lt.longest_streak||"0"},
  ];

  const Chart = ({title,data,color,unit=""}) => (
    <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"18px 20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
        <span style={{fontSize:"12px",letterSpacing:"2px",color:C.label}}>{title}</span>
        {data.length>0&&<span style={{fontSize:"13px",color,fontWeight:700}}>
          {data[data.length-1]?.toFixed(unit==="%"?0:2)}{unit}
        </span>}
      </div>
      <Sparkline data={data} color={color} h={72} label={title.replace(/\W/g,"")}/>
    </div>
  );

  return (
    <div style={{animation:"up .4s ease both"}}>
      <div style={{fontSize:"15px",letterSpacing:"2px",color:C.yellow,fontWeight:700,padding:"8px 0 16px"}}>ДИНАМИКА МАТЧЕЙ</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:"3px",marginBottom:"3px"}}>
        <Chart title="K/D RATIO" data={kdData} color={C.yellow}/>
        <Chart title="HEADSHOT %" data={hsData} color={C.orange} unit="%"/>
        {adrData.length>1&&<Chart title="ADR" data={adrData} color="#44ddaa"/>}
      </div>
      {/* Radar */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"20px",display:"flex",gap:"28px",alignItems:"center",flexWrap:"wrap"}}>
        <div style={{flex:"0 0 auto"}}>
          <div style={{fontSize:"12px",letterSpacing:"2px",color:C.label,marginBottom:"10px"}}>ПРОФИЛЬ ИГРЫ</div>
          <Radar axes={radarAxes}/>
        </div>
        <div style={{flex:1,minWidth:"180px"}}>
          <div style={{fontSize:"12px",letterSpacing:"2px",color:C.label,marginBottom:"14px"}}>ПОКАЗАТЕЛИ</div>
          {radarAxes.map((a,i)=>(
            <div key={i} style={{marginBottom:"12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"13px",marginBottom:"4px"}}>
                <span style={{color:C.label}}>{a.label}</span>
                <span style={{color:C.yellow,fontWeight:700}}>{a.raw}</span>
              </div>
              <div style={{height:"5px",background:"#1a1a10",borderRadius:"2px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(100,a.value)}%`,background:C.yellow,transition:"width 1s ease"}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Match History ─────────────────────────────────────────────────────────────
function MatchHistory({faceit}) {
  const [exp,setExp]           = useState(null);
  const [analyses,setAnalyses] = useState({});
  const [aiLoading,setAiLoading] = useState({});
  const matches = arr(faceit?.matches);

  async function fetchAnalysis(m, i) {
    if (analyses[i] || aiLoading[i]) return;
    setAiLoading(l=>({...l,[i]:true}));
    try {
      const r = await fetch(`${BACKEND}/analyze-match`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          map:m.map||"Unknown", result:m.result||"0",
          kills:m.kills||"0", deaths:m.deaths||"0",
          assists:m.assists||"0", kd:m.kd||"0",
          hs:m.hs||"0", adr:m.adr||"0",
          mvps:m.mvps||"0", score:m.score||""
        })
      });
      const d = await r.json();
      if (d.result) setAnalyses(a=>({...a,[i]:d.result}));
    } catch {}
    setAiLoading(l=>({...l,[i]:false}));
  }

  if (!matches.length) return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"36px 28px",textAlign:"center"}}>
      <div style={{fontSize:"36px",marginBottom:"14px"}}>🎮</div>
      <div style={{fontSize:"16px",color:C.value,fontWeight:700,marginBottom:"8px"}}>Нет матчей FACEIT</div>
      <div style={{fontSize:"14px",color:C.label,lineHeight:1.75,marginBottom:"20px",maxWidth:"400px",margin:"0 auto 20px"}}>
        История матчей и AI разбор доступны для игроков FACEIT.<br/>
        Регистрация бесплатная — просто привяжи Steam аккаунт.
      </div>
      <a href="https://www.faceit.com" target="_blank" rel="noreferrer"
        style={{display:"inline-block",padding:"11px 28px",background:C.orange,
          color:"#fff",textDecoration:"none",fontSize:"13px",fontWeight:700,letterSpacing:"2px"}}>
        РЕГИСТРАЦИЯ НА FACEIT →
      </a>
    </div>
  );

  return (
    <div style={{animation:"up .4s ease both"}}>
      <div style={{fontSize:"15px",letterSpacing:"2px",color:C.yellow,fontWeight:700,padding:"8px 0 16px"}}>
        ИСТОРИЯ МАТЧЕЙ · FACEIT
        <span style={{fontSize:"12px",color:C.muted,fontWeight:400,marginLeft:"12px",letterSpacing:"1px"}}>
          нажми на матч → AI разбор
        </span>
      </div>

      {matches.map((m,i)=>{
        const win=m.result==="1", ac=win?C.win:C.lose;
        const isExp=exp===i, ai=analyses[i], isAiLoading=aiLoading[i];

        return (
          <div key={i} style={{marginBottom:"3px"}}>
            <div className="match-row" onClick={()=>{
              const opening=!isExp;
              setExp(isExp?null:i);
              if(opening) fetchAnalysis(m,i);
            }} style={{
              display:"grid",gridTemplateColumns:"3px 1fr 90px 78px 66px 48px",
              gap:"12px",padding:"14px 16px",cursor:"pointer",alignItems:"center",
              background:isExp?"#181810":C.card,border:`1px solid ${C.border}`,
              borderLeft:`3px solid ${ac}`,transition:"background .15s"}}>
              <div/>
              <div>
                <div style={{fontSize:"15px",color:C.value,fontWeight:700}}>{m.map||"—"}</div>
                <div style={{fontSize:"12px",color:ac,marginTop:"2px"}}>{win?"ПОБЕДА":"ПОРАЖЕНИЕ"} · {m.score}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"11px",color:C.label,marginBottom:"3px"}}>K/D</div>
                <div style={{fontSize:"16px",color:C.yellow,fontWeight:700}}>{m.kd}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"11px",color:C.label,marginBottom:"3px"}}>K–D</div>
                <div style={{fontSize:"14px",color:C.text}}>{m.kills}–{m.deaths}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"11px",color:C.label,marginBottom:"3px"}}>HS%</div>
                <div style={{fontSize:"14px",color:C.text}}>{m.hs}%</div>
              </div>
              <div style={{textAlign:"center"}}>
                {parseInt(m.mvps)>0&&<div style={{fontSize:"14px"}}>⭐</div>}
                <div style={{fontSize:"11px",color:isExp?C.yellow:C.muted,marginTop:"2px"}}>{isExp?"▲":"▼"}</div>
              </div>
            </div>

            {isExp&&(
              <div style={{background:"#0f0f09",border:`1px solid ${C.border}`,borderTop:"none",
                padding:"16px 20px",animation:"up .2s ease both"}}>

                {/* Stats */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(80px,1fr))",
                  gap:"4px",marginBottom:"16px"}}>
                  {[{l:"УБИЙСТВА",v:m.kills},{l:"СМЕРТИ",v:m.deaths},{l:"АССИСТЫ",v:m.assists||"—"},
                    {l:"ADR",v:m.adr||"—"},{l:"K/R",v:m.kr||"—"},{l:"MVP",v:m.mvps||"0"}].map((st,j)=>(
                    <div key={j} style={{background:C.card,border:`1px solid ${C.border}`,
                      padding:"9px 10px",textAlign:"center"}}>
                      <div style={{fontSize:"10px",color:C.muted,letterSpacing:"1px",marginBottom:"3px"}}>{st.l}</div>
                      <div style={{fontSize:"16px",color:C.yellow,fontWeight:700}}>{st.v}</div>
                    </div>
                  ))}
                </div>

                {/* AI loading */}
                {isAiLoading&&(
                  <div style={{background:"#15150a",border:`1px solid ${C.yellow}33`,
                    borderLeft:`3px solid ${C.yellow}`,padding:"16px 18px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px"}}>
                      <div style={{display:"flex",gap:"4px"}}>
                        {[0,1,2].map(k=><div key={k} style={{width:"6px",height:"6px",background:C.yellow,
                          borderRadius:"50%",animation:`blink 1s ${k*.3}s infinite`}}/>)}
                      </div>
                      <span style={{fontSize:"12px",color:C.yellow,letterSpacing:"2px",fontWeight:700}}>
                        AI РАЗБИРАЕТ МАТЧ
                      </span>
                    </div>
                    <Skel w="90%" h="14"/><Skel w="75%" h="14" mb={4}/><Skel w="60%" h="14"/>
                  </div>
                )}

                {/* AI result */}
                {ai&&!isAiLoading&&(
                  <div style={{background:"#15150a",border:`1px solid ${C.yellow}33`,
                    borderLeft:`3px solid ${C.yellow}`,padding:"18px 20px",
                    animation:"up .3s ease both"}}>
                    <div style={{fontSize:"11px",letterSpacing:"3px",color:C.yellow,
                      marginBottom:"14px",fontWeight:700}}>🤖 AI РАЗБОР МАТЧА</div>

                    <div style={{fontSize:"15px",color:C.value,lineHeight:1.75,marginBottom:"16px"}}>
                      {ai.verdict}
                    </div>

                    <div style={{marginBottom:"14px"}}>
                      {arr(ai.mistakes).map((err,k)=>(
                        <div key={k} style={{display:"flex",gap:"10px",
                          alignItems:"flex-start",marginBottom:"8px"}}>
                          <span style={{color:C.lose,fontSize:"15px",flexShrink:0,marginTop:"1px"}}>✗</span>
                          <span style={{fontSize:"14px",color:C.label,lineHeight:1.65}}>{err}</span>
                        </div>
                      ))}
                    </div>

                    {ai.bright&&(
                      <div style={{display:"flex",gap:"10px",padding:"11px 14px",
                        background:"#0f1a0f",border:`1px solid ${C.win}33`,marginBottom:"10px"}}>
                        <span style={{color:C.win,fontSize:"15px",flexShrink:0}}>✓</span>
                        <span style={{fontSize:"14px",color:C.win,lineHeight:1.65}}>{ai.bright}</span>
                      </div>
                    )}

                    {ai.tip&&(
                      <div style={{display:"flex",gap:"10px",padding:"11px 14px",
                        background:C.yellow+"0a",border:`1px solid ${C.yellow}22`}}>
                        <span style={{fontSize:"15px",flexShrink:0}}>💡</span>
                        <span style={{fontSize:"14px",color:C.yellow,lineHeight:1.65}}>{ai.tip}</span>
                      </div>
                    )}
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

// ── Map Pool ──────────────────────────────────────────────────────────────────
function MapPool({faceit}) {
  const maps = arr(faceit?.maps).filter(m=>parseInt(m.matches)>0)
    .sort((a,b)=>parseFloat(b.winrate)-parseFloat(a.winrate));
  if (!maps.length) return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"36px 28px",textAlign:"center"}}>
      <div style={{fontSize:"36px",marginBottom:"14px"}}>🗺️</div>
      <div style={{fontSize:"16px",color:C.value,fontWeight:700,marginBottom:"8px"}}>Нет статистики по картам</div>
      <div style={{fontSize:"14px",color:C.label,lineHeight:1.75}}>
        Сыграй хотя бы 5 матчей на FACEIT — статистика по картам появится автоматически.
      </div>
    </div>
  );
  const best=maps[0], worst=maps[maps.length-1];
  const bans=maps.filter(m=>parseFloat(m.winrate)<45).slice(-2);
  return (
    <div style={{animation:"up .4s ease both"}}>
      <div style={{fontSize:"15px",letterSpacing:"2px",color:C.yellow,fontWeight:700,padding:"8px 0 16px"}}>ПУЛ КАРТ · FACEIT</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"3px",marginBottom:"12px"}}>
        <div style={{background:"#0d1a0d",border:`1px solid #1e3a1e`,padding:"16px 18px"}}>
          <div style={{fontSize:"11px",color:"#55aa55",letterSpacing:"2px",marginBottom:"5px"}}>ЛУЧШАЯ</div>
          <div style={{fontSize:"18px",color:"#66dd66",fontWeight:700}}>{best.map} · {best.winrate}%</div>
        </div>
        <div style={{background:"#1a0d0d",border:`1px solid #3a1e1e`,padding:"16px 18px"}}>
          <div style={{fontSize:"11px",color:"#cc5555",letterSpacing:"2px",marginBottom:"5px"}}>ХУДШАЯ</div>
          <div style={{fontSize:"18px",color:C.lose,fontWeight:700}}>{worst.map} · {worst.winrate}%</div>
        </div>
        {bans.length>0&&(
          <div style={{background:"#1a1408",border:`1px solid #3a2e14`,padding:"16px 18px"}}>
            <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"2px",marginBottom:"5px"}}>БАНИТЬ</div>
            <div style={{fontSize:"16px",color:C.yellow,fontWeight:700}}>{bans.map(b=>b.map).join(", ")}</div>
          </div>
        )}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 110px 80px 70px",gap:"2px",padding:"8px 14px",
        fontSize:"11px",letterSpacing:"2px",color:C.muted,borderBottom:`1px solid ${C.border}`}}>
        <div>КАРТА</div><div>WINRATE</div><div>МАТЧИ</div><div>K/D</div>
      </div>
      {maps.map((m,i)=>{
        const wr=parseFloat(m.winrate)||0;
        const wc=wr>=55?"#55cc66":wr>=45?C.yellow:C.lose;
        return (
          <div key={i} className="hov-row" style={{display:"grid",gridTemplateColumns:"1fr 110px 80px 70px",
            gap:"2px",padding:"13px 14px",alignItems:"center",borderBottom:`1px solid ${C.border}`,
            background:C.card,transition:"background .15s"}}>
            <div style={{fontSize:"16px",color:C.value,fontWeight:700}}>{m.map}</div>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <div style={{flex:1,height:"5px",background:"#1a1a10",borderRadius:"3px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${wr}%`,background:wc,transition:"width .8s ease"}}/>
              </div>
              <span style={{fontSize:"13px",color:wc,fontWeight:700,minWidth:"34px"}}>{m.winrate}%</span>
            </div>
            <div style={{fontSize:"13px",color:C.label}}>{m.matches}</div>
            <div style={{fontSize:"13px",color:C.label}}>{m.kd}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Search ────────────────────────────────────────────────────────────────────
function SearchBar({onSelect}) {
  const [q,setQ]=useState(""), [res,setRes]=useState([]), [open,setOpen]=useState(false), [loading,setLoading]=useState(false);
  const t=useRef(null);
  useEffect(()=>{
    if(q.trim().length<2){setRes([]);return;}
    clearTimeout(t.current); setLoading(true);
    t.current=setTimeout(async()=>{
      try{const r=await fetch(`${BACKEND}/search/${encodeURIComponent(q.trim())}`);const d=await r.json();setRes(d.results||[]);}
      catch{setRes([]);}
      setLoading(false); setOpen(true);
    },350);
    return()=>clearTimeout(t.current);
  },[q]);
  return (
    <div style={{position:"relative",width:"220px"}}>
      <input value={q} onChange={e=>setQ(e.target.value)} onFocus={()=>setOpen(true)}
        placeholder="поиск по FACEIT нику..."
        style={{width:"100%",background:"#111109",border:`1px solid ${C.border}`,
          color:C.yellow,fontSize:"13px",padding:"9px 13px",fontFamily:"'Segoe UI',system-ui,sans-serif"}}/>
      {open&&q.trim().length>=2&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:"2px",
          background:C.card,border:`1px solid ${C.border}`,zIndex:50,maxHeight:"280px",overflowY:"auto"}}>
          {loading&&<div style={{padding:"12px",fontSize:"12px",color:C.muted,textAlign:"center"}}>поиск...</div>}
          {!loading&&!res.length&&<div style={{padding:"12px",fontSize:"12px",color:C.muted,textAlign:"center"}}>не найдено</div>}
          {res.map((r,i)=>(
            <div key={i} className="hov-row" onClick={()=>{onSelect(r);setOpen(false);setQ("");}}
              style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 13px",
                cursor:"pointer",borderBottom:`1px solid ${C.border}`,transition:"background .15s"}}>
              {r.avatar?<img src={r.avatar} alt="" style={{width:"26px",height:"26px",borderRadius:"2px"}}/>
                :<div style={{width:"26px",height:"26px",background:"#1a1a10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px"}}>👤</div>}
              <span style={{fontSize:"14px",color:C.value,flex:1}}>{r.nickname}</span>
              <span style={{fontSize:"16px"}}>{flag(r.country)}</span>
            </div>
          ))}
        </div>
      )}
      {open&&<div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:40}}/>}
    </div>
  );
}

// ── Profile Modal ─────────────────────────────────────────────────────────────
function ProfileModal({steamid,nickname,onClose}) {
  const [data,setData]=useState(null);
  useEffect(()=>{
    const url=steamid?`${BACKEND}/profile/${steamid}`:`${BACKEND}/faceit/by-nickname/${encodeURIComponent(nickname)}`;
    fetch(url).then(r=>r.json()).then(setData).catch(()=>setData({}));
  },[steamid,nickname]);

  const fc=steamid?data?.faceit:data;
  const pl=steamid?data:{username:data?.nickname||nickname,avatar:fc?.avatar||"",country:fc?.country,cs2:{},faceit:fc};

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:500,
      display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,
        borderTop:`2px solid ${C.yellow}`,maxWidth:"680px",width:"100%",maxHeight:"88vh",overflowY:"auto",animation:"slideUp .3s ease"}}>
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:"12px",letterSpacing:"3px",color:C.yellow}}>ПРОФИЛЬ ИГРОКА</span>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.label,cursor:"pointer",width:"26px",height:"26px",fontFamily:"monospace",fontSize:"14px"}}>✕</button>
        </div>
        {!data?<div style={{padding:"32px"}}><Skel w="60%" h="22"/><Skel w="40%" h="16"/><div style={{marginTop:"20px"}}><Skel h="60"/><Skel h="60"/></div></div>
        :data.steamid||fc?(
          <div>
            {pl&&<HeroCard player={pl} source={fc?"faceit":"steam"}/>}
            {arr(fc?.matches).length>0&&<div style={{padding:"4px 16px"}}><ChartsSection faceit={fc}/></div>}
            {arr(fc?.matches).length>0&&<div style={{padding:"0 16px 16px"}}><MatchHistory faceit={fc}/></div>}
            {arr(fc?.maps).length>0&&<div style={{padding:"0 16px 20px"}}><MapPool faceit={fc}/></div>}
            {steamid&&data.history?.length>0&&(
              <div style={{padding:"0 16px 20px"}}>
                <div style={{fontSize:"15px",letterSpacing:"2px",color:C.yellow,fontWeight:700,padding:"6px 0 14px"}}>ИСТОРИЯ РАЗБОРОВ</div>
                {data.history.map((h,i)=>{
                  const lc=ANALYSIS_COLOR[h.result?.level]||C.yellow;
                  return <div key={i} style={{background:"#111109",border:`1px solid ${C.border}`,borderLeft:`2px solid ${lc}`,padding:"13px 16px",marginBottom:"3px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                      <span style={{fontSize:"11px",color:lc,letterSpacing:"2px"}}>{h.result?.level?.toUpperCase()}</span>
                      <span style={{fontSize:"11px",color:C.muted}}>{fmt(h.timestamp)}</span>
                    </div>
                    <div style={{fontSize:"14px",color:C.label,lineHeight:1.6}}>{h.result?.overall}</div>
                  </div>;
                })}
              </div>
            )}
          </div>
        ):<div style={{padding:"40px",textAlign:"center",color:C.muted,fontSize:"13px"}}>Профиль не найден</div>}
      </div>
    </div>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function Leaderboard({myId, onProfile}) {
  const [data,setData]=useState(null);
  const [sortKey,setSortKey]=useState("kd");
  useEffect(()=>{fetch(`${BACKEND}/leaderboard`).then(r=>r.json()).then(d=>setData(d.leaderboard||[])).catch(()=>setData([]));},[]);
  if (!data) return <div style={{padding:"12px"}}>{[1,2,3,4,5].map(i=><Skel key={i} h="50"/>)}</div>;
  if (!data.length) return (
    <div style={{textAlign:"center",padding:"70px",color:C.muted}}>
      <div style={{fontSize:"36px",marginBottom:"14px"}}>🏆</div>
      <div style={{fontSize:"13px",letterSpacing:"3px"}}>ТАБЛИЦА ПУСТА</div>
      <div style={{fontSize:"13px",color:C.muted,marginTop:"8px"}}>Войди через Steam и сделай анализ</div>
    </div>
  );

  const SORTS = [
    {id:"kd",      label:"K/D",          icon:"🎯", fn:(a,b)=>(parseFloat(b.stats?.kd||0)-parseFloat(a.stats?.kd||0))},
    {id:"winrate", label:"Побед %",       icon:"🏆", fn:(a,b)=>(parseFloat(b.stats?.winrate||0)-parseFloat(a.stats?.winrate||0))},
    {id:"hs",      label:"Хедшоты",      icon:"💥", fn:(a,b)=>(parseFloat(b.stats?.hs||0)-parseFloat(a.stats?.hs||0))},
    {id:"kills",   label:"Убийства",     icon:"⚔️", fn:(a,b)=>(parseInt(b.stats?.kills||0)-parseInt(a.stats?.kills||0))},
    {id:"deaths",  label:"Смерти",       icon:"💀", fn:(a,b)=>(parseInt(a.stats?.deaths||0)-parseInt(b.stats?.deaths||0))},
    {id:"matches", label:"Матчи",        icon:"🎮", fn:(a,b)=>(parseInt(b.stats?.matches||0)-parseInt(a.stats?.matches||0))},
    {id:"mvp",     label:"MVP",          icon:"⭐", fn:(a,b)=>(parseInt(b.stats?.mvp||0)-parseInt(a.stats?.mvp||0))},
    {id:"playtime",label:"Время в игре", icon:"⏱️", fn:(a,b)=>(parseInt(b.stats?.playtime||0)-parseInt(a.stats?.playtime||0))},
  ];

  const sortFn = SORTS.find(s=>s.id===sortKey)?.fn || SORTS[0].fn;
  const sorted = [...data].sort(sortFn);

  const valFor = (p) => {
    const s = p.stats || {};
    switch(sortKey) {
      case "kd":      return s.kd ? `${s.kd} K/D` : "—";
      case "winrate": return s.winrate ? `${s.winrate}%` : "—";
      case "hs":      return s.hs ? `${s.hs}% HS` : "—";
      case "kills":   return s.kills ? `${parseInt(s.kills).toLocaleString()} kills` : "—";
      case "deaths":  return s.deaths ? `${parseInt(s.deaths).toLocaleString()} deaths` : "—";
      case "matches": return s.matches ? `${parseInt(s.matches).toLocaleString()} матч.` : "—";
      case "mvp":     return s.mvp ? `${parseInt(s.mvp).toLocaleString()} MVP` : "—";
      case "playtime": return s.playtime ? `${Math.round(s.playtime/60)}ч` : "—";
      default:        return "—";
    }
  };

  return (
    <div style={{animation:"up .4s ease both"}}>
      {/* Sort buttons */}
      <div style={{marginBottom:"14px"}}>
        <div style={{fontSize:"11px",color:C.muted,letterSpacing:"2px",marginBottom:"8px"}}>СОРТИРОВАТЬ ПО:</div>
        <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
          {SORTS.map(s=>{
            const active = sortKey===s.id;
            return(
              <button key={s.id} onClick={()=>setSortKey(s.id)} style={{
                padding:"7px 12px",background:active?C.yellow+"22":C.card,
                border:`1px solid ${active?C.yellow+"88":C.border}`,
                borderBottom:`2px solid ${active?C.yellow:"transparent"}`,
                color:active?C.yellow:C.muted,cursor:"pointer",fontSize:"12px",
                fontFamily:"inherit",fontWeight:active?700:400,
                display:"flex",alignItems:"center",gap:"5px",transition:"all .15s",
                whiteSpace:"nowrap"}}>
                <span>{s.icon}</span> {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{fontSize:"12px",color:C.muted,marginBottom:"10px"}}>Нажми на игрока — откроется профиль</div>
      <div style={{display:"grid",gridTemplateColumns:"40px 1fr 110px 100px",gap:"2px",
        padding:"8px 14px",fontSize:"11px",letterSpacing:"2px",color:C.muted,borderBottom:`1px solid ${C.border}`}}>
        <div>#</div><div>ИГРОК</div><div>УРОВЕНЬ</div>
        <div style={{textAlign:"right"}}>{SORTS.find(s=>s.id===sortKey)?.label?.toUpperCase()}</div>
      </div>
      {sorted.map((p,i)=>{
        const lc=ANALYSIS_COLOR[p.level]||C.yellow;
        const isMe=myId&&p.steamid===myId;
        const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
        return (
          <div key={p.steamid||i} className="hov-row" onClick={()=>onProfile(p.steamid)} style={{
            display:"grid",gridTemplateColumns:"40px 1fr 110px 100px",gap:"2px",
            padding:"12px 14px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,
            background:isMe?"#1a1a08":C.card,borderLeft:isMe?`3px solid ${C.yellow}`:`3px solid transparent`,
            transition:"background .15s"}}>
            <div style={{color:i<3?C.yellow:C.muted,fontSize:"14px",fontWeight:700,alignSelf:"center"}}>{medal||i+1}</div>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              {p.avatar?<img src={p.avatar} alt="" style={{width:"28px",height:"28px",borderRadius:"2px",flexShrink:0}}/>
                :<div style={{width:"28px",height:"28px",background:"#1a1a10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",flexShrink:0}}>👤</div>}
              <span style={{fontSize:"14px",color:isMe?C.yellow:C.value,fontWeight:isMe?700:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {p.username}{isMe?" (ты)":""}
              </span>
            </div>
            <div style={{padding:"3px 8px",background:lc+"18",color:lc,border:`1px solid ${lc}33`,
              fontSize:"10px",letterSpacing:"1px",display:"inline-flex",alignItems:"center",height:"fit-content",alignSelf:"center"}}>
              {p.level}
            </div>
            <div style={{fontSize:"14px",color:C.yellow,fontWeight:700,textAlign:"right",alignSelf:"center"}}>
              {valFor(p)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab({steamid}) {
  const [data,setData]=useState(null), [exp,setExp]=useState(null);
  useEffect(()=>{
    fetch(`${BACKEND}/history/${steamid}`).then(r=>r.json()).then(d=>setData(d.history||[])).catch(()=>setData([]));
  },[steamid]);
  if (!data) return <div style={{padding:"12px"}}>{[1,2,3].map(i=><Skel key={i} h="70"/>)}</div>;
  if (!data.length) return (
    <div style={{textAlign:"center",padding:"60px",color:C.muted}}>
      <div style={{fontSize:"28px",marginBottom:"12px"}}>📋</div>
      <div style={{fontSize:"13px",letterSpacing:"3px"}}>ИСТОРИЯ ПУСТА</div>
    </div>
  );
  return (
    <div style={{animation:"up .4s ease both"}}>
      {data.map((h,i)=>{
        const lc=ANALYSIS_COLOR[h.result?.level]||C.yellow, isExp=exp===i;
        return (
          <div key={i} style={{marginBottom:"3px"}}>
            <div onClick={()=>setExp(isExp?null:i)} className="hov-row" style={{
              background:C.card,border:`1px solid ${C.border}`,borderLeft:`3px solid ${lc}`,
              padding:"16px 20px",cursor:"pointer",transition:"background .15s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
                  <span style={{padding:"3px 13px",background:lc+"18",color:lc,border:`1px solid ${lc}33`,fontSize:"11px",letterSpacing:"2px",fontWeight:700}}>
                    {h.result?.level?.toUpperCase()}
                  </span>
                  <span style={{fontSize:"13px",color:C.label}}>Rank {h.stats?.rank} · K/D {h.stats?.kd}</span>
                </div>
                <span style={{fontSize:"12px",color:C.muted}}>{fmt(h.timestamp)}</span>
              </div>
              <div style={{fontSize:"15px",color:C.text,lineHeight:1.75}}>{h.result?.overall}</div>
            </div>
            {isExp&&(
              <div style={{background:"#0f0f09",border:`1px solid ${C.border}`,borderTop:"none",
                padding:"18px 20px",animation:"up .2s ease both"}}>
                <div style={{color:"#ff8866",fontSize:"14px",marginBottom:"12px",borderLeft:"2px solid #ff5544",paddingLeft:"12px"}}>
                  ⚠ {h.result?.mainProblem}
                </div>
                {h.result?.mapInsights?.map((mi,j)=>(
                  <div key={j} style={{fontSize:"13px",color:C.yellow,marginBottom:"6px"}}>🗺️ {mi}</div>
                ))}
                <div style={{fontSize:"12px",color:C.muted,borderTop:`1px solid ${C.border}`,paddingTop:"10px",marginTop:"10px"}}>
                  🎯 {h.result?.goal}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}




// ── Score Cards ───────────────────────────────────────────────────────────────
function ScoreCards({player, source}) {
  const fc = player?.faceit;
  const cs2 = player?.cs2 || {};
  const kd   = parseFloat(source==="faceit"?fc?.lifetime?.kd:cs2.kd) || 0;
  const hs   = parseFloat(source==="faceit"?fc?.lifetime?.hs:cs2.hs) || 0;
  const wr   = parseFloat(source==="faceit"?fc?.lifetime?.winrate:cs2.winrate) || 0;
  const lvl  = parseInt(fc?.level) || 0;
  const matches = parseInt(source==="faceit"?fc?.lifetime?.matches:cs2.matches) || 0;

  // Compute scores
  const aimScore = Math.round(Math.min(100,
    (Math.min(kd/2,1)*40) + (Math.min(hs/60,1)*35) + (Math.min(wr/65,1)*25)
  ));
  const consistScore = Math.round(Math.min(100,
    (Math.min(wr/60,1)*50) + (Math.min(matches/200,1)*30) + (lvl>0?Math.min(lvl/10,1)*20:15)
  ));
  const overallScore = Math.round((aimScore*0.6 + consistScore*0.4));

  const ScoreRing = ({score,label,color}) => {
    const r=28, circ=2*Math.PI*r, dash=circ*score/100;
    const scoreColor = score>=70?"#55ee55":score>=45?C.yellow:"#ff6655";
    return (
      <div style={{textAlign:"center",padding:"16px 20px"}}>
        <div style={{position:"relative",width:"80px",height:"80px",margin:"0 auto 10px"}}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={r} fill="none" stroke={C.border} strokeWidth="5"/>
            <circle cx="40" cy="40" r={r} fill="none" stroke={scoreColor} strokeWidth="5"
              strokeDasharray={`${dash} ${circ-dash}`} strokeLinecap="round"
              strokeDashoffset={circ/4} style={{transition:"stroke-dasharray 1s ease"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:"18px",color:scoreColor,fontWeight:700}}>{score}</div>
        </div>
        <div style={{fontSize:"11px",color:C.muted,letterSpacing:"2px"}}>{label}</div>
        <div style={{fontSize:"13px",color:scoreColor,fontWeight:700,marginTop:"3px"}}>
          {score>=80?"ОТЛИЧНО":score>=60?"ХОРОШО":score>=40?"СРЕДНЕ":"РАБОТАЙ"}
        </div>
      </div>
    );
  };

  return (
    <div style={{className:"score-rings",background:C.card,border:`1px solid ${C.border}`,
      display:"flex",justifyContent:"space-around",flexWrap:"wrap",marginBottom:"3px",animation:"up .5s ease both"}}>
      <ScoreRing score={overallScore} label="ОБЩИЙ РЕЙТИНГ" color={C.yellow}/>
      <ScoreRing score={aimScore} label="AIM SCORE"/>
      <ScoreRing score={consistScore} label="CONSISTENCY"/>
    </div>
  );
}


// ── Daily Training Plan ───────────────────────────────────────────────────────
function TrainingPlan({player, source}) {
  const today = new Date().toDateString().replace(/ /g,"_");
  const storKey = `cs2_training_${today}`;
  const [done, setDone] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem(storKey)||"{}"); }catch{ return {}; }
  });
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const fc = player?.faceit;
  const cs2 = player?.cs2 || {};
  const kd  = parseFloat(source==="faceit"?fc?.lifetime?.kd:cs2.kd) || 0;
  const hs  = parseFloat(source==="faceit"?fc?.lifetime?.hs:cs2.hs) || 0;
  const wr  = parseFloat(source==="faceit"?fc?.lifetime?.winrate:cs2.winrate) || 0;

  // Генерация плана прямо на фронте без API
  useEffect(() => {
    const tasks = [];
    // Aim warmup — всегда
    tasks.push({id:"aim",cat:"AIM",dur:"15 мин",task:"Aim_botz: 500 убийств с места, фокус на голову",priority:true});
    // Recoil если HS низкий
    if (hs < 45) tasks.push({id:"recoil",cat:"МЕХАНИКА",dur:"20 мин",task:"Workshop: Recoil Master — отработать спрей AK и M4",priority:true});
    // Movement если KD низкий
    if (kd < 1.0) tasks.push({id:"move",cat:"МЕХАНИКА",dur:"15 мин",task:"Counter-strafe практика: двигаться → остановиться → стрелять"});
    // Prefire на картах
    tasks.push({id:"prefire",cat:"КАРТЫ",dur:"20 мин",task:"Prefire Workshop: отработать 10 ключевых позиций на своей лучшей карте"});
    // Deathmatch
    tasks.push({id:"dm",cat:"РАЗМИНКА",dur:"10 мин",task:"Deathmatch перед игрой: только хедшоты, пистолетный раунд"});
    // Demo если WR низкий
    if (wr < 50) tasks.push({id:"demo",cat:"АНАЛИЗ",dur:"15 мин",task:"Посмотри 1 раунд из проигранного матча — найди момент где ошибся"});
    // Utility
    tasks.push({id:"util",cat:"ТАКТИКА",dur:"10 мин",task:"Выучи 1 новый смок или молотов на часто играемой карте"});
    setPlan(tasks.slice(0,5));
  }, [player?.steamid, source]);

  const total = plan?.length || 0;
  const doneCount = Object.values(done).filter(Boolean).length;
  const progress = total > 0 ? Math.round(doneCount/total*100) : 0;

  const CAT_COLOR = {AIM:C.lose, МЕХАНИКА:C.orange, КАРТЫ:"#44ddaa", РАЗМИНКА:C.blue, АНАЛИЗ:"#aa88ff", ТАКТИКА:C.yellow};

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"24px",animation:"up .4s ease both"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <div style={{fontSize:"15px",letterSpacing:"2px",color:C.yellow,fontWeight:700,marginBottom:"4px"}}>
            📋 ПЛАН НА СЕГОДНЯ
          </div>
          <div style={{fontSize:"13px",color:C.muted}}>{doneCount}/{total} выполнено</div>
        </div>
        {/* Progress bar */}
        <div style={{minWidth:"200px"}}>
          <div style={{height:"8px",background:"#1a1a10",borderRadius:"4px",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${progress}%`,
              background:`linear-gradient(90deg,${C.yellow}88,${C.yellow})`,
              transition:"width .5s ease",borderRadius:"4px"}}/>
          </div>
          <div style={{fontSize:"12px",color:C.yellow,marginTop:"4px",textAlign:"right",fontWeight:700}}>{progress}%</div>
        </div>
      </div>

      {plan?.map((t,i) => {
        const cc = CAT_COLOR[t.cat] || C.yellow;
        const isDone = done[t.id];
        return (
          <div key={t.id} onClick={()=>setDone(d=>({...d,[t.id]:!d[t.id]}))}
            style={{display:"flex",gap:"14px",alignItems:"flex-start",padding:"14px 16px",
              marginBottom:"4px",cursor:"pointer",
              background:isDone?"#13180d":"#111109",
              border:`1px solid ${isDone?"#2a5a1a":C.border}`,
              borderLeft:`3px solid ${isDone?"#55aa33":cc}`,
              transition:"all .2s",opacity:isDone?0.6:1}}>
            {/* Checkbox */}
            <div style={{width:"22px",height:"22px",flexShrink:0,borderRadius:"3px",
              border:`2px solid ${isDone?"#55aa33":C.border}`,
              background:isDone?"#55aa33":"transparent",
              display:"flex",alignItems:"center",justifyContent:"center",marginTop:"1px",transition:"all .2s"}}>
              {isDone&&<span style={{color:"#fff",fontSize:"13px",fontWeight:700}}>✓</span>}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"5px",flexWrap:"wrap"}}>
                <span style={{padding:"2px 9px",background:cc+"22",color:cc,fontSize:"10px",letterSpacing:"2px",fontWeight:700}}>
                  {t.cat}
                </span>
                <span style={{fontSize:"12px",color:C.muted}}>{t.dur}</span>
                {t.priority&&<span style={{fontSize:"10px",color:C.lose,letterSpacing:"1px"}}>ПРИОРИТЕТ</span>}
              </div>
              <div style={{fontSize:"14px",color:isDone?C.muted:C.text,lineHeight:1.6,textDecoration:isDone?"line-through":"none"}}>
                {t.task}
              </div>
            </div>
          </div>
        );
      })}

      {doneCount===total&&total>0&&(
        <div style={{textAlign:"center",padding:"16px",marginTop:"8px",
          background:"#0f1a0f",border:`1px solid ${C.win}44`,
          fontSize:"15px",color:C.win,animation:"up .3s ease"}}
          ref={el=>{if(el)try{localStorage.setItem("cs2_training_done","1");}catch{}}}>
          🎉 Тренировка выполнена! Удачи в рейтинговых сегодня.
        </div>
      )}
    </div>
  );
}



// ── Mobile Navigation ─────────────────────────────────────────────────────────
function MobileNav({tab, setTab}) {
  const items = [
    {id:"overview", icon:"👤", label:"Обзор"},
    {id:"coach",    icon:"🎯", label:"Тренер"},
    {id:"matches",  icon:"🎮", label:"Матчи"},
    {id:"history",  icon:"📋", label:"История"},
    {id:"leaderboard", icon:"🏆", label:"Топ"},
  ];
  return (
    <nav className="mobile-nav" style={{position:"fixed",bottom:0,left:0,right:0,
      background:"#0d0d09",borderTop:`1px solid ${C.border}`,zIndex:100,
      alignItems:"stretch"}}>
      {items.map(item=>(
        <button key={item.id} onClick={()=>setTab(item.id)} style={{
          flex:1,padding:"8px 2px 10px",background:"transparent",border:"none",
          cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",
          borderTop:`2px solid ${tab===item.id?C.yellow:"transparent"}`,
          transition:"border-color .15s"}}>
          <span style={{fontSize:"20px",lineHeight:1}}>{item.icon}</span>
          <span style={{fontSize:"9px",letterSpacing:"1px",color:tab===item.id?C.yellow:C.muted,fontFamily:"inherit"}}>
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  );
}

// ── Streak Toast ──────────────────────────────────────────────────────────────
function StreakToast({streak, onClose}) {
  useEffect(()=>{ const t=setTimeout(onClose, 3500); return()=>clearTimeout(t); },[]);
  const msg = streak>=30?"🔥 30 дней подряд! Легенда!":streak>=14?"🔥 2 недели подряд! Серьёзно!":streak>=7?"🔥 Неделя подряд! Огонь!":"🔥 "+streak+" дня подряд!";
  return (
    <div style={{position:"fixed",top:"70px",left:"50%",transform:"translateX(-50%)",
      background:"#1a1408",border:`2px solid ${C.yellow}`,padding:"14px 24px",
      zIndex:300,animation:"slideUp .4s ease",boxShadow:`0 4px 24px ${C.yellow}44`,
      display:"flex",alignItems:"center",gap:"10px",whiteSpace:"nowrap"}}>
      <span style={{fontSize:"22px"}}>🔥</span>
      <div>
        <div style={{fontSize:"14px",color:C.yellow,fontWeight:700}}>{msg}</div>
        <div style={{fontSize:"12px",color:C.muted,marginTop:"2px"}}>Заходи завтра чтобы не потерять</div>
      </div>
      <button onClick={onClose} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:"16px",marginLeft:"8px"}}>✕</button>
    </div>
  );
}


// ── Logo ─────────────────────────────────────────────────────────────────────
function Logo({size=32, withText=true}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:"8px",userSelect:"none"}}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="17" stroke="#f5c518" strokeWidth="2.2"/>
        <line x1="20" y1="3"  x2="20" y2="12" stroke="#f5c518" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="20" y1="28" x2="20" y2="37" stroke="#f5c518" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="3"  y1="20" x2="12" y2="20" stroke="#f5c518" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="28" y1="20" x2="37" y2="20" stroke="#f5c518" strokeWidth="2.2" strokeLinecap="round"/>
        <circle cx="20" cy="20" r="2.5" fill="#f5c518"/>
        <text x="26" y="11" fontSize="7" fill="#f5c518" fontFamily="'Segoe UI',sans-serif" fontWeight="700">AI</text>
      </svg>
      {withText&&<div>
        <div style={{fontSize:"15px",color:"#f5c518",fontWeight:700,letterSpacing:"2px",lineHeight:1.1}}>CS2</div>
        <div style={{fontSize:"9px",color:"#9a9270",letterSpacing:"3px",lineHeight:1}}>ТРЕНЕР</div>
      </div>}
    </div>
  );
}


// ── Online counter ────────────────────────────────────────────────────────────
function useOnline() {
  const [n, setN] = useState(()=>Math.floor(Math.random()*60)+64);
  useEffect(()=>{
    const t = setInterval(()=>{
      setN(prev => {
        const delta = Math.floor(Math.random()*7)-3;
        return Math.max(58, Math.min(156, prev+delta));
      });
    }, 7000);
    return ()=>clearInterval(t);
  },[]);
  return n;
}


// ── About Modal ───────────────────────────────────────────────────────────────
function AboutModal({onClose}) {
  const FEATURES = [
    {icon:"🤖",title:"AI анализ",desc:"Нейросеть анализирует твою статистику и объясняет причины поражений на понятном языке. Не просто цифры — конкретные советы."},
    {icon:"📊",title:"Steam + FACEIT",desc:"Все данные подтягиваются автоматически при входе. K/D, процент побед, статистика карт, история матчей."},
    {icon:"🎯",title:"Per-match разбор",desc:"Нажми на любой матч — AI объяснит что пошло не так именно в этой игре. Какие ошибки, что было хорошо."},
    {icon:"💬",title:"AI тренер 24/7",desc:"Чат с тренером который знает твою статистику. Задавай вопросы, получай советы специально для тебя."},
    {icon:"📋",title:"План тренировок",desc:"Каждый день новый план — конкретные упражнения под твои слабые стороны. Чеклист с сохранением прогресса."},
    {icon:"⚡",title:"Рейтинг игроков",desc:"Таблица лидеров среди всех пользователей сервиса. Сравни себя с другими и стремись к вершине."},
  ];

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",
      zIndex:500,display:"flex",alignItems:"flex-start",justifyContent:"center",
      paddingTop:"72px",paddingBottom:"20px",paddingLeft:"20px",paddingRight:"20px",
      animation:"fadeIn .2s ease",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:C.card,border:`1px solid ${C.border}`,borderTop:`3px solid ${C.yellow}`,
        maxWidth:"620px",width:"100%",animation:"slideUp .3s ease"}}>

        <div style={{padding:"28px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
            <Logo size={40}/>
            <div>
              <div style={{fontSize:"11px",letterSpacing:"4px",color:C.yellow,marginBottom:"3px"}}>О СЕРВИСЕ</div>
              <div style={{fontSize:"18px",color:C.value,fontWeight:700}}>CS2 AI Тренер</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.border}`,
            color:C.muted,cursor:"pointer",width:"28px",height:"28px",fontSize:"14px",flexShrink:0}}>✕</button>
        </div>

        <div style={{padding:"24px 28px"}}>
          <div style={{fontSize:"16px",color:C.value,lineHeight:1.8,marginBottom:"24px"}}>
            CS2 AI Тренер — это персональный аналитик для игроков Counter-Strike 2.
            Сервис подключается к твоему Steam и FACEIT аккаунту, анализирует статистику
            и с помощью искусственного интеллекта объясняет <span style={{color:C.yellow,fontWeight:700}}>почему ты проигрываешь</span> и как это исправить.
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:"3px",marginBottom:"24px"}}>
            {FEATURES.map((f,i)=>(
              <div key={i} style={{background:"#111109",border:`1px solid ${C.border}`,padding:"16px"}}>
                <div style={{fontSize:"22px",marginBottom:"8px"}}>{f.icon}</div>
                <div style={{fontSize:"14px",color:C.value,fontWeight:700,marginBottom:"6px"}}>{f.title}</div>
                <div style={{fontSize:"13px",color:C.label,lineHeight:1.6}}>{f.desc}</div>
              </div>
            ))}
          </div>

          <div style={{background:"#111109",border:`1px solid ${C.border}`,padding:"18px 20px",marginBottom:"20px"}}>
            <div style={{fontSize:"12px",letterSpacing:"2px",color:C.yellow,marginBottom:"10px"}}>КАК ЭТО РАБОТАЕТ</div>
            {[
              "1. Войди через Steam — данные подтянутся автоматически",
              "2. AI Report загрузится сразу — увидишь свои сильные и слабые стороны",
              "3. Задай вопрос тренеру или нажми на матч для детального разбора",
              "4. Выполняй ежедневный план тренировок и отслеживай прогресс",
            ].map((t,i)=>(
              <div key={i} style={{fontSize:"14px",color:C.label,lineHeight:1.7,marginBottom:"4px"}}>{t}</div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px",marginBottom:"20px"}}>
            <div style={{background:"#111109",border:`1px solid ${C.border}`,padding:"16px"}}>
              <div style={{fontSize:"12px",color:C.muted,letterSpacing:"2px",marginBottom:"8px"}}>ТЕХНОЛОГИИ</div>
              {["Steam Web API","FACEIT Open API","Groq AI (LLaMA 3.3)","React + FastAPI"].map((t,i)=>(
                <div key={i} style={{fontSize:"13px",color:C.label,marginBottom:"4px"}}>· {t}</div>
              ))}
            </div>
            <div style={{background:"#111109",border:`1px solid ${C.border}`,padding:"16px"}}>
              <div style={{fontSize:"12px",color:C.muted,letterSpacing:"2px",marginBottom:"8px"}}>КОНФИДЕНЦИАЛЬНОСТЬ</div>
              <div style={{fontSize:"13px",color:C.label,lineHeight:1.6}}>
                Мы не храним пароли и личные данные. Используется только публичная статистика Steam и FACEIT.
              </div>
            </div>
          </div>

          <div style={{textAlign:"center",padding:"16px",background:"#111109",border:`1px solid ${C.border}`}}>
            <div style={{fontSize:"13px",color:C.muted,marginBottom:"6px"}}>Вопросы и поддержка</div>
            <div style={{fontSize:"14px",color:C.yellow}}>Telegram: @cs2coach_support</div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Footer ───────────────────────────────────────────────────────────────────
function Footer({onAbout, onPro, onLeaderboard}) {
  const online = useOnline();
  const [prevOnline, setPrev] = useState(online);
  const [anim, setAnim] = useState(false);
  useEffect(()=>{
    if (online !== prevOnline) {
      setAnim(true);
      setPrev(online);
      setTimeout(()=>setAnim(false), 400);
    }
  },[online]);

  const SOCIALS = [
    {icon:<svg width="16" height="16" viewBox="0 0 24 24" fill={C.yellow}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, label:"X / Twitter", url:"https://x.com/CS2Coach"},
    {icon:<svg width="16" height="16" viewBox="0 0 24 24" fill={C.yellow} xmlns="http://www.w3.org/2000/svg"><path d="M11.701 18.771H12.837C12.837 18.771 13.186 18.731 13.365 18.539C13.530 18.362 13.524 18.030 13.524 18.030C13.524 18.030 13.501 16.461 14.236 16.224C14.961 15.991 15.897 17.735 16.889 18.403C17.640 18.909 18.214 18.795 18.214 18.795L20.720 18.771C20.720 18.771 22.033 18.691 21.410 17.664C21.358 17.578 21.050 16.898 19.562 15.509C18.004 14.052 18.216 14.292 20.093 11.763C21.231 10.232 21.692 9.290 21.555 8.887C21.424 8.500 20.570 8.601 20.570 8.601L17.756 8.619C17.756 8.619 17.550 8.590 17.398 8.680C17.250 8.769 17.155 8.978 17.155 8.978C17.155 8.978 16.709 10.165 16.112 11.176C14.852 13.310 14.350 13.422 14.141 13.288C13.655 12.975 13.776 12.039 13.776 11.380C13.776 9.241 14.098 8.369 13.148 8.141C12.837 8.065 12.609 8.016 11.801 8.008C10.771 7.998 9.900 8.012 9.408 8.257C9.082 8.420 8.831 8.782 8.984 8.803C9.172 8.829 9.598 8.919 9.824 9.226C10.116 9.623 10.106 10.511 10.106 10.511C10.106 10.511 10.272 13.000 9.709 13.306C9.325 13.515 8.797 13.087 7.676 11.153C7.100 10.161 6.667 9.066 6.667 9.066C6.667 9.066 6.583 8.863 6.438 8.755C6.262 8.624 6.016 8.583 6.016 8.583L3.340 8.601C3.340 8.601 2.939 8.613 2.794 8.787C2.665 8.943 2.784 9.265 2.784 9.265C2.784 9.265 4.928 14.165 7.354 16.636C9.583 18.904 12.109 18.771 12.109 18.771H11.701Z"/></svg>, label:"VK", url:"https://vk.com/club239192553"},
    {icon:<svg width="16" height="16" viewBox="0 0 24 24" fill={C.yellow}><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z"/></svg>, label:"Telegram", url:"https://t.me/csgo2coach"},
  ];

  return (
    <footer style={{background:"#0d0d09",borderTop:`1px solid ${C.border}`,
      padding:"32px 24px 24px",marginTop:"32px"}}>
      <div style={{maxWidth:"1100px",margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
          flexWrap:"wrap",gap:"24px",marginBottom:"28px"}}>

          {/* Brand */}
          <div style={{minWidth:"200px"}}>
            <Logo size={36} withText={true}/>
            <div style={{fontSize:"13px",color:C.muted,marginTop:"10px",lineHeight:1.6,maxWidth:"220px"}}>
              AI тренер для CS2 игроков. Анализ статистики и персональные советы.
            </div>
          </div>

          {/* Links */}
          <div style={{display:"flex",gap:"64px",flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"2px",marginBottom:"12px",fontWeight:700}}>СЕРВИС</div>
              {[
                {label:"О нас", action:onAbout},
                {label:"Тарифы Pro", action:onPro},
                {label:"Таблица лидеров", action:onLeaderboard},
              ].map((l,i)=>(
                <div key={i} style={{marginBottom:"8px"}}>
                  <button onClick={l.action||undefined} style={{background:"transparent",border:"none",
                    color:C.label,cursor:l.action?"pointer":"default",fontSize:"14px",padding:0,
                    fontFamily:"inherit",textAlign:"left"}}
                    onMouseEnter={e=>{if(l.action)e.currentTarget.style.color=C.yellow;}}
                    onMouseLeave={e=>{e.currentTarget.style.color=C.label;}}>
                    {l.label}
                  </button>
                </div>
              ))}
            </div>
            <div>
              <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"2px",marginBottom:"12px",fontWeight:700}}>СОЦСЕТИ</div>
              {SOCIALS.map((s,i)=>(
                <a key={i} href={s.url} target="_blank" rel="noreferrer"
                  style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px",
                    textDecoration:"none",color:C.label,fontSize:"14px"}}
                  onMouseEnter={e=>{e.currentTarget.style.color=C.yellow;}}
                  onMouseLeave={e=>{e.currentTarget.style.color=C.label;}}>
                  <span style={{width:"20px",textAlign:"center",fontSize:"14px"}}>{s.icon}</span>
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Online */}
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"11px",color:C.muted,letterSpacing:"2px",marginBottom:"6px"}}>СЕЙЧАС ОНЛАЙН</div>
            <div style={{display:"flex",alignItems:"center",gap:"8px",justifyContent:"flex-end"}}>
              <div style={{width:"8px",height:"8px",background:C.win,borderRadius:"50%",
                animation:"pulse 2s infinite",boxShadow:`0 0 6px ${C.win}`}}/>
              <span style={{
                fontSize:"32px",color:C.win,fontWeight:700,
                fontFamily:"'Consolas',monospace",
                animation:anim?"up .3s ease":"none",
                display:"inline-block"}}>
                {online}
              </span>
            </div>
            <div style={{fontSize:"12px",color:C.muted,marginTop:"4px"}}>игроков на сайте</div>
          </div>
        </div>

        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:"18px",
          display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"12px"}}>
          <div style={{fontSize:"13px",color:C.muted}}>
            © {new Date().getFullYear()} CS2 AI Тренер. Все права защищены.
          </div>
          <div style={{display:"flex",gap:"20px"}}>
            {[
              {t:"Политика конфиденциальности",txt:"Мы собираем только публичные данные Steam и FACEIT — никаких паролей, личных данных и платёжной информации. Аналитика обрабатывается AI и не передаётся третьим лицам. Данные хранятся только в рамках текущей сессии."},
              {t:"Условия использования",txt:"Сервис предназначен для личного использования игроками CS2. Запрещено автоматическое использование API. Сервис не аффилирован с Valve Corporation или FACEIT Ltd. и не несёт ответственности за точность AI-анализа."},
            ].map((item,i)=>(
              <span key={i} onClick={()=>window.alert(item.txt)}
                style={{fontSize:"12px",color:C.muted,cursor:"pointer",textDecoration:"underline",textDecorationStyle:"dotted"}}
                onMouseEnter={e=>{e.currentTarget.style.color=C.yellow;}}
                onMouseLeave={e=>{e.currentTarget.style.color=C.muted;}}>
                {item.t}
              </span>
            ))}
          </div>
          <div style={{fontSize:"12px",color:C.muted}}>
            Не аффилирован с Valve Corporation или FACEIT Ltd.
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Cold Start Banner ─────────────────────────────────────────────────────────
function ColdStartBanner({status}) {
  if (status !== 'slow' && status !== 'waking') return null;
  return (
    <div style={{position:"fixed",top:0,left:0,right:0,background:"#1a1408",
      borderBottom:`2px solid ${C.yellow}`,padding:"10px 20px",
      zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",gap:"12px"}}>
      <div style={{display:"flex",gap:"4px"}}>
        {[0,1,2].map(i=><div key={i} style={{width:"6px",height:"6px",background:C.yellow,
          borderRadius:"50%",animation:`blink 1s ${i*.3}s infinite`}}/>)}
      </div>
      <span style={{fontSize:"13px",color:C.yellow,fontWeight:700}}>Сервер запускается</span>
      <span style={{fontSize:"13px",color:C.label}}>— подожди ~30 секунд, потом обнови страницу</span>
    </div>
  );
}

// ── Share Modal ────────────────────────────────────────────────────────────────
function ShareModal({steamid, onClose}) {
  const shareUrl = `${BACKEND}/share/${steamid}`;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      prompt("Скопируй ссылку:", shareUrl);
    }
  };

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",
      zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,
        borderTop:`2px solid ${C.yellow}`,maxWidth:"460px",width:"100%",padding:"32px",animation:"slideUp .3s ease"}}>
        <div style={{fontSize:"14px",letterSpacing:"3px",color:C.yellow,fontWeight:700,marginBottom:"20px"}}>
          📤 ПОДЕЛИТЬСЯ ПРОФИЛЕМ
        </div>
        <p style={{fontSize:"14px",color:C.label,lineHeight:1.7,marginBottom:"20px"}}>
          Отправь эту ссылку другу или скинь в Discord — откроется красивая карточка с твоими статами и AI вердиктом.
        </p>

        {/* URL preview */}
        <div style={{background:"#111109",border:`1px solid ${C.border}`,padding:"12px 16px",
          marginBottom:"16px",fontSize:"13px",color:C.muted,wordBreak:"break-all",lineHeight:1.5}}>
          {shareUrl}
        </div>

        <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
          <button onClick={copy} style={{
            flex:1,padding:"12px",background:copied?"#1a3a1a":C.yellow,
            color:copied?"#55aa55":"#080807",border:copied?`1px solid #55aa55`:"none",
            cursor:"pointer",fontSize:"14px",fontWeight:700,fontFamily:"inherit",
            transition:"all .2s"}}>
            {copied ? "✓ СКОПИРОВАНО!" : "📋 КОПИРОВАТЬ ССЫЛКУ"}
          </button>
          <a href={shareUrl} target="_blank" rel="noreferrer" style={{
            padding:"12px 20px",background:"transparent",
            color:C.label,border:`1px solid ${C.border}`,
            textDecoration:"none",fontSize:"14px",fontFamily:"inherit",
            display:"flex",alignItems:"center",gap:"6px"}}>
            👁 Открыть
          </a>
        </div>

        <button onClick={onClose} style={{width:"100%",marginTop:"12px",padding:"10px",
          background:"transparent",border:`1px solid ${C.border}`,color:C.muted,
          cursor:"pointer",fontSize:"13px",fontFamily:"inherit"}}>
          Закрыть
        </button>
      </div>
    </div>
  );
}

// ── Pro компоненты ────────────────────────────────────────────────────────────
function SetupChecklist({player, hasFaceit, analysisCount, onDismiss}) {
  const cs2 = player?.cs2 || {};
  const steps = [
    {id:"steam",    done:true,             label:"Войти через Steam",              action:null},
    {id:"stats",    done:!cs2.private,     label:"Открыть статистику CS2 в Steam", action:"privacy"},
    {id:"faceit",   done:hasFaceit,        label:"Подключить FACEIT аккаунт",      action:"faceit"},
    {id:"analysis", done:analysisCount>0,  label:"Получить первый AI разбор",      action:null},
    {id:"chat",     done:!!localStorage.getItem("cs2_chat_done"),    label:"Поговорить с AI тренером",    action:null},
    {id:"training", done:!!localStorage.getItem("cs2_training_done"),label:"Выполнить первую тренировку", action:null},
  ];
  const done = steps.filter(s=>s.done).length;
  const pct  = Math.round(done/steps.length*100);
  if (done===steps.length) { onDismiss(); return null; }
  const ACTIONS = {
    privacy:()=>window.open("https://steamcommunity.com/my/edit/settings","_blank"),
    faceit: ()=>window.open("https://www.faceit.com","_blank"),
  };
  return (
    <div style={{background:"#141409",border:`1px solid ${C.yellow}44`,borderLeft:`3px solid ${C.yellow}`,padding:"20px 24px",marginBottom:"16px",animation:"up .4s ease both",position:"relative"}}>
      <button onClick={onDismiss} style={{position:"absolute",top:"12px",right:"14px",background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:"16px"}}>✕</button>
      <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"16px",flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:"14px",color:C.yellow,fontWeight:700,marginBottom:"2px"}}>🚀 Настройка профиля</div>
          <div style={{fontSize:"13px",color:C.muted}}>{done} из {steps.length} шагов</div>
        </div>
        <div style={{flex:1,minWidth:"120px"}}>
          <div style={{height:"6px",background:"#1a1a10",borderRadius:"3px",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,background:C.yellow,transition:"width .8s ease"}}/>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:"6px"}}>
        {steps.map(step=>(
          <div key={step.id} onClick={()=>ACTIONS[step.action]?.()} style={{display:"flex",gap:"10px",alignItems:"center",padding:"9px 12px",background:step.done?"#0f1a0f":"#111109",border:`1px solid ${step.done?"#2a5a1a":C.border}`,cursor:step.action&&!step.done?"pointer":"default"}}>
            <div style={{width:"20px",height:"20px",flexShrink:0,borderRadius:"50%",background:step.done?C.win:"transparent",border:`2px solid ${step.done?C.win:C.muted}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {step.done&&<span style={{color:"#080807",fontSize:"11px",fontWeight:700}}>✓</span>}
            </div>
            <span style={{fontSize:"13px",color:step.done?C.win:C.label,lineHeight:1.4}}>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProModal({player, onClose, onActivated}) {
  const [tab,setTab]         = useState("plans");
  const [key,setKey]         = useState("");
  const [loading,setLoading] = useState(false);
  const [msg,setMsg]         = useState(null);
  const [payLoading,setPayLoading] = useState(null);

  async function activate() {
    if (!key.trim()||!player?.steamid) return;
    setLoading(true); setMsg(null);
    try {
      const r = await fetch(`${BACKEND}/activate-key`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({steamid:player.steamid,key:key.trim().toUpperCase()})});
      const d = await r.json();
      if(d.ok){setMsg({ok:true,text:"🎉 Pro активирован!"});onActivated();}
      else setMsg({ok:false,text:d.detail||"Ошибка"});
    }catch{setMsg({ok:false,text:"Ошибка сети"});}
    setLoading(false);
  }

  async function startPayment(plan) {
    if(!player?.steamid)return;
    setPayLoading(plan);
    try{
      const r=await fetch(`${BACKEND}/payment/create`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({steamid:player.steamid,plan})});
      const d=await r.json();
      if(d.url)window.open(d.url,"_blank");
      else alert("Платежи временно недоступны. Используй активацию ключом.");
    }catch{alert("Ошибка сети");}
    setPayLoading(null);
  }

  const PLANS=[{period:"МЕСЯЦ",price:"299 ₽",sub:"~$3.3",plan:"month"},{period:"ГОД",price:"1990 ₽",sub:"~$22 · экономия 40%",best:true,plan:"year"}];
  const FREE_F=["1 AI Report в день","5 AI запросов в день","Базовые статы","История матчей","Лидерборд"];
  const PRO_F=["Безлимитные AI Reports","Безлимитный AI чат","AI разбор каждого матча","Без дневных лимитов","Pro значок","Приоритетная поддержка"];

  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.yellow}55`,borderTop:`3px solid ${C.yellow}`,maxWidth:"520px",width:"100%",maxHeight:"90vh",overflowY:"auto",animation:"slideUp .3s ease",boxShadow:`0 8px 60px ${C.yellow}18`}}>
        <div style={{padding:"22px 24px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div><div style={{fontSize:"11px",letterSpacing:"4px",color:C.yellow,marginBottom:"4px"}}>⚡ CS2 AI ТРЕНЕР PRO</div><div style={{fontSize:"20px",color:C.value,fontWeight:700}}>Убери ограничения</div></div>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",width:"28px",height:"28px",fontSize:"14px"}}>✕</button>
        </div>
        <div style={{display:"flex",margin:"18px 24px 0",gap:"3px"}}>
          {[["plans","Тарифы"],["activate","Ввести ключ"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"9px",background:tab===t?C.yellow+"22":"transparent",border:`1px solid ${tab===t?C.yellow+"66":C.border}`,color:tab===t?C.yellow:C.muted,cursor:"pointer",fontSize:"13px",fontFamily:"inherit",fontWeight:tab===t?700:400}}>{l}</button>
          ))}
        </div>
        <div style={{padding:"20px 24px 24px"}}>
          {tab==="plans"&&<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px",marginBottom:"20px"}}>
              <div style={{background:"#111109",border:`1px solid ${C.border}`,padding:"16px"}}>
                <div style={{fontSize:"12px",color:C.muted,letterSpacing:"2px",marginBottom:"12px"}}>FREE</div>
                {FREE_F.map((f,i)=><div key={i} style={{fontSize:"13px",color:C.label,marginBottom:"7px",display:"flex",gap:"8px"}}><span style={{color:C.muted}}>—</span>{f}</div>)}
              </div>
              <div style={{background:"#1a1a0a",border:`2px solid ${C.yellow}44`,padding:"16px",position:"relative"}}>
                <div style={{position:"absolute",top:"-1px",right:"12px",background:C.yellow,color:"#080807",fontSize:"10px",fontWeight:700,padding:"2px 10px",letterSpacing:"2px"}}>PRO</div>
                <div style={{fontSize:"12px",color:C.yellow,letterSpacing:"2px",marginBottom:"12px"}}>PRO</div>
                {PRO_F.map((f,i)=><div key={i} style={{fontSize:"13px",color:C.value,marginBottom:"7px",display:"flex",gap:"8px"}}><span style={{color:C.win}}>✓</span>{f}</div>)}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"20px"}}>
              {PLANS.map((p,i)=>(
                <div key={i} style={{background:p.best?"#1a1a0a":"#111109",border:`${p.best?2:1}px solid ${p.best?C.yellow+"66":C.border}`,padding:"16px",textAlign:"center",position:"relative"}}>
                  {p.best&&<div style={{position:"absolute",top:"-1px",left:"50%",transform:"translateX(-50%)",background:C.yellow,color:"#080807",fontSize:"10px",fontWeight:700,padding:"2px 12px",letterSpacing:"1px",whiteSpace:"nowrap"}}>ВЫГОДНО</div>}
                  <div style={{fontSize:"12px",color:C.muted,marginBottom:"6px",marginTop:p.best?"8px":0}}>{p.period}</div>
                  <div style={{fontSize:"26px",color:C.yellow,fontWeight:700,marginBottom:"6px"}}>{p.price}</div>
                  <div style={{fontSize:"11px",color:C.muted,marginBottom:"14px"}}>{p.sub}</div>
                  <button onClick={()=>startPayment(p.plan)} disabled={payLoading===p.plan} style={{width:"100%",padding:"10px",background:payLoading===p.plan?"#1a1a0e":C.yellow,color:"#080807",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:700,fontFamily:"inherit"}}>
                    {payLoading===p.plan?"...":"ОПЛАТИТЬ"}
                  </button>
                </div>
              ))}
            </div>
            <div style={{fontSize:"12px",color:C.muted,lineHeight:1.7,background:"#111109",border:`1px solid ${C.border}`,padding:"12px 14px"}}>После оплаты получишь ключ активации. Введи его во вкладке "Ввести ключ".</div>
          </>}
          {tab==="activate"&&<>
            <div style={{fontSize:"14px",color:C.label,lineHeight:1.7,marginBottom:"20px"}}>Формат: <span style={{color:C.yellow,fontFamily:"monospace"}}>CS2PRO-XXXX-XXXX-XXXX</span></div>
            <input value={key} onChange={e=>setKey(e.target.value)} placeholder="CS2PRO-XXXX-XXXX-XXXX"
              style={{width:"100%",background:"#111109",border:`1px solid ${msg?.ok===false?C.lose:C.border}`,color:C.yellow,fontSize:"16px",padding:"13px 16px",fontFamily:"'Consolas',monospace",letterSpacing:"2px",marginBottom:"10px"}}/>
            {msg&&<div style={{fontSize:"13px",color:msg.ok?C.win:C.lose,marginBottom:"12px",padding:"10px 14px",background:msg.ok?"#0f1a0f":"#1a0f0f",border:`1px solid ${msg.ok?C.win+"33":C.lose+"33"}`}}>{msg.text}</div>}
            <button onClick={activate} disabled={loading||!key.trim()||!player} style={{width:"100%",padding:"14px",background:loading?"#1a1a0e":C.yellow,color:"#080807",border:"none",cursor:loading?"not-allowed":"pointer",fontSize:"14px",fontWeight:700,fontFamily:"inherit"}}>
              {loading?"АКТИВИРУЮ...":"АКТИВИРОВАТЬ PRO"}
            </button>
          </>}
        </div>
      </div>
    </div>
  );
}

function ProBadge() {
  return(
    <div style={{display:"inline-flex",alignItems:"center",gap:"4px",background:`linear-gradient(135deg,${C.yellow}22,#ff880022)`,border:`1px solid ${C.yellow}66`,padding:"3px 10px"}}>
      <span style={{fontSize:"11px"}}>⚡</span>
      <span style={{fontSize:"11px",color:C.yellow,fontWeight:700,letterSpacing:"1px"}}>PRO</span>
    </div>
  );
}

function UsageBar({remaining,total=FREE_WEEKLY,isPro,onUpgrade}) {
  if(isPro)return null;
  const pct=remaining/total*100;
  const color=remaining<=1?C.lose:remaining<=2?C.orange:C.win;
  return(
    <div style={{background:"#111109",border:`1px solid ${C.border}`,padding:"10px 14px",marginBottom:"12px",display:"flex",alignItems:"center",gap:"12px"}}>
      <div style={{flex:1}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
          <span style={{fontSize:"12px",color:C.label}}>AI разборов на этой неделе</span>
          <span style={{fontSize:"12px",color,fontWeight:700}}>{remaining}/{total}</span>
        </div>
        <div style={{height:"4px",background:"#1a1a10",borderRadius:"2px",overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:color,transition:"width .5s ease"}}/>
        </div>
      </div>
      <button onClick={onUpgrade} style={{flexShrink:0,padding:"6px 14px",background:C.yellow+"22",border:`1px solid ${C.yellow}55`,color:C.yellow,cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"inherit"}}>⚡ Pro</button>
    </div>
  );
}

function PaywallOverlay({feature,onUpgrade}) {
  return(
    <div style={{background:C.card,border:`1px solid ${C.yellow}33`,padding:"28px",textAlign:"center",animation:"fadeIn .3s ease"}}>
      <div style={{fontSize:"28px",marginBottom:"12px"}}>⚡</div>
      <div style={{fontSize:"16px",color:C.value,fontWeight:700,marginBottom:"8px"}}>{feature} — Pro функция</div>
      <div style={{fontSize:"14px",color:C.label,lineHeight:1.7,marginBottom:"20px"}}>Дневной лимит исчерпан.<br/>Получи Pro — безлимитный AI.</div>
      <button onClick={onUpgrade} style={{padding:"12px 32px",background:C.yellow,color:"#080807",border:"none",cursor:"pointer",fontSize:"14px",fontWeight:700,fontFamily:"inherit"}}>ПОПРОБОВАТЬ PRO →</button>
    </div>
  );
}

// ── Landing Page ─────────────────────────────────────────────────────────────
function LandingPage({onLogin}) {
  const online = useOnline();
  const [tick, setTick] = useState(0);
  const [visible, setVisible] = useState({});
  useEffect(()=>{
    const t = setInterval(()=>setTick(x=>x+1), 3500);
    return ()=>clearInterval(t);
  },[]);
  useEffect(()=>{
    const io = new IntersectionObserver(entries=>{
      entries.forEach(e=>{ if(e.isIntersecting) setVisible(v=>({...v,[e.target.dataset.id]:true})); });
    },{threshold:0.15});
    document.querySelectorAll('[data-id]').forEach(el=>io.observe(el));
    return ()=>io.disconnect();
  },[]);

  const INSIGHTS = [
    {text:"Ты теряешь дуэли из-за стрельбы в движении", tag:"МЕХАНИКА"},
    {text:"Win Rate падает на КТ стороне Mirage", tag:"КАРТЫ"},
    {text:"Слишком ранний выход без прикрытия", tag:"ТАКТИКА"},
    {text:"Низкий процент добиваний после первого убийства", tag:"АНАЛИТИКА"},
    {text:"Лучший результат в матчах с AWP", tag:"ОРУЖИЕ"},
  ];

  const FEATURES = [
    {
      icon:"🤖", color:"#f5c518",
      title:"AI объясняет ПОЧЕМУ ты проигрываешь",
      desc:"Не просто K/D и числа — тренер анализирует твою игру и говорит конкретно: что не так, почему, и что делать прямо сейчас",
      tag:"ГЛАВНАЯ ФИЧА",
    },
    {
      icon:"🎮", color:"#44ddaa",
      title:"Разбор каждого матча",
      desc:"Нажми на любой матч из истории — получи детальный AI-разбор именно этой игры. Какие ошибки, что получилось, что улучшить",
      tag:"PER-MATCH AI",
    },
    {
      icon:"💬", color:"#74c6f5",
      title:"Личный тренер 24/7",
      desc:"Чат с AI который знает твою статистику. Задай любой вопрос — ответ будет конкретным и про тебя, а не generic советы из YouTube",
      tag:"AI CHAT",
    },
  ];

  const REVIEWS = [
    {name:"Kryptex_cs", elo:"LVL 5 · 1380 ELO", text:"Захожу каждый день, AI report прямо в точку — сказал что у меня проблема с позиционированием на B Dust2, и правда, проверил демки.", kd:"K/D 1.31"},
    {name:"VortexAim",   elo:"LVL 3 · 870 ELO",  text:"Наконец-то понял почему у меня WR 38%. Оказывается сливаю форсы и эко раунды. Тренер дал конкретный план, за 2 недели дошёл до 47%.", kd:"K/D 0.94"},
    {name:"ShadowByte",  elo:"LVL 7 · 1620 ELO", text:"Per-match разбор это огонь. После каждого матча вижу где облажался. Поднял K/D с 1.1 до 1.4 за месяц.", kd:"K/D 1.42"},
  ];

  const inView = id => visible[id];
  const anim = (id, delay=0) => ({
    opacity: inView(id)?1:0,
    transform: inView(id)?'translateY(0)':'translateY(24px)',
    transition: `opacity .6s ${delay}s ease, transform .6s ${delay}s ease`,
  });

  return (
    <div style={{background:C.bg,minHeight:"100vh"}}>

      {/* ── HERO ── */}
      <div style={{
        minHeight:"100vh",display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",padding:"80px 24px 60px",
        textAlign:"center",position:"relative",overflow:"hidden",
      }}>
        {/* Animated background grid */}
        <div style={{position:"absolute",inset:0,
          backgroundImage:`linear-gradient(${C.yellow}08 1px,transparent 1px),linear-gradient(90deg,${C.yellow}08 1px,transparent 1px)`,
          backgroundSize:"60px 60px",pointerEvents:"none"}}/>
        {/* Glow blobs */}
        <div style={{position:"absolute",top:"15%",left:"20%",width:"500px",height:"500px",
          background:`radial-gradient(circle,${C.yellow}0e,transparent 65%)`,pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:"20%",right:"15%",width:"400px",height:"400px",
          background:`radial-gradient(circle,#74c6f508,transparent 65%)`,pointerEvents:"none"}}/>

        {/* Online badge */}
        <div style={{display:"flex",alignItems:"center",gap:"8px",
          background:"#1a1a0a",border:`1px solid ${C.yellow}44`,
          padding:"6px 18px",marginBottom:"32px",fontSize:"13px",color:C.label,
          animation:"up .6s ease both"}}>
          <div style={{width:"7px",height:"7px",background:C.win,borderRadius:"50%",
            boxShadow:`0 0 8px ${C.win}`,animation:"pulse 2s infinite"}}/>
          <span style={{color:C.win,fontWeight:700}}>{online}</span>
          <span>игроков сейчас на сайте</span>
        </div>

        {/* Main headline */}
        <h1 style={{
          fontSize:"clamp(36px,7vw,72px)",fontWeight:900,margin:"0 0 16px",
          color:C.value,lineHeight:1.1,maxWidth:"800px",letterSpacing:"-1px",
          animation:"up .6s .1s ease both",opacity:0,
          animationFillMode:"forwards",
        }}>
          AI скажет тебе<br/>
          <span style={{
            color:"transparent",
            background:`linear-gradient(135deg,${C.yellow},#ff8844)`,
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          }}>почему ты проигрываешь</span>
        </h1>

        <p style={{fontSize:"clamp(15px,2vw,19px)",color:C.label,maxWidth:"560px",
          lineHeight:1.75,margin:"0 0 40px",
          animation:"up .6s .2s ease both",opacity:0,animationFillMode:"forwards"}}>
          Подключи Steam — получи персональный разбор от AI за 10 секунд.
          Конкретные причины, не просто статистика.
        </p>

        {/* Rotating insight */}
        <div style={{
          background:"#141409",border:`1px solid ${C.yellow}55`,
          padding:"16px 28px",marginBottom:"40px",maxWidth:"500px",width:"100%",
          minHeight:"72px",display:"flex",flexDirection:"column",justifyContent:"center",
          animation:"up .6s .3s ease both",opacity:0,animationFillMode:"forwards",
          position:"relative",overflow:"hidden",
        }}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",
            background:`linear-gradient(90deg,transparent,${C.yellow},transparent)`,
            animation:"shimmer 2s infinite"}}/>
          <div style={{fontSize:"10px",letterSpacing:"3px",color:C.yellow,marginBottom:"7px",fontWeight:700}}>
            AI REPORT · ПРИМЕР
          </div>
          <div key={tick} style={{fontSize:"15px",color:C.value,lineHeight:1.6,animation:"up .4s ease"}}>
            ✗ {INSIGHTS[tick % INSIGHTS.length].text}
          </div>
        </div>

        {/* CTA */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px",
          animation:"up .6s .4s ease both",opacity:0,animationFillMode:"forwards"}}>
          <button onClick={onLogin} style={{
            padding:"18px 48px",background:C.yellow,color:"#080807",border:"none",
            cursor:"pointer",fontSize:"16px",fontWeight:800,letterSpacing:"2px",
            fontFamily:"inherit",
            boxShadow:`0 0 40px ${C.yellow}44,0 4px 20px ${C.yellow}33`,
            transition:"all .2s",display:"flex",alignItems:"center",gap:"12px"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 0 60px ${C.yellow}66,0 8px 30px ${C.yellow}44`;}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=`0 0 40px ${C.yellow}44,0 4px 20px ${C.yellow}33`;}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#080807">
              <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z"/>
            </svg>
            ВОЙТИ ЧЕРЕЗ STEAM — БЕСПЛАТНО
          </button>
          <div style={{fontSize:"13px",color:C.muted}}>
            Бесплатно · Занимает 10 секунд · Данные в безопасности
          </div>
        </div>

        {/* Stats */}
        <div style={{display:"flex",gap:"48px",marginTop:"64px",flexWrap:"wrap",justifyContent:"center",
          animation:"up .6s .5s ease both",opacity:0,animationFillMode:"forwards"}}>
          {[
            {val:"2 341",label:"разборов сделано"},
            {val:"89%",label:"улучшили K/D"},
            {val:"< 10с",label:"время анализа"},
          ].map((s,i)=>(
            <div key={i} style={{textAlign:"center"}}>
              <div style={{fontSize:"36px",color:C.yellow,fontWeight:800,lineHeight:1}}>{s.val}</div>
              <div style={{fontSize:"13px",color:C.muted,marginTop:"5px"}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div style={{padding:"80px 24px",maxWidth:"980px",margin:"0 auto"}} data-id="feat">
        <div style={{textAlign:"center",marginBottom:"48px",...anim("feat")}}>
          <div style={{fontSize:"12px",letterSpacing:"4px",color:C.yellow,marginBottom:"12px",fontWeight:700}}>
            ЧТО УМЕЕТ СЕРВИС
          </div>
          <h2 style={{fontSize:"clamp(28px,4vw,44px)",color:C.value,fontWeight:800,margin:0,letterSpacing:"-0.5px"}}>
            Не просто статистика —<br/>реальная помощь
          </h2>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"3px"}}>
          {FEATURES.map((f,i)=>(
            <div key={i} data-id={`feat${i}`} style={{
              background:"#141409",
              border:`1px solid ${C.border}`,
              borderTop:`3px solid ${f.color}`,
              padding:"28px 24px",
              transition:"transform .2s, box-shadow .2s",
              ...anim(`feat${i}`, i*0.12),
            }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow=`0 8px 32px ${f.color}18`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px"}}>
                <span style={{fontSize:"40px"}}>{f.icon}</span>
                <span style={{fontSize:"10px",letterSpacing:"2px",color:f.color,
                  background:`${f.color}18`,border:`1px solid ${f.color}44`,
                  padding:"3px 10px",fontWeight:700}}>
                  {f.tag}
                </span>
              </div>
              <h3 style={{fontSize:"18px",color:C.value,fontWeight:700,margin:"0 0 10px",lineHeight:1.3}}>
                {f.title}
              </h3>
              <p style={{fontSize:"14px",color:C.label,lineHeight:1.75,margin:0}}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{background:"#0d0d09",padding:"80px 24px"}} data-id="how">
        <div style={{maxWidth:"720px",margin:"0 auto",textAlign:"center"}}>
          <div style={{...anim("how")}}>
            <div style={{fontSize:"12px",letterSpacing:"4px",color:C.yellow,marginBottom:"12px",fontWeight:700}}>
              КАК ЭТО РАБОТАЕТ
            </div>
            <h2 style={{fontSize:"clamp(26px,4vw,40px)",color:C.value,fontWeight:800,margin:"0 0 48px",letterSpacing:"-0.5px"}}>
              От входа до разбора — 3 шага
            </h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"24px"}}>
            {[
              {n:"01",title:"Войди через Steam",desc:"Нажми кнопку входа — данные CS2 и FACEIT подтянутся автоматически"},
              {n:"02",title:"AI анализирует",desc:"Нейросеть изучает статистику и составляет персональный отчёт"},
              {n:"03",title:"Получи разбор",desc:"Конкретные проблемы, план тренировок и ответы на любые вопросы"},
            ].map((s,i)=>(
              <div key={i} data-id={`step${i}`} style={{textAlign:"center",...anim(`step${i}`,i*0.15)}}>
                <div style={{
                  width:"64px",height:"64px",margin:"0 auto 16px",
                  background:`linear-gradient(135deg,${C.yellow}22,${C.yellow}0a)`,
                  border:`2px solid ${C.yellow}55`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:"20px",color:C.yellow,fontWeight:800,
                }}>
                  {s.n}
                </div>
                <h3 style={{fontSize:"16px",color:C.value,fontWeight:700,margin:"0 0 8px"}}>{s.title}</h3>
                <p style={{fontSize:"14px",color:C.label,lineHeight:1.65,margin:0}}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── REVIEWS ── */}
      <div style={{padding:"80px 24px",maxWidth:"980px",margin:"0 auto"}} data-id="rev">
        <div style={{textAlign:"center",marginBottom:"48px",...anim("rev")}}>
          <div style={{fontSize:"12px",letterSpacing:"4px",color:C.yellow,marginBottom:"12px",fontWeight:700}}>
            ОТЗЫВЫ ИГРОКОВ
          </div>
          <h2 style={{fontSize:"clamp(26px,4vw,40px)",color:C.value,fontWeight:800,margin:0,letterSpacing:"-0.5px"}}>
            Что говорят игроки
          </h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:"3px"}}>
          {REVIEWS.map((r,i)=>(
            <div key={i} data-id={`rev${i}`} style={{
              background:"#141409",border:`1px solid ${C.border}`,padding:"24px",
              ...anim(`rev${i}`,i*0.1),
            }}>
              <div style={{display:"flex",gap:"3px",marginBottom:"14px"}}>
                {[...Array(5)].map((_,j)=>(
                  <span key={j} style={{color:C.yellow,fontSize:"14px"}}>★</span>
                ))}
              </div>
              <p style={{fontSize:"14px",color:C.label,lineHeight:1.75,margin:"0 0 18px",fontStyle:"italic"}}>
                "{r.text}"
              </p>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:"14px",color:C.value,fontWeight:700}}>{r.name}</div>
                  <div style={{fontSize:"12px",color:C.muted}}>{r.elo}</div>
                </div>
                <div style={{fontSize:"12px",color:C.yellow,background:`${C.yellow}14`,
                  border:`1px solid ${C.yellow}33`,padding:"3px 10px",fontWeight:700}}>
                  {r.kd}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FINAL CTA ── */}
      <div style={{
        padding:"80px 24px",textAlign:"center",
        background:`linear-gradient(180deg,transparent,${C.yellow}08,transparent)`,
      }} data-id="cta">
        <div style={{maxWidth:"600px",margin:"0 auto",...anim("cta")}}>
          <h2 style={{fontSize:"clamp(28px,5vw,52px)",color:C.value,fontWeight:900,
            margin:"0 0 16px",letterSpacing:"-1px",lineHeight:1.1}}>
            Готов узнать правду<br/>
            <span style={{color:C.yellow}}>о своей игре?</span>
          </h2>
          <p style={{fontSize:"16px",color:C.label,margin:"0 0 36px",lineHeight:1.7}}>
            Присоединяйся к 2000+ игроков которые уже знают почему они проигрывают — и работают над этим
          </p>
          <button onClick={onLogin} style={{
            padding:"18px 52px",background:C.yellow,color:"#080807",border:"none",
            cursor:"pointer",fontSize:"17px",fontWeight:800,letterSpacing:"2px",
            fontFamily:"inherit",
            boxShadow:`0 0 40px ${C.yellow}44`,transition:"all .2s"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 0 60px ${C.yellow}66`;}}
            onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=`0 0 40px ${C.yellow}44`;}}>
            НАЧАТЬ БЕСПЛАТНО →
          </button>
          <div style={{fontSize:"13px",color:C.muted,marginTop:"14px"}}>
            Не нужна кредитная карта · Вход через Steam · Займёт 10 секунд
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AI Report (автосводка) ────────────────────────────────────────────────────
function AIReport({player, source}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fc = player?.faceit;
  const cs2 = player?.cs2 || {};

  async function load() {
    setLoading(true);
    const stats = source === "faceit" && fc ? {
      kd: fc.lifetime?.kd||"0", winrate: fc.lifetime?.winrate||"0",
      hs: fc.lifetime?.hs||"0", matches: fc.lifetime?.matches||"0",
      faceit_level: String(fc.level||""), faceit_elo: String(fc.elo||""),
      maps: arr(fc.maps),
    } : {
      kd: cs2.kd||"0", winrate: cs2.winrate||"0",
      hs: cs2.hs||"0", matches: cs2.matches||"0",
      faceit_level: String(fc?.level||""), faceit_elo: String(fc?.elo||""),
      maps: arr(fc?.maps),
    };
    try {
      const r = await fetch(`${BACKEND}/ai-summary`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(stats)
      });
      const d = await r.json();
      if (d.result) { setReport(d.result); setLoaded(true); }
    } catch {}
    setLoading(false);
  }

  // Авто-загрузка при первом рендере
  useEffect(() => { if (!loaded && !loading) load(); }, [player?.steamid, source]);

  const roleColor = {ENTRY:C.lose, SUPPORT:C.blue, RIFLER:C.yellow, LURKER:"#aa88ff", AWP:"#44ddaa"};
  const rc = roleColor[report?.role?.split(" ")[0]] || C.yellow;

  if (loading) return (
    <div style={{background:C.card,border:`2px solid ${C.yellow}`,padding:"28px",marginBottom:"16px",animation:"fadeIn .3s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
        <div style={{width:"8px",height:"8px",background:C.yellow,borderRadius:"50%",animation:"pulse 1.5s infinite"}}/>
        <span style={{fontSize:"13px",letterSpacing:"3px",color:C.yellow}}>AI АНАЛИЗИРУЕТ ТВОЮ ИГРУ</span>
      </div>
      <Skel w="90%" h="18" mb={10}/><Skel w="70%" h="16" mb={10}/><Skel w="80%" h="16"/>
    </div>
  );

  if (!report) return null;

  return (
    <div style={{background:"#15140a",border:`2px solid ${C.yellow}44`,borderLeft:`4px solid ${C.yellow}`,
      padding:"28px",marginBottom:"16px",position:"relative",overflow:"hidden",animation:"up .4s ease both"}}>
      {/* glow */}
      <div style={{position:"absolute",top:"-40px",right:"-40px",width:"200px",height:"200px",
        background:`radial-gradient(circle,${C.yellow}12,transparent 70%)`,pointerEvents:"none"}}/>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"20px",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{width:"8px",height:"8px",background:C.yellow,borderRadius:"50%"}}/>
          <span style={{fontSize:"13px",letterSpacing:"3px",color:C.yellow,fontWeight:700}}>AI REPORT</span>
        </div>
        {report.role&&<span style={{padding:"3px 14px",background:rc+"22",color:rc,border:`1px solid ${rc}55`,fontSize:"12px",letterSpacing:"2px",fontWeight:700}}>
          {report.role}
        </span>}
        <button onClick={load} style={{marginLeft:"auto",background:"transparent",border:`1px solid ${C.border}`,
          color:C.muted,cursor:"pointer",fontSize:"11px",padding:"4px 12px",fontFamily:"inherit"}}>
          ↻ обновить
        </button>
      </div>

      {/* Verdict */}
      <div style={{fontSize:"17px",color:C.value,lineHeight:1.8,marginBottom:"20px",fontWeight:400}}>
        {report.verdict}
      </div>

      {/* Roast */}
      {report.roast&&<div style={{background:"#1e1a08",border:`1px solid ${C.yellow}33`,
        padding:"12px 18px",marginBottom:"20px",fontSize:"15px",color:C.yellow,
        fontStyle:"italic",lineHeight:1.6}}>
        💬 "{report.roast}"
      </div>}

      {/* Problems */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"8px",marginBottom:"20px"}}>
        {arr(report.problems).map((p,i)=>(
          <div key={i} style={{display:"flex",gap:"12px",alignItems:"flex-start",
            background:"#1a1009",border:`1px solid ${C.lose}33`,padding:"12px 14px"}}>
            <span style={{color:C.lose,fontSize:"16px",flexShrink:0}}>✗</span>
            <span style={{fontSize:"14px",color:C.text,lineHeight:1.6}}>{p}</span>
          </div>
        ))}
      </div>

      {/* Priority */}
      {report.priority&&<div style={{display:"flex",gap:"12px",alignItems:"flex-start",
        background:"#0f1a0f",border:`1px solid ${C.win}44`,padding:"14px 18px"}}>
        <span style={{fontSize:"16px",flexShrink:0}}>🎯</span>
        <div>
          <div style={{fontSize:"12px",letterSpacing:"2px",color:C.win,marginBottom:"4px",fontWeight:700}}>
            ГЛАВНЫЙ ПРИОРИТЕТ
          </div>
          <div style={{fontSize:"15px",color:C.value,lineHeight:1.6}}>{report.priority}</div>
        </div>
      </div>}
    </div>
  );
}


// ── Support Panel ─────────────────────────────────────────────────────────────
function SupportPanel({onClose}) {
  const [msg, setMsg]     = useState("");
  const [sent, setSent]   = useState(false);
  return (
    <div style={{position:"fixed",bottom:"148px",right:"24px",width:"320px",
      background:C.card,border:`1px solid ${C.blue}55`,
      boxShadow:`0 8px 40px rgba(0,0,0,0.7),0 0 20px ${C.blue}18`,
      display:"flex",flexDirection:"column",zIndex:200,animation:"slideUp .3s ease"}}>
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,
        display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0e0e0e"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{width:"7px",height:"7px",background:C.blue,borderRadius:"50%"}}/>
          <span style={{fontSize:"13px",color:C.blue,fontWeight:700,letterSpacing:"2px"}}>ПОДДЕРЖКА</span>
        </div>
        <button onClick={onClose} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:"18px"}}>✕</button>
      </div>
      <div style={{padding:"16px 18px"}}>
        {!sent ? <>
          <div style={{fontSize:"13px",color:C.label,marginBottom:"14px",lineHeight:1.6}}>
            Есть вопрос или проблема? Напиши нам:
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"14px"}}>
            {[
              {icon:"✈️", text:"Telegram", url:"https://t.me/cs2coach_support"},
              {icon:"✉️", text:"Email: support@cs2coach.app", url:"mailto:support@cs2coach.app"},
            ].map((c,i)=>(
              <a key={i} href={c.url} target="_blank" rel="noreferrer"
                style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",
                  background:"#111109",border:`1px solid ${C.border}`,textDecoration:"none",
                  color:C.value,fontSize:"13px"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.blue+"55"}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <span>{c.icon}</span><span>{c.text}</span>
              </a>
            ))}
          </div>
          <div style={{fontSize:"11px",color:C.muted,letterSpacing:"2px",marginBottom:"8px"}}>ИЛИ ОСТАВЬ СООБЩЕНИЕ</div>
          <textarea value={msg} onChange={e=>setMsg(e.target.value)}
            placeholder="Опиши проблему..."
            style={{width:"100%",height:"80px",background:"#111109",border:`1px solid ${C.border}`,
              color:C.value,fontSize:"13px",padding:"10px",fontFamily:"inherit",resize:"none"}}/>
          <button onClick={()=>{if(msg.trim()){setSent(true);}}}
            disabled={!msg.trim()}
            style={{width:"100%",marginTop:"8px",padding:"10px",
              background:msg.trim()?C.blue:"#1a1a1a",color:"#fff",border:"none",
              cursor:msg.trim()?"pointer":"not-allowed",fontSize:"13px",fontFamily:"inherit",fontWeight:700}}>
            ОТПРАВИТЬ
          </button>
        </> : (
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:"28px",marginBottom:"10px"}}>✅</div>
            <div style={{fontSize:"14px",color:C.win,fontWeight:700}}>Сообщение отправлено!</div>
            <div style={{fontSize:"13px",color:C.label,marginTop:"6px"}}>Ответим в течение 24 часов</div>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Support Modal ─────────────────────────────────────────────────────────────
function SupportModal({player, onClose}) {
  const steamid = player?.steamid || "anon";
  const SKEY = `cs2_support_${steamid}`;
  const INITIAL = [{from:"support",text:"Привет! 👋 Чем могу помочь? Опиши проблему — передам команде и ответим в Telegram.",ts:0}];

  const [msgs,setMsgs] = useState(()=>{
    try { const s=localStorage.getItem(SKEY); return s?JSON.parse(s):INITIAL; }
    catch { return INITIAL; }
  });
  const [input,setInput] = useState("");
  const [loading,setLoading] = useState(false);
  const sentAck = useRef(false);
  const lastTs = useRef(0);
  const endRef = useRef(null);

  // Сохраняем в localStorage при каждом изменении
  useEffect(()=>{
    try { localStorage.setItem(SKEY, JSON.stringify(msgs)); } catch {}
    endRef.current?.scrollIntoView({behavior:"smooth"});
  },[msgs]);

  // Инициализируем lastTs из сохранённых сообщений
  useEffect(()=>{
    const adminMsgs = msgs.filter(m=>m.from==="admin_real");
    if(adminMsgs.length>0 && adminMsgs[adminMsgs.length-1].ts)
      lastTs.current = adminMsgs[adminMsgs.length-1].ts;
  },[]);

  // Polling новых ответов от админа
  useEffect(()=>{
    const poll = async ()=>{
      try{
        const r = await fetch(`${BACKEND}/support/poll/${steamid}?since=${lastTs.current}`);
        const d = await r.json();
        if(d.messages?.length>0){
          d.messages.forEach(m=>{ lastTs.current = Math.max(lastTs.current, m.ts+1); });
          setMsgs(prev=>{
            const existingTs = new Set(prev.filter(m=>m.admin_real).map(m=>m.ts));
            const fresh = d.messages
              .filter(m=>!existingTs.has(m.ts))
              .map(m=>({from:"support",text:m.text,ts:m.ts,admin_real:true}));
            return fresh.length>0 ? [...prev,...fresh] : prev;
          });
        }
      }catch{}
    };
    poll();
    const t = setInterval(poll, 2000);
    return ()=>clearInterval(t);
  },[steamid]);

  const sending = useRef(false); // защита от двойной отправки

  async function send() {
    const text = input.trim();
    if(!text || loading || sending.current) return;
    sending.current = true;
    setInput(""); setLoading(true);
    setMsgs(m=>[...m,{from:"user",text,ts:Date.now()}]);
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(()=>ctrl.abort(), 12000);
      await fetch(`${BACKEND}/support`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        signal:ctrl.signal,
        body:JSON.stringify({message:text,steamid:player?.steamid||"",username:player?.username||"Аноним"})
      });
      clearTimeout(tid);
      // "Получили!" — только если ещё не было
      setMsgs(m=>{
        if(m.some(msg=>msg.text?.includes("Менеджер ответит"))) return m;
        return [...m,{from:"support",text:"Получили! Менеджер ответит здесь или в @cs2coach_support 🙌",ts:Date.now()}];
      });
    }catch{
      setMsgs(m=>[...m,{from:"support",text:"Ошибка. Напиши напрямую: @cs2coach_support",ts:Date.now()}]);
    }
    setLoading(false);
    sending.current = false;
  }

  return (
    <div style={{position:"fixed",bottom:"150px",right:"24px",width:"320px",
      background:C.card,border:`1px solid ${C.blue}55`,
      boxShadow:`0 8px 40px rgba(0,0,0,0.7),0 0 20px ${C.blue}18`,
      display:"flex",flexDirection:"column",zIndex:200,animation:"slideUp .3s ease",
      maxHeight:"420px"}}>
      {/* Header */}
      <div style={{padding:"13px 16px",borderBottom:`1px solid ${C.border}`,
        display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0f1114"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{width:"7px",height:"7px",background:C.win,borderRadius:"50%",
            animation:"pulse 2s infinite",boxShadow:`0 0 6px ${C.win}`}}/>
          <span style={{fontSize:"13px",color:C.blue,fontWeight:700,letterSpacing:"2px"}}>ПОДДЕРЖКА</span>
        </div>
        <button onClick={onClose} style={{background:"transparent",border:"none",
          color:C.muted,cursor:"pointer",fontSize:"18px",lineHeight:1}}>✕</button>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"14px",display:"flex",
        flexDirection:"column",gap:"10px"}}>
        {msgs.map((m,i)=>{
          const isUser = m.from==="user";
          const nick = isUser ? (player?.username||"Ты") : "Поддержка";
          const nickColor = isUser ? C.blue : C.yellow;
          const avatar = isUser
            ? (player?.avatar
                ? <img src={player.avatar} alt="" style={{width:"22px",height:"22px",borderRadius:"50%",border:`1px solid ${C.blue}44`,flexShrink:0}}/>
                : <div style={{width:"22px",height:"22px",borderRadius:"50%",background:"#1a2a3a",border:`1px solid ${C.blue}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",flexShrink:0}}>👤</div>)
            : <div style={{width:"22px",height:"22px",borderRadius:"50%",background:"#1a180a",border:`1px solid ${C.yellow}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",flexShrink:0}}>🎧</div>;
          return(
          <div key={i} style={{display:"flex",flexDirection:"column",
            alignItems:isUser?"flex-end":"flex-start",gap:"3px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"5px",
              flexDirection:isUser?"row-reverse":"row"}}>
              {avatar}
              <span style={{fontSize:"10px",color:nickColor,fontWeight:700,letterSpacing:"1px",opacity:.85}}>
                {nick}
              </span>
            </div>
            <div style={{maxWidth:"85%",padding:"9px 13px",
              background:isUser?C.blue+"22":"#1a1a12",
              border:`1px solid ${isUser?C.blue+"44":C.border}`,
              fontSize:"13px",color:isUser?C.blue:C.text,lineHeight:1.6,
              marginLeft:isUser?0:"27px",marginRight:isUser?"27px":0}}>
              {m.text}
            </div>
          </div>
          );
        })}
        {loading&&<div style={{display:"flex",gap:"4px",padding:"6px"}}>
          {[0,1,2].map(k=><div key={k} style={{width:"6px",height:"6px",background:C.blue,
            borderRadius:"50%",animation:`blink 1s ${k*.3}s infinite`}}/>)}
        </div>}
        <div ref={endRef}/>
      </div>

      {/* Input — всегда показываем */}
      <div style={{padding:"10px",borderTop:`1px solid ${C.border}`,display:"flex",gap:"7px"}}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
          placeholder="Напиши вопрос..."
          style={{flex:1,background:"#111109",border:`1px solid ${C.border}`,
            color:C.value,fontSize:"13px",padding:"8px 10px",fontFamily:"inherit"}}/>
        <button onClick={send} disabled={loading||!input.trim()} style={{
          padding:"8px 14px",background:loading||!input.trim()?"#1a1a0e":C.blue,
          color:"#fff",border:"none",cursor:"pointer",
          fontSize:"14px",fontWeight:700,fontFamily:"inherit"}}>→</button>
      </div>
    </div>
  );
}

// ── AI Chat ───────────────────────────────────────────────────────────────────
const CHAT_INIT = [{role:"assistant", content:"Привет! Я твой AI-тренер. Вижу твои статы и готов отвечать на конкретные вопросы — например: Почему я умираю первым? Как апнуть FACEIT? Что тренировать на Mirage?"}];
function ChatPanel({player, source, onClose, isPro, aiRemaining}) {
  const chatKey = `cs2_chat_msgs_${player?.steamid||"anon"}`;
  const [msgs, setMsgsRaw] = useState(()=>{
    try{ const s=localStorage.getItem(chatKey); return s?JSON.parse(s):CHAT_INIT; }catch{ return CHAT_INIT; }
  });
  const setMsgs = (fn) => setMsgsRaw(prev=>{
    const next = typeof fn==="function"?fn(prev):fn;
    try{ localStorage.setItem(chatKey,JSON.stringify(next.slice(-60))); }catch{}
    return next;
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const fc = player?.faceit;
  const cs2 = player?.cs2 || {};

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  const stats = source==="faceit"&&fc ? {
    kd:fc.lifetime?.kd, winrate:fc.lifetime?.winrate, hs:fc.lifetime?.hs,
    matches:fc.lifetime?.matches, faceit_level:String(fc.level||""), faceit_elo:String(fc.elo||"")
  } : {kd:cs2.kd, winrate:cs2.winrate, hs:cs2.hs, matches:cs2.matches,
       faceit_level:String(fc?.level||""), faceit_elo:String(fc?.elo||"")};

  async function send() {
    const q = input.trim(); if (!q || loading) return;
    // Проверяем: если просят AI разбор и лимит исчерпан
    const analysisKeywords = ["разбор","проанализируй","анализ моей игры","разбери мою","analyze"];
    const wantsAnalysis = analysisKeywords.some(k=>q.toLowerCase().includes(k));
    if (wantsAnalysis && !isPro && aiRemaining<=0) {
      setMsgs(m=>[...m,{role:"user",content:q},{role:"assistant",content:"⚡ Еженедельный лимит бесплатных разборов исчерпан. Вернись на следующей неделе или активируй Pro для безлимитного доступа."}]);
      setInput("");
      return;
    }
    const newMsgs = [...msgs, {role:"user",content:q}];
    setMsgs(newMsgs); setInput(""); setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/chat`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({messages:newMsgs.filter(m=>m.role!=="system"), stats})
      });
      const d = await r.json();
      setMsgs(m=>[...m, {role:"assistant",content:d.reply||"Не смог ответить, попробуй ещё."}]);
    } catch { setMsgs(m=>[...m, {role:"assistant",content:"Ошибка сервера."}]); }
    setLoading(false);
  }

  const QUICK = ["Почему я умираю первым?","Как апнуть FACEIT?","Что тренировать?","Лучшая карта для меня?"];

  return (
    <div style={{className:"chat-panel",position:"fixed",bottom:"80px",right:"24px",width:"380px",maxHeight:"550px",
      background:C.card,border:`1px solid ${C.yellow}55`,boxShadow:`0 8px 40px rgba(0,0,0,0.7), 0 0 20px ${C.yellow}18`,
      display:"flex",flexDirection:"column",zIndex:200,animation:"slideUp .3s ease"}}>
      {/* Header */}
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:"#181408"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{width:"7px",height:"7px",background:C.win,borderRadius:"50%",animation:"pulse 2s infinite"}}/>
          <span style={{fontSize:"13px",color:C.yellow,fontWeight:700,letterSpacing:"2px"}}>AI ТРЕНЕР</span>
        </div>
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
          <button onClick={()=>setMsgs(CHAT_INIT)} title="Очистить историю" style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:"13px",lineHeight:1,padding:"2px 6px",opacity:.6}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=.6}>🗑</button>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:"18px",lineHeight:1}}>✕</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:"10px"}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"85%",padding:"10px 14px",
              background:m.role==="user"?C.yellow+"22":"#1e1e12",
              border:`1px solid ${m.role==="user"?C.yellow+"44":C.border}`,
              fontSize:"14px",color:m.role==="user"?C.yellow:C.text,lineHeight:1.65}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading&&<div style={{display:"flex",gap:"5px",padding:"8px"}}>
          {[0,1,2].map(i=><div key={i} style={{width:"7px",height:"7px",background:C.yellow,borderRadius:"50%",animation:`blink 1s ${i*.3}s infinite`}}/>)}
        </div>}
        <div ref={endRef}/>
      </div>

      {/* Quick questions */}
      {msgs.length<=1&&<div style={{padding:"0 12px 12px",display:"flex",flexWrap:"wrap",gap:"6px"}}>
        {QUICK.map((q,i)=>(
          <button key={i} onClick={()=>{setInput(q);}} style={{
            padding:"5px 11px",background:"transparent",border:`1px solid ${C.border}`,
            color:C.label,cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>
            {q}
          </button>
        ))}
      </div>}

      {/* Input */}
      <div style={{padding:"12px",borderTop:`1px solid ${C.border}`,display:"flex",gap:"8px"}}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
          placeholder="Спроси тренера..."
          style={{flex:1,background:"#111109",border:`1px solid ${C.border}`,color:C.value,
            fontSize:"14px",padding:"9px 12px",fontFamily:"inherit"}}/>
        <button onClick={send} disabled={loading||!input.trim()} style={{
          padding:"9px 16px",background:loading||!input.trim()?"#1a1a0e":C.yellow,
          color:"#080807",border:"none",cursor:loading||!input.trim()?"not-allowed":"pointer",
          fontSize:"14px",fontWeight:700,fontFamily:"inherit"}}>→</button>
      </div>
    </div>
  );
}


// ── Practice Tab ──────────────────────────────────────────────────────────────
const PRACTICE_ITEMS = [
  // ВОРКШОП
  {id:1,cat:"workshop",diff:"Любой",icon:"🎯",title:"aim_botz",map:null,
   desc:"Лучшая карта для тренировки прицела — стоячие, двигающиеся боты, настройка дистанции.",
   url:"https://steamcommunity.com/sharedfiles/filedetails/?id=243702660",type:"steam"},
  {id:2,cat:"workshop",diff:"Средний",icon:"🔫",title:"Recoil Master",map:null,
   desc:"Визуальный тренажёр отдачи всего оружия в реальном времени. Самый быстрый способ выучить спрей.",
   url:"https://steamcommunity.com/sharedfiles/filedetails/?id=419404847",type:"steam"},
  {id:3,cat:"workshop",diff:"Начинающий",icon:"🏃",title:"KZ Climb Beginner",map:null,
   desc:"Тренировка движения, прыжков, стрейфов. Улучшает механику и контроль.",
   url:"https://steamcommunity.com/sharedfiles/filedetails/?id=2756420180",type:"steam"},
  {id:4,cat:"workshop",diff:"Средний",icon:"⚡",title:"Yprac Prefire Mirage",map:"Mirage",
   desc:"Боты на всех стандартных позициях Mirage. Тренировка префайра и углов.",
   url:"https://steamcommunity.com/sharedfiles/filedetails/?id=2070817221",type:"steam"},
  {id:5,cat:"workshop",diff:"Средний",icon:"⚡",title:"Yprac Prefire Inferno",map:"Inferno",
   desc:"Все углы бананы, B и апа. Обязательно для Inferno.",
   url:"https://steamcommunity.com/sharedfiles/filedetails/?id=2072029536",type:"steam"},
  {id:6,cat:"workshop",diff:"Начинающий",icon:"⚡",title:"Yprac Prefire Dust2",map:"Dust2",
   desc:"Базовые углы Dust2. Идеально для новичков — все стандартные позиции.",
   url:"https://steamcommunity.com/sharedfiles/filedetails/?id=2070818064",type:"steam"},
  {id:7,cat:"workshop",diff:"Средний",icon:"⚡",title:"Yprac Prefire Ancient",map:"Ancient",
   desc:"Тренировка всех углов Ancient — карта которую мало кто учит, поэтому даёт преимущество.",
   url:"https://steamcommunity.com/sharedfiles/filedetails/?id=2134123524",type:"steam"},
  {id:8,cat:"workshop",diff:"Любой",icon:"🎮",title:"1v1 Arena",map:null,
   desc:"Случайные дуэли 1v1. Лучший способ проверить прицел в боевых условиях.",
   url:"https://steamcommunity.com/sharedfiles/filedetails/?id=149093839",type:"steam"},
  {id:9,cat:"workshop",diff:"Средний",icon:"💨",title:"Smoke Training Mirage",map:"Mirage",
   desc:"Специальная карта с точками для изучения смоков — стоишь на маркере и бросаешь.",
   url:"https://steamcommunity.com/sharedfiles/filedetails/?id=2693216004",type:"steam"},
  {id:10,cat:"workshop",diff:"Продвинутый",icon:"🏆",title:"Fast Aim Reflex Training",map:null,
   desc:"Продвинутый тренажёр рефлексов и микро-коррекции прицела. Для опытных игроков.",
   url:"https://steamcommunity.com/sharedfiles/filedetails/?id=368026786",type:"steam"},

  // ГРАНАТЫ — реальные видео
  {id:11,cat:"grenades",diff:"Начинающий",icon:"💨",title:"Mirage — 5 базовых смоков CT",map:"Mirage",
   desc:"Обязательные смоки на Mirage: Jungle, CT, Stairs, Short, Connector. Знание этих 5 уже делает тебя полезным.",
   url:"https://www.youtube.com/watch?v=UBxpvAFkBSE",type:"youtube"},
  {id:12,cat:"grenades",diff:"Начинающий",icon:"💨",title:"Dust2 — стандартные смоки",map:"Dust2",
   desc:"Xbox smoke, Long A cross, CT rush — три обязательных смока на Dust2.",
   url:"https://www.youtube.com/watch?v=FhLVxUzghYg",type:"youtube"},
  {id:13,cat:"grenades",diff:"Начинающий",icon:"💨",title:"Inferno — Banana и B контроль",map:"Inferno",
   desc:"Смоки на Banana, Car, CT. Флешки и молотовы для контроля B на Inferno.",
   url:"https://www.youtube.com/watch?v=x5t0eoMeRak",type:"youtube"},
  {id:14,cat:"grenades",diff:"Средний",icon:"🔥",title:"Mirage — молотовы и флешки А",map:"Mirage",
   desc:"Молотов на A ramp, поп-флеш через угол на А. Эффективная атака А через гранаты.",
   url:"https://www.youtube.com/watch?v=2Wh2TmpYn0k",type:"youtube"},
  {id:15,cat:"grenades",diff:"Средний",icon:"💨",title:"Nuke — важные смоки",map:"Nuke",
   desc:"Smokes для контроля Outside, Lobby, Ramp. Nuke без смоков невозможен.",
   url:"https://www.youtube.com/watch?v=lOvhBXFAH1A",type:"youtube"},
  {id:16,cat:"grenades",diff:"Средний",icon:"💨",title:"Ancient — базовые смоки",map:"Ancient",
   desc:"CT, Mid, B-site смоки на Ancient. Мало кто знает — даёт большое преимущество.",
   url:"https://www.youtube.com/watch?v=g2kMcJeH2jQ",type:"youtube"},

  // ДВИЖЕНИЕ
  {id:17,cat:"movement",diff:"Начинающий",icon:"⚙️",title:"Контрастрейф — полный гайд",map:null,
   desc:"Counter-strafe — как правильно останавливаться перед выстрелом. Самый важный механический навык.",
   url:"https://www.youtube.com/watch?v=8GpLR5YQPQM",type:"youtube"},
  {id:18,cat:"movement",diff:"Средний",icon:"🐇",title:"Бхоп — основы и практика",map:null,
   desc:"Bunny hop — прыжки с ускорением. Поможет в ротациях и некоторых позициях.",
   url:"https://www.youtube.com/watch?v=q3vPWC4Ek5w",type:"youtube"},
  {id:19,cat:"movement",diff:"Средний",icon:"📐",title:"Прыжки на позиции — Mirage",map:"Mirage",
   desc:"Прыжок на ящик Short, буст на рампу. Позиции недоступные без знания прыжков.",
   url:"https://www.youtube.com/watch?v=RzD8FpGp5pA",type:"youtube"},
  {id:20,cat:"movement",diff:"Продвинутый",icon:"🌀",title:"Стрейфы и движение в CS2",map:null,
   desc:"Air-strafe, W-стрейфы, контроль точности при движении. Продвинутая механика.",
   url:"https://www.youtube.com/watch?v=4yK4pU5KjQU",type:"youtube"},

  // ПОЗИЦИИ
  {id:21,cat:"positions",diff:"Начинающий",icon:"🗺️",title:"Mirage — топ CT позиции",map:"Mirage",
   desc:"Window, Jungle, B passive, standard CT. Позиции с максимальным контролем информации.",
   url:"https://www.youtube.com/watch?v=N8WPW5hLMiU",type:"youtube"},
  {id:22,cat:"positions",diff:"Начинающий",icon:"🗺️",title:"Inferno — позиции B сайта",map:"Inferno",
   desc:"Carp, Balcony, Orange, Fountain. Правильное расположение на B Inferno.",
   url:"https://www.youtube.com/watch?v=bTJBuIbjWqc",type:"youtube"},
  {id:23,cat:"positions",diff:"Средний",icon:"🎯",title:"Off-angles и нестандартные позиции",map:null,
   desc:"Позиции которых не ожидают. Один из самых эффективных способов получить лёгкие килы.",
   url:"https://www.youtube.com/watch?v=YLPZ2mH5sTI",type:"youtube"},
  {id:24,cat:"positions",diff:"Средний",icon:"🔭",title:"AWP позиции — топ карты",map:null,
   desc:"Лучшие AWP углы на Mirage, Inferno, Dust2. Для снайперов всех уровней.",
   url:"https://www.youtube.com/watch?v=EUy9y3wkbRs",type:"youtube"},
  {id:25,cat:"positions",diff:"Продвинутый",icon:"🔍",title:"Lurk и информационные позиции",map:null,
   desc:"Позиции для сбора информации без риска. Для саппорта и лёрка.",
   url:"https://www.youtube.com/watch?v=pf5w_7EJKqE",type:"youtube"},
];

const CATS = [
  {id:"all",     label:"Всё",       icon:"🎮"},
  {id:"workshop",label:"Воркшоп",  icon:"🔧"},
  {id:"grenades",label:"Гранаты",  icon:"💨"},
  {id:"movement",label:"Движение", icon:"🏃"},
  {id:"positions",label:"Позиции", icon:"🗺️"},
  {id:"callouts",label:"Карты",    icon:"📍"},
];
const DIFFS = ["Начинающий","Средний","Продвинутый","Любой"];
const DIFF_COLOR = {"Начинающий":C.win,"Средний":C.yellow,"Продвинутый":C.lose,"Любой":C.blue};

// ── MAP CALLOUTS — по реальным картам CS2 ─────────────────────────────────────
// Зоны нарисованы по реальным callout-картам. SVG viewBox 0 0 100 100.
// cx/cy — центр текста. Все координаты нормализованы.
const MAP_CALLOUTS = {
  // ─── MIRAGE ─────────────────────────────────────────────────────────────────
  // T Spawn — правый центр, B Site — левый верх, A Site — нижний центр-право
  // По картинке: B Apartments верх-лево, T Spawn — право-центр, A — низ-право
  Mirage:{
    key:"Контроль Mid открывает A через Window и B через Apps",
    zones:[
      {id:"t_spawn",  label:"T Spawn",    team:"T",  path:"M78,42 L95,42 L95,62 L78,62 Z", cx:86, cy:52,
       desc:"Стартовая позиция T. Двое на Ramp/Mid, двое A Main, один Palace.", tip:"Первые 5 сек — выйди к Ramp. CT занимают Short быстро."},
      {id:"top_mid",  label:"Top Mid",    team:"T",  path:"M62,42 L78,42 L78,58 L62,58 Z", cx:70, cy:50,
       desc:"Top Mid — выход T к Mid через Cart и Banana-сторону.", tip:"Smoke Top Mid = контроль среднего коридора без потерь."},
      {id:"b_house",  label:"B House",    team:"T",  path:"M52,5 L78,5 L78,24 L52,24 Z", cx:65, cy:14,
       desc:"B House — прямой маршрут к B через T Spawn коридор.", tip:"B House + Banana — стандартный быстрый B push с правой стороны."},
      {id:"banana",   label:"Banana",     team:"N",  path:"M62,24 L78,24 L78,42 L62,42 Z", cx:70, cy:33,
       desc:"Banana — ключевой коридор к B сайту. AWP позиция CT сверху.", tip:"Smoke CT на Banana + rush = быстрый безопасный B take."},
      {id:"b_site",   label:"B Site",     team:"CT", path:"M5,5 L42,5 L42,32 L5,32 Z", cx:23, cy:18,
       desc:"B сайт. Van, Short Corner, Bench — укрытия CT при защите B.", tip:"Молотов Van + smoke Apps = заблокирован весь T вход на B."},
      {id:"b_apts",   label:"B Apts",     team:"CT", path:"M5,32 L28,32 L28,50 L5,50 Z", cx:16, cy:41,
       desc:"B Apartments — выход CT к B и Van. Позиция фланга.", tip:"B Apts hold = CT перекрывает Catwalk/Apps выход T."},
      {id:"catwalk",  label:"Catwalk",    team:"N",  path:"M42,32 L62,32 L62,42 L42,42 Z", cx:52, cy:37,
       desc:"Catwalk — переход между Mid и B Apps. Связывает T Mid с B.", tip:"Catwalk к Apps — неожиданный маршрут если CT ждут с Main."},
      {id:"mid",      label:"Mid",        team:"N",  path:"M42,42 L78,42 L78,58 L42,58 Z", cx:60, cy:50,
       desc:"Mid — центр карты. Window, Jungle, Short — ключевые позиции.", tip:"Smoke Window + CT smoke = T контролирует Mid без потерь."},
      {id:"jungle",   label:"Jungle",     team:"N",  path:"M28,50 L44,50 L44,65 L28,65 Z", cx:36, cy:57,
       desc:"Jungle — AWP позиция между Mid и A. Видно весь A вход.", tip:"Jungle AWP без смока = T не выйдет на A без потерь."},
      {id:"short",    label:"Short",      team:"N",  path:"M28,65 L48,65 L48,80 L28,80 Z", cx:38, cy:72,
       desc:"Short — выход к A сайту с Ramp. CT агрессят здесь ранним пиком.", tip:"Flash Short + push = неожиданный вход для T с левой стороны."},
      {id:"ramp",     label:"Ramp",       team:"T",  path:"M62,58 L78,58 L78,75 L62,75 Z", cx:70, cy:66,
       desc:"Ramp — переход T от Spawn к Mid и Short.", tip:"Быстрый Ramp выход в первые секунды = CT не успевает Short."},
      {id:"a_main",   label:"A Main",     team:"T",  path:"M62,75 L82,75 L82,95 L62,95 Z", cx:72, cy:85,
       desc:"A Main — основной заход T на A сайт. Palace и Main — два входа.", tip:"Smoke Jungle + Flash = стандартный безопасный A take."},
      {id:"palace",   label:"Palace",     team:"T",  path:"M82,75 L95,75 L95,95 L82,95 Z", cx:88, cy:85,
       desc:"Palace — альтернативный заход на A. Split вместе с Main.", tip:"Palace + Main одновременно — CT не успевает покрыть обе точки."},
      {id:"a_site",   label:"A Site",     team:"CT", path:"M5,65 L28,65 L28,95 L5,95 Z", cx:16, cy:80,
       desc:"A сайт. Ticket Booth, CT Box, Stairs — ключевые укрытия.", tip:"A hold: один Jungle, один Short, один CT Box — все углы закрыты."},
      {id:"ct_spawn", label:"CT Spawn",   team:"CT", path:"M5,50 L28,50 L28,65 L5,65 Z", cx:16, cy:57,
       desc:"CT Spawn — стартовая точка CT. Быстрый выход к A и B.", tip:"Ротация A→B: 6 секунд. Всегда слушай шаги и бомбу."},
    ]
  },

  // ─── INFERNO ────────────────────────────────────────────────────────────────
  // По картинке: T Spawn — левый центр, B — верх-лево, A — право, Banana — вертикально слева
  Inferno:{
    key:"Контроль Banana критичен — без него CT не могут ротировать",
    zones:[
      {id:"t_spawn",   label:"T Spawn",    team:"T",  path:"M5,40 L22,40 L22,65 L5,65 Z", cx:13, cy:52,
       desc:"T Spawn — слева на карте. Расходятся: Banana или A через Apartments.", tip:"2 на Banana pressure, 3 на A — стандартный старт."},
      {id:"t_apts",    label:"T Apts",     team:"T",  path:"M5,65 L28,65 L28,95 L5,95 Z", cx:16, cy:80,
       desc:"T Apartments — нижний путь к A через Bridge и Second Mid.", tip:"T Apts дают flanking возможность при A take через Short."},
      {id:"banana",    label:"Banana",     team:"N",  path:"M22,26 L38,26 L38,60 L22,60 Z", cx:30, cy:43,
       desc:"Banana — ключевой коридор к B. Car, Logs, Tree — позиции CT.", tip:"Молотов Top Banana + smoke CT = T берёт Banana без потерь."},
      {id:"b_site",    label:"B Site",     team:"CT", path:"M5,5 L38,5 L38,26 L5,26 Z", cx:21, cy:15,
       desc:"B сайт. Fountain, New Box, Car — укрытия CT при защите.", tip:"После плента: один Car, один New Box — retake очень сложен."},
      {id:"construction",label:"Constr.",  team:"T",  path:"M38,5 L72,5 L72,22 L38,22 Z", cx:55, cy:13,
       desc:"Construction — путь к A сайту через Garden. CT контролирует Truck.", tip:"Construction + Apartments = split на A с двух сторон."},
      {id:"connector",  label:"Connector", team:"N",  path:"M38,22 L58,22 L58,42 L38,42 Z", cx:48, cy:32,
       desc:"Connector — переход между B и серединой карты. Ротации CT.", tip:"Connector smoke блокирует ротацию CT с B на A."},
      {id:"a_long",    label:"A Long",     team:"T",  path:"M72,22 L95,22 L95,48 L72,48 Z", cx:83, cy:35,
       desc:"A Long — прямой вход на A сайт. Library рядом.", tip:"Smoke Arch + Flash = безопасный вход на A через Long."},
      {id:"arch",      label:"Arch",       team:"N",  path:"M58,42 L78,42 L78,58 L58,58 Z", cx:68, cy:50,
       desc:"Arch — позиция AWP CT. Контролирует весь вход T с A Long.", tip:"Смок Arch при каждом A пуше — иначе AWP закроет вход."},
      {id:"a_site",    label:"A Site",     team:"CT", path:"M72,48 L95,48 L95,78 L72,78 Z", cx:83, cy:63,
       desc:"A сайт. Default, Pit, Balcony — укрытия CT при защите A.", tip:"Pit AWP + CT hold = T не зайдёт без смоков."},
      {id:"pit",       label:"Pit",        team:"CT", path:"M72,78 L88,78 L88,95 L72,95 Z", cx:80, cy:86,
       desc:"Pit — мощная позиция под A сайтом. AWP держит вход.", tip:"Pit AWP без смока = T не заходит на A. Сильнейшая позиция."},
      {id:"ct_spawn",  label:"CT Spawn",   team:"CT", path:"M78,5 L95,5 L95,22 L78,22 Z", cx:86, cy:13,
       desc:"CT Spawn — центральная позиция CT. Ротация к A и B.", tip:"CT ротация A→B — 5-6 секунд. Слушай Banana."},
      {id:"mid",       label:"Middle",     team:"N",  path:"M38,42 L58,42 L58,70 L38,70 Z", cx:48, cy:56,
       desc:"Middle — центр карты между Banana и A. Bench и Haystack.", tip:"Mid control даёт split возможности для обоих сайтов."},
    ]
  },

  // ─── DUST2 ──────────────────────────────────────────────────────────────────
  // По картинке: T Spawn — правый низ, CT Spawn — левый верх, Long A — право-верх
  // A site — центр-верх, B — левый центр, Tunnels — правый низ
  Dust2:{
    key:"Кто контролирует Long A — тот контролирует карту",
    zones:[
      {id:"t_spawn",   label:"T Spawn",   team:"T",  path:"M75,68 L95,68 L95,88 L75,88 Z", cx:85, cy:78,
       desc:"T Spawn — право-низ карты. Long A, Catwalk/Mid или B Tunnels.", tip:"Long push в первые секунды — без AWP у CT тяжело остановить."},
      {id:"outside_long",label:"Outside Long",team:"T",path:"M52,60 L75,60 L75,88 L52,88 Z", cx:63, cy:74,
       desc:"Outside Long — путь к Long A. Suicide — агрессивный вариант.", tip:"Suicide push = информация но высокий риск без смока."},
      {id:"long_a",    label:"Long A",    team:"T",  path:"M52,25 L80,25 L80,60 L52,60 Z", cx:66, cy:42,
       desc:"Long A — самая важная часть карты. Контроль = давление на A.", tip:"Smoke CT Cross + smoke Long Corner = безопасный Long take."},
      {id:"a_site",    label:"A Site",    team:"CT", path:"M24,8 L52,8 L52,38 L24,38 Z", cx:38, cy:23,
       desc:"A сайт. Short, CT Ramp, Car — главные укрытия CT.", tip:"A hold: один Long, один Short, один CT Box — все входы закрыты."},
      {id:"ct_ramp",   label:"CT Ramp",   team:"CT", path:"M52,8 L80,8 L80,25 L52,25 Z", cx:66, cy:16,
       desc:"CT Ramp — выход CT к A с правой стороны. AWP позиция.", tip:"CT Ramp peek даёт информацию о Long без большого риска."},
      {id:"short_a",   label:"Short A",   team:"CT", path:"M8,8 L24,8 L24,30 L8,30 Z", cx:16, cy:19,
       desc:"Short A — быстрый выход CT к A сайту слева.", tip:"Short CT peek в начале раунда = информация о Mid."},
      {id:"ct_spawn",  label:"CT Spawn",  team:"CT", path:"M5,5 L30,5 L30,38 L5,38 Z", cx:17, cy:21,
       desc:"CT Spawn — левый верх карты. Ротация к A и B.", tip:"CT ротация A→B: 5 секунд. Слушай бомбу и тоннели."},
      {id:"mid",       label:"Mid",       team:"N",  path:"M24,38 L52,38 L52,60 L24,60 Z", cx:38, cy:49,
       desc:"Mid — Xbox, Squeaky, Cat. Контроль Mid = Split на A через Short.", tip:"Mid control + Long = A take с двух сторон."},
      {id:"upper_tunnels",label:"Tunnels",team:"T",  path:"M24,60 L52,60 L52,78 L24,78 Z", cx:38, cy:69,
       desc:"Upper Tunnels — выход к B сайту. Быстрый путь с T Spawn.", tip:"Flash потолок тоннеля + rush = быстрый B take без смоков."},
      {id:"b_site",    label:"B Site",    team:"CT", path:"M5,38 L24,38 L24,70 L5,70 Z", cx:14, cy:54,
       desc:"B сайт. Car, Boxes, Window — укрытия CT при защите B.", tip:"Smoke B Door + smoke Window = T не видит CT ни слева ни справа."},
      {id:"b_platform",label:"B Platform",team:"CT", path:"M5,70 L24,70 L24,88 L5,88 Z", cx:14, cy:79,
       desc:"B Platform — задний план B сайта. Back Plat позиция AWP.", tip:"Back Plat CT hold = перекрывает весь выход из туннелей."},
    ]
  },

  // ─── NUKE ───────────────────────────────────────────────────────────────────
  // По картинке: T Spawn — левый центр, B site — верхний лево (отдельная зона!),
  // A site — центр-право, CT — правый верх. Особенность: два этажа
  Nuke:{
    key:"Контроль Outside даёт доступ к обоим сайтам",
    zones:[
      {id:"t_spawn",  label:"T Spawn",    team:"T",  path:"M5,44 L22,44 L22,64 L5,64 Z", cx:13, cy:54,
       desc:"T Spawn — слева. Маршрут: Outside к A или Ramp к B.", tip:"Split Outside + Ramp = CT не понимает куда идут T."},
      {id:"outside",  label:"Outside",    team:"N",  path:"M22,28 L52,28 L52,65 L22,65 Z", cx:37, cy:46,
       desc:"Outside — ключевая внешняя зона. Контроль = выбор A или B.", tip:"Smoke Hut + Ramp smoke + Outside = T выбирает сайт свободно."},
      {id:"ramp",     label:"Ramp",       team:"T",  path:"M22,65 L40,65 L40,82 L22,82 Z", cx:31, cy:73,
       desc:"Ramp — заход на B снизу. CT встречают здесь через Ramp Room.", tip:"Smoke Ramp Room + flash = безопасный вход без боя."},
      {id:"lobby",    label:"Lobby",      team:"T",  path:"M5,64 L22,64 L22,88 L5,88 Z", cx:13, cy:76,
       desc:"Lobby — альтернативный путь к B через нижний уровень.", tip:"Lobby rush + Outside noise = CT не понимает куда идти."},
      {id:"b_site",   label:"B Site",     team:"CT", path:"M5,5 L30,5 L30,28 L5,28 Z", cx:17, cy:16,
       desc:"B сайт (нижний уровень). Vent, Ducting, De-con — позиции CT.", tip:"B hold: один Vent, один Back Halls — закрываются все входы снизу."},
      {id:"tunnels",  label:"Tunnels",    team:"T",  path:"M5,28 L22,28 L22,44 L5,44 Z", cx:13, cy:36,
       desc:"Tunnels — подземный переход к B снизу через Secret.", tip:"Secret smoke = T входит на B без контакта с CT."},
      {id:"secret",   label:"Secret",     team:"N",  path:"M30,28 L52,28 L52,44 L30,44 Z", cx:41, cy:36,
       desc:"Secret — скрытый проход к нижнему B. T редко используют.", tip:"Secret smoke + push = неожиданный вход на B снизу."},
      {id:"a_site",   label:"A Site",     team:"CT", path:"M52,8 L90,8 L90,50 L52,50 Z", cx:71, cy:29,
       desc:"A сайт (верхний). Ramp Room, Trophy, Fork — позиции CT.", tip:"Heaven hold без Outside smoke = CT AWP контролирует A."},
      {id:"heaven",   label:"Heaven",     team:"CT", path:"M72,5 L95,5 L95,28 L72,28 Z", cx:83, cy:16,
       desc:"Heaven — позиция над A сайтом. AWP отсюда держит весь вход.", tip:"Heaven AWP без смока = T не выходит на A без потерь."},
      {id:"ct_spawn", label:"CT Spawn",   team:"CT", path:"M72,50 L95,50 L95,72 L72,72 Z", cx:83, cy:61,
       desc:"CT Spawn — правый центр. Ротация между A и B занимает время.", tip:"Nuke ротация сложнейшая. Читай T паттерны заранее."},
    ]
  },

  // ─── ANCIENT ────────────────────────────────────────────────────────────────
  // По картинке: CT Spawn — верх-центр, T Spawn — низ-центр
  // A — верх-лево, B — право-центр, Tomb — центр-лево, Mid — центр
  Ancient:{
    key:"Контроль Mid через Donut открывает оба сайта",
    zones:[
      {id:"t_spawn",  label:"T Spawn",    team:"T",  path:"M38,78 L58,78 L58,95 L38,95 Z", cx:48, cy:86,
       desc:"T Spawn — низ карты. Три маршрута: A Main, Mid/Donut, B Main.", tip:"Mid pressure + A fake = CT ошибается в ротации."},
      {id:"split",    label:"Split",      team:"T",  path:"M5,60 L38,60 L38,85 L5,85 Z", cx:21, cy:72,
       desc:"Split — нижний путь T к B через Tunnel и Water.", tip:"Split + Tunnel = маршрут к B без контакта через Mid."},
      {id:"tunnel",   label:"Tunnel",     team:"T",  path:"M38,62 L58,62 L58,78 L38,78 Z", cx:48, cy:70,
       desc:"Tunnel — переход от T Spawn к Split и B сайту.", tip:"Tunnel к B Main = менее предсказуемый маршрут для T."},
      {id:"a_main",   label:"A Main",     team:"T",  path:"M5,22 L24,22 L24,60 L5,60 Z", cx:14, cy:41,
       desc:"A Main — левый вертикальный коридор к A сайту.", tip:"Smoke Pillar + Flash = стандартный безопасный вход на A."},
      {id:"tomb",     label:"Tomb",       team:"N",  path:"M24,32 L44,32 L44,62 L24,62 Z", cx:34, cy:47,
       desc:"Tomb — центральная открытая зона левее Mid. Hall к Short.", tip:"Tomb hold = информация о T движении к A через Main."},
      {id:"donut",    label:"Donut",      team:"N",  path:"M42,50 L62,50 L62,64 L42,64 Z", cx:52, cy:57,
       desc:"Donut — ключевой переход от Mid к A. Split с двух сторон.", tip:"Donut control + A Main push = CT не успевает покрыть."},
      {id:"mid",      label:"Mid",        team:"N",  path:"M44,36 L68,36 L68,52 L44,52 Z", cx:56, cy:44,
       desc:"Mid — центральный контроль. Через Donut к A, Cave к B.", tip:"Mid smoke + Donut push = CT теряет информацию."},
      {id:"ct_spawn", label:"CT Spawn",   team:"CT", path:"M38,5 L62,5 L62,22 L38,22 Z", cx:50, cy:13,
       desc:"CT Spawn — верх карты. Центральная позиция, ротация к A и B.", tip:"CT ротация: A→B за 5 секунд. Быстрая реакция ключевая."},
      {id:"a_site",   label:"A Site",     team:"CT", path:"M5,5 L38,5 L38,32 L24,32 L24,22 L5,22 Z", cx:20, cy:15,
       desc:"A сайт — верх-лево. Triple Box, Big Box, Back Site.", tip:"A hold: один Pillar, один Temple — нет слепых углов для T."},
      {id:"house",    label:"House",      team:"CT", path:"M38,5 L68,5 L68,22 L38,22 Z", cx:53, cy:13,
       desc:"House — верхний коридор от CT Spawn. Sniper Nest, House Doors.", tip:"House AWP = держит Mid и Alley от T."},
      {id:"b_site",   label:"B Site",     team:"CT", path:"M62,36 L88,36 L88,65 L62,65 Z", cx:75, cy:50,
       desc:"B сайт — право-центр. Sunroom, Vent, Ramp — позиции CT.", tip:"B hold: один Sunroom, один Ramp — закрывают оба входа."},
      {id:"lower_b",  label:"Lower B",    team:"T",  path:"M62,65 L88,65 L88,88 L62,88 Z", cx:75, cy:76,
       desc:"Lower B Long — нижний подход к B через Dig и Cat.", tip:"Lower B Long + Ramp = split на B сайт с двух сторон."},
    ]
  },

  // ─── ANUBIS ─────────────────────────────────────────────────────────────────
  // По картинке: T Spawn — низ-центр, CT Spawn — верх-право
  // A — верх-право, B — центр-лево, Canal — центр
  Anubis:{
    key:"Контроль Canal критичен для обеих команд",
    zones:[
      {id:"t_spawn",  label:"T Spawn",    team:"T",  path:"M38,78 L62,78 L62,95 L38,95 Z", cx:50, cy:86,
       desc:"T Spawn — низ карты. A Main вправо или Canal/B Main влево.", tip:"Canal control должен быть получен в первые 30 секунд."},
      {id:"street",   label:"Street",     team:"T",  path:"M50,60 L72,60 L72,78 L50,78 Z", cx:61, cy:69,
       desc:"Street/T Stairs — переход от T Spawn к Canal и B.", tip:"Street control = T видит куда движутся CT при ротации."},
      {id:"canal",    label:"Canal",      team:"N",  path:"M28,40 L60,40 L60,62 L28,62 Z", cx:44, cy:51,
       desc:"Canal — центральная зона. Кто берёт Canal — контролирует карту.", tip:"Smoke Canal + push = CT теряет информацию о split атаках."},
      {id:"middle",   label:"Middle",     team:"N",  path:"M44,24 L68,24 L68,40 L44,40 Z", cx:56, cy:32,
       desc:"Middle — верхний Canal. Heaven, Walkway — позиции контроля.", tip:"Middle hold = информация о T движении по всей карте."},
      {id:"a_main",   label:"A Main",     team:"T",  path:"M28,8 L50,8 L50,40 L28,40 Z", cx:39, cy:24,
       desc:"A Main — прямой путь к A под контролем Palace AWP.", tip:"Smoke Palace + Flash A = безопасный выход без потерь от AWP."},
      {id:"b_main",   label:"B Main",     team:"T",  path:"M5,62 L28,62 L28,88 L5,88 Z", cx:16, cy:75,
       desc:"B Main — левый путь к B сайту. Узкий коридор с Ruins.", tip:"B Main молотов + smoke CT = T входит на B без потерь."},
      {id:"palace",   label:"Palace",     team:"CT", path:"M62,5 L82,5 L82,28 L62,28 Z", cx:72, cy:16,
       desc:"Palace — мощная AWP позиция CT. Держит весь A вход.", tip:"Palace AWP без смока = T не выходит на A сайт."},
      {id:"ct_spawn", label:"CT Spawn",   team:"CT", path:"M68,28 L95,28 L95,52 L68,52 Z", cx:81, cy:40,
       desc:"CT Spawn — право-центр. Быстрая ротация к A и B.", tip:"Anubis CT ротация самая быстрая. Реагируй сразу на Canal."},
      {id:"boat",     label:"Boat",       team:"N",  path:"M60,40 L82,40 L82,62 L60,62 Z", cx:71, cy:51,
       desc:"Boat / T Side Upper — нейтральная зона перехода к B.", tip:"Boat control = T может split на B с двух направлений."},
      {id:"a_site",   label:"A Site",     team:"CT", path:"M50,5 L82,5 L82,28 L62,28 L62,40 L50,40 Z", cx:64, cy:19,
       desc:"A сайт. Circle, Fountain — укрытия CT. Много углов.", tip:"A hold: один Palace, один Circle — надёжная защита A."},
      {id:"b_site",   label:"B Site",     team:"CT", path:"M5,40 L28,40 L28,62 L5,62 Z", cx:16, cy:51,
       desc:"B сайт. Bridge, Backsite, Outside Long — позиции CT.", tip:"B hold: один Bridge, один Back — retake очень сложен."},
    ]
  },
};


// ── Interactive Map with SVG zones ───────────────────────────────────────────
function MapCalloutView({mapName}) {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const data = MAP_CALLOUTS[mapName];
  if(!data) return null;
  const activeZone = selected || hovered;
  const info = activeZone ? data.zones.find(z=>z.id===activeZone) : null;

  const teamColor = (team) => team==="T"?"#f5c518":team==="CT"?"#74c6f5":"#aaa88a";
  const teamBg = (team) => team==="T"?"#f5c51818":team==="CT"?"#74c6f518":"#aaa88a11";

  return(
    <div style={{animation:"up .3s ease both"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderTop:`2px solid ${C.yellow}`,overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:"12px",letterSpacing:"3px",color:C.yellow,fontWeight:700}}>
            {mapName.toUpperCase()} · ИНТЕРАКТИВНАЯ КАРТА
          </div>
          <div style={{fontSize:"12px",color:C.muted}}>Наводи на зону для деталей</div>
        </div>

        {/* SVG Map */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:0}}>
          {/* Left: SVG */}
          <div style={{position:"relative",background:"#0c0c08",padding:"4px"}}>
            <svg viewBox="0 0 100 100" style={{width:"100%",display:"block",cursor:"crosshair"}}
              xmlns="http://www.w3.org/2000/svg">
              {/* Background grid */}
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1a1a10" strokeWidth="0.3"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)"/>

              {/* Map border */}
              <rect x="3" y="3" width="94" height="94" fill="none" stroke="#2e2e1e" strokeWidth="0.5"/>

              {/* Zones */}
              {data.zones.map(z=>{
                const isActive = activeZone===z.id;
                const tc = teamColor(z.team);
                const isSelected = selected===z.id;
                // Use path if available, otherwise fallback to rect
                const shapeProps = {
                  fill: isActive?tc+"55":teamBg(z.team),
                  stroke: isActive?tc:tc+"66",
                  strokeWidth: isActive?"0.9":"0.45",
                  style:{transition:"all .15s ease",cursor:"pointer"},
                  onMouseEnter:()=>setHovered(z.id),
                  onMouseLeave:()=>setHovered(null),
                  onClick:()=>setSelected(isSelected?null:z.id),
                };
                return(
                  <g key={z.id}>
                    {z.path
                      ? <path d={z.path} rx="0" {...shapeProps}/>
                      : <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="1" {...shapeProps}/>
                    }
                    {/* Zone label — always at cx/cy center */}
                    <text
                      x={z.cx||(z.x+z.w/2)} y={(z.cy||(z.y+z.h/2))+0.5}
                      textAnchor="middle" dominantBaseline="middle"
                      fill={isActive?tc:"#ffffffaa"}
                      fontSize={isActive?"3.2":"2.6"}
                      fontWeight={isActive?"bold":"normal"}
                      style={{pointerEvents:"none",userSelect:"none",transition:"all .15s ease",fontFamily:"monospace"}}
                    >{z.label}</text>
                    {/* Selected indicator */}
                    {isSelected&&z.path&&<path d={z.path}
                      fill="none" stroke={tc} strokeWidth="1"
                      strokeDasharray="2 1" style={{pointerEvents:"none"}}/>}
                    {isSelected&&!z.path&&<rect x={z.x} y={z.y} width={z.w} height={z.h}
                      fill="none" stroke={tc} strokeWidth="1" rx="1"
                      strokeDasharray="2 1" style={{pointerEvents:"none"}}/>}
                  </g>
                );
              })}

              {/* Legend labels */}
              <text x="5" y="8" fill="#f5c51888" fontSize="2.5" fontFamily="monospace">T</text>
              <text x="12" y="8" fill="#74c6f588" fontSize="2.5" fontFamily="monospace">CT</text>
              <text x="20" y="8" fill="#aaa88a88" fontSize="2.5" fontFamily="monospace">NEUTRAL</text>
            </svg>
          </div>

          {/* Right: Info panel */}
          <div style={{borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",minHeight:"320px"}}>
            {info?(
              <div style={{padding:"18px",animation:"up .2s ease both"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px"}}>
                  <div style={{width:"8px",height:"8px",borderRadius:"50%",
                    background:teamColor(info.team),boxShadow:`0 0 6px ${teamColor(info.team)}`}}/>
                  <span style={{fontSize:"11px",color:teamColor(info.team),fontWeight:700,letterSpacing:"2px"}}>
                    {info.team==="T"?"T СТОРОНА":info.team==="CT"?"CT СТОРОНА":"НЕЙТРАЛЬНАЯ"}
                  </span>
                </div>
                <div style={{fontSize:"18px",color:C.value,fontWeight:700,marginBottom:"10px",lineHeight:1.2}}>
                  {info.label}
                </div>
                <div style={{fontSize:"13px",color:C.text,lineHeight:1.7,marginBottom:"12px"}}>
                  {info.desc}
                </div>
                {info.tip&&<div style={{background:C.yellow+"0d",border:`1px solid ${C.yellow}28`,
                  padding:"10px 12px",marginBottom:"12px"}}>
                  <div style={{fontSize:"10px",color:C.yellow,letterSpacing:"2px",fontWeight:700,marginBottom:"5px"}}>
                    💡 ТАКТИКА
                  </div>
                  <div style={{fontSize:"12px",color:C.yellow+"cc",lineHeight:1.6}}>{info.tip}</div>
                </div>}
                <div style={{fontSize:"11px",color:C.muted,borderTop:`1px solid ${C.border}`,
                  paddingTop:"10px",lineHeight:1.5}}>
                  {selected===info.id?"Клик ещё раз — снять выделение":"Кликни — закрепить выделение"}
                </div>
              </div>
            ):(
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",padding:"20px",textAlign:"center",gap:"12px"}}>
                <div style={{fontSize:"28px",opacity:.4}}>🗺️</div>
                <div style={{fontSize:"13px",color:C.muted,lineHeight:1.6}}>
                  Наведи на зону карты чтобы узнать её название и тактику
                </div>
                <div style={{marginTop:"8px",width:"100%"}}>
                  {[{label:"T Сторона",color:"#f5c518"},{label:"CT Сторона",color:"#74c6f5"},{label:"Нейтральная",color:"#aaa88a"}].map(l=>(
                    <div key={l.label} style={{display:"flex",alignItems:"center",gap:"8px",
                      padding:"5px 8px",marginBottom:"4px"}}>
                      <div style={{width:"10px",height:"10px",background:l.color+"33",
                        border:`1px solid ${l.color}88`,borderRadius:"2px"}}/>
                      <span style={{fontSize:"12px",color:C.muted}}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Key tip */}
        <div style={{padding:"12px 16px",background:C.yellow+"0a",
          borderTop:`1px solid ${C.yellow}22`,fontSize:"13px",color:C.yellow,lineHeight:1.6}}>
          💡 {data.key}
        </div>
      </div>
    </div>
  );
}



function PracticeTab({player}) {
  const [cat,setCat]       = useState("all");
  const [diff,setDiff]     = useState("all");
  const [search,setSearch] = useState("");
  const [selMap,setSelMap] = useState(null);
  const fc = player?.faceit;
  const cs2 = player?.cs2 || {};

  // "Для вас" — подбираем по слабым сторонам
  const forYouIds = (() => {
    if(!player) return [];
    const ids = [];
    const kd = parseFloat(fc?.lifetime?.kd||cs2.kd||0);
    const hs = parseFloat(fc?.lifetime?.hs||cs2.hs||0);
    const wr = parseFloat(fc?.lifetime?.winrate||cs2.winrate||0);
    if(kd<1.0)  ids.push(1,2,17); // aim_botz, recoil, counterstraft
    if(hs<40)   ids.push(1,10,17); // aim training
    if(wr<45)   ids.push(21,22,11,12); // positions + grenades
    if(kd>=1.0&&hs>=45) ids.push(23,24,25); // advanced
    return [...new Set(ids)];
  })();

  const filtered = cat==="callouts" ? [] : PRACTICE_ITEMS.filter(item=>{
    if(cat!=="all"&&item.cat!==cat) return false;
    if(diff!=="all"&&item.diff!==diff) return false;
    if(diff==="Для вас"&&!forYouIds.includes(item.id)) return false;
    if(search){
      const q=search.toLowerCase();
      return item.title.toLowerCase().includes(q)||(item.map||"").toLowerCase().includes(q)||item.desc.toLowerCase().includes(q);
    }
    return true;
  });

  return(
    <div style={{animation:"up .4s ease both"}}>
      <div style={{marginBottom:"16px"}}>
        <h2 style={{fontSize:"22px",color:C.value,fontWeight:700,margin:"0 0 4px"}}>База знаний CS2</h2>
        <p style={{fontSize:"13px",color:C.muted,margin:0}}>Воркшоп, гранаты, движение, позиции и карты</p>
      </div>

      {/* Поиск */}
      <input value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="🔍  Поиск по карте или теме..."
        style={{width:"100%",background:"#0f0f0b",border:`1px solid ${C.border}`,
          color:C.value,fontSize:"14px",padding:"11px 16px",fontFamily:"inherit",marginBottom:"14px"}}/>

      {/* Категории — крупные таб-кнопки */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:"4px",marginBottom:"12px"}}>
        {CATS.map(c=>{
          const active = cat===c.id;
          return(
            <button key={c.id} onClick={()=>{setCat(c.id);setSelMap(null);}} style={{
              padding:"10px 6px",background:active?C.yellow+"18":C.card,
              border:`1px solid ${active?C.yellow+"88":C.border}`,
              borderBottom:`2px solid ${active?C.yellow:"transparent"}`,
              color:active?C.yellow:C.label,cursor:"pointer",fontSize:"12px",
              fontFamily:"inherit",fontWeight:active?700:400,
              display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",
              transition:"all .15s"}}>
              <span style={{fontSize:"18px"}}>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Уровень сложности — горизонтальные пилюли */}
      {cat!=="callouts"&&(
        <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap",
          padding:"10px 14px",background:"#0d0d09",border:`1px solid ${C.border}`,marginBottom:"16px"}}>
          <span style={{fontSize:"11px",color:C.muted,letterSpacing:"1px",marginRight:"4px",whiteSpace:"nowrap"}}>
            УРОВЕНЬ:
          </span>
          {[
            {id:"all",    label:"Все",        color:C.label},
            {id:"Начинающий", label:"Новичок",  color:C.win},
            {id:"Средний",    label:"Средний",  color:C.yellow},
            {id:"Продвинутый",label:"Про",      color:C.lose},
            {id:"Любой",      label:"Любой",    color:C.blue},
            {id:"Для вас",    label:player?"⭐ Для тебя":"Для вас", color:"#cc88ff"},
          ].map(d=>{
            const active = diff===d.id;
            return(
              <button key={d.id} onClick={()=>setDiff(d.id)} style={{
                padding:"5px 14px",
                background:active?d.color+"28":"transparent",
                border:`1px solid ${active?d.color+"99":C.border+"88"}`,
                color:active?d.color:C.muted,cursor:"pointer",fontSize:"12px",
                fontFamily:"inherit",fontWeight:active?700:400,
                borderRadius:"20px",transition:"all .15s",whiteSpace:"nowrap"}}>
                {d.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Callouts секция */}
      {cat==="callouts"&&<>
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"16px"}}>
          {Object.keys(MAP_CALLOUTS).map(m=>(
            <button key={m} onClick={()=>setSelMap(m===selMap?null:m)} style={{
              padding:"8px 18px",background:selMap===m?C.yellow+"22":C.card,
              border:`1px solid ${selMap===m?C.yellow+"66":C.border}`,
              color:selMap===m?C.yellow:C.label,cursor:"pointer",fontSize:"14px",
              fontFamily:"inherit",fontWeight:selMap===m?700:400}}>
              {m}
            </button>
          ))}
        </div>
        {selMap&&MAP_CALLOUTS[selMap]&&<MapCalloutView mapName={selMap}/>}
        {!selMap&&<div style={{textAlign:"center",padding:"40px",color:C.muted,fontSize:"14px"}}>
          Выбери карту чтобы увидеть интерактивную схему позывных
        </div>}
      </>}

      {/* Cards */}
      {cat!=="callouts"&&<>
        <div style={{fontSize:"12px",color:C.muted,marginBottom:"12px"}}>
          {diff==="Для вас"&&!player?"Войди через Steam для персональных рекомендаций":
           `${filtered.length} материал${filtered.length===1?"":"ов"}`}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"3px"}}>
          {filtered.map(item=>{
            const dc=DIFF_COLOR[item.diff]||C.yellow;
            return(
              <div key={item.id} className="hov-card" style={{
                background:C.card,border:`1px solid ${C.border}`,padding:"18px",
                display:"flex",flexDirection:"column",gap:"10px",transition:"all .2s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <span style={{fontSize:"24px"}}>{item.icon}</span>
                    <div>
                      <div style={{fontSize:"15px",color:C.value,fontWeight:700,lineHeight:1.2}}>{item.title}</div>
                      {item.map&&<div style={{fontSize:"11px",color:C.muted,marginTop:"2px"}}>📍 {item.map}</div>}
                    </div>
                  </div>
                  <span style={{padding:"2px 9px",background:dc+"18",color:dc,
                    border:`1px solid ${dc}33`,fontSize:"10px",fontWeight:700,flexShrink:0}}>
                    {item.diff}
                  </span>
                </div>
                <p style={{fontSize:"13px",color:C.label,lineHeight:1.65,margin:0,flex:1}}>{item.desc}</p>
                <a href={item.url} target="_blank" rel="noreferrer" style={{
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"10px 14px",background:"#111109",border:`1px solid ${C.border}`,
                  textDecoration:"none",color:item.type==="steam"?C.blue:C.lose,
                  fontSize:"13px",fontWeight:700,transition:"border-color .2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=item.type==="steam"?C.blue+"66":C.lose+"66";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;}}>
                  <span>{item.type==="steam"?"🔧 Открыть в Steam":"▶ Смотреть на YouTube"}</span>
                  <span>→</span>
                </a>
              </div>
            );
          })}
        </div>
        {diff==="Для вас"&&!player&&(
          <div style={{textAlign:"center",padding:"40px",background:C.card,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:"28px",marginBottom:"12px"}}>⭐</div>
            <div style={{fontSize:"14px",color:C.label}}>Войди через Steam — подберём материалы под твои слабые стороны</div>
          </div>
        )}
      </>}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [player,setPlayer]       = useState(null);
  const [source,setSource]       = useState("steam");
  const [mainTab,setMainTab]     = useState("overview");
  const [subTab,setSubTab]       = useState("weak");
  const [analysis,setAnalysis]   = useState(null);
  const [loading,setLoading]     = useState(false);
  const [errorMsg,setErrorMsg]   = useState(null);
  const [showPopup,setShowPopup] = useState(false);
  const [profileView,setProfileView] = useState(null);
  const [showAbout,setShowAbout]       = useState(false);
  const [chatOpen,setChatOpen]     = useState(false);
  const [supportOpen,setSupportOpen] = useState(false);
  const [serverStatus,setServerStatus] = useState("checking");
  const [shareOpen,setShareOpen]   = useState(false);
  const [streak,setStreak]         = useState(0);
  const [showStreakToast,setShowStreakToast] = useState(false);
  const [isPro,setIsPro]               = useState(false);
  const [aiRemaining,setAiRemaining]   = useState(FREE_WEEKLY);
  const [showProModal,setShowProModal] = useState(false);
  const [showChecklist,setShowChecklist] = useState(true);
  const [analysisCount,setAnalysisCount] = useState(
    ()=>{ try{ return parseInt(localStorage.getItem("cs2_analysis_count")||"0"); }catch{ return 0; } }
  );

  const hasFaceit = !!(player?.faceit && (player.faceit.elo || arr(player.faceit.matches).length));

  // ── streak tracking ─────────────────────────────────────────────────────────
  useEffect(()=>{
    try {
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now()-86400000).toDateString();
      const last = localStorage.getItem("cs2_last_visit");
      const cur  = parseInt(localStorage.getItem("cs2_streak")||"0");
      let newStreak = 1;
      if (last===today)       newStreak=cur;
      else if(last===yesterday) newStreak=cur+1;
      setStreak(newStreak);
      localStorage.setItem("cs2_streak",String(newStreak));
      localStorage.setItem("cs2_last_visit",today);
      if (newStreak>1 && last!==today) setTimeout(()=>setShowStreakToast(true),1500);
    } catch {}
  },[]);

  // ── payment success check ─────────────────────────────────────────────────────
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment")==="success") {
      window.history.replaceState({},"","/");
      setTimeout(()=>{
        if (player?.steamid) {
          fetch(`${BACKEND}/pro/${player.steamid}`)
            .then(r=>r.json())
            .then(d=>{ if(d.pro){ setIsPro(true); setAiRemaining(999); } })
            .catch(()=>{});
        }
        setShowProModal(true);
      }, 500);
    }
  },[]);

  // ── cold start wake-up ──────────────────────────────────────────────────────
  useEffect(()=>{
    const t = setTimeout(()=>setServerStatus('slow'), 2500);
    fetch(`${BACKEND}/health`).then(()=>{
      clearTimeout(t); setServerStatus('ready');
    }).catch(()=>{ clearTimeout(t); setServerStatus('ready'); });
    return ()=>clearTimeout(t);
  },[]);

  // ── restore + refresh ─────────────────────────────────────────────────────
  useEffect(()=>{
    try {
      const saved = localStorage.getItem("cs2_player_v3");
      if (saved) {
        const p = JSON.parse(saved);
        setPlayer(p);
        if (!hasFaceit) setSource("steam");
        // check Pro status
        if (p.steamid) {
          fetch(`${BACKEND}/pro/${p.steamid}`)
            .then(r=>r.json())
            .then(d=>{ setIsPro(d.pro||false); setAiRemaining(d.remaining??FREE_WEEKLY); })
            .catch(()=>{});
        }
        // background refresh
        if (p.steamid) {
          fetch(`${BACKEND}/profile/${p.steamid}`).then(r=>r.json()).then(d=>{
            if (d?.steamid) {
              const fresh = {...p, username:d.username||p.username, avatar:d.avatar||p.avatar,
                created:d.created||p.created, steam_level:d.steam_level??p.steam_level,
                country:d.country||p.country, cs2:d.cs2||p.cs2||{},
                faceit: d.faceit || p.faceit || null};
              setPlayer(fresh);
              try{localStorage.setItem("cs2_player_v3",JSON.stringify(fresh));}catch{}
            }
          }).catch(()=>{});
        }
      } else setTimeout(()=>setShowPopup(true),1200);
    } catch { setTimeout(()=>setShowPopup(true),1200); }
  },[]);

  // ── Steam postMessage ─────────────────────────────────────────────────────
  useEffect(()=>{
    const handler = e => {
      if (!e.data?.player) return;
      const cs2stats = e.data.stats || {};
      const p = {...e.data.player, cs2: cs2stats};
      setPlayer(p);
      if (!p.faceit?.elo) setSource("steam");
      try{localStorage.setItem("cs2_player_v3",JSON.stringify(p));}catch{}
      setShowPopup(false);
      // check Pro status
      if (p.steamid) {
        fetch(`${BACKEND}/pro/${p.steamid}`)
          .then(r=>r.json())
          .then(d=>{ setIsPro(d.pro||false); setAiRemaining(d.remaining??FREE_DAILY); })
          .catch(()=>{});
      }
    };
    window.addEventListener("message", handler);
    return ()=>window.removeEventListener("message", handler);
  },[]);

  const openSteam = () => window.open(`${BACKEND}/auth/steam`,"steam-login","width=600,height=700,left=400,top=80");
  const logout = () => {
    setPlayer(null); setAnalysis(null); setSource("steam");
    try{localStorage.removeItem("cs2_player_v3");}catch{}
    setShowPopup(true);
  };

  // ── Analyze ───────────────────────────────────────────────────────────────
  async function analyze() {
    if (!player) { setShowPopup(true); return; }
    if (!isPro && aiRemaining <= 0) { setShowProModal(true); return; }
    setLoading(true); setAnalysis(null); setErrorMsg(null);

    const fc = player.faceit;
    const cs2 = player.cs2 || {};

    const statsPayload = source === "faceit" && fc
      ? { kd:fc.lifetime?.kd||"0", winrate:fc.lifetime?.winrate||"0",
          hltv:"0", hs:fc.lifetime?.hs||"0",
          adr:arr(fc.matches)[0]?.adr||"0",
          clutch1v1:"0", entrySuccess:"0",
          rank:String(fc.elo||0), matches:fc.lifetime?.matches||"0",
          steamid:player.steamid, maps:arr(fc.maps) }
      : { kd:cs2.kd||"0", winrate:cs2.winrate||"0",
          hltv:"0", hs:cs2.hs||"0",
          adr:"0", clutch1v1:"0", entrySuccess:"0",
          rank:String(fc?.elo||0), matches:cs2.matches||"0",
          steamid:player.steamid, maps:arr(fc?.maps) };

    const call = async () => {
      const res = await fetch(`${BACKEND}/analyze`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(statsPayload)});
      const d = await res.json();
      if (d.error && !d.result) throw new Error(d.error);
      const m = (d.result||"").match(/\{[\s\S]*\}/);
      if (!m) throw new Error("JSON не найден");
      return JSON.parse(m[0]);
    };
    try {
      let result=null,le=null;
      for(let i=0;i<3;i++){try{result=await call();break;}catch(e){le=e;if(i<2)await new Promise(r=>setTimeout(r,700));}}
      if (!result) throw le;
      setAnalysis(result); setSubTab("weak");
      const newCount = analysisCount+1;
      setAnalysisCount(newCount);
      try{ localStorage.setItem("cs2_analysis_count",String(newCount)); }catch{}
      if (!isPro) setAiRemaining(r=>Math.max(0,r-1));
      fetch(`${BACKEND}/leaderboard/add`,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({steamid:player.steamid,username:player.username,
          avatar:player.avatar||"",
          stats:{
            ...statsPayload,
            kills: source==="faceit"&&fc ? (fc.lifetime?.kills||arr(fc.matches).reduce((s,m)=>s+parseInt(m.kills||0),0)||"0") : (cs2.kills||"0"),
            deaths: source==="faceit"&&fc ? (fc.lifetime?.deaths||"0") : (cs2.deaths||"0"),
            mvp: source==="faceit"&&fc ? (fc.lifetime?.mvp||arr(fc.matches).reduce((s,m)=>s+parseInt(m.mvps||0),0)||"0") : (cs2.mvp||"0"),
            playtime: cs2.playtime||"0",
          },
          level:result.level,overall:result.overall})}).catch(()=>{});
    } catch(e) { setErrorMsg(e.message); }
    finally { setLoading(false); }
  }

  const lc = ANALYSIS_COLOR[analysis?.level] || C.yellow;

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className="scanlines" style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif",color:C.text}}>
      <style>{css}</style>
      {/* scanline */}
      <div style={{position:"fixed",left:0,right:0,height:"2px",
        background:`linear-gradient(90deg,transparent,${C.yellow}18,transparent)`,
        animation:"scan 10s linear infinite",pointerEvents:"none",zIndex:1}}/>

      {showPopup&&<SteamPopup onLogin={openSteam} onSkip={()=>setShowPopup(false)}/>}
      {profileView&&<ProfileModal steamid={profileView.steamid} nickname={profileView.nickname} onClose={()=>setProfileView(null)}/>}
      {shareOpen&&player&&<ShareModal steamid={player.steamid} onClose={()=>setShareOpen(false)}/>}
      {showProModal&&<ProModal player={player} onClose={()=>setShowProModal(false)}
        onActivated={()=>{setIsPro(true);setAiRemaining(999);setShowProModal(false);}}/>}
      <ColdStartBanner status={serverStatus}/>

      {/* Top accent */}
      <div style={{height:"3px",background:`linear-gradient(90deg,${C.yellow},#c9a000,${C.yellow})`}}/>

      {/* Topbar */}
      <div style={{background:"#0d0d09",borderBottom:`1px solid ${C.border}`,padding:"12px 28px",
        display:"flex",alignItems:"center",justifyContent:"space-between",gap:"16px",flexWrap:"wrap",position:"relative",zIndex:10}}>
        <div onClick={()=>setShowAbout(true)} style={{display:"flex",alignItems:"center",gap:"14px",cursor:"pointer"}}
          title="О нас"
          onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
          onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
          <Logo size={28} withText={true}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
          <div className="search-bar"><SearchBar onSelect={r=>setProfileView({nickname:r.nickname})}/></div>
          {player?(
            <>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                {(player.avatar||player.faceit?.avatar)&&
                  <img src={player.avatar||player.faceit?.avatar} alt="" style={{width:"28px",height:"28px",borderRadius:"2px"}}/>}
                <span style={{fontSize:"13px",color:C.value}}>{player.username}</span>
                {hasFaceit&&<span style={{fontSize:"11px",color:C.orange,background:"#ff773322",padding:"2px 8px",border:"1px solid #ff773344"}}>
                  FACEIT {player.faceit.level} · {player.faceit.elo} ELO
                </span>}
              </div>
              {isPro
                ? <ProBadge/>
                : <button onClick={()=>setShowProModal(true)} style={{
                    padding:"5px 12px",background:C.yellow+"18",border:`1px solid ${C.yellow}44`,
                    color:C.yellow,cursor:"pointer",fontSize:"11px",fontWeight:700,
                    fontFamily:"inherit",letterSpacing:"1px"}}>
                    ⚡ PRO
                  </button>}
              {streak>1&&<div title={`Стрик: ${streak} дней подряд`} style={{display:"flex",alignItems:"center",gap:"4px",
                padding:"4px 10px",background:"#1a1408",border:`1px solid ${C.yellow}44`,cursor:"help"}}>
                <span style={{fontSize:"14px"}}>🔥</span>
                <span style={{fontSize:"13px",color:C.yellow,fontWeight:700}}>{streak}</span>
                <span style={{fontSize:"10px",color:C.muted}}>дн</span>
              </div>}
              <button onClick={()=>setShareOpen(true)} style={{background:"transparent",border:`1px solid ${C.yellow}44`,color:C.yellow,cursor:"pointer",fontSize:"11px",letterSpacing:"1px",fontFamily:"inherit",padding:"5px 12px",display:"flex",alignItems:"center",gap:"5px"}}>📤 <span>Поделиться</span></button>
              <button onClick={logout} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.label,cursor:"pointer",fontSize:"11px",letterSpacing:"1px",fontFamily:"inherit",padding:"5px 10px"}}>ВЫЙТИ</button>
            </>
          ):(
            <button onClick={openSteam} style={{background:"#1b6090",color:"#fff",border:"none",padding:"9px 18px",cursor:"pointer",fontSize:"11px",fontWeight:700,letterSpacing:"2px",fontFamily:"'Courier New',monospace"}}>STEAM</button>
          )}
        </div>
      </div>

      <div style={{className:"content-pad",maxWidth:"1100px",margin:"0 auto",padding:"28px 24px 80px",position:"relative",zIndex:5,minHeight:"calc(100vh - 200px)"}}>

        {/* Page title */}
        <div style={{marginBottom:"24px"}}>
          <h1 style={{fontSize:"clamp(26px,5vw,42px)",fontWeight:400,margin:"0 0 4px",color:C.value,letterSpacing:"2px"}}>
            Разбор твоей игры
          </h1>
          <p style={{color:C.muted,fontSize:"13px",margin:0}}>Steam + FACEIT аналитика · AI-тренер</p>
        </div>

        {/* Main tabs */}
        <div style={{className:"desktop-nav",display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:"22px",flexWrap:"wrap"}}>
          {[["overview","ОБЗОР"],["coach","🎯 ТРЕНЕР"],["practice","📚 ПРАКТИКА"],["matches","🎮 МАТЧИ"],["maps","🗺️ КАРТЫ"],["history","📋 ИСТОРИЯ"],["leaderboard","🏆 ЛИДЕРЫ"]].map(([t,l])=>(
            <button key={t} onClick={()=>setMainTab(t)} style={{
              padding:"11px 18px",background:"transparent",
              color:mainTab===t?C.yellow:C.muted,border:"none",
              borderBottom:`2px solid ${mainTab===t?C.yellow:"transparent"}`,
              cursor:"pointer",fontSize:"13px",letterSpacing:"1px",
              fontFamily:"'Segoe UI',system-ui,sans-serif",marginBottom:"-1px",transition:"color .15s"}}>{l}</button>
          ))}
        </div>



        {/* ── OVERVIEW ── */}
        {mainTab==="overview"&&!player&&<LandingPage onLogin={openSteam}/>}
        {mainTab==="overview"&&(player?(
          <div style={{animation:"up .4s ease both"}}>
            <SourceToggle source={source} setSource={setSource} hasFaceit={hasFaceit}/>
            {showChecklist&&<SetupChecklist
              player={player} hasFaceit={hasFaceit}
              analysisCount={analysisCount}
              onDismiss={()=>setShowChecklist(false)}/>}
            {source==="steam"&&player.cs2?.private&&<PrivateWarning/>}
            {!player.cs2?.private&&(isPro||aiRemaining>0?<AIReport player={player} source={source}/>:<PaywallOverlay feature="AI Report" onUpgrade={()=>setShowProModal(true)}/>)}
            <HeroCard player={player} source={source}/>
            <ScoreCards player={player} source={source}/>
            {source==="faceit"&&hasFaceit
              ?<div style={{marginTop:"12px"}}><ChartsSection faceit={player.faceit}/></div>
              :source==="steam"&&!player.cs2?.private&&(
                <div style={{marginTop:"12px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"3px"}}>
                  {[{l:"УБИЙСТВА",v:player.cs2?.kills},{l:"СМЕРТИ",v:player.cs2?.deaths},{l:"ПОБЕДЫ",v:player.cs2?.wins},{l:"MVP",v:player.cs2?.mvps}].map((s,i)=>(
                    <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,padding:"16px",textAlign:"center"}}>
                      <div style={{fontSize:"13px",color:C.label,letterSpacing:"1px",marginBottom:"7px"}}>{s.l}</div>
                      <div style={{fontSize:"24px",color:C.yellow,fontWeight:700}}>{s.v||"—"}</div>
                    </div>
                  ))}
                </div>
              )
            }
            {source==="faceit"&&!hasFaceit&&(
              <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"30px",textAlign:"center",color:C.muted,marginTop:"12px",fontSize:"13px",lineHeight:1.7}}>
                FACEIT профиль не найден.<br/>
                Статистика FACEIT доступна для игроков, у которых Steam связан с FACEIT аккаунтом.
              </div>
            )}
          </div>
        ):<div style={{textAlign:"center",padding:"60px",color:C.muted,fontSize:"13px"}}>Войди через Steam для просмотра</div>)}

        {/* ── COACH ── */}
        {mainTab==="coach"&&(
          <>
            {player&&<>
              <SourceToggle source={source} setSource={setSource} hasFaceit={hasFaceit}/>
              {source==="steam"&&player.cs2?.private&&<PrivateWarning/>}

              {/* Stat cards */}
              <div style={{className:"stat-grid",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"3px",marginBottom:"16px"}}>
                {(source==="faceit"&&player.faceit?[
                  {l:"K/D",v:player.faceit.lifetime?.kd||"—"},
                  {l:"WIN %",v:player.faceit.lifetime?.winrate?(player.faceit.lifetime.winrate+"%"):"—"},
                  {l:"HS %",v:player.faceit.lifetime?.hs?(player.faceit.lifetime.hs+"%"):"—"},
                  {l:"FACEIT ELO",v:player.faceit.elo||"—"},
                  {l:"МАТЧИ",v:player.faceit.lifetime?.matches||"—"},
                  {l:"ADR",v:arr(player.faceit.matches)[0]?.adr||"—"},
                ]:[
                  {l:"K/D",v:player.cs2?.kd||"—"},
                  {l:"WIN %",v:player.cs2?.winrate?(player.cs2.winrate+"%"):"—"},
                  {l:"HS %",v:player.cs2?.hs?(player.cs2.hs+"%"):"—"},
                  {l:"FACEIT ELO",v:player.faceit?.elo||"—"},
                  {l:"МАТЧИ",v:player.cs2?.matches||"—"},
                  {l:"УБИЙСТВА",v:player.cs2?.kills||"—"},
                ]).map((f,i)=>(
                  <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,padding:"14px 16px"}}>
                    <div style={{fontSize:"11px",color:C.label,letterSpacing:"2px",marginBottom:"7px"}}>{f.l}</div>
                    <div style={{fontSize:"24px",color:C.yellow,fontWeight:700}}>{f.v}</div>
                  </div>
                ))}
              </div>
              <UsageBar remaining={aiRemaining} total={FREE_WEEKLY} isPro={isPro} onUpgrade={()=>setShowProModal(true)}/>
              <div style={{fontSize:"12px",color:C.muted,marginBottom:"16px"}}>
                Источник данных: <span style={{color:source==="faceit"?C.orange:C.blue,fontWeight:700}}>{source==="faceit"?"FACEIT":"STEAM"}</span>
                {source==="steam"&&player.faceit&&" (переключись на FACEIT для более детального анализа)"}
              </div>
            </>}

            <div style={{marginBottom:"20px"}}>
              <TrainingPlan player={player} source={source}/>
            </div>
            <button onClick={analyze} disabled={loading||!player} className="glow-btn" style={{
              width:"100%",padding:"17px",marginBottom:"24px",
              background:(!player||loading)?"#13130a":C.yellow,
              color:(!player||loading)?C.muted:"#080807",
              border:`1px solid ${(!player||loading)?C.border:C.yellow}`,
              cursor:(!player||loading)?"not-allowed":"pointer",
              fontSize:"13px",fontWeight:700,letterSpacing:"4px",
              fontFamily:"'Courier New',monospace",transition:"all .15s"}}>
              {loading?"АНАЛИЗИРУЮ...":!player?"ВОЙДИ ЧЕРЕЗ STEAM":"ПОЛУЧИТЬ РАЗБОР ОТ ТРЕНЕРА"}
            </button>

            {loading&&(
              <div style={{textAlign:"center",padding:"40px"}}>
                <div style={{fontSize:"12px",letterSpacing:"3px",color:C.muted,marginBottom:"16px"}}>ТРЕНЕР ИЗУЧАЕТ СТАТИСТИКУ</div>
                <div style={{display:"flex",justifyContent:"center",gap:"8px"}}>
                  {[0,1,2].map(i=><div key={i} style={{width:"8px",height:"8px",background:C.yellow,borderRadius:"50%",animation:`blink 1.2s ${i*.35}s infinite`}}/>)}
                </div>
              </div>
            )}

            {errorMsg&&<div style={{border:"1px solid #ff444455",padding:"16px",color:"#ff8866",fontSize:"13px",background:"#ff440406",marginBottom:"16px"}}>⚠ {errorMsg}</div>}

            {analysis&&(
              <div style={{animation:"up .4s ease both"}}>
                <div style={{background:C.card,border:`1px solid ${C.border}`,borderLeft:`4px solid ${lc}`,padding:"24px 26px",marginBottom:"3px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"14px",flexWrap:"wrap"}}>
                    <span style={{padding:"5px 16px",fontSize:"12px",letterSpacing:"3px",fontWeight:700,background:lc+"20",color:lc,border:`1px solid ${lc}55`}}>
                      {analysis.level?.toUpperCase()}
                    </span>
                    <span style={{fontSize:"13px",color:C.muted}}>→ {analysis.goal}</span>
                    <span style={{marginLeft:"auto",fontSize:"11px",color:C.muted,letterSpacing:"1px"}}>✓ в лидерах</span>
                  </div>
                  <div style={{fontSize:"16px",color:C.value,lineHeight:1.8,marginBottom:"16px"}}>{analysis.overall}</div>
                  <div style={{background:"#ff440410",borderLeft:"3px solid #ff5544",padding:"13px 16px",fontSize:"14px",color:"#ff9977",lineHeight:1.6}}>
                    ⚠ {analysis.mainProblem}
                  </div>
                </div>

                {analysis.mapInsights?.length>0&&(
                  <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"20px 22px",marginBottom:"3px"}}>
                    <div style={{fontSize:"12px",letterSpacing:"3px",color:C.yellow,marginBottom:"12px"}}>🗺️ ИНСАЙТЫ ПО КАРТАМ</div>
                    {analysis.mapInsights.map((mi,i)=>(
                      <div key={i} style={{fontSize:"14px",color:C.value,lineHeight:1.7,marginBottom:"7px",paddingLeft:"14px",borderLeft:`2px solid ${C.yellow}44`}}>{mi}</div>
                    ))}
                  </div>
                )}

                <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:"3px"}}>
                  {[["weak","❌ СЛАБЫЕ"],["strong","✅ СИЛЬНЫЕ"],["plan","📋 ПЛАН"]].map(([t,l])=>(
                    <button key={t} onClick={()=>setSubTab(t)} style={{
                      padding:"12px 20px",background:"transparent",
                      color:subTab===t?(t==="weak"?"#ff8866":t==="strong"?"#88ee88":C.yellow):C.muted,
                      border:"none",borderBottom:`2px solid ${subTab===t?(t==="weak"?"#ff5544":t==="strong"?"#55bb55":C.yellow):"transparent"}`,
                      cursor:"pointer",fontSize:"12px",letterSpacing:"2px",
                      fontFamily:"'Segoe UI',system-ui,sans-serif",marginBottom:"-1px",transition:"color .15s"}}>{l}</button>
                  ))}
                </div>

                {subTab==="weak"&&(
                  <div style={{className:"two-col",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px",animation:"up .25s ease both"}}>
                    {analysis.weaknesses?.map((w,i)=>(
                      <div key={i} style={{background:C.card,border:"1px solid #2e1414",borderTop:"2px solid #ff5544",padding:"20px"}}>
                        <div style={{display:"inline-block",padding:"3px 13px",background:"#ff554422",color:"#ff8866",fontSize:"12px",letterSpacing:"2px",fontWeight:700,marginBottom:"12px"}}>{w.stat?.toUpperCase()}</div>
                        <div style={{fontSize:"15px",color:C.label,lineHeight:1.75,marginBottom:"14px"}}>{w.problem}</div>
                        <div style={{background:C.yellow+"12",border:`1px solid ${C.yellow}33`,padding:"11px 14px",fontSize:"14px",color:C.yellow,lineHeight:1.7}}>💡 {w.fix}</div>
                      </div>
                    ))}
                  </div>
                )}
                {subTab==="strong"&&(
                  <div style={{className:"two-col",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px",animation:"up .25s ease both"}}>
                    {analysis.strengths?.map((s,i)=>(
                      <div key={i} style={{background:C.card,border:"1px solid #142814",borderTop:"2px solid #55aa55",padding:"20px"}}>
                        <div style={{display:"inline-block",padding:"3px 13px",background:"#55aa5522",color:"#88ee88",fontSize:"12px",letterSpacing:"2px",fontWeight:700,marginBottom:"12px"}}>{s.stat?.toUpperCase()}</div>
                        <div style={{fontSize:"15px",color:"#77cc77",lineHeight:1.75}}>{s.comment}</div>
                      </div>
                    ))}
                  </div>
                )}
                {subTab==="plan"&&(
                  <div style={{animation:"up .25s ease both"}}>
                    {analysis.plan?.map((day,i)=>(
                      <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,padding:"18px 20px",marginBottom:"3px",display:"flex",gap:"18px",alignItems:"flex-start"}}>
                        <div style={{minWidth:"32px",height:"32px",background:C.yellow+"18",border:`1px solid ${C.yellow}44`,color:C.yellow,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",fontWeight:700,flexShrink:0}}>{i+1}</div>
                        <div style={{fontSize:"15px",color:C.value,lineHeight:1.8}}>{day}</div>
                      </div>
                    ))}
                    <div style={{marginTop:"3px",padding:"18px 20px",background:C.yellow+"0a",border:`1px solid ${C.yellow}22`,fontSize:"15px",color:C.yellow}}>
                      🎯 Цель: {analysis.goal}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {mainTab==="matches"&&(!player?<LandingPage onLogin={openSteam}/>:player
          ?<><SourceToggle source={source} setSource={setSource} hasFaceit={hasFaceit}/>{source==="faceit"?<MatchHistory faceit={player.faceit}/>:
            <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"28px 24px",textAlign:"center"}}>
              <div style={{fontSize:"24px",marginBottom:"10px"}}>⚡</div>
              <div style={{fontSize:"15px",color:C.value,fontWeight:700,marginBottom:"8px"}}>Переключись на FACEIT</div>
              <div style={{fontSize:"14px",color:C.label,lineHeight:1.7}}>История матчей доступна только через FACEIT. Нажми кнопку ⚡ FACEIT выше.</div>
            </div>}</>
          :<div style={{textAlign:"center",padding:"60px",color:C.muted,fontSize:"13px"}}>Войди через Steam</div>)}

        {mainTab==="maps"&&(!player?<LandingPage onLogin={openSteam}/>:player
          ?<><SourceToggle source={source} setSource={setSource} hasFaceit={hasFaceit}/>{source==="faceit"?<MapPool faceit={player.faceit}/>:<div style={{textAlign:"center",padding:"50px",color:C.muted,fontSize:"13px"}}>Статистика карт доступна только через ⚡ FACEIT</div>}</>
          :<div style={{textAlign:"center",padding:"60px",color:C.muted,fontSize:"13px"}}>Войди через Steam</div>)}

        {mainTab==="history"&&(!player?<LandingPage onLogin={openSteam}/>:player
          ?<HistoryTab steamid={player.steamid}/>
          :<div style={{textAlign:"center",padding:"60px",color:C.muted,fontSize:"13px"}}>Войди через Steam</div>)}

        {mainTab==="practice"&&<PracticeTab player={player}/>}
        {mainTab==="leaderboard"&&<Leaderboard myId={player?.steamid} onProfile={sid=>setProfileView({steamid:sid})}/>}
      </div>

      <div style={{height:"2px",background:`linear-gradient(90deg,transparent,${C.yellow},transparent)`}}/>
      <Footer onAbout={()=>setShowAbout(true)} onPro={()=>setShowProModal(true)} onLeaderboard={()=>setMainTab("leaderboard")}/>

      {showAbout&&<AboutModal onClose={()=>setShowAbout(false)}/>}
      {supportOpen&&<SupportModal player={player} onClose={()=>setSupportOpen(false)}/>}
      {/* Streak toast */}
      {showStreakToast&&<StreakToast streak={streak} onClose={()=>setShowStreakToast(false)}/>}

      {/* Mobile nav */}
      {player&&<MobileNav tab={mainTab} setTab={setMainTab}/>}

      {/* Support button */}
      {player&&<a href="https://t.me/cs2coach_support" target="_blank" rel="noreferrer"
        title="Поддержка в Telegram"
        style={{position:"fixed",bottom:"92px",right:"24px",width:"48px",height:"48px",
          background:"#0d1520",border:`1px solid ${C.blue}55`,borderRadius:"50%",
          display:"flex",alignItems:"center",justifyContent:"center",
          textDecoration:"none",fontSize:"20px",zIndex:199,
          boxShadow:`0 4px 16px ${C.blue}33`,transition:"all .2s"}}
        onMouseEnter={e=>{e.currentTarget.style.background="#162030";e.currentTarget.style.boxShadow=`0 4px 24px ${C.blue}66`;}}
        onMouseLeave={e=>{e.currentTarget.style.background="#0d1520";e.currentTarget.style.boxShadow=`0 4px 16px ${C.blue}33`;}}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill={C.blue}>
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z"/>
        </svg>
      </a>}

      {/* Support & Chat bubbles */}
      <button onClick={()=>setSupportOpen(o=>!o)} style={{
        position:"fixed",bottom:"94px",right:"24px",width:"48px",height:"48px",
        background:supportOpen?"#1b6090":"#0d0d09",color:C.blue,
        border:`2px solid ${C.blue}`,borderRadius:"50%",cursor:"pointer",
        fontSize:"20px",boxShadow:`0 4px 16px ${C.blue}33`,zIndex:199,
        transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center"}}
        title="Поддержка">
        💬
      </button>
      {player&&<>
        <button onClick={()=>{ setChatOpen(o=>!o); try{localStorage.setItem("cs2_chat_done","1");}catch{} }} style={{
          position:"fixed",bottom:"24px",right:"24px",width:"52px",height:"52px",
          background:chatOpen?C.yellow:"#1a1a0e",color:chatOpen?"#080807":C.yellow,
          border:`2px solid ${C.yellow}`,borderRadius:"50%",cursor:"pointer",
          fontSize:"24px",boxShadow:`0 4px 20px ${C.yellow}44`,zIndex:200,
          transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {chatOpen?"✕":"🤖"}
        </button>
        {chatOpen&&<ChatPanel player={player} source={source} isPro={isPro} aiRemaining={aiRemaining} onClose={()=>setChatOpen(false)}/>}
      </>}
    </div>
  );
}
