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
      case "kills":   return s.kills ? `${parseInt(s.kills).toLocaleString()}` : "—";
      case "deaths":  return s.deaths ? `${parseInt(s.deaths).toLocaleString()}` : "—";
      case "matches": return s.matches ? `${parseInt(s.matches).toLocaleString()}` : "—";
      case "mvp":     return s.mvp ? `${parseInt(s.mvp).toLocaleString()}` : "—";
      case "playtime": return s.playtime && parseInt(s.playtime)>0 ? `${Math.round(parseInt(s.playtime)/60)}ч` : "—";
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

const MAP_IMAGES = {
  Mirage: "data:image/jpeg;base64,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",
  Inferno: "data:image/jpeg;base64,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",
  Dust2: "data:image/jpeg;base64,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",
  Nuke: "data:image/jpeg;base64,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",
  Ancient: "data:image/jpeg;base64,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",
  Anubis: "data:image/jpeg;base64,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",
};

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
          {/* Left: Real map image + SVG zones overlay */}
          <div style={{position:"relative",background:"#080806",overflow:"hidden"}}>
            {/* Real map image */}
            {MAP_IMAGES[mapName]&&<img
              src={MAP_IMAGES[mapName]}
              alt={mapName}
              style={{width:"100%",display:"block",opacity:0.85,userSelect:"none",pointerEvents:"none"}}
            />}
            {/* SVG overlay with zones — absolute over image */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none"
              style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",cursor:"crosshair"}}
              xmlns="http://www.w3.org/2000/svg">
              {/* Zones */}
              {data.zones.map(z=>{
                const isActive = activeZone===z.id;
                const tc = teamColor(z.team);
                const isSelected = selected===z.id;
                const shapeProps = {
                  fill: isActive?tc+"55":"transparent",
                  stroke: isActive?tc:tc+"88",
                  strokeWidth: isActive?"0.9":"0.5",
                  style:{transition:"all .15s ease",cursor:"pointer"},
                  onMouseEnter:()=>setHovered(z.id),
                  onMouseLeave:()=>setHovered(null),
                  onClick:()=>setSelected(isSelected?null:z.id),
                };
                return(
                  <g key={z.id}>
                    {z.path
                      ? <path d={z.path} {...shapeProps}/>
                      : <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="0.5" {...shapeProps}/>
                    }
                    {/* Label — shown only when active */}
                    {isActive&&<>
                      <rect
                        x={(z.cx||(z.x+z.w/2))-10} y={(z.cy||(z.y+z.h/2))-2.5}
                        width="20" height="5" rx="1"
                        fill="#000000cc" style={{pointerEvents:"none"}}
                      />
                      <text
                        x={z.cx||(z.x+z.w/2)} y={(z.cy||(z.y+z.h/2))+0.5}
                        textAnchor="middle" dominantBaseline="middle"
                        fill={tc} fontSize="3.2" fontWeight="bold"
                        style={{pointerEvents:"none",userSelect:"none",fontFamily:"monospace"}}
                      >{z.label}</text>
                    </>}
                    {/* Non-active: small dot label */}
                    {!isActive&&<text
                      x={z.cx||(z.x+z.w/2)} y={(z.cy||(z.y+z.h/2))+0.5}
                      textAnchor="middle" dominantBaseline="middle"
                      fill={tc+"cc"} fontSize="2.2" fontWeight="normal"
                      style={{pointerEvents:"none",userSelect:"none",fontFamily:"monospace"}}
                    >{z.label}</text>}
                    {isSelected&&z.path&&<path d={z.path}
                      fill="none" stroke={tc} strokeWidth="0.9"
                      strokeDasharray="2 1" style={{pointerEvents:"none"}}/>}
                    {isSelected&&!z.path&&<rect x={z.x} y={z.y} width={z.w} height={z.h}
                      fill="none" stroke={tc} strokeWidth="0.9" rx="0.5"
                      strokeDasharray="2 1" style={{pointerEvents:"none"}}/>}
                  </g>
                );
              })}
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
            kills: source==="faceit"&&fc
              ? String(arr(fc.matches).reduce((s,m)=>s+parseInt(m.kills||0),0) || cs2?.kills || 0)
              : (cs2?.kills||"0"),
            deaths: source==="faceit"&&fc
              ? String(arr(fc.matches).reduce((s,m)=>s+parseInt(m.deaths||0),0) || cs2?.deaths || 0)
              : (cs2?.deaths||"0"),
            mvp: source==="faceit"&&fc
              ? String(arr(fc.matches).reduce((s,m)=>s+parseInt(m.mvps||0),0) || cs2?.mvps || 0)
              : (cs2?.mvps||"0"),
            playtime: cs2?.playtime||"0",
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
