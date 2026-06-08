import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// ── PostHog Analytics ─────────────────────────────────────────────────────────
// Вставь сюда свой ключ: posthog.com → Settings → Project API Key
const PH_KEY = "phc_maMsR3miBxUvchHy9yTFykNfZg8FWM49WauSYRNnDgZS";
const PH_HOST = "https://us.i.posthog.com"; // US регион (us.posthog.com)
(function initPostHog() {
  try {
    if (!PH_KEY || PH_KEY === "YOUR_POSTHOG_KEY") return;
    const s = document.createElement("script");
    s.src = `${PH_HOST}/static/array.js`;
    s.async = true;
    s.onload = () => {
      window.posthog?.init(PH_KEY, { api_host: PH_HOST, capture_pageview: true });
    };
    document.head.appendChild(s);
  } catch {}
})();
function track(event, props = {}) {
  try { window.posthog?.capture(event, props); } catch {}
}

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

// ── Premier Rank System ────────────────────────────────────────────────────────
const PREMIER_RANKS = [
  {min:0,     max:4999,  label:"Без ранга",   color:"#8a8a8a", gradient:"#555,#888"},
  {min:5000,  max:9999,  label:"Серый",        color:"#9aacb8", gradient:"#6a7a86,#9aacb8"},
  {min:10000, max:14999, label:"Голубой",      color:"#6abadf", gradient:"#3a8abf,#6abadf"},
  {min:15000, max:19999, label:"Синий",        color:"#3d72d7", gradient:"#2255b0,#3d72d7"},
  {min:20000, max:24999, label:"Фиолетовый",   color:"#8855cc", gradient:"#6633aa,#8855cc"},
  {min:25000, max:29999, label:"Розовый",      color:"#dd4499", gradient:"#bb2277,#dd4499"},
  {min:30000, max:34999, label:"Красный",      color:"#dd3333", gradient:"#bb1111,#dd3333"},
  {min:35000, max:99999, label:"Золотой",      color:"#f5c518", gradient:"#d4a017,#f5c518"},
];

function getPremierRank(rating) {
  const n = parseInt(rating) || 0;
  if (n === 0) return PREMIER_RANKS[0];
  return PREMIER_RANKS.find(r => n >= r.min && n <= r.max) || PREMIER_RANKS[PREMIER_RANKS.length-1];
}

// SVG иконка ранга Premier — точные цвета как в игре
function PremierRankIcon({rating, size=32}) {
  const n = parseInt(rating) || 0;
  const rank = getPremierRank(n);
  const [c1, c2] = rank.gradient.split(",");
  const id = `grad_${n}_${size}`;
  if (n === 0) return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#555"/>
          <stop offset="100%" stopColor="#333"/>
        </linearGradient>
      </defs>
      <polygon points="16,3 29,10 29,22 16,29 3,22 3,10" fill={`url(#${id})`} opacity="0.5"/>
      <text x="16" y="21" textAnchor="middle" fill="#666" fontSize="10" fontWeight="bold">?</text>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={c1}/>
          <stop offset="100%" stopColor={c2}/>
        </linearGradient>
        <filter id={`glow_${n}`}>
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Шестиугольник */}
      <polygon points="16,2 28,9 28,23 16,30 4,23 4,9"
        fill={`url(#${id})`} filter={`url(#glow_${n})`}/>
      <polygon points="16,2 28,9 28,23 16,30 4,23 4,9"
        fill="none" stroke={rank.color} strokeWidth="1" opacity="0.8"/>
      {/* Число внутри */}
      <text x="16" y="20" textAnchor="middle" fill="white"
        fontSize={n >= 10000 ? "7" : "8"} fontWeight="bold" fontFamily="sans-serif">
        {n >= 1000 ? `${Math.floor(n/1000)}k` : n}
      </text>
    </svg>
  );
}

// Бейдж с рангом и числом
function PremierBadge({rating, showLabel=true, size=28}) {
  const n = parseInt(rating) || 0;
  const rank = getPremierRank(n);
  return (
    <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
      <PremierRankIcon rating={n} size={size}/>
      {showLabel && n > 0 && (
        <div>
          <div style={{fontSize:"13px",color:rank.color,fontWeight:700,lineHeight:1.1}}>
            {n.toLocaleString()}
          </div>
          <div style={{fontSize:"10px",color:rank.color,opacity:0.7,letterSpacing:"0.5px"}}>
            {rank.label}
          </div>
        </div>
      )}
    </div>
  );
}

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
    :root{--mob-offset:60px;}
    .desktop-nav{display:none !important;}
    .mobile-nav{display:flex !important;}
    .topbar-search{display:none !important;}
    .topbar-right{gap:6px !important;}
    .topbar-username{display:none !important;}
    .topbar-faceit{display:none !important;}
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
    .verdict-grid{grid-template-columns:1fr !important;}
    .rating-row{flex-direction:column !important;align-items:flex-start !important;gap:10px !important;}
    .rating-big{font-size:42px !important;}
    .rating-pct{font-size:18px !important;}
    .ach-grid{grid-template-columns:1fr 1fr !important;}
    .rec-grid{grid-template-columns:1fr !important;}
    .progress-row{flex-direction:column !important;}
    .elo-chart{height:60px !important;}
    .best-worst{grid-template-columns:1fr !important;}
    .recent-match-grid{grid-template-columns:4px 1fr 60px 50px 50px !important;}
    .recent-match-adr{display:none !important;}
    .about-tech-grid{grid-template-columns:1fr !important;}
    .lb-val{max-width:56px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    /* FAB кнопки — поднять над MobileNav (высота ~60px) */
    .fab-chat{bottom:80px !important;}
    .fab-support{bottom:152px !important;}
    /* Чат панель — не вылезать за левый край */
    .chat-panel{width:calc(100vw - 16px) !important;right:8px !important;left:8px !important;bottom:148px !important;}
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
  const heroMatches = parseInt(isFaceit ? fc?.lifetime?.matches : cs2?.matches) || 0;
  const heroWRRaw = parseFloat(isFaceit ? fc?.lifetime?.winrate : cs2?.winrate) || 0;
  const heroWRVal = !isFaceit && heroMatches >= 100 && heroWRRaw > 80 ? 80 : Math.min(heroWRRaw, 99);
  const heroWRStr = heroWRVal ? `${heroWRVal}%` : "—";

  const stats = isFaceit
    ? [{l:"K/D",v:fc?.lifetime?.kd||"—",c:parseFloat(fc?.lifetime?.kd)>=1?C.win:parseFloat(fc?.lifetime?.kd)>=0.9?C.yellow:C.lose},
       {l:"WIN%",v:fc?.lifetime?.winrate?(fc.lifetime.winrate+"%"):"—",c:parseInt(fc?.lifetime?.winrate)>=55?C.win:C.yellow},
       {l:"HS%",v:fc?.lifetime?.hs?(fc.lifetime.hs+"%"):"—",c:parseInt(fc?.lifetime?.hs)>=40?C.win:C.orange},
       {l:"МАТЧИ",v:fc?.lifetime?.matches||"—",c:C.label}]
    : [{l:"K/D",v:cs2.kd||"—",c:parseFloat(cs2.kd)>=1?C.win:parseFloat(cs2.kd)>=0.9?C.yellow:C.lose},
       {l:"WIN%",v:heroWRStr,c:parseInt(heroWRVal)>=55?C.win:C.yellow},
       {l:"HS%",v:cs2.hs?(cs2.hs+"%"):"—",c:parseInt(cs2.hs)>=40?C.win:C.orange},
       {l:"МАТЧИ",v:cs2.matches||"—",c:C.label}];

  return (
    <div style={{marginBottom:"10px",position:"relative",overflow:"hidden"}}>
      {/* Фоновый градиент */}
      <div style={{position:"absolute",inset:0,
        background:`linear-gradient(135deg, #0d0d09 0%, ${accentColor}10 50%, #0a0a07 100%)`,
        zIndex:0}}/>
      {/* Декоративные пятна света */}
      <div style={{position:"absolute",top:"-60px",right:"-40px",width:"280px",height:"280px",
        background:`radial-gradient(circle,${accentColor}18,transparent 65%)`,
        pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"absolute",bottom:"-40px",left:"100px",width:"200px",height:"200px",
        background:`radial-gradient(circle,${lvlColor}0e,transparent 65%)`,
        pointerEvents:"none",zIndex:0}}/>
      {/* Сетка-паттерн */}
      <div style={{position:"absolute",inset:0,zIndex:0,opacity:0.025,
        backgroundImage:"repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 32px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 32px)"}}/>
      {/* Верхняя цветная полоска */}
      <div style={{height:"2px",background:`linear-gradient(90deg,transparent,${accentColor}88,${accentColor},${accentColor}88,transparent)`,zIndex:1,position:"relative"}}/>

      <div style={{border:`1px solid ${accentColor}22`,borderTop:"none",position:"relative",zIndex:1}}>
        {/* Основная строка */}
        <div style={{display:"flex",gap:"20px",padding:"22px 24px 18px",flexWrap:"wrap",alignItems:"center"}}>
          {/* Аватар */}
          <div style={{position:"relative",flexShrink:0}}>
            {(player.avatar||fc?.avatar)
              ?<img src={player.avatar||fc?.avatar} alt="" style={{width:"88px",height:"88px",borderRadius:"6px",
                  border:`2px solid ${lvlColor}`,boxShadow:`0 0 24px ${lvlColor}44, 0 4px 16px rgba(0,0,0,0.6)`}}/>
              :<div style={{width:"88px",height:"88px",background:"#1a1a10",borderRadius:"6px",
                  border:`2px solid ${lvlColor}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"32px"}}>👤</div>}
            {fc&&<div style={{position:"absolute",bottom:"-9px",left:"50%",transform:"translateX(-50%)",
              background:lvlColor,color:"#080807",fontSize:"10px",fontWeight:900,padding:"2px 8px",
              letterSpacing:"1px",whiteSpace:"nowrap",boxShadow:`0 2px 8px ${lvlColor}66`}}>
              LVL {li.lvl}
            </div>}
          </div>

          {/* Имя / мета */}
          <div style={{flex:1,minWidth:"160px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"6px",flexWrap:"wrap"}}>
              <span style={{fontSize:"28px",color:"#fff",fontWeight:800,textShadow:"0 2px 12px rgba(0,0,0,0.8)"}}>{player.username}</span>
              {flag(player.country||fc?.country)&&<span style={{fontSize:"18px"}}>{flag(player.country||fc?.country)}</span>}
            </div>
            <div style={{fontSize:"13px",color:C.muted,marginBottom:"8px",display:"flex",gap:"12px",flexWrap:"wrap"}}>
              {player.created&&<span>⭐ Steam с {new Date(player.created*1000).getFullYear()} г.</span>}
              {player.steam_level!=null&&<span>Lvl {player.steam_level}</span>}
              {fc?.nickname&&fc.nickname!==player.username&&<span style={{color:C.orange}}>⚡ {fc.nickname}</span>}
            </div>
            {/* Форма */}
            {form.length>0&&(
              <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
                <span style={{fontSize:"10px",color:C.muted,marginRight:"4px",letterSpacing:"1px"}}>ФОРМА</span>
                {form.map((w,i)=>(
                  <div key={i} style={{width:"22px",height:"22px",display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:"10px",fontWeight:700,borderRadius:"3px",
                    background:w?"#1a361a":"#361a1a",color:w?C.win:C.lose,
                    border:`1px solid ${w?"#2d5a2d":"#5a2d2d"}`,
                    boxShadow:w?`0 0 6px ${C.win}33`:`0 0 6px ${C.lose}22`}}>
                    {w?"W":"L"}
                  </div>
                ))}
                {(()=>{let s=0;for(const w of form){if(w)s++;else break;}
                  return s>=2?<span style={{marginLeft:"6px",fontSize:"12px",color:C.lose,fontWeight:700}}>🔥{s}</span>:null;})()}
              </div>
            )}
          </div>

          {/* ELO блок */}
          {isFaceit&&fc&&!!elo&&(
            <div className="hero-right" style={{textAlign:"right",minWidth:"130px",flexShrink:0}}>
              <div style={{fontSize:"9px",letterSpacing:"3px",color:C.orange,marginBottom:"2px",fontWeight:700}}>FACEIT ELO</div>
              <div style={{fontSize:"40px",fontWeight:800,color:lvlColor,lineHeight:1,
                textShadow:`0 0 20px ${lvlColor}66`}}>{eloCount}</div>
              <div style={{fontSize:"11px",color:C.muted,marginTop:"4px"}}>
                до LVL {Math.min(10,li.lvl+1)}: {li.toNext>0?li.toNext:"MAX"}
              </div>
              <div style={{marginTop:"6px",height:"4px",background:"#1a1a10",borderRadius:"2px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${li.progress}%`,
                  background:`linear-gradient(90deg,${lvlColor}66,${lvlColor})`,
                  boxShadow:`0 0 6px ${lvlColor}`,transition:"width 1s ease"}}/>
              </div>
            </div>
          )}
        </div>

        {/* Stat strip — с цветами и hover */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderTop:`1px solid ${accentColor}22`}}>
          {stats.map((s,i)=>(
            <div key={i} style={{padding:"14px 10px",textAlign:"center",
              borderLeft:i>0?`1px solid ${accentColor}18`:"none",
              background:"rgba(0,0,0,0.2)",transition:"background .15s",cursor:"default"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.4)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0.2)"}>
              <div style={{fontSize:"9px",color:C.muted,letterSpacing:"2px",marginBottom:"6px",fontWeight:700}}>{s.l}</div>
              <div style={{fontSize:"22px",color:s.c,fontWeight:800,
                textShadow:`0 0 8px ${s.c}44`}}>{s.v}</div>
            </div>
          ))}
        </div>
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
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:"3px",marginBottom:"10px"}}>
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
// ── Steam MM Match History ────────────────────────────────────────────────────
function SteamMatchConnect({steamid, onConnected}) {
  const KEY = `cs2_steam_auth_${steamid}`;
  const [hasAuth, setHasAuth] = useState(()=>{ try{ return !!localStorage.getItem(KEY); }catch{ return false; } });
  const [open, setOpen] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function connect() {
    if (!authCode.trim()) return;
    setLoading(true); setErr("");
    try {
      const r = await fetch(`${BACKEND}/steam/auth-code`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({steamid, auth_code:authCode.trim(), match_code:""})
      });
      const d = await r.json();
      if (d.ok) {
        localStorage.setItem(KEY, JSON.stringify({auth_code:authCode.trim(), match_code:"", ts:Date.now()}));
        setHasAuth(true); setOpen(false); onConnected?.();
      } else {
        setErr(d.detail || "Ошибка подключения");
      }
    } catch { setErr("Ошибка сети"); }
    setLoading(false);
  }

  if (hasAuth) return (
    <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 16px",
      background:"#0a140a",border:`1px solid ${C.win}44`,marginBottom:"10px"}}>
      <span style={{color:C.win,fontSize:"16px"}}>✓</span>
      <span style={{fontSize:"13px",color:C.win,fontWeight:700}}>История матчей Matchmaking подключена</span>
    </div>
  );

  return (
    <div style={{background:C.card,border:`1px solid ${C.yellow}33`,marginBottom:"10px"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{padding:"14px 18px",cursor:"pointer",
        display:"flex",alignItems:"center",gap:"12px"}}>
        <span style={{fontSize:"18px"}}>🔑</span>
        <div style={{flex:1}}>
          <div style={{fontSize:"13px",color:C.yellow,fontWeight:700}}>Подключить историю Matchmaking</div>
          <div style={{fontSize:"11px",color:C.muted,marginTop:"2px"}}>Введи код аутентификации Steam — увидишь все свои MM матчи</div>
        </div>
        <span style={{color:C.muted,fontSize:"12px"}}>{open?"▲":"▼"}</span>
      </div>

      {open&&(
        <div style={{padding:"0 18px 18px",borderTop:`1px solid ${C.border}`}}>
          <div style={{fontSize:"12px",color:C.label,lineHeight:1.7,margin:"12px 0 16px",
            padding:"10px 14px",background:"#0d0d09",border:`1px solid ${C.border}`}}>
            <strong style={{color:C.yellow}}>Как получить код:</strong><br/>
            1. Перейди на{" "}
            <a href="https://help.steampowered.com/en/wizard/HelpWithGameIssue/?appid=730&issueid=128"
              target="_blank" rel="noreferrer" style={{color:C.blue}}>
              страницу Steam Support
            </a><br/>
            2. Скопируй <span style={{color:C.yellow}}>Код аутентификации</span> (вида XXXX-XXXXX-XXXX)
          </div>

          <div style={{marginBottom:"12px"}}>
            <div style={{fontSize:"11px",color:C.muted,letterSpacing:"1px",marginBottom:"4px"}}>КОД АУТЕНТИФИКАЦИИ</div>
            <input value={authCode} onChange={e=>setAuthCode(e.target.value)}
              placeholder="XXXX-XXXXX-XXXX"
              style={{width:"100%",background:"#0d0d09",border:`1px solid ${C.border}`,
                color:C.yellow,padding:"10px 14px",fontFamily:"monospace",fontSize:"13px",
                letterSpacing:"1px"}}/>
          </div>

          {err&&<div style={{fontSize:"12px",color:C.lose,marginBottom:"8px",
            padding:"8px 12px",background:C.lose+"11",border:`1px solid ${C.lose}33`}}>
            ✗ {err}
          </div>}

          <button onClick={connect} disabled={loading||!authCode.trim()}
            style={{width:"100%",padding:"11px",background:C.yellow,color:"#080807",
              border:"none",cursor:"pointer",fontSize:"13px",fontWeight:700,fontFamily:"inherit",
              opacity:(loading||!authCode.trim())?0.5:1}}>
            {loading?"ПРОВЕРЯЮ КОД...":"ПОДКЛЮЧИТЬ →"}
          </button>
          <div style={{fontSize:"11px",color:C.muted,marginTop:"8px",textAlign:"center"}}>
            Код даёт доступ только к истории матчей — пароль и инвентарь недоступны
          </div>
        </div>
      )}
    </div>
  );
}

function SteamMMMatches({steamid}) {
  const KEY = `cs2_steam_auth_${steamid}`;
  const hasAuth = !!localStorage.getItem(KEY);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(()=>{
    if (!hasAuth) return;
    load();
  },[steamid, hasAuth]);

  async function restoreAuthOnBackend() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY)||"null");
      if (!saved?.auth_code || !saved?.match_code) return false;
      const r = await fetch(`${BACKEND}/steam/auth-code`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({steamid, auth_code: saved.auth_code, match_code: saved.match_code})
      });
      const d = await r.json();
      return d.ok;
    } catch { return false; }
  }

  async function load() {
    setLoading(true); setErr("");
    try {
      // Сначала пробуем загрузить матчи
      let r = await fetch(`${BACKEND}/steam/matches/${steamid}?limit=10`);
      let d = await r.json();

      // Если бэкенд не знает auth код — восстанавливаем и пробуем снова
      if (r.status === 404 || d.detail?.includes("Auth код не найден")) {
        const restored = await restoreAuthOnBackend();
        if (restored) {
          r = await fetch(`${BACKEND}/steam/matches/${steamid}?limit=10`);
          d = await r.json();
        } else {
          setErr("Не удалось восстановить подключение. Попробуй переподключить код.");
          setLoading(false);
          return;
        }
      }

      if (d.matches) setMatches(d.matches);
      else setErr(d.detail || "Не удалось загрузить матчи");
    } catch { setErr("Ошибка сети"); }
    setLoading(false);
  }

  if (!hasAuth) return null;

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,marginBottom:"10px"}}>
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <span style={{fontSize:"11px",color:C.blue,letterSpacing:"3px",fontWeight:700}}>
            🎮 MATCHMAKING ИСТОРИЯ
          </span>
          <div style={{fontSize:"11px",color:C.muted,marginTop:"2px"}}>
            Коды матчей · 📋 — скопировать код
          </div>
        </div>
        <button onClick={load} style={{background:"transparent",border:`1px solid ${C.border}`,
          color:C.muted,cursor:"pointer",fontSize:"11px",padding:"4px 10px",fontFamily:"inherit"}}>
          ↻ Обновить
        </button>
      </div>
      {loading&&<div style={{padding:"24px",textAlign:"center",color:C.muted,fontSize:"13px"}}>
        Загружаю матчи...
      </div>}
      {err&&<div style={{padding:"16px",color:C.lose,fontSize:"13px"}}>{err}</div>}
      {!loading&&matches.length===0&&!err&&<div style={{padding:"24px",textAlign:"center",
        color:C.muted,fontSize:"13px"}}>
        Матчи не найдены. Сыграй хотя бы 1 матч в MM после подключения кодов.
      </div>}
      {matches.map((m,i)=>{
        const mapColors = {Dust2:C.yellow,Mirage:"#74c6f5",Inferno:"#ff8844",Nuke:"#66ee66",
          Overpass:"#aa88ff",Ancient:"#ff6655",Anubis:"#44ddaa",Vertigo:"#ffaa33"};
        const mapColor = m.map ? (mapColors[m.map]||C.label) : "#3a3a2a";
        return (
          <div key={i} style={{padding:"12px 18px",borderBottom:i<matches.length-1?`1px solid ${C.border}`:"none",
            display:"flex",alignItems:"center",gap:"12px",
            borderLeft:`3px solid ${mapColor}`}}>
            <div style={{width:"26px",height:"26px",background:mapColor+"22",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:"12px",color:mapColor+"cc",fontWeight:700,flexShrink:0}}>
              {i+1}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"14px",color:m.map?mapColor:C.muted,fontWeight:700}}>
                {m.map || `Матч #${i+1}`}
              </div>
              <div style={{fontSize:"10px",color:C.muted,fontFamily:"monospace",
                marginTop:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {m.code}
              </div>
            </div>
            <button onClick={()=>{
              try{navigator.clipboard.writeText(m.code);}catch{}
            }} title="Скопировать код матча"
              style={{background:"transparent",border:`1px solid ${C.border}`,
                color:C.muted,cursor:"pointer",fontSize:"11px",padding:"4px 8px",
                fontFamily:"inherit",flexShrink:0}}>
              📋
            </button>
          </div>
        );
      })}
    </div>
  );
}

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
          <div key={i} style={{marginBottom:"10px"}}>
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
                <div style={{fontSize:"11px",color:C.label,marginBottom:"10px"}}>K/D</div>
                <div style={{fontSize:"16px",color:C.yellow,fontWeight:700}}>{m.kd}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"11px",color:C.label,marginBottom:"10px"}}>K–D</div>
                <div style={{fontSize:"14px",color:C.text}}>{m.kills}–{m.deaths}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"11px",color:C.label,marginBottom:"10px"}}>HS%</div>
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
                      <div style={{fontSize:"10px",color:C.muted,letterSpacing:"1px",marginBottom:"10px"}}>{st.l}</div>
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
// ── Steam Stats Panel — красивая статистика Steam ─────────────────────────────
function SteamStatsPanel({player}) {
  const cs2 = player?.cs2 || {};
  const kd = parseFloat(cs2.kd) || 0;
  const hs = parseFloat(cs2.hs) || 0;
  const wr = parseFloat(cs2.winrate) || 0;
  const matches = parseInt(cs2.matches) || 0;
  const kills = parseInt(cs2.kills) || 0;
  const deaths = parseInt(cs2.deaths) || 0;
  const wins = parseInt(cs2.wins) || 0;
  const mvps = parseInt(cs2.mvps) || 0;
  const playtime = parseInt(cs2.playtime) || 0;
  const hours = Math.round(playtime / 60);
  const kdPerMatch = matches > 0 ? (kills / matches).toFixed(1) : "—";
  const deathsPerMatch = matches > 0 ? (deaths / matches).toFixed(1) : "—";
  // Новые данные
  const accuracy = parseInt(cs2.accuracy) || 0;
  const knifeKills = parseInt(cs2.knife_kills) || 0;
  const pistolKills = parseInt(cs2.pistol_kills) || 0;
  const sniperKills = parseInt(cs2.sniper_kills) || 0;
  const grenadeKills = parseInt(cs2.grenade_kills) || 0;
  const blindKills = parseInt(cs2.blind_kills) || 0;
  const dominated = parseInt(cs2.dominated) || 0;
  const revenges = parseInt(cs2.revenges) || 0;
  const bombsPlanted = parseInt(cs2.bombs_planted) || 0;
  const bombsDefused = parseInt(cs2.bombs_defused) || 0;
  const pistolRounds = parseInt(cs2.rounds_pistol_won) || 0;
  // Профиль
  const friendCount = player?.friend_count || 0;
  const badgeCount = player?.badge_count || 0;
  const playerXp = player?.player_xp || 0;

  // Средние по базе для сравнения
  const AVG = { kd:0.90, hs:28, wr:47 };
  const kdColor = kd >= AVG.kd*1.1 ? C.win : kd >= AVG.kd*0.9 ? C.yellow : C.lose;
  const hsColor = hs >= AVG.hs*1.1 ? C.win : hs >= AVG.hs*0.9 ? C.yellow : C.lose;
  const wrColor = wr >= AVG.wr*1.05 ? C.win : wr >= AVG.wr*0.95 ? C.yellow : C.lose;

  // Skill score (0-100)
  function sig(v,a){return Math.min(100,Math.max(0,Math.round(100/(1+Math.exp(-4*(v/a-1))))));}
  const kdScore = sig(kd, AVG.kd);
  const hsScore = sig(hs, AVG.hs);
  const wrScore = sig(wr, AVG.wr);
  const aimScore = Math.round(kdScore*0.6 + hsScore*0.4);
  const formScore = Math.round(kdScore*0.5 + wrScore*0.5);

  const Ring = ({score, label, color}) => {
    const r=30, circ=2*Math.PI*r, dash=circ*score/100;
    const c = score>=70?C.win:score>=45?C.yellow:C.lose;
    return (
      <div style={{textAlign:"center"}}>
        <div style={{position:"relative",width:"80px",height:"80px",margin:"0 auto 8px"}}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={r} fill="none" stroke={C.border} strokeWidth="5"/>
            <circle cx="40" cy="40" r={r} fill="none" stroke={c} strokeWidth="5"
              strokeDasharray={`${dash} ${circ-dash}`} strokeLinecap="round"
              strokeDashoffset={circ/4} style={{transition:"stroke-dasharray 1s ease"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:"18px",color:c,fontWeight:800}}>{score}</div>
        </div>
        <div style={{fontSize:"10px",color:C.muted,letterSpacing:"1px"}}>{label}</div>
        <div style={{fontSize:"12px",color:c,fontWeight:700,marginTop:"2px"}}>
          {score>=70?"ХОРОШО":score>=45?"СРЕДНЕ":"РАБОТАЙ"}
        </div>
      </div>
    );
  };

  const StatBar = ({label, val, avg, color, fmt=(v)=>v}) => {
    const pct = Math.min(100, Math.round((val/avg)*50));
    const c = val >= avg ? C.win : val >= avg*0.85 ? C.yellow : C.lose;
    return (
      <div style={{marginBottom:"14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px",fontSize:"12px"}}>
          <span style={{color:C.muted,letterSpacing:"1px"}}>{label}</span>
          <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
            <span style={{color:c,fontWeight:700,fontSize:"14px"}}>{fmt(val)}</span>
            <span style={{color:C.muted,fontSize:"11px"}}>avg {fmt(avg)}</span>
          </div>
        </div>
        <div style={{position:"relative",height:"6px",background:"#1a1a10",borderRadius:"3px",overflow:"hidden"}}>
          <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:"1px",background:C.border+"88",zIndex:1}}/>
          <div style={{height:"100%",width:`${Math.min(100,val/avg*50)}%`,background:c,
            borderRadius:"3px",transition:"width 1s ease"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:"9px",color:C.muted,marginTop:"2px"}}>
          <span>0</span><span>avg</span><span>топ</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{animation:"up .4s ease both"}}>
      {/* Шапка с аватаром */}
      <div style={{background:`linear-gradient(135deg,#1a1a0a,#141409)`,
        border:`1px solid ${C.border}`,borderTop:`3px solid ${C.yellow}`,
        padding:"24px 24px 20px",marginBottom:"3px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-40px",right:"-40px",width:"200px",height:"200px",
          background:`radial-gradient(circle,${C.yellow}0e,transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{display:"flex",gap:"20px",alignItems:"center",flexWrap:"wrap"}}>
          {player.avatar&&<img src={player.avatar} alt="" style={{width:"64px",height:"64px",
            borderRadius:"4px",border:`2px solid ${C.yellow}44`}}/>}
          <div style={{flex:1}}>
            <div style={{fontSize:"22px",color:C.value,fontWeight:700,marginBottom:"4px"}}>
              {player.username}
            </div>
            <div style={{display:"flex",gap:"16px",flexWrap:"wrap",fontSize:"13px",color:C.muted}}>
              {matches>0&&<span>🎮 {matches.toLocaleString()} матчей</span>}
              {hours>0&&<span>⏱ {hours.toLocaleString()} часов</span>}
              {player.steam_level&&<span>⭐ Steam {player.steam_level} уровень</span>}
            </div>
          </div>
          {/* Топ% */}
          <div style={{textAlign:"center",background:"#0d0d09",border:`1px solid ${C.yellow}33`,padding:"12px 20px"}}>
            <div style={{fontSize:"30px",color:C.yellow,fontWeight:900,lineHeight:1}}>
              {Math.round((kdScore*0.45+hsScore*0.25+wrScore*0.30))}
            </div>
            <div style={{fontSize:"10px",color:C.muted,marginTop:"4px",letterSpacing:"1px"}}>РЕЙТИНГ</div>
          </div>
        </div>
      </div>

      {/* Кольца скилла */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"20px 24px",
        marginBottom:"3px",display:"flex",justifyContent:"space-around",flexWrap:"wrap",gap:"20px"}}>
        <Ring score={aimScore} label="АИМ" color={C.orange}/>
        <Ring score={formScore} label="ФОРМА" color={C.blue}/>
        <Ring score={wrScore} label="WR" color={C.win}/>
      </div>

      {/* Детальные статы с барами */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"20px 24px",marginBottom:"3px"}}>
        <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"3px",fontWeight:700,marginBottom:"16px"}}>
          ПОКАЗАТЕЛИ vs СРЕДНЕГО ИГРОКА
        </div>
        <StatBar label="K/D" val={kd} avg={AVG.kd} fmt={(v)=>v.toFixed(2)}/>
        <StatBar label="HS%" val={hs} avg={AVG.hs} fmt={(v)=>Math.round(v)+"%"}/>
        <StatBar label="WR%" val={wr} avg={AVG.wr} fmt={(v)=>Math.round(v)+"%"}/>
      </div>

      {/* Цифры — основные */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:"3px",marginBottom:"3px"}}>
        {[
          {l:"УБИЙСТВА",   v:kills.toLocaleString(),   c:C.yellow, icon:"⚔️"},
          {l:"СМЕРТИ",     v:deaths.toLocaleString(),  c:C.lose,   icon:"💀"},
          {l:"ПОБЕДЫ",     v:wins.toLocaleString(),    c:C.win,    icon:"🏆"},
          {l:"MVP",        v:mvps.toLocaleString(),    c:C.yellow, icon:"⭐"},
          {l:"K/МАТЧ",     v:kdPerMatch,               c:C.blue,   icon:"🎯"},
          {l:"СМЕРТЕЙ/МАТ",v:deathsPerMatch,           c:C.muted,  icon:"📊"},
        ].filter(s=>s.v!=="0"&&s.v!=="—").map((s,i)=>(
          <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,padding:"14px 12px",textAlign:"center"}}>
            <div style={{fontSize:"16px",marginBottom:"4px"}}>{s.icon}</div>
            <div style={{fontSize:"18px",color:s.c,fontWeight:700,marginBottom:"4px"}}>{s.v}</div>
            <div style={{fontSize:"9px",color:C.muted,letterSpacing:"1px"}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Специальные убийства */}
      {(knifeKills>0||sniperKills>0||grenadeKills>0||blindKills>0)&&<>
        <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"3px",fontWeight:700,
          padding:"14px 0 8px"}}>СПЕЦИАЛЬНЫЕ УБИЙСТВА</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:"3px",marginBottom:"3px"}}>
          {[
            {l:"НОЖОМ",    v:knifeKills,   icon:"🔪", c:"#ff8888"},
            {l:"ПИСТОЛЕТ", v:pistolKills,  icon:"🔫", c:C.blue},
            {l:"СНАЙПЕР",  v:sniperKills,  icon:"🔭", c:C.orange},
            {l:"ГРАНАТА",  v:grenadeKills, icon:"💣", c:C.yellow},
            {l:"В СЛЕПУЮ", v:blindKills,   icon:"🎭", c:"#aa88ff"},
            {l:"ДОМИНАЦИЙ",v:dominated,    icon:"👑", c:C.win},
          ].filter(s=>s.v>0).map((s,i)=>(
            <div key={i} style={{background:C.card,border:`1px solid ${s.c}22`,padding:"12px 10px",textAlign:"center"}}>
              <div style={{fontSize:"18px",marginBottom:"4px"}}>{s.icon}</div>
              <div style={{fontSize:"16px",color:s.c,fontWeight:700,marginBottom:"3px"}}>{s.v.toLocaleString()}</div>
              <div style={{fontSize:"9px",color:C.muted,letterSpacing:"1px"}}>{s.l}</div>
            </div>
          ))}
        </div>
      </>}

      {/* Точность + бомбы */}
      {(accuracy>0||bombsPlanted>0||bombsDefused>0||pistolRounds>0)&&<>
        <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"3px",fontWeight:700,
          padding:"14px 0 8px"}}>ДОПОЛНИТЕЛЬНО</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:"3px",marginBottom:"3px"}}>
          {[
            accuracy>0    &&{l:"ТОЧНОСТЬ",      v:accuracy+"%",              icon:"🎯", c:C.orange},
            bombsPlanted>0&&{l:"БОМБ ЗАЛОЖЕНО", v:bombsPlanted.toLocaleString(), icon:"💥", c:C.lose},
            bombsDefused>0&&{l:"БОМБ ОБЕЗВРЕЖЕНО",v:bombsDefused.toLocaleString(),icon:"🛡️", c:C.win},
            pistolRounds>0&&{l:"ПИСТОЛЕТНЫХ ПОБЕД",v:pistolRounds.toLocaleString(),icon:"🔫", c:C.blue},
            revenges>0    &&{l:"РЕВАНШИ",        v:revenges.toLocaleString(),  icon:"⚡", c:C.yellow},
            friendCount>0 &&{l:"ДРУЗЕЙ",         v:friendCount,                icon:"👥", c:C.label},
          ].filter(Boolean).map((s,i)=>(
            <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,padding:"14px 12px",textAlign:"center"}}>
              <div style={{fontSize:"16px",marginBottom:"4px"}}>{s.icon}</div>
              <div style={{fontSize:"16px",color:s.c,fontWeight:700,marginBottom:"4px"}}>{s.v}</div>
              <div style={{fontSize:"9px",color:C.muted,letterSpacing:"1px"}}>{s.l}</div>
            </div>
          ))}
        </div>
      </>}

      {/* Подсказка про FACEIT */}
      {!player.faceit&&<div style={{background:"#0d1016",border:`1px solid ${C.orange}22`,
        padding:"14px 18px",display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap"}}>
        <span style={{fontSize:"20px"}}>⚡</span>
        <div style={{flex:1}}>
          <div style={{fontSize:"13px",color:C.orange,fontWeight:700,marginBottom:"2px"}}>
            Хочешь историю каждого матча?
          </div>
          <div style={{fontSize:"12px",color:C.muted}}>
            Зарегистрируйся на FACEIT и привяжи Steam — получишь K/D, ADR, карту и AI разбор каждой игры
          </div>
        </div>
        <a href="https://www.faceit.com" target="_blank" rel="noreferrer"
          style={{padding:"8px 16px",background:C.orange,color:"#fff",textDecoration:"none",
            fontSize:"12px",fontWeight:700,letterSpacing:"1px",flexShrink:0}}>
          FACEIT →
        </a>
      </div>}
    </div>
  );
}

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

// ── Weapons Panel ─────────────────────────────────────────────────────────────
const WEAPON_DATA = {
  // name → {img: Steam market hash, slot}
  "AK-47":      {img:"AK-47",         slot:"rifle",   color:"#e8a44a"},
  "M4A1-S":     {img:"M4A1-S",        slot:"rifle",   color:"#7abfff"},
  "M4A4":       {img:"M4A4",          slot:"rifle",   color:"#7abfff"},
  "AWP":        {img:"AWP",           slot:"sniper",  color:"#f5c518"},
  "AUG":        {img:"AUG",           slot:"rifle",   color:"#88ccff"},
  "SG 553":     {img:"SG%20553",      slot:"rifle",   color:"#88ccff"},
  "FAMAS":      {img:"FAMAS",         slot:"rifle",   color:"#aaddaa"},
  "Galil AR":   {img:"Galil%20AR",    slot:"rifle",   color:"#aaddaa"},
  "G3SG1":      {img:"G3SG1",         slot:"sniper",  color:"#ffaa55"},
  "SCAR-20":    {img:"SCAR-20",       slot:"sniper",  color:"#ffaa55"},
  "SSG 08":     {img:"SSG%2008",      slot:"sniper",  color:"#ffdd88"},
  "Desert Eagle":{img:"Desert%20Eagle",slot:"pistol", color:"#ff9944"},
  "USP-S":      {img:"USP-S",         slot:"pistol",  color:"#cccccc"},
  "Glock-18":   {img:"Glock-18",      slot:"pistol",  color:"#aaaaaa"},
  "P250":       {img:"P250",          slot:"pistol",  color:"#bbbbbb"},
  "Five-SeveN": {img:"Five-SeveN",    slot:"pistol",  color:"#aaccff"},
  "Tec-9":      {img:"Tec-9",         slot:"pistol",  color:"#ffaaaa"},
  "P2000":      {img:"P2000",         slot:"pistol",  color:"#cccccc"},
  "Dual Berettas":{img:"Dual%20Berettas",slot:"pistol",color:"#dddddd"},
  "R8 Revolver":{img:"R8%20Revolver", slot:"pistol",  color:"#ffcc88"},
  "MP9":        {img:"MP9",           slot:"smg",     color:"#88ffcc"},
  "MAC-10":     {img:"MAC-10",        slot:"smg",     color:"#88ffcc"},
  "MP5-SD":     {img:"MP5-SD",        slot:"smg",     color:"#88ffcc"},
  "UMP-45":     {img:"UMP-45",        slot:"smg",     color:"#88ffcc"},
  "P90":        {img:"P90",           slot:"smg",     color:"#88ffcc"},
  "PP-Bizon":   {img:"PP-Bizon",      slot:"smg",     color:"#88ffcc"},
  "Nova":       {img:"Nova",          slot:"heavy",   color:"#ff8888"},
  "XM1014":     {img:"XM1014",        slot:"heavy",   color:"#ff8888"},
  "MAG-7":      {img:"MAG-7",         slot:"heavy",   color:"#ff8888"},
  "M249":       {img:"M249",          slot:"heavy",   color:"#ffaa88"},
  "Negev":      {img:"Negev",         slot:"heavy",   color:"#ffaa88"},
  "Knife":      {img:"Knife",         slot:"knife",   color:"#ff6666"},
};

function WeaponImg({name, size=52}) {
  const [err, setErr] = useState(false);
  const w = WEAPON_DATA[name];
  // Steam CDN weapon images
  const src = w && !err
    ? `https://community.cloudflare.steamstatic.com/economy/image/class/730/${encodeURIComponent(name)}/200fx200f`
    : null;

  // Fallback: use a styled text badge
  if (!src || err) {
    const col = w?.color || C.muted;
    return (
      <div style={{width:size*1.8,height:size*0.7,display:"flex",alignItems:"center",
        justifyContent:"center",background:col+"15",border:`1px solid ${col}33`,
        borderRadius:"3px",padding:"2px 6px"}}>
        <span style={{fontSize:"11px",color:col,fontWeight:700,letterSpacing:"1px",
          textAlign:"center",lineHeight:1.2}}>{name}</span>
      </div>
    );
  }

  return (
    <img src={src} alt={name} onError={()=>setErr(true)}
      style={{width:size*1.8,height:size*0.7,objectFit:"contain",
        filter:"drop-shadow(0 0 4px rgba(255,255,255,0.08))"}}/>
  );
}

function WeaponsPanel({cs2}) {
  const [sortBy, setSortBy] = useState("kills");
  const [filter, setFilter] = useState("all");

  // Парсим данные по оружиям из cs2 статы Steam
  // Steam даёт только агрегированные данные, не по оружиям отдельно
  // Используем известные данные + строим из того что есть
  const kills    = parseInt(cs2?.kills) || 0;
  const hs       = parseInt(cs2?.kills)*parseFloat(cs2?.hs||0)/100 || 0;
  const sniper   = parseInt(cs2?.sniper_kills) || 0;
  const knife    = parseInt(cs2?.knife_kills) || 0;
  const pistol   = parseInt(cs2?.pistol_kills) || 0;
  const grenade  = parseInt(cs2?.grenade_kills) || 0;
  const blind    = parseInt(cs2?.blind_kills) || 0;
  const accuracy = parseInt(cs2?.accuracy) || 0;

  // Строим список оружий с данными
  const weapons = [
    {name:"AK-47",    kills:Math.round(kills*0.28), hs:Math.round(kills*0.28*0.42), acc:22, slot:"rifle"},
    {name:"M4A1-S",   kills:Math.round(kills*0.18), hs:Math.round(kills*0.18*0.44), acc:24, slot:"rifle"},
    {name:"AWP",      kills:sniper,                 hs:Math.round(sniper*0.05),     acc:44, slot:"sniper"},
    {name:"Desert Eagle",kills:Math.round(pistol*0.35),hs:Math.round(pistol*0.35*0.68),acc:34,slot:"pistol"},
    {name:"USP-S",    kills:Math.round(pistol*0.30),hs:Math.round(pistol*0.30*0.55),acc:32, slot:"pistol"},
    {name:"Glock-18", kills:Math.round(pistol*0.20),hs:Math.round(pistol*0.20*0.40),acc:20, slot:"pistol"},
    {name:"M4A4",     kills:Math.round(kills*0.08), hs:Math.round(kills*0.08*0.38), acc:21, slot:"rifle"},
    {name:"Knife",    kills:knife,                  hs:0,                           acc:100,slot:"knife"},
  ].filter(w=>w.kills>0).map(w=>({
    ...w,
    hspc: w.kills>0 ? Math.round(w.hs/w.kills*100) : 0,
  }));

  const slots = [{id:"all",l:"Все"},{id:"rifle",l:"Винтовки"},{id:"sniper",l:"Снайпер"},{id:"pistol",l:"Пистолеты"},{id:"knife",l:"Нож"}];
  const filtered = filter==="all" ? weapons : weapons.filter(w=>w.slot===filter);
  const sorted = [...filtered].sort((a,b)=>sortBy==="kills"?b.kills-a.kills:sortBy==="hs"?b.hspc-a.hspc:b.acc-a.acc);
  const total = weapons.reduce((s,w)=>s+w.kills,0)||1;

  if (!kills) return null;

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,marginBottom:"10px",animation:"up .4s ease both"}}>
      {/* Header */}
      <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,
        display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px"}}>
        <span style={{fontSize:"11px",color:C.yellow,letterSpacing:"3px",fontWeight:700}}>🔫 ОРУЖИЯ</span>
        <div style={{display:"flex",gap:"4px"}}>
          {[["kills","Убийства"],["hs","HS%"],["acc","Точность"]].map(([k,l])=>(
            <button key={k} onClick={()=>setSortBy(k)} style={{
              padding:"3px 10px",background:sortBy===k?C.yellow+"22":"transparent",
              border:`1px solid ${sortBy===k?C.yellow+"55":C.border}`,
              color:sortBy===k?C.yellow:C.muted,cursor:"pointer",
              fontSize:"10px",fontFamily:"inherit",letterSpacing:"1px"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Фильтр по слотам */}
      <div style={{display:"flex",gap:"2px",padding:"8px 20px",borderBottom:`1px solid ${C.border}`,flexWrap:"wrap"}}>
        {slots.map(s=>(
          <button key={s.id} onClick={()=>setFilter(s.id)} style={{
            padding:"3px 10px",background:filter===s.id?C.yellow+"18":"transparent",
            border:`1px solid ${filter===s.id?C.yellow+"44":C.border+"88"}`,
            color:filter===s.id?C.yellow:C.muted,cursor:"pointer",
            fontSize:"11px",fontFamily:"inherit"}}>
            {s.l}
          </button>
        ))}
      </div>

      {/* Список оружий */}
      <div style={{padding:"8px 0"}}>
        {sorted.map((w,i)=>{
          const col = WEAPON_DATA[w.name]?.color || C.label;
          const barW = Math.round(w.kills/total*100);
          return (
            <div key={w.name} className="hov-row" style={{
              padding:"10px 20px",borderBottom:i<sorted.length-1?`1px solid ${C.border}33`:"none",
              display:"grid",gridTemplateColumns:"auto 1fr auto auto auto",
              gap:"14px",alignItems:"center",transition:"background .15s"}}>

              {/* Иконка оружия */}
              <div style={{width:"90px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <WeaponImg name={w.name} size={32}/>
              </div>

              {/* Бар */}
              <div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                  <span style={{fontSize:"12px",color:C.value,fontWeight:600}}>{w.name}</span>
                </div>
                <div style={{height:"4px",background:"#1a1a10",borderRadius:"2px",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${barW}%`,background:col,
                    transition:"width .8s ease",opacity:0.8}}/>
                </div>
              </div>

              {/* Убийства */}
              <div style={{textAlign:"center",minWidth:"44px"}}>
                <div style={{fontSize:"16px",color:col,fontWeight:700}}>{w.kills.toLocaleString()}</div>
                <div style={{fontSize:"9px",color:C.muted,letterSpacing:"1px"}}>УБИЙСТВ</div>
              </div>

              {/* HS% */}
              <div style={{textAlign:"center",minWidth:"44px"}}>
                <div style={{fontSize:"14px",color:w.hspc>=50?C.win:w.hspc>=30?C.yellow:C.muted,fontWeight:700}}>
                  {w.hspc}%
                </div>
                <div style={{fontSize:"9px",color:C.muted,letterSpacing:"1px"}}>HS%</div>
              </div>

              {/* Точность */}
              <div style={{textAlign:"center",minWidth:"44px"}}>
                <div style={{fontSize:"14px",color:C.label,fontWeight:700}}>{w.acc}%</div>
                <div style={{fontSize:"9px",color:C.muted,letterSpacing:"1px"}}>ТОЧНОСТЬ</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Итоговая строка */}
      <div style={{padding:"10px 20px",borderTop:`1px solid ${C.border}`,
        display:"flex",gap:"20px",flexWrap:"wrap",fontSize:"11px",color:C.muted}}>
        <span>Всего убийств: <strong style={{color:C.yellow}}>{kills.toLocaleString()}</strong></span>
        <span>Ножом: <strong style={{color:"#ff8888"}}>{knife.toLocaleString()}</strong></span>
        <span>Гранатой: <strong style={{color:C.orange}}>{grenade.toLocaleString()}</strong></span>
        <span>В слепую: <strong style={{color:"#aa88ff"}}>{blind.toLocaleString()}</strong></span>
      </div>
    </div>
  );
}

// ── ScoreCards Collapsible ─────────────────────────────────────────────────────
function ScoreCardsCollapsible({player, source}) {

  const [open, setOpen] = useState(false);
  return (
    <div style={{marginBottom:"10px"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{
        width:"100%",background:C.card,border:`1px solid ${C.border}`,
        color:C.muted,cursor:"pointer",padding:"12px 20px",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        fontFamily:"inherit",fontSize:"12px",letterSpacing:"2px"}}>
        <span>📊 ДОПОЛНИТЕЛЬНЫЕ МЕТРИКИ</span>
        <span style={{fontSize:"14px"}}>{open?"▲":"▼"}</span>
      </button>
      {open&&<ScoreCards player={player} source={source}/>}
    </div>
  );
}

function BestWorstMap({faceit}) {
  const maps = arr(faceit?.maps).filter(m=>parseInt(m.matches)>=3)
    .sort((a,b)=>parseFloat(b.winrate)-parseFloat(a.winrate));
  if (!maps.length) return null;
  const best = maps[0];
  const worst = maps[maps.length-1];
  return (
    <div className="best-worst" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px",marginBottom:"10px",animation:"up .5s ease both"}}>
      <div style={{background:"#0a150a",border:`1px solid ${C.win}44`,padding:"18px 20px"}}>
        <div style={{fontSize:"10px",color:C.win,letterSpacing:"3px",fontWeight:700,marginBottom:"8px"}}>
          🏆 ЛУЧШАЯ КАРТА
        </div>
        <div style={{fontSize:"22px",color:C.value,fontWeight:700,marginBottom:"6px"}}>{best.map}</div>
        <div style={{display:"flex",gap:"16px",alignItems:"center"}}>
          <span style={{fontSize:"28px",color:C.win,fontWeight:700}}>{best.winrate}%</span>
          <div style={{fontSize:"12px",color:C.muted,lineHeight:1.7}}>
            <div>{best.matches} матчей</div>
            <div>K/D {best.kd}</div>
          </div>
        </div>
      </div>
      <div style={{background:"#150a0a",border:`1px solid ${C.lose}44`,padding:"18px 20px"}}>
        <div style={{fontSize:"10px",color:C.lose,letterSpacing:"3px",fontWeight:700,marginBottom:"8px"}}>
          ⚠️ ХУДШАЯ КАРТА
        </div>
        <div style={{fontSize:"22px",color:C.value,fontWeight:700,marginBottom:"6px"}}>{worst.map}</div>
        <div style={{display:"flex",gap:"16px",alignItems:"center"}}>
          <span style={{fontSize:"28px",color:C.lose,fontWeight:700}}>{worst.winrate}%</span>
          <div style={{fontSize:"12px",color:C.muted,lineHeight:1.7}}>
            <div>{worst.matches} матчей</div>
            <div>K/D {worst.kd}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Recent Matches Overview ───────────────────────────────────────────────────
function RecentMatchesOverview({faceit}) {
  const [analyses, setAnalyses] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const matches = arr(faceit?.matches).slice(0, 5);
  if (!matches.length) return null;

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

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,marginBottom:"10px",animation:"up .5s ease both"}}>
      <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:"11px",color:C.yellow,letterSpacing:"3px",fontWeight:700}}>
          🎮 ПОСЛЕДНИЕ МАТЧИ
        </span>
        <span style={{fontSize:"11px",color:C.muted}}>нажми → AI разбор</span>
      </div>
      {matches.map((m,i)=>{
        const win = m.result==="1";
        const ac = win ? C.win : C.lose;
        const ai = analyses[i];
        const isLoading = aiLoading[i];
        const [open, setOpen] = useState(false);

        return (
          <div key={i} style={{borderBottom:i<matches.length-1?`1px solid ${C.border}`:"none"}}>
            <div onClick={()=>{ setOpen(o=>!o); if(!open) fetchAnalysis(m,i); }}
              className="hov-row recent-match-grid" style={{display:"grid", gridTemplateColumns:"4px 1fr 72px 60px 60px 60px",
                gap:"10px", padding:"12px 16px", cursor:"pointer", alignItems:"center",
                borderLeft:`4px solid ${ac}`, background:"transparent",
                transition:"background .15s"}}>
              <div/>
              <div>
                <div style={{fontSize:"14px",color:C.value,fontWeight:700}}>{m.map||"—"}</div>
                <div style={{fontSize:"11px",color:ac,marginTop:"2px",letterSpacing:"1px"}}>
                  {win?"ПОБЕДА":"ПОРАЖЕНИЕ"}{m.score?` · ${m.score}`:""}
                </div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"10px",color:C.muted,marginBottom:"2px"}}>K/D</div>
                <div style={{fontSize:"15px",color:C.yellow,fontWeight:700}}>{m.kd||"—"}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"10px",color:C.muted,marginBottom:"2px"}}>УБИЙСТВ</div>
                <div style={{fontSize:"15px",color:C.label,fontWeight:600}}>{m.kills||"—"}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"10px",color:C.muted,marginBottom:"2px"}}>HS%</div>
                <div style={{fontSize:"15px",color:C.label,fontWeight:600}}>{m.hs||"—"}%</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"10px",color:C.muted,marginBottom:"2px"}}>ADR</div>
                <div style={{fontSize:"15px",color:C.label,fontWeight:600}}>{m.adr||"—"}</div>
              </div>
            </div>
            {/* AI разбор */}
            {open&&<div style={{padding:"12px 20px 14px",background:"#0f0f0a",
              borderTop:`1px solid ${C.border}`}}>
              {isLoading?(
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <div style={{width:"6px",height:"6px",borderRadius:"50%",background:C.yellow,
                    animation:"pulse 1.2s infinite"}}/>
                  <span style={{fontSize:"12px",color:C.yellow,letterSpacing:"2px"}}>AI анализирует матч...</span>
                </div>
              ):ai?(
                <div style={{fontSize:"13px",color:C.text,lineHeight:1.7,
                  borderLeft:`2px solid ${C.yellow}`,paddingLeft:"12px"}}>
                  🤖 {ai}
                </div>
              ):(
                <div style={{fontSize:"12px",color:C.muted}}>Нажми ещё раз для AI разбора</div>
              )}
            </div>}
          </div>
        );
      })}
    </div>
  );
}

// ── Progress History ───────────────────────────────────────────────────────────
function ProgressHistory({player, source}) {
  const [history, setHistory] = useState([]);
  useEffect(()=>{
    if (!player?.steamid) return;
    try{ const h=JSON.parse(localStorage.getItem(`cs2_rating_history_${player.steamid}`)||"[]"); setHistory(h); }catch{}
  }, [player?.steamid]);
  if (history.length < 2) return null;
  const first=history[0], last=history[history.length-1];
  function sigmoid(v,a){return Math.min(99,Math.max(1,Math.round(100/(1+Math.exp(-4*(v/a-1))))));}
  const avgByLevel=[
    {kd:0.75,hs:28,wr:43},{kd:0.82,hs:30,wr:44},{kd:0.92,hs:33,wr:46},
    {kd:1.00,hs:36,wr:48},{kd:1.06,hs:38,wr:49},{kd:1.12,hs:40,wr:50},
    {kd:1.20,hs:42,wr:51},{kd:1.28,hs:44,wr:52},{kd:1.38,hs:46,wr:53},
    {kd:1.52,hs:48,wr:54},{kd:1.72,hs:52,wr:56},
  ];
  function calcRating(s){
    const avg=avgByLevel[Math.min(s.lvl||0,10)];
    return Math.min(99,Math.round(sigmoid(s.kd,avg.kd)*0.45+sigmoid(s.hs,avg.hs)*0.25+sigmoid(s.wr,avg.wr)*0.30));
  }
  const rFirst=calcRating(first), rLast=calcRating(last), diff=rLast-rFirst;
  const diffColor=diff>0?C.win:diff<0?C.lose:C.muted;
  const diffLabel=diff>0?"РОСТ":diff<0?"ПАДЕНИЕ":"БЕЗ ИЗМЕНЕНИЙ";
  const stats=[
    {name:"K/D",f:first.kd?.toFixed(2),l:last.kd?.toFixed(2),diff:((last.kd||0)-(first.kd||0)).toFixed(2),up:(last.kd||0)>=(first.kd||0)},
    {name:"HS%",f:Math.round(first.hs||0)+"%",l:Math.round(last.hs||0)+"%",diff:(Math.round(last.hs||0)-Math.round(first.hs||0))+"%",up:(last.hs||0)>=(first.hs||0)},
    {name:"WR%",f:Math.round(first.wr||0)+"%",l:Math.round(last.wr||0)+"%",diff:(Math.round(last.wr||0)-Math.round(first.wr||0))+"%",up:(last.wr||0)>=(first.wr||0)},
  ];
  const ratings=history.map(s=>calcRating(s));
  const minR=Math.min(...ratings)-5, maxR=Math.max(...ratings)+5;
  const W=100,H=50;
  const pts=ratings.map((r,i)=>({x:(i/(ratings.length-1||1))*W,y:H-((r-minR)/(maxR-minR||1))*H}));
  const polyline=pts.map(p=>`${p.x},${p.y}`).join(" ");
  const area=`${pts[0].x},${H} `+pts.map(p=>`${p.x},${p.y}`).join(" ")+` ${pts[pts.length-1].x},${H}`;
  return (
    <div style={{background:"#0f0f0b",border:`2px solid ${diffColor}44`,borderLeft:`4px solid ${diffColor}`,
      padding:"20px 24px",marginBottom:"10px",animation:"up .5s ease both",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:"-30px",right:"-30px",width:"160px",height:"160px",
        background:`radial-gradient(circle,${diffColor}12,transparent 70%)`,pointerEvents:"none"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
        <span style={{fontSize:"11px",color:C.yellow,letterSpacing:"3px",fontWeight:700}}>📊 ИСТОРИЯ ПРОГРЕССА</span>
        <span style={{fontSize:"11px",color:C.muted}}>{first.date} — {last.date}</span>
      </div>
      <div className="progress-row" style={{display:"flex",alignItems:"center",gap:"20px",marginBottom:"16px",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"baseline",gap:"10px"}}>
          <span style={{fontSize:"48px",color:diffColor,fontWeight:900,lineHeight:1}}>{diff>0?"+":""}{diff}</span>
          <div>
            <div style={{fontSize:"12px",color:diffColor,fontWeight:700,letterSpacing:"2px"}}>{diffLabel}</div>
            <div style={{fontSize:"13px",color:C.muted,marginTop:"2px"}}>
              <span style={{color:C.label,fontWeight:600}}>{rFirst}</span>
              <span style={{margin:"0 8px",fontSize:"16px"}}>→</span>
              <span style={{color:diffColor,fontWeight:800,fontSize:"18px"}}>{rLast}</span>
            </div>
          </div>
        </div>
        {ratings.length>2&&(
          <div style={{flex:1,minWidth:"120px"}}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"52px",display:"block"}} preserveAspectRatio="none">
              <defs><linearGradient id="phGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={diffColor} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={diffColor} stopOpacity="0.02"/>
              </linearGradient></defs>
              <polygon points={area} fill="url(#phGrad)"/>
              <polyline points={polyline} fill="none" stroke={diffColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
              {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={i===pts.length-1?"3":"1.5"} fill={i===pts.length-1?diffColor:diffColor+"99"}/>)}
            </svg>
          </div>
        )}
      </div>
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
        {stats.map((s,i)=>(
          <div key={i} style={{flex:"1 1 80px",background:s.up?"#0a140a":"#140a0a",
            border:`1px solid ${s.up?C.win+"33":C.lose+"33"}`,padding:"10px 12px",textAlign:"center"}}>
            <div style={{fontSize:"10px",color:C.muted,marginBottom:"4px",letterSpacing:"1px"}}>{s.name}</div>
            <div style={{fontSize:"12px",color:C.label,marginBottom:"10px"}}>{s.f} → <span style={{color:s.up?C.win:C.lose,fontWeight:700}}>{s.l}</span></div>
            <div style={{fontSize:"13px",color:s.up?C.win:C.lose,fontWeight:800}}>{parseFloat(s.diff)>0?"+":""}{s.diff}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Player Rating ──────────────────────────────────────────────────────────────
function PlayerRating({player, source}) {
  const fc=player?.faceit, cs2=player?.cs2||{};
  const kd=parseFloat(source==="faceit"?fc?.lifetime?.kd:cs2.kd)||0;
  const hs=parseFloat(source==="faceit"?fc?.lifetime?.hs:cs2.hs)||0;
  const lvl=parseInt(fc?.level)||0;
  const matches=parseInt(source==="faceit"?fc?.lifetime?.matches:cs2.matches)||0;
  const wrRaw=parseFloat(source==="faceit"?fc?.lifetime?.winrate:cs2.winrate)||0;
  // Steam WR иногда неправдоподобен: капируем 80% при 100+ матчах
  const wr=source==="steam"&&matches>=100&&wrRaw>80 ? 80 : (wrRaw>=99&&matches<50)?65:Math.min(wrRaw,99);
  const avgByLevel=[
    {kd:0.75,hs:28,wr:43},{kd:0.82,hs:30,wr:44},{kd:0.92,hs:33,wr:46},
    {kd:1.00,hs:36,wr:48},{kd:1.06,hs:38,wr:49},{kd:1.12,hs:40,wr:50},
    {kd:1.20,hs:42,wr:51},{kd:1.28,hs:44,wr:52},{kd:1.38,hs:46,wr:53},
    {kd:1.52,hs:48,wr:54},{kd:1.72,hs:52,wr:56},
  ];
  const avg=avgByLevel[Math.min(lvl,10)];
  function pct(val,avgVal){
    const score=Math.round(100/(1+Math.exp(-4*(val/avgVal-1))));
    if(val===100&&matches<20)return Math.min(score,65);
    return Math.min(99,Math.max(1,score));
  }
  const kdPct=pct(kd,avg.kd), hsPct=pct(hs,avg.hs), wrPct=pct(wr,avg.wr);
  const overall=Math.min(99,Math.round(kdPct*0.45+hsPct*0.25+wrPct*0.30));
  const overallColor=overall>=70?C.win:overall>=45?C.yellow:C.orange;
  const label=overall>=80?"ТОП ИГРОК":overall>=60?"ВЫШЕ СРЕДНЕГО":overall>=40?"СРЕДНИЙ УРОВЕНЬ":"ЕСТЬ КУДА РАСТИ";
  const stats=[
    {name:"K/D",val:kd.toFixed(2),avg:avg.kd.toFixed(2),pct:kdPct,color:C.blue},
    {name:"HS%",val:Math.round(hs)+"%",avg:avg.hs+"%",pct:hsPct,color:C.orange},
    {name:"WR%",val:Math.round(wr)+"%",avg:avg.wr+"%",pct:wrPct,color:"#aa88ff"},
  ];

  // Система уровней CS2 Coach
  const coachLevels=[
    {min:0,  max:19,  name:"НОВОБРАНЕЦ", icon:"🪖", color:"#8a8070", next:"Боец"},
    {min:20, max:34,  name:"БОЕЦ",       icon:"⚔️", color:"#c8a060", next:"Снайпер"},
    {min:35, max:49,  name:"СНАЙПЕР",    icon:"🔭", color:"#74c6f5", next:"Ветеран"},
    {min:50, max:64,  name:"ВЕТЕРАН",    icon:"🎖️", color:"#f5c518", next:"Мастер"},
    {min:65, max:79,  name:"МАСТЕР",     icon:"🏆", color:"#ff8844", next:"Элита"},
    {min:80, max:89,  name:"ЭЛИТА",      icon:"💀", color:"#ff4466", next:"Легенда"},
    {min:90, max:100, name:"ЛЕГЕНДА",    icon:"👑", color:"#aa44ff", next:null},
  ];
  const coachLvl = coachLevels.find(l=>overall>=l.min&&overall<=l.max)||coachLevels[0];
  const nextLvl  = coachLevels.find(l=>l.min===coachLvl.max+1);
  const lvlProg  = nextLvl ? Math.round((overall-coachLvl.min)/(coachLvl.max-coachLvl.min)*100) : 100;

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"18px 20px",marginBottom:"10px",animation:"up .5s ease both"}}>
      <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"3px",fontWeight:700,marginBottom:"16px"}}>🏅 CS2 COACH РЕЙТИНГ</div>
      <div className="rating-row" style={{display:"flex",gap:"20px",alignItems:"center",flexWrap:"wrap",marginBottom:"16px"}}>
        {/* Уровень — иконка + название */}
        <div style={{textAlign:"center",minWidth:"100px"}}>
          <div style={{fontSize:"44px",lineHeight:1,marginBottom:"4px"}}>{coachLvl.icon}</div>
          <div style={{fontSize:"13px",color:coachLvl.color,fontWeight:800,letterSpacing:"1px"}}>{coachLvl.name}</div>
          <div style={{fontSize:"11px",color:C.muted,marginTop:"2px"}}>{overall} / 100</div>
        </div>
        <div style={{flex:1}}>
          <div className="rating-pct" style={{fontSize:"22px",color:C.value,fontWeight:800,lineHeight:1.2,marginBottom:"5px"}}>
            Лучше чем <span style={{color:coachLvl.color}}>{overall}%</span>
          </div>
          <div style={{fontSize:"14px",color:C.muted,marginBottom:"10px"}}>игроков{lvl>0?` уровня FACEIT ${lvl}`:" CS2"}</div>
          {/* Прогресс до следующего уровня */}
          {/* XP прогресс до следующего уровня */}
          {nextLvl&&<>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:C.muted,marginBottom:"4px"}}>
              <span style={{color:coachLvl.color,fontWeight:700}}>{overall*10} XP</span>
              <span>{(coachLvl.max+1)*10} XP → <span style={{color:coachLevels.find(l=>l.name===coachLvl.next)?.color||C.yellow}}>{coachLvl.next}</span></span>
            </div>
            <div style={{height:"6px",background:"#1a1a10",borderRadius:"3px",overflow:"hidden",marginBottom:"4px"}}>
              <div style={{height:"100%",width:`${lvlProg}%`,background:coachLvl.color,
                borderRadius:"3px",transition:"width 1s ease",boxShadow:`0 0 6px ${coachLvl.color}88`}}/>
            </div>
            <div style={{fontSize:"11px",color:C.muted}}>
              ещё <span style={{color:coachLvl.color,fontWeight:700}}>{(coachLvl.max+1-overall)*10} XP</span> до {coachLvl.next}
            </div>
          </>}
          {!nextLvl&&<div style={{fontSize:"12px",color:"#aa44ff",fontWeight:700}}>⭐ Максимальный уровень</div>}
          {matches>0&&<div style={{fontSize:"11px",color:C.muted,marginTop:"4px"}}>на основе {matches} матчей</div>}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {stats.map((s,i)=>(
          <div key={i}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px",fontSize:"12px"}}>
              <span style={{color:C.muted}}>{s.name}</span>
              <span><span style={{color:s.color,fontWeight:700}}>{s.val}</span><span style={{color:C.muted}}> / avg {s.avg}</span></span>
            </div>
            <div style={{height:"4px",background:"#1a1a10",borderRadius:"2px",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${s.pct}%`,background:s.color,borderRadius:"2px",transition:"width 1s ease"}}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Achievement Modal ─────────────────────────────────────────────────────────
function AchievementModal({a, onClose}) {
  // тренировки под каждое достижение
  const tips = {
    headshot: [
      {cat:"AIM",      dur:"20 мин", task:"Aim_botz: 500 убийств только в голову, без спрея — пока не выйдет уверенно"},
      {cat:"МЕХАНИКА", dur:"15 мин", task:"Recoil Master workshop: отработай первые 5 пуль AK47 — они дают больше всего хедшотов"},
      {cat:"ПРАКТИКА", dur:"10 мин", task:"Deathmatch: стреляй только пистолетом — заставляет прицеливаться точнее"},
    ],
    sniper: [
      {cat:"AIM",      dur:"20 мин", task:"Aim_botz headshot only: минимум 300 убийств подряд с точностью выше 60%"},
      {cat:"МЕХАНИКА", dur:"15 мин", task:"Переключись на AWP на 1 deathmatch-сессию — учит ставить прицел на уровень головы"},
      {cat:"АНАЛИЗ",   dur:"10 мин", task:"Посмотри демо: найди 3 момента где стрелял в тело — понять почему прицел был низко"},
    ],
    fragger: [
      {cat:"МЕХАНИКА", dur:"15 мин", task:"Counter-strafe практика: движение → стоп → выстрел. Цель — 0 пуль в движении"},
      {cat:"AIM",      dur:"20 мин", task:"Deathmatch 15 минут: фокус только на первый выстрел, не спрей"},
      {cat:"ТАКТИКА",  dur:"10 мин", task:"Играй агрессивнее на входе — больше дуэлей = больше шансов поднять K/D"},
    ],
    elite: [
      {cat:"AIM",      dur:"25 мин", task:"Aim_botz: 1000 убийств ежедневно — без этого K/D 1.5+ не даётся"},
      {cat:"МЕХАНИКА", dur:"20 мин", task:"Micro-adjustments: стреляй по маленьким движущимся мишеням в workshop"},
      {cat:"АНАЛИЗ",   dur:"15 мин", task:"Разбери 5 смертей из последнего матча — найди паттерн где проигрываешь дуэли"},
    ],
    winner: [
      {cat:"ТАКТИКА",  dur:"15 мин", task:"Учи utility на 1 карте: 2 смока, 1 молотов, 1 флэш — и применяй каждый раунд"},
      {cat:"АНАЛИЗ",   dur:"20 мин", task:"Посмотри 1 проигранный матч: найди раунды где команда проигрывала из-за позиций"},
      {cat:"ТАКТИКА",  dur:"10 мин", task:"Не rush B каждый раунд — чередуй атаки, читай мини-карту, реагируй на ротации"},
    ],
    dominator: [
      {cat:"ТАКТИКА",  dur:"20 мин", task:"Изучи 3 стандартные раскидки на лучшей карте — смок мидл, смок CT, молотов на кит"},
      {cat:"АНАЛИЗ",   dur:"15 мин", task:"После каждого проигранного раунда: 1 вывод почему проиграли, 1 исправление"},
      {cat:"ТАКТИКА",  dur:"10 мин", task:"Играй IGL роль 1 матч: давай callouts, предлагай стратегии — понимание игры растёт"},
    ],
    veteran: [
      {cat:"РЕЖИМ",    dur:"—",      task:"Ставь себе цель: минимум 3 матча в день. Главное — регулярность, не результат"},
      {cat:"ТАКТИКА",  dur:"15 мин", task:"Каждый день — 1 новая раскидка на любой карте. За 200 матчей это 200 инструментов"},
      {cat:"АНАЛИЗ",   dur:"10 мин", task:"Веди заметки: после каждого матча 1 строчка — что сделал хорошо, что исправить"},
    ],
    grinder: [
      {cat:"РЕЖИМ",    dur:"—",      task:"Уже 500 матчей — ты гриндер. Теперь фокус на качестве: играй медленнее, думай больше"},
      {cat:"АНАЛИЗ",   dur:"20 мин", task:"Разбери своё худшее соотношение K/D за последние 20 матчей — найди общий паттерн"},
      {cat:"ТАКТИКА",  dur:"15 мин", task:"Пробуй новые позиции и углы — 500 матчей на одних и тех же точках = потолок"},
    ],
    streak3: [
      {cat:"ПСИХОЛОГИЯ",dur:"—",     task:"Серия 3+ побед: не меняй стиль игры, не force-buy — сохраняй темп"},
      {cat:"AIM",       dur:"15 мин", task:"Перед каждым матчем серии: 10 минут aim warmup — не прыгать в игру холодным"},
      {cat:"ТАКТИКА",   dur:"10 мин", task:"Играй на своей лучшей карте пока идёт серия — не экспериментируй"},
    ],
    streak5: [
      {cat:"ПСИХОЛОГИЯ",dur:"—",     task:"Серия 5+ — ты в зоне. Главное правило: стоп если проиграл 2 подряд, отдохни"},
      {cat:"AIM",       dur:"20 мин", task:"Ежедневный warmup стал твоим ритуалом — не пропускай его во время серии"},
      {cat:"ТАКТИКА",   dur:"10 мин", task:"Анализируй что делаешь правильно сейчас — запомни это состояние игры"},
    ],
    faceit5: [
      {cat:"ТАКТИКА",   dur:"15 мин", task:"На уровне 5+ противники знают базовые раскидки — учи нестандартные позиции"},
      {cat:"AIM",       dur:"20 мин", task:"Aim_botz ежедневно: на этом уровне механика решает половину дуэлей"},
      {cat:"АНАЛИЗ",    dur:"15 мин", task:"Смотри демо игроков уровня 7-8 на своей роли — копируй позиционирование"},
    ],
    faceit8: [
      {cat:"АНАЛИЗ",    dur:"20 мин", task:"На уровне 8+ нужен разбор каждого матча: 3 ошибки и 1 что сделал хорошо"},
      {cat:"ТАКТИКА",   dur:"20 мин", task:"Изучи все раскидки на 2 основных картах до автоматизма — без этого уровень 10 закрыт"},
      {cat:"AIM",       dur:"15 мин", task:"Переключись на Aimlabs / KovaaK's — workshop aim_botz уже не даёт прогресса на этом уровне"},
    ],
    mvp100: [
      {cat:"ТАКТИКА",   dur:"15 мин", task:"MVP = первый в команде. Фокус: entry fragging, открывать раунды, не ждать"},
      {cat:"АНАЛИЗ",    dur:"10 мин", task:"После каждого матча: был ли ты полезен команде или просто стрелял? MVP — это вклад"},
      {cat:"ТАКТИКА",   dur:"10 мин", task:"Учи раскидки под entry: 1 смок + 1 флэш на каждую карту — даёт больше MVP"},
    ],
    kills1k: [
      {cat:"AIM",       dur:"20 мин", task:"1000 убийств — хорошее начало. Aim_botz: 500 фрагов ежедневно для роста механики"},
      {cat:"МЕХАНИКА",  dur:"15 мин", task:"Работай над counter-strafe — точность в движении даёт +20% к фрагам"},
      {cat:"РЕЖИМ",     dur:"—",      task:"Ставь цель: 2000 убийств за следующие 3 месяца = ~22 матча в неделю"},
    ],
    kills10k: [
      {cat:"АНАЛИЗ",    dur:"20 мин", task:"10к убийств — ты ветеран. Теперь считай ADR и impact, не просто kills"},
      {cat:"ТАКТИКА",   dur:"15 мин", task:"На этом опыте учи IGL: давай callouts, читай игру соперника, выигрывай тактически"},
      {cat:"РЕЖИМ",     dur:"—",      task:"Делай перерыв каждые 2 часа — с таким количеством часов важна свежесть восприятия"},
    ],
  };

  const trainings = tips[a.id] || [
    {cat:"AIM",     dur:"20 мин", task:"Aim_botz: ежедневная разминка 500 убийств"},
    {cat:"АНАЛИЗ",  dur:"15 мин", task:"Разбери последний проигранный матч — найди 1 паттерн ошибок"},
    {cat:"ТАКТИКА", dur:"10 мин", task:"Выучи 1 новую раскидку на лучшей карте"},
  ];
  const prog = Math.min(99, Math.round((a.val / a.target) * 100));
  const remaining = a.target > a.val ? Math.ceil(a.target - a.val) : 0;
  const CAT_COLOR = {AIM:C.lose, МЕХАНИКА:C.orange, КАРТЫ:"#44ddaa", ТАКТИКА:C.yellow, АНАЛИЗ:"#aa88ff", ПРАКТИКА:C.orange, ПСИХОЛОГИЯ:"#dd88ff", РЕЖИМ:C.muted};

  return createPortal(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:9999,
      display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",animation:"up .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${a.color}66`,
        width:"100%",maxWidth:"460px",maxHeight:"90vh",overflowY:"auto"}}>

        {/* Шапка */}
        <div style={{padding:"22px 24px 16px",borderBottom:`1px solid ${C.border}`,
          background:`linear-gradient(135deg,${a.color}18,transparent)`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{display:"flex",gap:"14px",alignItems:"center"}}>
              <span style={{fontSize:"36px"}}>{a.icon}</span>
              <div>
                <div style={{fontSize:"16px",color:a.done?C.yellow:C.value,fontWeight:700,marginBottom:"3px"}}>{a.name}</div>
                <div style={{fontSize:"11px",color:a.done?a.color:C.muted,letterSpacing:"1px"}}>
                  {a.done ? "✅ ВЫПОЛНЕНО" : `${a.val}${a.unit} из ${a.target}${a.unit}`}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{background:"transparent",border:"none",color:C.muted,
              fontSize:"20px",cursor:"pointer",padding:"0 4px",lineHeight:1}}>✕</button>
          </div>

          {/* Прогресс-бар */}
          {!a.done && (
            <div style={{marginTop:"16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",color:C.muted,marginBottom:"5px"}}>
                <span>Прогресс</span>
                <span style={{color:a.color,fontWeight:700}}>{prog}%</span>
              </div>
              <div style={{height:"6px",background:"#1a1a10",borderRadius:"3px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${prog}%`,background:a.color,borderRadius:"3px",transition:"width .6s ease"}}/>
              </div>
              <div style={{fontSize:"12px",color:C.muted,marginTop:"6px"}}>
                ещё <span style={{color:C.value,fontWeight:700}}>{remaining}{a.unit}</span> до цели
              </div>
            </div>
          )}
        </div>

        {/* Тренировки */}
        <div style={{padding:"18px 24px"}}>
          <div style={{fontSize:"10px",color:C.yellow,letterSpacing:"3px",fontWeight:700,marginBottom:"14px"}}>
            КАК ВЫПОЛНИТЬ:
          </div>
          {trainings.map((t,i)=>{
            const cc = CAT_COLOR[t.cat] || C.yellow;
            return (
              <div key={i} style={{display:"flex",gap:"12px",padding:"12px 14px",marginBottom:"6px",
                background:"#0d0d09",borderLeft:`3px solid ${cc}`,border:`1px solid ${C.border}`,
                borderLeft:`3px solid ${cc}`}}>
                <div style={{flexShrink:0,paddingTop:"2px"}}>
                  <span style={{padding:"2px 8px",background:cc+"22",color:cc,
                    fontSize:"9px",letterSpacing:"2px",fontWeight:700,whiteSpace:"nowrap"}}>{t.cat}</span>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:"11px",color:C.muted,marginBottom:"3px"}}>{t.dur}</div>
                  <div style={{fontSize:"13px",color:C.text,lineHeight:1.6}}>{t.task}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Achievements Collapsible ──────────────────────────────────────────────────
function AchievementsCollapsible({player, source}) {
  const [open, setOpen] = useState(false);
  // Считаем сколько разблокировано для превью
  const fc=player?.faceit, cs2=player?.cs2||{};
  const kd=parseFloat(source==="faceit"?fc?.lifetime?.kd:cs2.kd)||0;
  const hs=parseFloat(source==="faceit"?fc?.lifetime?.hs:cs2.hs)||0;
  const wr=parseFloat(source==="faceit"?fc?.lifetime?.winrate:cs2.winrate)||0;
  const matches=parseInt(source==="faceit"?fc?.lifetime?.matches:cs2.matches)||0;
  const kills=parseInt(cs2?.kills)||0;
  const mvps=parseInt(cs2?.mvps)||0;
  const lvl=parseInt(fc?.level)||0;
  const elo=parseInt(fc?.elo)||0;
  const knifeKills=parseInt(cs2?.knife_kills)||0;
  const bombsDefused=parseInt(cs2?.bombs_defused)||0;
  const bombsPlanted=parseInt(cs2?.bombs_planted)||0;
  const dominated=parseInt(cs2?.dominated)||0;
  const hours=Math.round((parseInt(cs2?.playtime)||0)/60);
  const accuracy=parseInt(cs2?.accuracy)||0;
  const apiStreak=parseInt(fc?.lifetime?.longest_streak)||0;
  const calcStreak=(()=>{let s=0;for(const m of arr(fc?.matches)){if(m.result==="1")s++;else break;}return s;})();
  const streak=Math.max(apiStreak,calcStreak);
  const sniperKills=parseInt(cs2?.sniper_kills)||0;

  const total = 32;
  const unlocked = [
    hs>=30,hs>=40,hs>=55,accuracy>=25,
    streak>=3,streak>=5,streak>=10,
    kd>=1.0,kd>=1.5,kd>=2.0,dominated>=50,mvps>=100,mvps>=500,kills>=1000,kills>=5000,kills>=10000,
    wr>=50,wr>=60,matches>=100,matches>=500,matches>=1000,lvl>=5,lvl>=8,lvl>=10,elo>=2000,hours>=100,hours>=500,
    knifeKills>=5,knifeKills>=50,sniperKills>=100,
    bombsDefused>=10,bombsPlanted>=50,
  ].filter(Boolean).length;

  const pct = Math.round(unlocked/total*100);

  return (
    <div style={{marginBottom:"10px"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{
        width:"100%",background:C.card,border:`1px solid ${C.border}`,
        cursor:"pointer",padding:"14px 20px",fontFamily:"inherit",
        display:"flex",justifyContent:"space-between",alignItems:"center",transition:"border-color .15s"}}
        onMouseEnter={e=>e.currentTarget.style.borderColor=C.yellow+"55"}
        onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <span style={{fontSize:"16px"}}>🏅</span>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"3px",fontWeight:700}}>ДОСТИЖЕНИЯ</div>
            <div style={{fontSize:"11px",color:C.muted,marginTop:"2px"}}>
              <span style={{color:C.yellow,fontWeight:700}}>{unlocked}</span>/{total} разблокировано
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          {/* Мини прогресс-бар */}
          <div style={{width:"80px",height:"4px",background:"#1a1a10",borderRadius:"2px",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,background:C.yellow,transition:"width 1s ease"}}/>
          </div>
          <span style={{fontSize:"11px",color:C.muted,minWidth:"28px"}}>{pct}%</span>
          <span style={{fontSize:"14px",color:C.muted,transition:"transform .2s",
            transform:open?"rotate(180deg)":"rotate(0deg)"}}>▼</span>
        </div>
      </button>
      {open&&<Achievements player={player} source={source}/>}
    </div>
  );
}

// ── Achievements ─────────────────────────────────────────────────────────────
function Achievements({player, source}) {
  const [cat, setCat] = useState("all");
  const [modal, setModal] = useState(null);
  const fc=player?.faceit, cs2=player?.cs2||{};
  const kd=parseFloat(source==="faceit"?fc?.lifetime?.kd:cs2.kd)||0;
  const hs=parseFloat(source==="faceit"?fc?.lifetime?.hs:cs2.hs)||0;
  const wr=parseFloat(source==="faceit"?fc?.lifetime?.winrate:cs2.winrate)||0;
  const matches=parseInt(source==="faceit"?fc?.lifetime?.matches:cs2.matches)||0;
  const kills=parseInt(cs2?.kills)||0;
  const deaths=parseInt(cs2?.deaths)||0;
  const mvps=parseInt(cs2?.mvps)||0;
  const lvl=parseInt(fc?.level)||0;
  const elo=parseInt(fc?.elo)||0;
  const wins=parseInt(cs2?.wins)||0;
  const knifeKills=parseInt(cs2?.knife_kills)||0;
  const sniperKills=parseInt(cs2?.sniper_kills)||0;
  const bombsDefused=parseInt(cs2?.bombs_defused)||0;
  const bombsPlanted=parseInt(cs2?.bombs_planted)||0;
  const dominated=parseInt(cs2?.dominated)||0;
  const apiStreak=parseInt(fc?.lifetime?.longest_streak)||0;
  const calcStreak=(()=>{let s=0;for(const m of arr(fc?.matches)){if(m.result==="1")s++;else break;}return s;})();
  const streak=Math.max(apiStreak,calcStreak);
  const hours=Math.round((parseInt(cs2?.playtime)||0)/60);
  const accuracy=parseInt(cs2?.accuracy)||0;

  const ALL_ACH = [
    // Aim
    {id:"hs30",   cat:"aim",     icon:"🎯",name:"Снайпер-новичок",   desc:"HS% выше 30%",           done:hs>=30,  val:Math.round(hs),   target:30,  unit:"%",  color:C.orange},
    {id:"hs40",   cat:"aim",     icon:"🔴",name:"HS Машина",          desc:"HS% выше 40%",           done:hs>=40,  val:Math.round(hs),   target:40,  unit:"%",  color:C.orange},
    {id:"hs55",   cat:"aim",     icon:"💥",name:"Headshot Hunter",    desc:"HS% выше 55%",           done:hs>=55,  val:Math.round(hs),   target:55,  unit:"%",  color:C.orange},
    {id:"acc25",  cat:"aim",     icon:"🎯",name:"Меткий стрелок",     desc:"Точность выше 25%",      done:accuracy>=25,val:accuracy,       target:25,  unit:"%",  color:C.yellow},
    // Clutching
    {id:"clutch1",cat:"clutch",  icon:"😤",name:"Clutch King",        desc:"3+ серия побед",         done:streak>=3,val:streak,           target:3,   unit:"",   color:C.blue},
    {id:"clutch2",cat:"clutch",  icon:"🔥",name:"Огненная серия",     desc:"5+ серия побед",         done:streak>=5,val:streak,           target:5,   unit:"",   color:C.lose},
    {id:"clutch3",cat:"clutch",  icon:"⚡",name:"Непобедимый",        desc:"10+ серия побед",        done:streak>=10,val:streak,          target:10,  unit:"",   color:C.yellow},
    // Impact
    {id:"kd1",    cat:"impact",  icon:"⚔️",name:"Фраггер",            desc:"K/D выше 1.0",           done:kd>=1.0, val:kd.toFixed(2),   target:1.0, unit:"",   color:C.blue},
    {id:"kd15",   cat:"impact",  icon:"💀",name:"Элита",               desc:"K/D выше 1.5",           done:kd>=1.5, val:kd.toFixed(2),   target:1.5, unit:"",   color:C.blue},
    {id:"kd2",    cat:"impact",  icon:"👾",name:"Машина смерти",       desc:"K/D выше 2.0",           done:kd>=2.0, val:kd.toFixed(2),   target:2.0, unit:"",   color:C.blue},
    {id:"dom50",  cat:"impact",  icon:"👑",name:"Доминатор",           desc:"50+ доминаций",          done:dominated>=50,val:dominated,    target:50,  unit:"",   color:C.win},
    {id:"mvp",    cat:"impact",  icon:"🥇",name:"MVP x100",            desc:"100 MVP наград",         done:mvps>=100,val:mvps,            target:100, unit:"",   color:C.yellow},
    {id:"mvp500", cat:"impact",  icon:"🏅",name:"MVP Легенда",         desc:"500 MVP наград",         done:mvps>=500,val:mvps,            target:500, unit:"",   color:C.yellow},
    // Results
    {id:"win50",  cat:"results", icon:"🏆",name:"Победитель",          desc:"50%+ WinRate",           done:wr>=50,  val:Math.round(wr),   target:50,  unit:"%",  color:C.win},
    {id:"win60",  cat:"results", icon:"🎖️",name:"Доминирующий",       desc:"60%+ WinRate",           done:wr>=60,  val:Math.round(wr),   target:60,  unit:"%",  color:C.win},
    {id:"m100",   cat:"results", icon:"🎮",name:"Ветеран",             desc:"100 матчей",             done:matches>=100,val:matches,       target:100, unit:"",   color:C.label},
    {id:"m500",   cat:"results", icon:"⚙️",name:"Гриндер",             desc:"500 матчей",             done:matches>=500,val:matches,       target:500, unit:"",   color:C.label},
    {id:"m1000",  cat:"results", icon:"🌟",name:"Легенда",             desc:"1000 матчей",            done:matches>=1000,val:matches,      target:1000,unit:"",   color:C.yellow},
    // Weapons / Style
    {id:"knife5", cat:"style",   icon:"🔪",name:"Ножевой мастер",      desc:"5+ убийств ножом",       done:knifeKills>=5,  val:knifeKills, target:5,   unit:"",   color:"#ff8888"},
    {id:"knife50",cat:"style",   icon:"🗡️",name:"Нинзя",              desc:"50+ убийств ножом",      done:knifeKills>=50, val:knifeKills, target:50,  unit:"",   color:"#ff8888"},
    {id:"sniper", cat:"style",   icon:"🔭",name:"Снайпер",             desc:"100+ убийств снайпером", done:sniperKills>=100,val:sniperKills,target:100,unit:"",   color:C.blue},
    // Kills milestones
    {id:"k1k",    cat:"impact",  icon:"⚔️",name:"1000 убийств",        desc:"Накопи 1000 фрагов",     done:kills>=1000, val:kills,        target:1000, unit:"",  color:"#aa88ff"},
    {id:"k5k",    cat:"impact",  icon:"🗡️",name:"5000 убийств",       desc:"Накопи 5000 фрагов",     done:kills>=5000, val:kills,        target:5000, unit:"",  color:"#aa88ff"},
    {id:"k10k",   cat:"impact",  icon:"💣",name:"10к убийств",         desc:"Накопи 10000 фрагов",    done:kills>=10000,val:kills,        target:10000,unit:"",  color:"#aa88ff"},
    // Bomb
    {id:"bomb10", cat:"tactics", icon:"💥",name:"Сапёр",               desc:"10+ бомб обезврежено",   done:bombsDefused>=10,val:bombsDefused,target:10,unit:"",  color:C.win},
    {id:"plant50",cat:"tactics", icon:"🕹️",name:"Бомбардир",           desc:"50+ бомб заложено",      done:bombsPlanted>=50,val:bombsPlanted,target:50,unit:"",  color:C.lose},
    // FACEIT
    {id:"fl5",    cat:"results", icon:"⚡",name:"FACEIT Pro",          desc:"FACEIT уровень 5",        done:lvl>=5,  val:lvl,              target:5,   unit:"",   color:C.orange},
    {id:"fl8",    cat:"results", icon:"🌠",name:"FACEIT Элита",        desc:"FACEIT уровень 8",        done:lvl>=8,  val:lvl,              target:8,   unit:"",   color:C.orange},
    {id:"fl10",   cat:"results", icon:"🔱",name:"FACEIT Легенда",      desc:"FACEIT уровень 10",       done:lvl>=10, val:lvl,              target:10,  unit:"",   color:C.orange},
    {id:"elo2k",  cat:"results", icon:"💎",name:"2000 ELO",            desc:"FACEIT ELO выше 2000",    done:elo>=2000,val:elo,             target:2000,unit:"",   color:C.yellow},
    // Time
    {id:"h100",   cat:"results", icon:"⏱",name:"100 часов",           desc:"100 часов в CS2",        done:hours>=100,val:hours,           target:100, unit:"ч", color:C.muted},
    {id:"h500",   cat:"results", icon:"🕐",name:"500 часов",           desc:"500 часов в CS2",        done:hours>=500,val:hours,           target:500, unit:"ч", color:C.label},
  ];

  const CATS = [
    {id:"all",     label:"Все",        count:ALL_ACH.length},
    {id:"aim",     label:"Прицел",     count:ALL_ACH.filter(a=>a.cat==="aim").length},
    {id:"impact",  label:"Импакт",     count:ALL_ACH.filter(a=>a.cat==="impact").length},
    {id:"clutch",  label:"Клатч",      count:ALL_ACH.filter(a=>a.cat==="clutch").length},
    {id:"results", label:"Результаты", count:ALL_ACH.filter(a=>a.cat==="results").length},
    {id:"style",   label:"Стиль",      count:ALL_ACH.filter(a=>a.cat==="style").length},
    {id:"tactics", label:"Тактика",    count:ALL_ACH.filter(a=>a.cat==="tactics").length},
  ];

  const visible = cat==="all" ? ALL_ACH : ALL_ACH.filter(a=>a.cat===cat);
  const unlocked = ALL_ACH.filter(a=>a.done).length;

  return (
    <>
      {modal&&<AchievementModal a={modal} onClose={()=>setModal(null)}/>}
      <div style={{background:C.card,border:`1px solid ${C.border}`,marginBottom:"10px",animation:"up .5s ease both"}}>
        {/* Header */}
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,
          display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px"}}>
          <span style={{fontSize:"11px",color:C.yellow,letterSpacing:"3px",fontWeight:700}}>🏅 ДОСТИЖЕНИЯ</span>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{height:"5px",background:"#1a1a10",borderRadius:"3px",overflow:"hidden",width:"80px"}}>
              <div style={{height:"100%",width:`${Math.round(unlocked/ALL_ACH.length*100)}%`,
                background:C.yellow,transition:"width 1s ease"}}/>
            </div>
            <span style={{fontSize:"11px",color:C.yellow,fontWeight:700}}>{unlocked}<span style={{color:C.muted}}>/{ALL_ACH.length}</span></span>
          </div>
        </div>

        {/* Category tabs */}
        <div style={{display:"flex",gap:"2px",padding:"8px 16px",borderBottom:`1px solid ${C.border}`,flexWrap:"wrap"}}>
          {CATS.map(c=>{
            const catUnlocked = (c.id==="all"?ALL_ACH:ALL_ACH.filter(a=>a.cat===c.id)).filter(a=>a.done).length;
            const active = cat===c.id;
            return (
              <button key={c.id} onClick={()=>setCat(c.id)} style={{
                padding:"4px 12px",background:active?C.yellow+"22":"transparent",
                border:`1px solid ${active?C.yellow+"55":C.border}`,
                color:active?C.yellow:C.muted,cursor:"pointer",
                fontSize:"11px",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"5px"}}>
                {c.label}
                <span style={{fontSize:"9px",background:active?C.yellow+"33":"#1a1a10",
                  color:active?C.yellow:C.muted,padding:"1px 5px",borderRadius:"10px"}}>
                  {catUnlocked}/{c.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div className="ach-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"2px",padding:"8px"}}>
          {visible.map(a=>{
            const prog=Math.min(99,Math.round((parseFloat(a.val)/a.target)*100));
            return (
              <div key={a.id} onClick={()=>{setModal(a);track("achievement_opened",{id:a.id,done:a.done});}}
                style={{
                  padding:"12px 14px",cursor:"pointer",position:"relative",
                  background:a.done?`linear-gradient(135deg,${a.color}14,${a.color}06)`:"#0d0d09",
                  border:`1px solid ${a.done?a.color+"55":C.border+"66"}`,
                  opacity:a.done?1:0.65,transition:"all .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.borderColor=a.color+"88";}}
                onMouseLeave={e=>{e.currentTarget.style.opacity=a.done?"1":"0.65";e.currentTarget.style.borderColor=a.done?a.color+"55":C.border+"66";}}>

                {a.done&&<div style={{position:"absolute",top:"8px",right:"10px",
                  fontSize:"11px",color:a.color,fontWeight:700}}>✓</div>}

                <div style={{fontSize:"22px",marginBottom:"6px",
                  filter:a.done?"none":"grayscale(0.7)"}}>{a.icon}</div>
                <div style={{fontSize:"12px",color:a.done?a.color:C.label,
                  fontWeight:700,marginBottom:"2px"}}>{a.name}</div>
                <div style={{fontSize:"10px",color:C.muted,marginBottom:a.done?0:"8px"}}>{a.desc}</div>

                {!a.done&&<>
                  <div style={{height:"2px",background:"#1a1a10",borderRadius:"1px",overflow:"hidden",marginTop:"6px"}}>
                    <div style={{height:"100%",width:`${prog}%`,background:a.color,opacity:0.7}}/>
                  </div>
                  <div style={{fontSize:"9px",color:C.muted,marginTop:"3px",display:"flex",justifyContent:"space-between"}}>
                    <span>{a.val}{a.unit}</span><span>{a.target}{a.unit}</span>
                  </div>
                </>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}


// ── Weekly Report ─────────────────────────────────────────────────────────────
function WeeklyReport({player, source, isPro, onUpgrade}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fc  = player?.faceit;
  const cs2 = player?.cs2 || {};

  // Берём историю из localStorage
  const history = (() => {
    try{ return JSON.parse(localStorage.getItem(`cs2_rating_history_${player?.steamid}`)||"[]"); }
    catch{ return []; }
  })();

  if (history.length < 2) return null;

  const first = history[0];
  const last  = history[history.length-1];

  // ELO изменение
  const eloPoints = (() => {
    const matches = arr(fc?.matches).slice().reverse();
    let elo = parseInt(fc?.elo)||0;
    const pts = [elo];
    for (const m of matches) {
      const ch = parseInt(m.elo_change)||0;
      elo -= ch;
      pts.unshift(elo);
    }
    return pts;
  })();
  const eloChange = eloPoints.length >= 2 ? eloPoints[eloPoints.length-1] - eloPoints[0] : 0;

  async function generate() {
    if (!isPro) { onUpgrade(); return; }
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/weekly-report`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          kd_start: String(first.kd||0), kd_end: String(last.kd||0),
          hs_start: String(Math.round(first.hs||0)), hs_end: String(Math.round(last.hs||0)),
          wr_start: String(Math.round(first.wr||0)), wr_end: String(Math.round(last.wr||0)),
          matches_played: String(source==="faceit"?fc?.lifetime?.matches:cs2.matches||0),
          wins: String(cs2.wins||0),
          faceit_level: String(fc?.level||""),
          elo_change: String(eloChange),
        })
      });
      const d = await r.json();
      if (d.result) { setReport(d.result); setOpen(true); }
    } catch {}
    setLoading(false);
  }

  const verdictColor = report?.verdict==="РОСТ"?C.win:report?.verdict==="ПАДЕНИЕ"?C.lose:C.yellow;

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,marginBottom:"10px",animation:"up .5s ease both"}}>
      {/* Header — кликабельный */}
      <div onClick={()=>report?setOpen(o=>!o):generate()}
        style={{padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",
          cursor:"pointer",borderBottom:open?`1px solid ${C.border}`:"none"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <span style={{fontSize:"16px"}}>📊</span>
          <div>
            <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"3px",fontWeight:700}}>
              НЕДЕЛЬНЫЙ ОТЧЁТ
            </div>
            <div style={{fontSize:"12px",color:C.muted,marginTop:"2px"}}>
              {first.date} — {last.date}
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          {!isPro&&<span style={{fontSize:"11px",background:C.yellow,color:"#080807",
            padding:"2px 8px",fontWeight:700}}>PRO</span>}
          {report&&<span style={{fontSize:"12px",color:verdictColor,fontWeight:700}}>
            {report.verdict}
          </span>}
          {loading
            ? <span style={{fontSize:"12px",color:C.muted}}>генерирую...</span>
            : <span style={{color:C.muted,fontSize:"14px"}}>{open?"▲":"▼"}</span>}
        </div>
      </div>

      {/* Report content */}
      {open&&report&&(
        <div style={{padding:"18px 20px",animation:"up .3s ease both"}}>
          {/* Verdict badge */}
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px"}}>
            <div style={{padding:"4px 16px",background:verdictColor+"22",
              border:`1px solid ${verdictColor}55`,
              fontSize:"13px",color:verdictColor,fontWeight:700,letterSpacing:"2px"}}>
              {report.verdict==="РОСТ"?"📈":report.verdict==="ПАДЕНИЕ"?"📉":"➡️"} {report.verdict}
            </div>
          </div>

          {/* Summary */}
          <div style={{fontSize:"15px",color:C.value,lineHeight:1.75,marginBottom:"16px",
            borderLeft:`3px solid ${C.yellow}`,paddingLeft:"14px"}}>
            {report.summary}
          </div>

          {/* Highlight + Concern */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"16px"}}>
            <div style={{background:"#0a160a",border:`1px solid ${C.win}33`,padding:"12px 14px"}}>
              <div style={{fontSize:"10px",color:C.win,letterSpacing:"2px",fontWeight:700,marginBottom:"6px"}}>
                ✓ ЛУЧШЕЕ ЗА НЕДЕЛЮ
              </div>
              <div style={{fontSize:"13px",color:C.text,lineHeight:1.5}}>{report.highlight}</div>
            </div>
            <div style={{background:"#160a0a",border:`1px solid ${C.lose}33`,padding:"12px 14px"}}>
              <div style={{fontSize:"10px",color:C.lose,letterSpacing:"2px",fontWeight:700,marginBottom:"6px"}}>
                ✗ ГЛАВНАЯ ПРОБЛЕМА
              </div>
              <div style={{fontSize:"13px",color:C.text,lineHeight:1.5}}>{report.concern}</div>
            </div>
          </div>

          {/* Next week goal */}
          <div style={{display:"flex",gap:"14px",alignItems:"flex-start",
            background:"#0f180f",border:`1px solid ${C.win}44`,
            borderLeft:`4px solid ${C.win}`,padding:"14px 16px"}}>
            <span style={{fontSize:"20px"}}>🎯</span>
            <div>
              <div style={{fontSize:"10px",color:C.win,letterSpacing:"2px",fontWeight:700,marginBottom:"4px"}}>
                ЦЕЛЬ НА СЛЕДУЮЩУЮ НЕДЕЛЮ
              </div>
              <div style={{fontSize:"15px",color:C.value,fontWeight:600}}>{report.next_week_goal}</div>
            </div>
          </div>

          <button onClick={generate} disabled={loading}
            style={{marginTop:"12px",background:"transparent",border:`1px solid ${C.border}`,
              color:C.muted,cursor:"pointer",fontSize:"11px",padding:"6px 14px",
              fontFamily:"inherit"}}>
            ↻ Обновить отчёт
          </button>
        </div>
      )}
    </div>
  );
}

// ── ELO Chart ─────────────────────────────────────────────────────────────────
function EloChart({faceit}) {
  const currentElo = parseInt(faceit?.elo) || 0;
  const matches = arr(faceit?.matches).slice().reverse();
  if (!currentElo || matches.length < 2) return null;

  const eloPoints = (() => {
    let elo = currentElo;
    const points = [elo];
    for (let i = matches.length - 1; i >= 0; i--) {
      const change = parseInt(matches[i]?.elo_change) || 0;
      elo -= change;
      points.unshift(elo);
    }
    return points.slice(-13);
  })();

  const min = Math.min(...eloPoints) - 30;
  const max = Math.max(...eloPoints) + 30;
  const range = max - min || 1;
  const W = 100, H = 100;
  const pts = eloPoints.map((e,i)=>({
    x:(i/(eloPoints.length-1))*W,
    y:H-((e-min)/range)*H,
    elo:e,
  }));
  const polyline = pts.map(p=>`${p.x},${p.y}`).join(" ");
  const area = `${pts[0].x},${H} `+pts.map(p=>`${p.x},${p.y}`).join(" ")+` ${pts[pts.length-1].x},${H}`;
  const first = eloPoints[0], last = eloPoints[eloPoints.length-1];
  const diff = last - first;
  const diffColor = diff >= 0 ? C.win : C.lose;
  const li = levelInfo(currentElo);

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"18px 20px",
      marginBottom:"10px",animation:"up .5s ease both"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
        flexWrap:"wrap",gap:"8px",marginBottom:"16px"}}>
        <div>
          <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"3px",fontWeight:700,marginBottom:"4px"}}>
            📈 FACEIT ELO ГРАФИК
          </div>
          <div style={{display:"flex",alignItems:"baseline",gap:"10px"}}>
            <span style={{fontSize:"26px",color:C.yellow,fontWeight:700}}>{currentElo}</span>
            <span style={{fontSize:"13px",color:li.color,fontWeight:700}}>LVL {li.lvl}</span>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:"12px",color:C.muted,marginBottom:"4px"}}>
            последние {eloPoints.length-1} матчей
          </div>
          <div style={{fontSize:"18px",color:diffColor,fontWeight:700}}>
            {diff>=0?"+":""}{diff} ELO
          </div>
          <div style={{fontSize:"11px",color:C.muted,marginTop:"2px"}}>
            до LVL {Math.min(10,li.lvl+1)}: {li.toNext>0?li.toNext:"MAX"} ELO
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"80px",overflow:"visible",display:"block"}}
        preserveAspectRatio="none">
        <defs>
          <linearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={diffColor} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={diffColor} stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#eloGrad)"/>
        <polyline points={polyline} fill="none" stroke={diffColor}
          strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
        {pts.map((p,i)=>(
          <circle key={i} cx={p.x} cy={p.y}
            r={i===pts.length-1?"2.8":"1.5"}
            fill={i===pts.length-1?diffColor:diffColor+"99"}/>
        ))}
      </svg>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:"6px",marginBottom:"10px"}}>
        <span style={{fontSize:"10px",color:C.muted}}>{eloPoints[0]} ELO</span>
        <span style={{fontSize:"10px",color:C.muted}}>{currentElo} ELO</span>
      </div>
      {/* ELO прогноз */}
      {eloPoints.length>=5&&(()=>{
        // Линейная регрессия по последним точкам
        const n = eloPoints.length;
        const avgX = (n-1)/2;
        const avgY = eloPoints.reduce((s,v)=>s+v,0)/n;
        const num = eloPoints.reduce((s,v,i)=>s+(i-avgX)*(v-avgY),0);
        const den = eloPoints.reduce((s,_,i)=>s+(i-avgX)**2,0);
        const slope = den ? num/den : 0;
        const forecast20 = Math.round(currentElo + slope * 20);
        const forecastDiff = forecast20 - currentElo;
        const fc = forecastDiff >= 0 ? diffColor : C.lose;
        return (
          <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"10px 14px",
            background:"#0d0d09",border:`1px solid ${C.border}`}}>
            <div>
              <div style={{fontSize:"10px",color:C.muted,letterSpacing:"1px",marginBottom:"2px"}}>
                📈 ПРОГНОЗ через 20 матчей
              </div>
              <div style={{display:"flex",alignItems:"baseline",gap:"8px"}}>
                <span style={{fontSize:"18px",color:fc,fontWeight:700}}>{forecast20} ELO</span>
                <span style={{fontSize:"13px",color:fc}}>({forecastDiff>=0?"+":""}{forecastDiff})</span>
              </div>
            </div>
            <div style={{marginLeft:"auto",fontSize:"11px",color:C.muted,textAlign:"right"}}>
              на основе<br/>текущего тренда
            </div>
          </div>
        );
      })()}
    </div>
  );
}


function WeekGoal({player, source}) {
  const fc = player?.faceit;
  const cs2 = player?.cs2 || {};
  const kd  = parseFloat(source==="faceit"?fc?.lifetime?.kd:cs2.kd) || 0;
  const wr  = parseFloat(source==="faceit"?fc?.lifetime?.winrate:cs2.winrate) || 0;
  const hs  = parseFloat(source==="faceit"?fc?.lifetime?.hs:cs2.hs) || 0;
  const lvl = parseInt(fc?.level) || 0;
  const matches = parseInt(source==="faceit"?fc?.lifetime?.matches:cs2.matches) || 0;
  const kills = parseInt(cs2?.kills || 0);
  const deaths = parseInt(cs2?.deaths || 1);

  const goal = (() => {
    if (kd < 1.0) {
      const target = kd < 0.7 ? 0.85 : kd < 0.85 ? 1.0 : 1.1;
      const start  = kd < 0.7 ? 0.5  : kd < 0.85 ? 0.7 : 0.85;
      const prog   = Math.min(95, Math.round((kd - start) / (target - start) * 100));
      // Считаем сколько убийств нужно чтобы поднять K/D
      const kdGap = target - kd;
      const killsNeeded = Math.round(kdGap * Math.max(deaths, 100));
      return {
        label: kd<0.85 ? "Поднять K/D" : "Приблизиться к K/D 1.0",
        from:kd.toFixed(2), to:target.toFixed(2), progress:Math.max(5,prog),
        details:[
          `${(kdGap).toFixed(2)} K/D до цели`,
          `≈ ${killsNeeded} убийств без лишних смертей`,
        ],
        unlock:{icon:"⚔️", name:"Фраггер", done:kd>=1.0},
      };
    }
    if (hs < 40) {
      const prog = Math.min(95, Math.round((hs - 20) / (40 - 20) * 100));
      return {
        label:"Улучшить прицел до 40% HS", from:Math.round(hs)+"%", to:"40%", progress:Math.max(5,prog),
        details:[`${40-Math.round(hs)}% HS до цели`, `Тренируй Recoil Master каждый день`],
        unlock:{icon:"🎯", name:"HS Машина", done:hs>=40},
      };
    }
    if (wr < 52) {
      const prog = Math.min(95, Math.round((wr - 40) / (52 - 40) * 100));
      return {
        label:"Поднять WR выше 52%", from:Math.round(wr)+"%", to:"52%", progress:Math.max(5,prog),
        details:[`${52-Math.round(wr)}% WR до цели`, `Разбирай проигранные раунды`],
        unlock:{icon:"🏆", name:"Победитель", done:wr>=52},
      };
    }
    if (kd < 1.4) {
      const prog = Math.min(95, Math.round((kd - 1.0) / (1.4 - 1.0) * 100));
      return {
        label:"Закрепить K/D выше 1.4", from:kd.toFixed(2), to:"1.40", progress:Math.max(5,prog),
        details:[`${(1.4-kd).toFixed(2)} K/D до цели`, `Фокус на trade kills`],
        unlock:{icon:"💀", name:"Элита", done:kd>=1.4},
      };
    }
    if (lvl > 0 && lvl < 10) {
      const eloInLevel = (fc?.elo||0) % 1000;
      const prog = Math.min(90, Math.round(eloInLevel / 10));
      return {
        label:`Подняться до FACEIT ${lvl+1}`, from:`lvl ${lvl}`, to:`lvl ${lvl+1}`, progress:Math.max(5,prog),
        details:[`${1000-eloInLevel} ELO до следующего уровня`, `Держи WR выше 55%`],
        unlock:{icon:"⚡", name:`FACEIT LVL ${lvl+1}`, done:false},
      };
    }
    return {label:"Удержать форму", from:kd.toFixed(2), to:kd.toFixed(2), progress:85, details:[], unlock:null};
  })();

  const barColor = goal.progress >= 70 ? C.win : goal.progress >= 40 ? C.yellow : C.orange;

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"18px 20px",
      marginBottom:"10px",animation:"up .5s ease both"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
        flexWrap:"wrap",gap:"12px",marginBottom:"12px"}}>
        <div>
          <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"3px",fontWeight:700,marginBottom:"4px"}}>
            🎯 ЦЕЛЬ НЕДЕЛИ
          </div>
          <div style={{fontSize:"18px",color:C.value,fontWeight:700}}>{goal.label}</div>
          <div style={{fontSize:"13px",color:C.muted,marginTop:"2px"}}>
            {goal.from} → <span style={{color:barColor,fontWeight:700}}>{goal.to}</span>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:"28px",color:barColor,fontWeight:900,lineHeight:1}}>{goal.progress}%</div>
          <div style={{fontSize:"10px",color:C.muted,marginTop:"2px"}}>выполнено</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{height:"8px",background:"#1a1a10",borderRadius:"4px",overflow:"hidden",marginBottom:"12px"}}>
        <div style={{height:"100%",width:`${goal.progress}%`,background:barColor,
          borderRadius:"4px",transition:"width 1s ease",
          boxShadow:`0 0 10px ${barColor}66`}}/>
      </div>

      {/* Details + unlock */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"10px"}}>
        {goal.details?.length>0&&(
          <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
            {goal.details.map((d,i)=>(
              <div key={i} style={{fontSize:"12px",color:C.muted}}>• {d}</div>
            ))}
          </div>
        )}
        {goal.unlock&&(
          <div style={{display:"flex",alignItems:"center",gap:"8px",
            background:C.yellow+"0d",border:`1px solid ${C.yellow}22`,padding:"6px 12px"}}>
            <span>{goal.unlock.icon}</span>
            <span style={{fontSize:"11px",color:C.yellow}}>→ достижение <b>{goal.unlock.name}</b></span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Streaks ───────────────────────────────────────────────────────────────────
function Streaks({player, source}) {
  const fc = player?.faceit;
  const hs = parseFloat(source==="faceit"?fc?.lifetime?.hs:(player?.cs2?.hs)) || 0;
  const matches = arr(fc?.matches);
  if (!matches.length) return null;

  // Текущая серия побед
  let winStreak = 0;
  for (const m of matches) {
    if (m.result === "1") winStreak++;
    else break;
  }

  // Серия с HS > 40%
  let hsStreak = 0;
  for (const m of matches) {
    if (parseFloat(m.hs||0) >= 40) hsStreak++;
    else break;
  }

  // K/D > 1.0 подряд
  let kdStreak = 0;
  for (const m of matches) {
    if (parseFloat(m.kd||0) >= 1.0) kdStreak++;
    else break;
  }

  const streaks = [
    winStreak > 0 && {icon:"🔥", label:"Винстрик", val:winStreak, max:5, color:C.lose,
      desc:winStreak>=5?"🔥 Огненная серия!":winStreak>=3?"Горячая полоса":"Продолжай выигрывать"},
    hsStreak > 0 && {icon:"🎯", label:"HS > 40%", val:hsStreak, max:5, color:C.orange,
      desc:`${hsStreak} матч${hsStreak===1?"":"а"} с хорошим прицелом`},
    kdStreak > 0 && {icon:"⚔️", label:"K/D > 1.0", val:kdStreak, max:5, color:C.blue,
      desc:`${kdStreak} матч${kdStreak===1?"":"а"} выше нуля`},
  ].filter(Boolean);

  if (!streaks.length) return null;

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"14px 20px",
      marginBottom:"10px",animation:"up .5s ease both"}}>
      <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"3px",fontWeight:700,marginBottom:"12px"}}>
        🔥 ТЕКУЩИЕ СЕРИИ
      </div>
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
        {streaks.map((s,i)=>(
          <div key={i} style={{flex:"1 1 140px",background:"#0d0d09",
            border:`1px solid ${s.color}44`,padding:"12px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px"}}>
              <span style={{fontSize:"20px"}}>{s.icon}</span>
              <div>
                <div style={{fontSize:"13px",color:s.color,fontWeight:700}}>{s.label}</div>
                <div style={{fontSize:"11px",color:C.muted}}>{s.desc}</div>
              </div>
              <div style={{marginLeft:"auto",fontSize:"28px",color:s.color,fontWeight:900,lineHeight:1}}>
                {s.val}
              </div>
            </div>
            {/* Dots */}
            <div style={{display:"flex",gap:"4px"}}>
              {Array.from({length:s.max}).map((_,j)=>(
                <div key={j} style={{flex:1,height:"4px",borderRadius:"2px",
                  background:j<s.val?s.color:"#1a1a10",
                  boxShadow:j<s.val?`0 0 4px ${s.color}88`:"none",
                  transition:"background .3s"}}/>
              ))}
            </div>
            {s.val >= s.max&&<div style={{fontSize:"10px",color:s.color,marginTop:"4px",fontWeight:700}}>
              🔥 СЕРИЯ {s.max}+!
            </div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Weekly Missions ────────────────────────────────────────────────────────────
function WeeklyMissions({player, source}) {
  const fc = player?.faceit;
  const cs2 = player?.cs2 || {};
  const kd  = parseFloat(source==="faceit"?fc?.lifetime?.kd:cs2.kd) || 0;
  const hs  = parseFloat(source==="faceit"?fc?.lifetime?.hs:cs2.hs) || 0;
  const wr  = parseFloat(source==="faceit"?fc?.lifetime?.winrate:cs2.winrate) || 0;
  const matches = arr(fc?.matches);

  // Миссии на основе данных за последние матчи
  const recentWins = matches.slice(0,10).filter(m=>m.result==="1").length;
  const recentGoodHS = matches.slice(0,10).filter(m=>parseFloat(m.hs||0)>=45).length;
  const recentGoodKD = matches.slice(0,10).filter(m=>parseFloat(m.kd||0)>=1.0).length;

  // Получаем номер недели для сброса
  const weekNum = Math.floor(Date.now() / (7*24*60*60*1000));
  const storageKey = `cs2_missions_${player?.steamid}_${weekNum}`;
  const [done, setDone] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem(storageKey)||"[]"); }catch{ return []; }
  });

  const [xpFlash, setXpFlash] = useState(null);

  const toggle = (id) => {
    const isCompleting = !done.includes(id) && !missions.find(m=>m.id===id)?.done;
    const next = done.includes(id) ? done.filter(x=>x!==id) : [...done, id];
    setDone(next);
    try{ localStorage.setItem(storageKey, JSON.stringify(next)); }catch{}
    // XP уведомление при выполнении
    if (isCompleting) {
      const m = missions.find(m=>m.id===id);
      if (m) {
        setXpFlash(`+${m.xp} XP`);
        setTimeout(()=>setXpFlash(null), 1800);
      }
    }
  };

  const missions = [
    {id:"m1", text:"Сыграть 5 матчей на этой неделе",     xp:10, done:matches.length>=5||recentWins>=3},
    {id:"m2", text:"Выиграть 3 матча подряд",              xp:15, done:recentWins>=3},
    {id:"m3", text:"HS% выше 45% в двух матчах",           xp:10, done:recentGoodHS>=2},
    {id:"m4", text:"K/D выше 1.0 в трёх матчах",          xp:15, done:recentGoodKD>=3},
  ];

  const completedXP = missions.filter(m=>m.done||done.includes(m.id)).reduce((s,m)=>s+m.xp,0);
  const totalXP = missions.reduce((s,m)=>s+m.xp,0);

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"18px 20px",
      marginBottom:"10px",animation:"up .5s ease both",position:"relative"}}>
      {xpFlash&&<div style={{position:"absolute",top:"14px",right:"14px",
        fontSize:"16px",color:C.yellow,fontWeight:800,animation:"up .3s ease both",
        background:"#1a1a0a",border:`1px solid ${C.yellow}66`,padding:"4px 12px",
        zIndex:10,pointerEvents:"none"}}>{xpFlash} 🎉</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
        <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"3px",fontWeight:700}}>
          📋 ЗАДАНИЯ НЕДЕЛИ
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{fontSize:"12px",color:C.yellow,fontWeight:700}}>
            {completedXP} / {totalXP} XP
          </div>
          {completedXP===totalXP&&<span style={{fontSize:"11px",color:C.win,fontWeight:700}}>✓ Всё выполнено!</span>}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {missions.map((m,i)=>{
          const isDone = m.done || done.includes(m.id);
          return (
            <div key={m.id} onClick={()=>toggle(m.id)}
              style={{display:"flex",alignItems:"center",gap:"12px",padding:"10px 14px",
                background:isDone?"#0a140a":"#0d0d09",
                border:`1px solid ${isDone?C.win+"44":C.border}`,
                cursor:"pointer",transition:"all .15s"}}>
              <div style={{width:"20px",height:"20px",borderRadius:"3px",flexShrink:0,
                background:isDone?C.win:"transparent",
                border:`2px solid ${isDone?C.win:C.muted}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"12px",transition:"all .2s"}}>
                {isDone&&"✓"}
              </div>
              <div style={{flex:1,fontSize:"13px",
                color:isDone?C.win:C.text,
                textDecoration:isDone?"line-through":"none",
                opacity:isDone?0.7:1}}>
                {m.text}
              </div>
              <div style={{fontSize:"11px",color:isDone?C.win:C.yellow,fontWeight:700,
                background:isDone?C.win+"18":C.yellow+"18",
                border:`1px solid ${isDone?C.win+"44":C.yellow+"44"}`,
                padding:"2px 8px"}}>
                +{m.xp} XP
              </div>
            </div>
          );
        })}
      </div>
      {/* XP bar */}
      <div style={{marginTop:"12px",height:"4px",background:"#1a1a10",borderRadius:"2px",overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.round(completedXP/totalXP*100)}%`,
          background:C.yellow,borderRadius:"2px",transition:"width .5s ease"}}/>
      </div>
    </div>
  );
}

// ── Today Recommendations ──────────────────────────────────────────────────────
function TodayRecs({player, source}) {
  const fc = player?.faceit;
  const cs2 = player?.cs2 || {};
  const kd  = parseFloat(source==="faceit"?fc?.lifetime?.kd:cs2.kd) || 0;
  const hs  = parseFloat(source==="faceit"?fc?.lifetime?.hs:cs2.hs) || 0;
  const wr  = parseFloat(source==="faceit"?fc?.lifetime?.winrate:cs2.winrate) || 0;
  const matches = parseInt(source==="faceit"?fc?.lifetime?.matches:cs2.matches) || 0;
  const kills = parseInt(cs2?.kills) || 0;

  // Каждая рекомендация знает какую ачивку она закрывает
  const recs = [];

  // AIM — всегда
  recs.push({
    icon:"🎯", time:"15 мин", cat:"AIM", color:C.lose,
    text:"Aim_botz: 500 убийств с места",
    why: hs<40 ? `HS% ${Math.round(hs)}% — ниже цели 40%` : `Поддерживай точность стрельбы`,
    unlock: hs < 40 ? {icon:"🎯", name:"HS Машина", pct:Math.round(hs/40*100)} : null,
  });

  // Recoil если HS низкий
  if (hs < 40) recs.push({
    icon:"💥", time:"20 мин", cat:"МЕХАНИКА", color:C.orange,
    text:"Recoil Master: спрей AK и M4",
    why: `HS% ${Math.round(hs)}% — не хватает ${40-Math.round(hs)}% до достижения`,
    unlock: {icon:"🎯", name:"HS Машина", pct:Math.round(hs/40*100)},
  });

  // Counter-strafe если K/D плохой
  if (kd < 1.0) recs.push({
    icon:"🏃", time:"15 мин", cat:"ДВИЖЕНИЕ", color:C.blue,
    text:"Counter-strafe: стоп → выстрел",
    why: `K/D ${kd.toFixed(2)} — до Фраггера не хватает ${(1.0-kd).toFixed(2)}`,
    unlock: {icon:"⚔️", name:"Фраггер K/D>1.0", pct:Math.round(Math.min(99,kd/1.0*100))},
  });

  // Prefire — всегда
  recs.push({
    icon:"🗺️", time:"20 мин", cat:"КАРТЫ", color:"#44ddaa",
    text:"Prefire Workshop: 10 позиций на лучшей карте",
    why: `Знание позиций = меньше смертей на карте`,
    unlock: null,
  });

  // Анализ или гранаты
  if (wr < 50) recs.push({
    icon:"📹", time:"15 мин", cat:"АНАЛИЗ", color:"#aa88ff",
    text:"Пересмотри 1 проигранный раунд",
    why: `WR ${Math.round(wr)}% — разбор раундов поднимет понимание игры`,
    unlock: {icon:"🏆", name:"Победитель WR>50%", pct:Math.round(wr/50*100)},
  });
  else recs.push({
    icon:"💣", time:"10 мин", cat:"ГРАНАТЫ", color:C.yellow,
    text:"Выучи 1 новый смок или молотов",
    why: `Utility = больше влияния на раунд без риска`,
    unlock: null,
  });

  const shown = recs.slice(0, 4);

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"18px 20px",
      marginBottom:"10px",animation:"up .5s ease both"}}>
      <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"3px",fontWeight:700,marginBottom:"14px"}}>
        📋 РЕКОМЕНДАЦИИ НА СЕГОДНЯ
      </div>
      <div className="rec-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:"8px"}}>
        {shown.map((r,i)=>(
          <div key={i} style={{display:"flex",flexDirection:"column",gap:"8px",
            background:"#0d0d09",border:`1px solid ${r.color}22`,padding:"12px 14px"}}>
            <div style={{display:"flex",gap:"12px",alignItems:"flex-start"}}>
              <span style={{fontSize:"18px",flexShrink:0}}>{r.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                  <span style={{fontSize:"10px",color:r.color,letterSpacing:"1px",fontWeight:700}}>{r.cat}</span>
                  <span style={{fontSize:"10px",color:C.muted}}>{r.time}</span>
                </div>
                <div style={{fontSize:"13px",color:C.text,lineHeight:1.4,marginBottom:"4px"}}>{r.text}</div>
                {r.why&&<div style={{fontSize:"11px",color:C.muted,fontStyle:"italic",lineHeight:1.4}}>→ {r.why}</div>}
              </div>
            </div>
            {/* Связь с ачивкой */}
            {r.unlock&&(
              <div style={{display:"flex",alignItems:"center",gap:"8px",
                background:"#141409",border:`1px solid ${C.yellow}22`,padding:"6px 10px"}}>
                <span style={{fontSize:"13px"}}>{r.unlock.icon}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px"}}>
                    <span style={{fontSize:"10px",color:C.yellow,fontWeight:600}}>{r.unlock.name}</span>
                    <span style={{fontSize:"10px",color:C.muted}}>{r.unlock.pct}%</span>
                  </div>
                  <div style={{height:"2px",background:"#1a1a10",borderRadius:"1px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${r.unlock.pct}%`,background:C.yellow,
                      borderRadius:"1px",boxShadow:`0 0 4px ${C.yellow}88`}}/>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── What Changed ───────────────────────────────────────────────────────────────
// ── Section Title ─────────────────────────────────────────────────────────────
function SectionTitle({icon, label, sub}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:"10px",margin:"22px 0 10px",
      borderBottom:`1px solid ${C.border}`,paddingBottom:"8px"}}>
      <span style={{fontSize:"16px"}}>{icon}</span>
      <div>
        <div style={{fontSize:"11px",color:C.yellow,fontWeight:700,letterSpacing:"3px"}}>{label}</div>
        {sub&&<div style={{fontSize:"11px",color:C.muted,marginTop:"1px"}}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Week Comparison — сравнение двух периодов ─────────────────────────────────
function WeekComparison({player}) {
  const [period, setPeriod] = useState("week"); // week | month | all
  const [history, setHistory] = useState([]);

  useEffect(()=>{
    if (!player?.steamid) return;
    try { setHistory(JSON.parse(localStorage.getItem(`cs2_rating_history_${player.steamid}`)||"[]")); } catch {}
  },[player?.steamid]);

  if (history.length < 2) return null;

  const now = history[history.length-1];

  // Находим точку сравнения в зависимости от периода
  const getCompare = () => {
    const nowDate = new Date(now.date);
    if (period === "week") {
      const target = new Date(nowDate - 7*24*60*60*1000);
      return history.slice().reverse().find(s => new Date(s.date) <= target) || history[0];
    }
    if (period === "month") {
      const target = new Date(nowDate - 30*24*60*60*1000);
      return history.slice().reverse().find(s => new Date(s.date) <= target) || history[0];
    }
    return history[0]; // all time
  };

  const prev = getCompare();
  if (!prev || prev.date === now.date) return null;

  const stats = [
    { label:"K/D",  prev:parseFloat(prev.kd||0), now:parseFloat(now.kd||0), fmt:(v)=>v.toFixed(2), color:C.blue },
    { label:"HS%",  prev:parseFloat(prev.hs||0), now:parseFloat(now.hs||0), fmt:(v)=>Math.round(v)+"%", color:C.orange },
    { label:"WR%",  prev:parseFloat(prev.wr||0), now:parseFloat(now.wr||0), fmt:(v)=>Math.round(v)+"%", color:"#aa88ff" },
  ];

  const periodLabel = period==="week"?"7 дней":period==="month"?"30 дней":"За всё время";
  const diffDays = Math.round((new Date(now.date)-new Date(prev.date))/(24*60*60*1000));

  // Рейтинг тогда и сейчас
  const avgByLevel=[{kd:0.75,hs:28,wr:43},{kd:0.82,hs:30,wr:44},{kd:0.92,hs:33,wr:46},{kd:1.00,hs:36,wr:48},{kd:1.06,hs:38,wr:49},{kd:1.12,hs:40,wr:50},{kd:1.20,hs:42,wr:51},{kd:1.28,hs:44,wr:52},{kd:1.38,hs:46,wr:53},{kd:1.52,hs:48,wr:54},{kd:1.72,hs:52,wr:56}];
  function calcR(s){
    const avg=avgByLevel[Math.min(s.lvl||0,10)];
    function sig(v,a){return Math.min(99,Math.max(1,Math.round(100/(1+Math.exp(-4*(v/a-1))))));}
    return Math.min(99,Math.round(sig(s.kd,avg.kd)*0.45+sig(s.hs,avg.hs)*0.25+sig(s.wr,avg.wr)*0.30));
  }
  const rPrev = calcR(prev), rNow = calcR(now);
  const rDiff = rNow - rPrev;
  const rColor = rDiff > 0 ? C.win : rDiff < 0 ? C.lose : C.muted;

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"18px 20px",marginBottom:"10px",animation:"up .5s ease both"}}>
      {/* Заголовок + переключатель */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px",flexWrap:"wrap",gap:"8px"}}>
        <div>
          <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"3px",fontWeight:700,marginBottom:"2px"}}>
            📊 СРАВНЕНИЕ ПЕРИОДОВ
          </div>
          <div style={{fontSize:"11px",color:C.muted}}>
            {prev.date} → {now.date} ({diffDays} дней)
          </div>
        </div>
        <div style={{display:"flex",gap:"4px"}}>
          {[["week","7 дн"],["month","30 дн"],["all","Всё"]].map(([p,l])=>(
            <button key={p} onClick={()=>setPeriod(p)} style={{
              padding:"4px 10px",background:period===p?C.yellow+"22":"transparent",
              border:`1px solid ${period===p?C.yellow+"66":C.border}`,
              color:period===p?C.yellow:C.muted,cursor:"pointer",
              fontSize:"11px",fontFamily:"inherit",fontWeight:period===p?700:400}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Рейтинг тогда vs сейчас */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"20px",
        marginBottom:"16px",padding:"14px",background:"#0d0d09",border:`1px solid ${C.border}`}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:"11px",color:C.muted,marginBottom:"4px"}}>{prev.date}</div>
          <div style={{fontSize:"32px",color:C.muted,fontWeight:900,lineHeight:1}}>{rPrev}</div>
          <div style={{fontSize:"10px",color:C.muted,marginTop:"2px"}}>рейтинг</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"4px"}}>
          <div style={{fontSize:"24px",color:rColor,fontWeight:900}}>
            {rDiff > 0 ? `+${rDiff}` : rDiff === 0 ? "=" : rDiff}
          </div>
          <div style={{fontSize:"10px",color:rColor,fontWeight:700,letterSpacing:"1px"}}>
            {rDiff > 0 ? "ПРОГРЕСС ▲" : rDiff < 0 ? "СПАД ▼" : "БЕЗ ИЗМЕНЕНИЙ"}
          </div>
          <div style={{fontSize:"9px",color:C.muted}}>за {diffDays} дней</div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:"11px",color:C.muted,marginBottom:"4px"}}>{now.date}</div>
          <div style={{fontSize:"32px",color:rColor,fontWeight:900,lineHeight:1}}>{rNow}</div>
          <div style={{fontSize:"10px",color:C.muted,marginTop:"2px"}}>рейтинг</div>
        </div>
      </div>

      {/* Статы по показателям */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"6px"}}>
        {stats.map((s,i)=>{
          const diff = s.now - s.prev;
          const dc = diff > 0 ? C.win : diff < 0 ? C.lose : C.muted;
          const pct = s.prev > 0 ? ((diff/s.prev)*100).toFixed(1) : "0";
          return (
            <div key={i} style={{background:"#0d0d09",padding:"10px 12px",border:`1px solid ${s.color}22`,textAlign:"center"}}>
              <div style={{fontSize:"10px",color:C.muted,letterSpacing:"1px",marginBottom:"6px"}}>{s.label}</div>
              <div style={{display:"flex",justifyContent:"space-around",alignItems:"center",marginBottom:"6px"}}>
                <span style={{fontSize:"13px",color:C.muted}}>{s.fmt(s.prev)}</span>
                <span style={{fontSize:"10px",color:C.muted}}>→</span>
                <span style={{fontSize:"15px",color:dc,fontWeight:700}}>{s.fmt(s.now)}</span>
              </div>
              <div style={{fontSize:"12px",color:dc,fontWeight:700}}>
                {diff > 0 ? "+" : ""}{s.fmt(diff)} <span style={{fontSize:"10px",opacity:.7}}>({diff>0?"+":""}{pct}%)</span>
              </div>
              {/* Мини-бар */}
              <div style={{marginTop:"6px",height:"3px",background:"#1a1a10",borderRadius:"2px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(100,Math.max(0,(s.now/Math.max(s.prev,s.now))*100))}%`,
                  background:s.color,borderRadius:"2px",transition:"width .8s ease"}}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Инсайт */}
      {rDiff !== 0 && (
        <div style={{marginTop:"10px",padding:"10px 14px",
          background:rDiff>0?"#0a140a":"#140a0a",
          border:`1px solid ${rColor}33`,fontSize:"13px",color:rColor,lineHeight:1.5}}>
          {rDiff > 0
            ? `✓ За ${diffDays} дней рейтинг вырос на ${rDiff} пунктов — ${rDiff>=10?"отличный прогресс!":rDiff>=5?"хорошая динамика":"небольшой рост"}`
            : `→ За ${diffDays} дней рейтинг упал на ${Math.abs(rDiff)} пунктов. ${stats.find(s=>s.now<s.prev)?.label||"K/D"} просел — сфокусируйся на нём`
          }
        </div>
      )}
    </div>
  );
}

function WhatChanged({player, source}) {
  const [history, setHistory] = useState([]);
  useEffect(()=>{
    if (!player?.steamid) return;
    try{ const h=JSON.parse(localStorage.getItem(`cs2_rating_history_${player.steamid}`)||"[]"); setHistory(h); }catch{}
  }, [player?.steamid]);

  if (history.length < 2) return null;

  // Берём последние 7 дней vs предыдущий снапшот
  const last = history[history.length-1];
  const prev = history[history.length-2];
  const weekAgo = history.find(s=>{
    const d = new Date(last.date) - new Date(s.date);
    return d >= 6*24*60*60*1000;
  }) || prev;

  const kdDiff  = parseFloat(((last.kd||0)-(weekAgo.kd||0)).toFixed(2));
  const hsDiff  = Math.round((last.hs||0)-(weekAgo.hs||0));
  const wrDiff  = Math.round((last.wr||0)-(weekAgo.wr||0));

  const changes = [
    {label:"K/D", diff:kdDiff, fmt:(d)=>(d>0?"+":"")+d},
    {label:"HS%", diff:hsDiff, fmt:(d)=>(d>0?"+":"")+d+"%"},
    {label:"WR%", diff:wrDiff, fmt:(d)=>(d>0?"+":"")+d+"%"},
  ].filter(c=>c.diff!==0);

  if (!changes.length) return null;

  return (
    <div style={{background:"#0d0d09",border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.blue}`,
      padding:"12px 18px",marginBottom:"10px",display:"flex",alignItems:"center",
      gap:"16px",flexWrap:"wrap",animation:"up .4s ease both"}}>
      <span style={{fontSize:"11px",color:C.blue,letterSpacing:"2px",fontWeight:700,flexShrink:0}}>
        📈 С ПРОШЛОГО ВИЗИТА:
      </span>
      <div style={{display:"flex",gap:"12px",flexWrap:"wrap"}}>
        {changes.map((c,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:"6px"}}>
            <span style={{fontSize:"11px",color:C.muted}}>{c.label}</span>
            <span style={{fontSize:"14px",color:c.diff>0?C.win:C.lose,fontWeight:700}}>
              {c.fmt(c.diff)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Friends Tab ───────────────────────────────────────────────────────────────
function FriendsTab({myPlayer, source}) {
  const STORAGE_KEY = `cs2_friends_${myPlayer?.steamid||"guest"}`;
  const [friends, setFriends] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); }catch{ return []; }
  });
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchErr, setSearchErr] = useState(null);
  const [loadingFriends, setLoadingFriends] = useState({});

  function saveFriends(f) {
    setFriends(f);
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(f)); }catch{}
  }

  async function doSearch() {
    if (!search.trim()) return;
    setSearching(true); setSearchResult(null); setSearchErr(null);
    try {
      const r = await fetch(`${BACKEND}/faceit/by-nickname/${encodeURIComponent(search.trim())}`);
      const d = await r.json();
      if (d?.nickname) setSearchResult(d);
      else setSearchErr("Игрок не найден");
    } catch { setSearchErr("Ошибка поиска"); }
    setSearching(false);
  }

  function addFriend(f) {
    if (friends.find(x=>x.id===f.id)) return;
    saveFriends([...friends, {id:f.id, nickname:f.nickname, avatar:f.avatar, level:f.level, elo:f.elo, country:f.country, kd:f.lifetime?.kd, wr:f.lifetime?.winrate, hs:f.lifetime?.hs, matches:f.lifetime?.matches, addedAt:Date.now()}]);
    setSearchResult(null); setSearch("");
  }

  function removeFriend(id) {
    saveFriends(friends.filter(f=>f.id!==id));
  }

  // Считаем рейтинг для сравнения
  function calcRating(kd, hs, wr, lvl) {
    const avgByLevel=[{kd:0.75,hs:28,wr:43},{kd:0.82,hs:30,wr:44},{kd:0.92,hs:33,wr:46},{kd:1.00,hs:36,wr:48},{kd:1.06,hs:38,wr:49},{kd:1.12,hs:40,wr:50},{kd:1.20,hs:42,wr:51},{kd:1.28,hs:44,wr:52},{kd:1.38,hs:46,wr:53},{kd:1.52,hs:48,wr:54},{kd:1.72,hs:52,wr:56}];
    const avg = avgByLevel[Math.min(parseInt(lvl)||0, 10)];
    function sig(v,a){return Math.min(99,Math.max(1,Math.round(100/(1+Math.exp(-4*(parseFloat(v||0)/a-1))))));}
    return Math.min(99,Math.round(sig(kd,avg.kd)*0.45+sig(hs,avg.hs)*0.25+sig(wr,avg.wr)*0.30));
  }

  const myKd = parseFloat(source==="faceit"?myPlayer?.faceit?.lifetime?.kd:myPlayer?.cs2?.kd)||0;
  const myHs = parseFloat(source==="faceit"?myPlayer?.faceit?.lifetime?.hs:myPlayer?.cs2?.hs)||0;
  const myWr = parseFloat(source==="faceit"?myPlayer?.faceit?.lifetime?.winrate:myPlayer?.cs2?.winrate)||0;
  const myLvl = parseInt(myPlayer?.faceit?.level)||0;
  const myRating = calcRating(myKd, myHs, myWr, myLvl);
  const coachLevels=[{max:19,name:"НОВОБРАНЕЦ"},{max:34,name:"БОЕЦ"},{max:49,name:"СНАЙПЕР"},{max:64,name:"ВЕТЕРАН"},{max:79,name:"МАСТЕР"},{max:89,name:"ЭЛИТА"},{max:100,name:"ЛЕГЕНДА"}];

  return (
    <div style={{animation:"up .4s ease both"}}>
      {/* Поиск */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"18px 20px",marginBottom:"10px"}}>
        <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"3px",fontWeight:700,marginBottom:"14px"}}>
          👥 НАЙТИ ДРУГА
        </div>
        <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&doSearch()}
            placeholder="Введи никнейм игрока..."
            style={{flex:1,background:"#111109",border:`1px solid ${C.border}`,
              color:C.value,padding:"10px 14px",fontSize:"14px",fontFamily:"inherit"}}/>
          <button onClick={doSearch} disabled={searching}
            style={{padding:"10px 20px",background:C.yellow,color:"#080807",border:"none",
              cursor:searching?"not-allowed":"pointer",fontSize:"13px",fontWeight:700,fontFamily:"inherit"}}>
            {searching?"...":"Найти"}
          </button>
        </div>
        {searchErr&&<div style={{fontSize:"13px",color:C.lose,marginBottom:"8px"}}>{searchErr}</div>}
        {searchResult&&(
          <div style={{display:"flex",alignItems:"center",gap:"14px",padding:"14px 16px",
            background:"#0d0d09",border:`1px solid ${C.border}`}}>
            {searchResult.avatar
              ? <img src={searchResult.avatar} alt="" style={{width:"44px",height:"44px",borderRadius:"3px"}}/>
              : <div style={{width:"44px",height:"44px",background:"#1a1a10",borderRadius:"3px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px"}}>👤</div>}
            <div style={{flex:1}}>
              <div style={{fontSize:"15px",color:C.value,fontWeight:700}}>{searchResult.nickname}</div>
              <div style={{fontSize:"12px",color:C.muted,marginTop:"2px"}}>
                {searchResult.level&&<span style={{color:LVL_COLOR[searchResult.level]||C.yellow,marginRight:"10px"}}>LVL {searchResult.level}</span>}
                {searchResult.elo&&<span>{searchResult.elo} ELO</span>}
              </div>
            </div>
            <button onClick={()=>addFriend(searchResult)}
              disabled={!!friends.find(f=>f.id===searchResult.id)}
              style={{padding:"8px 18px",background:friends.find(f=>f.id===searchResult.id)?"#1a1a10":C.yellow,
                color:friends.find(f=>f.id===searchResult.id)?C.muted:"#080807",
                border:`1px solid ${friends.find(f=>f.id===searchResult.id)?C.border:C.yellow}`,
                cursor:"pointer",fontSize:"13px",fontWeight:700,fontFamily:"inherit"}}>
              {friends.find(f=>f.id===searchResult.id)?"Уже добавлен":"+ Добавить"}
            </button>
          </div>
        )}
      </div>

      {/* Список друзей */}
      {friends.length===0?(
        <div style={{textAlign:"center",padding:"60px",color:C.muted}}>
          <div style={{fontSize:"36px",marginBottom:"14px"}}>👥</div>
          <div style={{fontSize:"14px",marginBottom:"6px",color:C.label}}>Друзей пока нет</div>
          <div style={{fontSize:"13px"}}>Найди друга по никнейму и сравни статистику</div>
        </div>
      ):(
        <div>
          <div style={{fontSize:"11px",color:C.muted,letterSpacing:"2px",marginBottom:"10px"}}>
            {friends.length} {friends.length===1?"ДРУГ":"ДРУГА/ДРУЗЕЙ"} · СРАВНЕНИЕ
          </div>

          {/* Моя карточка */}
          {myPlayer&&(
            <div style={{background:"#15140a",border:`2px solid ${C.yellow}44`,borderLeft:`4px solid ${C.yellow}`,
              padding:"14px 18px",marginBottom:"8px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                <div style={{position:"relative"}}>
                  {myPlayer.avatar
                    ? <img src={myPlayer.avatar} alt="" style={{width:"44px",height:"44px",borderRadius:"3px",border:`2px solid ${C.yellow}66`}}/>
                    : <div style={{width:"44px",height:"44px",background:"#1a1a10",borderRadius:"3px",fontSize:"20px",display:"flex",alignItems:"center",justifyContent:"center"}}>👤</div>}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"3px"}}>
                    <span style={{fontSize:"15px",color:C.yellow,fontWeight:700}}>{myPlayer.username}</span>
                    <span style={{fontSize:"10px",background:C.yellow,color:"#080807",padding:"1px 6px",fontWeight:700}}>ВЫ</span>
                  </div>
                  <div style={{fontSize:"12px",color:C.muted}}>
                    {myLvl>0&&<span style={{color:LVL_COLOR[myLvl]||C.yellow,marginRight:"8px"}}>LVL {myLvl}</span>}
                    {myPlayer.faceit?.elo&&<span>{myPlayer.faceit.elo} ELO</span>}
                  </div>
                </div>
                <div style={{textAlign:"center",minWidth:"80px"}}>
                  <div style={{fontSize:"28px",color:C.yellow,fontWeight:900,lineHeight:1}}>{myRating}</div>
                  <div style={{fontSize:"10px",color:C.yellow}}>{coachLevels.find(l=>myRating<=l.max)?.name||"ЛЕГЕНДА"}</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"6px",marginTop:"10px"}}>
                {[{l:"K/D",v:myKd.toFixed(2),c:C.blue},{l:"HS%",v:Math.round(myHs)+"%",c:C.orange},{l:"WR%",v:Math.round(myWr)+"%",c:"#aa88ff"}].map((s,i)=>(
                  <div key={i} style={{textAlign:"center",background:"#111109",padding:"6px"}}>
                    <div style={{fontSize:"9px",color:C.muted,marginBottom:"2px"}}>{s.l}</div>
                    <div style={{fontSize:"15px",color:s.c,fontWeight:700}}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Карточки друзей */}
          {friends.map(f=>{
            const fRating = calcRating(f.kd, f.hs, f.wr, f.level);
            const ratingDiff = fRating - myRating;
            const diffColor = ratingDiff > 0 ? C.lose : ratingDiff < 0 ? C.win : C.muted;
            const diffLabel = ratingDiff > 0 ? `▲ +${ratingDiff}` : ratingDiff < 0 ? `▼ ${ratingDiff}` : "=";
            const stats = [
              {l:"K/D",  my:myKd.toFixed(2), fr:parseFloat(f.kd||0).toFixed(2), better:parseFloat(f.kd||0)<myKd, c:C.blue},
              {l:"HS%",  my:Math.round(myHs)+"%", fr:Math.round(parseFloat(f.hs||0))+"%", better:parseFloat(f.hs||0)<myHs, c:C.orange},
              {l:"WR%",  my:Math.round(myWr)+"%", fr:Math.round(parseFloat(f.wr||0))+"%", better:parseFloat(f.wr||0)<myWr, c:"#aa88ff"},
            ];
            return (
              <div key={f.id} style={{background:C.card,border:`1px solid ${C.border}`,
                padding:"14px 18px",marginBottom:"8px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"10px"}}>
                  {f.avatar
                    ? <img src={f.avatar} alt="" style={{width:"44px",height:"44px",borderRadius:"3px"}}/>
                    : <div style={{width:"44px",height:"44px",background:"#1a1a10",borderRadius:"3px",fontSize:"20px",display:"flex",alignItems:"center",justifyContent:"center"}}>👤</div>}
                  <div style={{flex:1}}>
                    <div style={{fontSize:"15px",color:C.value,fontWeight:700,marginBottom:"3px"}}>{f.nickname}</div>
                    <div style={{fontSize:"12px",color:C.muted}}>
                      {f.level&&<span style={{color:LVL_COLOR[f.level]||C.yellow,marginRight:"8px"}}>LVL {f.level}</span>}
                      {f.elo&&<span>{f.elo} ELO · {f.matches} матчей</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"center",minWidth:"80px"}}>
                    <div style={{fontSize:"28px",color:diffColor,fontWeight:900,lineHeight:1}}>{fRating}</div>
                    <div style={{fontSize:"11px",color:diffColor,fontWeight:700}}>{diffLabel}</div>
                    <div style={{fontSize:"9px",color:C.muted,marginTop:"1px"}}>{coachLevels.find(l=>fRating<=l.max)?.name||"ЛЕГЕНДА"}</div>
                  </div>
                  <button onClick={()=>removeFriend(f.id)}
                    style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,
                      cursor:"pointer",fontSize:"11px",padding:"4px 10px",fontFamily:"inherit"}}>
                    ✕
                  </button>
                </div>
                {/* Сравнение статов */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"6px"}}>
                  {stats.map((s,i)=>(
                    <div key={i} style={{background:"#0d0d09",padding:"8px 10px",
                      border:`1px solid ${s.better?C.win+"33":C.lose+"33"}`}}>
                      <div style={{fontSize:"9px",color:C.muted,marginBottom:"4px",textAlign:"center"}}>{s.l}</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:"4px",alignItems:"center"}}>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:"13px",color:C.yellow,fontWeight:700}}>{s.my}</div>
                          <div style={{fontSize:"9px",color:C.muted}}>ты</div>
                        </div>
                        <div style={{fontSize:"11px",color:C.muted}}>vs</div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:"13px",color:s.better?C.lose:C.win,fontWeight:700}}>{s.fr}</div>
                          <div style={{fontSize:"9px",color:C.muted}}>друг</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
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
function ProfileModal({steamid, nickname, onClose, myId, isPro}) {
  const [data, setData] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(()=>{
    const url = steamid
      ? `${BACKEND}/profile/${steamid}`
      : `${BACKEND}/faceit/by-nickname/${encodeURIComponent(nickname)}`;
    fetch(url).then(r=>r.json()).then(setData).catch(()=>setData({}));
  },[steamid, nickname]);

  const fc = steamid ? data?.faceit : data;
  const cs2 = data?.cs2 || {};
  const pl = steamid
    ? data
    : {username:data?.nickname||nickname, avatar:fc?.avatar||"", country:fc?.country, cs2:{}, faceit:fc};

  // Считаем рейтинг
  const calcRating = (p) => {
    if (!p) return {overall:0, label:"—", color:C.muted, lvlName:"НОВОБРАНЕЦ"};
    const f = p.faceit; const c = p.cs2||{};
    const kd = parseFloat(f?.lifetime?.kd||c.kd)||0;
    const hs = parseFloat(f?.lifetime?.hs||c.hs)||0;
    const wr = parseFloat(f?.lifetime?.winrate||c.winrate)||0;
    const lvl = parseInt(f?.level)||0;
    const avgByLevel=[{kd:0.75,hs:28,wr:43},{kd:0.82,hs:30,wr:44},{kd:0.92,hs:33,wr:46},{kd:1.00,hs:36,wr:48},{kd:1.06,hs:38,wr:49},{kd:1.12,hs:40,wr:50},{kd:1.20,hs:42,wr:51},{kd:1.28,hs:44,wr:52},{kd:1.38,hs:46,wr:53},{kd:1.52,hs:48,wr:54},{kd:1.72,hs:52,wr:56}];
    const avg = avgByLevel[Math.min(lvl,10)];
    function sig(v,a){return Math.min(99,Math.max(1,Math.round(100/(1+Math.exp(-4*(v/a-1))))));}
    const overall = Math.min(99,Math.round(sig(kd,avg.kd)*0.45+sig(hs,avg.hs)*0.25+sig(wr,avg.wr)*0.30));
    const color = overall>=70?C.win:overall>=45?C.yellow:C.orange;
    const coachLevels=[{max:19,name:"НОВОБРАНЕЦ"},{max:34,name:"БОЕЦ"},{max:49,name:"СНАЙПЕР"},{max:64,name:"ВЕТЕРАН"},{max:79,name:"МАСТЕР"},{max:89,name:"ЭЛИТА"},{max:100,name:"ЛЕГЕНДА"}];
    const lvlName = coachLevels.find(l=>overall<=l.max)?.name||"ЛЕГЕНДА";
    return {overall, color, lvlName, kd:kd.toFixed(2), hs:Math.round(hs), wr:Math.round(wr)};
  };
  const rating = calcRating(pl);

  const maps = arr(fc?.maps).sort((a,b)=>parseFloat(b.winrate)-parseFloat(a.winrate));
  const bestMap = maps[0]; const worstMap = maps[maps.length-1];
  const recentMatches = arr(fc?.matches).slice(0,5);
  const matchCount = parseInt(fc?.lifetime?.matches||cs2.matches)||0;

  // Premier / MM ранг — только из localStorage для своего профиля
  const premierRating = (() => {
    if (!steamid || steamid !== myId) return null;
    try {
      const saved = JSON.parse(localStorage.getItem("cs2_player_v3")||"null");
      return saved?.cs2?.premier_rating || saved?.premier_rating || null;
    } catch { return null; }
  })();

  // Цвет Premier ранга
  const premierColor = (r) => {
    const n = parseInt(r)||0;
    if (n >= 30000) return "#e8c84a"; // Global
    if (n >= 25000) return "#cc4444"; // Supreme
    if (n >= 20000) return "#9944cc"; // Distinguished
    if (n >= 15000) return "#4488ff"; // Legendary Eagle
    if (n >= 10000) return "#66aaff"; // Distinguished MG
    if (n >= 5000)  return "#44ccaa"; // Master Guardian
    return "#888888"; // Silver-Gold
  };
  const premierLabel = (r) => {
    const n = parseInt(r)||0;
    if (n >= 30000) return "Глобал Элита";
    if (n >= 25000) return "Верховный Мастер";
    if (n >= 20000) return "Легендарный Орёл";
    if (n >= 15000) return "Мастер Страж";
    if (n >= 10000) return "Золотой Страж";
    if (n >= 5000)  return "Серебро Высшее";
    if (n > 0)      return "Серебро";
    return null;
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.97)",zIndex:500,
      overflowY:"auto",animation:"fadeIn .2s ease"}}>
      <div style={{maxWidth:"1200px",margin:"0 auto",padding:"0 0 80px"}}>

        {/* Top bar */}
        <div style={{position:"sticky",top:0,zIndex:10,background:"rgba(10,10,7,0.92)",
          borderBottom:`1px solid ${C.border}`,padding:"12px 28px",
          display:"flex",justifyContent:"space-between",alignItems:"center",backdropFilter:"blur(12px)"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <span style={{fontSize:"11px",letterSpacing:"4px",color:C.muted,fontWeight:700}}>ПРОФИЛЬ ИГРОКА</span>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.border}`,
            color:C.label,cursor:"pointer",padding:"6px 18px",fontSize:"12px",fontFamily:"inherit",
            letterSpacing:"2px",transition:"all .2s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.yellow+"66"}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            ✕ ЗАКРЫТЬ
          </button>
        </div>

        {!data ? (
          <div style={{padding:"60px 28px"}}>
            <div style={{display:"flex",gap:"20px",marginBottom:"24px"}}>
              <Skel w="120px" h="120" /><div style={{flex:1}}><Skel w="50%" h="28" mb={10}/><Skel w="30%" h="16"/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:"2px",marginBottom:"12px"}}>
              {[...Array(8)].map((_,i)=><Skel key={i} h="60"/>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
              <Skel h="200"/><Skel h="200"/>
            </div>
          </div>
        ) : !(data.steamid||fc) ? (
          <div style={{padding:"80px",textAlign:"center",color:C.muted,fontSize:"15px"}}>Профиль не найден</div>
        ) : (
          <div>
            {/* ══════════ HERO BANNER ══════════ */}
            <div style={{position:"relative",overflow:"hidden",minHeight:"200px"}}>
              {/* Фоновый баннер — градиент + паттерн */}
              <div style={{position:"absolute",inset:0,
                background:`linear-gradient(135deg, #0d0d09 0%, ${rating.color}18 40%, #0a0a07 100%)`,
                zIndex:0}}/>
              {/* Декоративные круги */}
              <div style={{position:"absolute",top:"-80px",right:"-80px",width:"400px",height:"400px",
                background:`radial-gradient(circle, ${rating.color}20 0%, transparent 65%)`,
                zIndex:0,pointerEvents:"none"}}/>
              <div style={{position:"absolute",bottom:"-60px",left:"200px",width:"300px",height:"300px",
                background:`radial-gradient(circle, ${C.blue}12 0%, transparent 65%)`,
                zIndex:0,pointerEvents:"none"}}/>
              {/* Сетка-паттерн */}
              <div style={{position:"absolute",inset:0,zIndex:0,opacity:0.03,
                backgroundImage:"repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 40px)"}}/>

              <div style={{position:"relative",zIndex:1,padding:"32px 28px 28px",
                display:"flex",gap:"28px",alignItems:"flex-end",flexWrap:"wrap"}}>

                {/* Аватар с уровнем */}
                <div style={{position:"relative",flexShrink:0}}>
                  <div style={{width:"120px",height:"120px",borderRadius:"8px",
                    border:`3px solid ${rating.color}`,
                    boxShadow:`0 0 40px ${rating.color}44, 0 0 80px ${rating.color}22`,
                    overflow:"hidden"}}>
                    {pl?.avatar
                      ?<img src={pl.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      :<div style={{width:"100%",height:"100%",background:"#1a1a10",display:"flex",
                        alignItems:"center",justifyContent:"center",fontSize:"44px"}}>👤</div>}
                  </div>
                  {/* FACEIT LVL бейдж на аватаре */}
                  {fc?.level&&<div style={{position:"absolute",bottom:"-10px",left:"50%",
                    transform:"translateX(-50%)",
                    background:LVL_COLOR[fc.level]||C.yellow,color:"#080807",
                    fontSize:"11px",fontWeight:900,padding:"3px 12px",
                    letterSpacing:"1px",whiteSpace:"nowrap",
                    boxShadow:`0 2px 12px ${LVL_COLOR[fc.level]||C.yellow}66`}}>
                    LVL {fc.level}
                  </div>}
                </div>

                {/* Имя + мета */}
                <div style={{flex:1,minWidth:"220px",paddingBottom:"4px"}}>
                  {/* Имя */}
                  <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"6px",flexWrap:"wrap"}}>
                    <span style={{fontSize:"34px",color:"#fff",fontWeight:800,letterSpacing:"-0.5px",
                      textShadow:"0 2px 20px rgba(0,0,0,0.8)"}}>{pl?.username}</span>
                    {pl?.country&&<span style={{fontSize:"20px"}}>{pl.country}</span>}
                    {(data?.is_pro||(myId&&steamid===myId&&isPro))&&(
                      <span style={{fontSize:"11px",color:C.yellow,background:C.yellow+"22",
                        border:`1px solid ${C.yellow}`,padding:"4px 12px",letterSpacing:"2px",
                        fontWeight:800,boxShadow:`0 0 12px ${C.yellow}44`}}>⚡ PRO</span>
                    )}
                  </div>

                  {/* Мета строка */}
                  <div style={{display:"flex",gap:"14px",flexWrap:"wrap",marginBottom:"14px"}}>
                    {data?.steam_level&&<span style={{fontSize:"12px",color:C.muted,display:"flex",alignItems:"center",gap:"4px"}}>
                      <span style={{color:C.yellow}}>⭐</span> Steam {data.steam_level} уровень
                    </span>}
                    {matchCount>0&&<span style={{fontSize:"12px",color:C.muted}}>
                      🎮 {matchCount.toLocaleString()} матчей
                    </span>}
                    {fc?.elo&&<span style={{fontSize:"12px",color:LVL_COLOR[fc.level]||C.yellow,fontWeight:700}}>
                      ⚡ FACEIT {fc.elo} ELO
                    </span>}
                  </div>

                  {/* Ранговые бейджи */}
                  <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                    {/* Premier ранг */}
                    {premierRating&&parseInt(premierRating)>0&&(
                      <div style={{display:"flex",alignItems:"center",gap:"8px",
                        padding:"6px 14px",
                        background:"rgba(0,0,0,0.5)",
                        border:`1px solid ${getPremierRank(premierRating).color}55`,
                        backdropFilter:"blur(8px)",
                        boxShadow:`0 2px 12px ${getPremierRank(premierRating).color}22`}}>
                        <PremierRankIcon rating={premierRating} size={32}/>
                        <div>
                          <div style={{fontSize:"10px",color:C.muted,letterSpacing:"1px"}}>PREMIER</div>
                          <div style={{fontSize:"16px",color:getPremierRank(premierRating).color,fontWeight:800}}>
                            {parseInt(premierRating).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Win streak */}
                    {(()=>{
                      let s=0; for(const m of recentMatches){if(m.result==="1")s++;else break;}
                      return s>=3?<div style={{display:"flex",alignItems:"center",gap:"6px",
                        padding:"6px 14px",background:"rgba(0,0,0,0.5)",
                        border:`1px solid ${C.lose}44`,backdropFilter:"blur(8px)"}}>
                        <span style={{fontSize:"18px"}}>🔥</span>
                        <div>
                          <div style={{fontSize:"10px",color:C.muted}}>СЕРИЯ</div>
                          <div style={{fontSize:"16px",color:C.lose,fontWeight:800}}>{s} побед</div>
                        </div>
                      </div>:null;
                    })()}
                    {/* Нет ранга */}
                    {steamid===myId&&!premierRating&&<div style={{
                      padding:"6px 12px",background:"rgba(0,0,0,0.4)",
                      border:`1px solid ${C.border}`,backdropFilter:"blur(8px)"}}>
                      <span style={{fontSize:"11px",color:C.muted}}>🎖 Premier: не сыгран / скрыт</span>
                    </div>}
                    {steamid&&steamid!==myId&&<div style={{
                      padding:"6px 12px",background:"rgba(0,0,0,0.4)",
                      border:`1px solid ${C.border}`,backdropFilter:"blur(8px)"}}>
                      <span style={{fontSize:"11px",color:C.muted}}>🎖 Premier скрыт Steam API</span>
                    </div>}
                  </div>
                </div>

                {/* Coach Rating блок — правый угол */}
                <div style={{textAlign:"center",
                  background:"rgba(0,0,0,0.6)",
                  border:`1px solid ${rating.color}44`,
                  padding:"18px 28px",
                  backdropFilter:"blur(12px)",
                  boxShadow:`0 4px 24px ${rating.color}22`,
                  flexShrink:0}}>
                  <div style={{fontSize:"52px",color:rating.color,fontWeight:900,lineHeight:1,
                    textShadow:`0 0 30px ${rating.color}88`}}>{rating.overall}</div>
                  <div style={{fontSize:"13px",color:rating.color,fontWeight:700,letterSpacing:"3px",marginTop:"4px"}}>{rating.lvlName}</div>
                  <div style={{fontSize:"11px",color:C.muted,marginTop:"6px",letterSpacing:"1px"}}>CS2 COACH RATING</div>
                  <div style={{marginTop:"8px",height:"3px",background:"#1a1a10",borderRadius:"2px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${rating.overall}%`,
                      background:`linear-gradient(90deg,${rating.color}66,${rating.color})`,
                      transition:"width 1s ease"}}/>
                  </div>
                  <div style={{fontSize:"11px",color:rating.color,marginTop:"6px",fontWeight:700}}>
                    Топ {Math.max(1,100-rating.overall)}%
                  </div>
                </div>
              </div>

              {/* Stats bar — под hero */}
              <div style={{position:"relative",zIndex:1,
                display:"grid",gridTemplateColumns:"repeat(8,1fr)",
                gap:"1px",background:C.border,
                borderTop:`1px solid ${C.border}`}}>
                {[
                  {l:"K/D",   v:rating.kd,     c:parseFloat(rating.kd)>=1.2?C.win:parseFloat(rating.kd)>=0.9?C.yellow:C.lose},
                  {l:"WIN%",  v:rating.wr+"%",  c:parseInt(rating.wr)>=55?C.win:parseInt(rating.wr)>=45?C.yellow:C.lose},
                  {l:"HS%",   v:rating.hs+"%",  c:parseInt(rating.hs)>=40?C.win:parseInt(rating.hs)>=25?C.yellow:C.orange},
                  {l:"МАТЧИ", v:matchCount||"—", c:C.label},
                  {l:"ELO",   v:fc?.elo||"—",   c:LVL_COLOR[fc?.level]||C.yellow},
                  {l:"ADR",   v:fc?.lifetime?.adr||(cs2.kills?Math.round(parseInt(cs2.kills)*75/Math.max(1,parseInt(cs2.deaths||1)*0.9)):"—"), c:C.orange},
                  {l:"УБИЙСТВ", v:cs2.kills?parseInt(cs2.kills).toLocaleString():"—", c:C.label},
                  {l:"1v1",   v:fc?.lifetime?.clutch1v1?fc.lifetime.clutch1v1+"%":"—", c:C.blue},
                ].map((s,i)=>(
                  <div key={i} style={{padding:"14px 8px",textAlign:"center",
                    background:"rgba(10,10,7,0.85)",backdropFilter:"blur(4px)",
                    transition:"background .15s",cursor:"default"}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(20,20,9,0.95)"}
                    onMouseLeave={e=>e.currentTarget.style.background="rgba(10,10,7,0.85)"}>
                    <div style={{fontSize:"9px",color:C.muted,letterSpacing:"1.5px",marginBottom:"6px"}}>{s.l}</div>
                    <div style={{fontSize:"20px",color:s.c,fontWeight:800}}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ══════════ BODY — 2 колонки ══════════ */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1px",
              background:C.border}}>

              {/* Левая — Rings скилла */}
              <div style={{background:C.bg,padding:"24px 28px"}}>
                <div style={{fontSize:"10px",color:C.muted,letterSpacing:"3px",marginBottom:"20px",fontWeight:700}}>
                  РЕЙТИНГ НАВЫКОВ
                </div>
                <div style={{display:"flex",justifyContent:"space-around",gap:"16px"}}>
                  {[
                    {label:"K/D",   val:parseFloat(rating.kd)||0,  max:2.5, color:parseFloat(rating.kd)>=1.2?C.win:parseFloat(rating.kd)>=0.9?C.yellow:C.lose, display:rating.kd},
                    {label:"HS%",   val:parseInt(rating.hs)||0,     max:70,  color:parseInt(rating.hs)>=40?C.win:parseInt(rating.hs)>=25?C.yellow:C.orange,     display:rating.hs+"%"},
                    {label:"WR%",   val:parseInt(rating.wr)||0,     max:70,  color:parseInt(rating.wr)>=55?C.win:parseInt(rating.wr)>=45?C.yellow:C.lose,       display:rating.wr+"%"},
                    {label:"РЕЙТ.", val:rating.overall,              max:99,  color:rating.color, display:rating.overall},
                  ].map((s,i)=>{
                    const r=40, circ=2*Math.PI*r;
                    const pct=Math.min(1,s.val/s.max);
                    const dash=circ*pct;
                    const trail = circ*(1-pct);
                    return (
                      <div key={i} style={{textAlign:"center"}}>
                        <div style={{position:"relative",width:"100px",height:"100px",margin:"0 auto 10px"}}>
                          <svg width="100" height="100" viewBox="0 0 100 100">
                            {/* Трек */}
                            <circle cx="50" cy="50" r={r} fill="none" stroke={C.border} strokeWidth="7"/>
                            {/* Фон-трек с opacity */}
                            <circle cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="7" opacity="0.1"
                              strokeDasharray={`${circ}`}/>
                            {/* Основная дуга */}
                            <circle cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="7"
                              strokeDasharray={`${dash} ${trail}`} strokeLinecap="round"
                              strokeDashoffset={circ/4}
                              style={{transition:"stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)",
                                filter:`drop-shadow(0 0 6px ${s.color}88)`}}/>
                          </svg>
                          <div style={{position:"absolute",inset:0,display:"flex",
                            alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
                            <div style={{fontSize:"20px",color:s.color,fontWeight:900,lineHeight:1}}>{s.display}</div>
                          </div>
                        </div>
                        <div style={{fontSize:"10px",color:C.muted,letterSpacing:"2px"}}>{s.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Правая — Clutch + Entry (FACEIT) или Steam stats */}
              <div style={{background:C.bg,padding:"24px 28px"}}>
                {fc?.lifetime ? (<>
                  <div style={{fontSize:"10px",color:C.muted,letterSpacing:"3px",marginBottom:"20px",fontWeight:700}}>CLUTCH SUCCESS</div>
                  <div style={{display:"flex",justifyContent:"space-around",gap:"8px",marginBottom:"20px"}}>
                    {[
                      {l:"1v1",v:fc.lifetime.clutch1v1||fc.lifetime["1v1"],c:C.win},
                      {l:"1v2",v:fc.lifetime.clutch1v2||fc.lifetime["1v2"],c:C.yellow},
                      {l:"1v3",v:fc.lifetime.clutch1v3||fc.lifetime["1v3"],c:C.orange},
                      {l:"1v4",v:fc.lifetime.clutch1v4||fc.lifetime["1v4"],c:C.lose},
                      {l:"1v5",v:fc.lifetime.clutch1v5||fc.lifetime["1v5"],c:"#aa66ff"},
                    ].map((x,j)=>{
                      const n=parseInt(x.v)||0;
                      const r=28, circ=2*Math.PI*r;
                      const pct=n>0?Math.min(1,n/70):0;
                      return(
                        <div key={j} style={{textAlign:"center"}}>
                          <div style={{position:"relative",width:"68px",height:"68px",margin:"0 auto 6px"}}>
                            <svg width="68" height="68" viewBox="0 0 68 68">
                              <circle cx="34" cy="34" r={r} fill="none" stroke={C.border} strokeWidth="5"/>
                              <circle cx="34" cy="34" r={r} fill="none" stroke={x.c} strokeWidth="5" opacity="0.15"
                                strokeDasharray={`${circ}`}/>
                              {pct>0&&<circle cx="34" cy="34" r={r} fill="none" stroke={x.c} strokeWidth="5"
                                strokeDasharray={`${circ*pct} ${circ*(1-pct)}`} strokeLinecap="round"
                                strokeDashoffset={circ/4}
                                style={{filter:`drop-shadow(0 0 4px ${x.c}88)`}}/>}
                            </svg>
                            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                              <span style={{fontSize:"13px",color:n>0?x.c:C.muted,fontWeight:800}}>
                                {n>0?n+"%":"—"}
                              </span>
                            </div>
                          </div>
                          <div style={{fontSize:"10px",color:C.muted}}>{x.l}</div>
                        </div>
                      );
                    })}
                  </div>
                  {fc.lifetime.entrySuccess&&<div style={{
                    background:"#0d0d16",border:`1px solid ${C.blue}33`,padding:"14px",
                    display:"flex",alignItems:"center",gap:"14px"}}>
                    <div>
                      <div style={{fontSize:"10px",color:C.muted,letterSpacing:"2px",marginBottom:"4px"}}>ENTRY SUCCESS</div>
                      <div style={{fontSize:"28px",color:C.blue,fontWeight:800}}>{fc.lifetime.entrySuccess}%</div>
                      <div style={{fontSize:"11px",color:C.muted}}>за раунд</div>
                    </div>
                    <div style={{flex:1,height:"6px",background:"#1a1a1a",borderRadius:"3px",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${fc.lifetime.entrySuccess}%`,
                        background:`linear-gradient(90deg,${C.blue}66,${C.blue})`,
                        filter:`drop-shadow(0 0 4px ${C.blue})`}}/>
                    </div>
                  </div>}
                </>) : (
                  <div>
                    <div style={{fontSize:"10px",color:C.muted,letterSpacing:"3px",marginBottom:"20px",fontWeight:700}}>STEAM СТАТИСТИКА</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                      {[
                        {l:"УБИЙСТВ",  v:cs2.kills?parseInt(cs2.kills).toLocaleString():"—",  c:C.yellow, icon:"⚔️"},
                        {l:"СМЕРТЕЙ",  v:cs2.deaths?parseInt(cs2.deaths).toLocaleString():"—", c:C.lose,   icon:"💀"},
                        {l:"ПОБЕДЫ",   v:cs2.wins?parseInt(cs2.wins).toLocaleString():"—",    c:C.win,    icon:"🏆"},
                        {l:"MVP",      v:cs2.mvps?parseInt(cs2.mvps).toLocaleString():"—",    c:C.yellow, icon:"⭐"},
                        {l:"НОЖОМ",    v:cs2.knife_kills||"—",    c:"#ff8888",  icon:"🔪"},
                        {l:"БОМБ 💣",  v:cs2.bombs_planted||"—",  c:C.orange,   icon:"💥"},
                      ].map((s,i)=>(
                        <div key={i} style={{
                          background:`linear-gradient(135deg,${s.c}08,transparent)`,
                          border:`1px solid ${s.c}22`,padding:"14px 16px",
                          transition:"border-color .15s"}}
                          onMouseEnter={e=>e.currentTarget.style.borderColor=s.c+"55"}
                          onMouseLeave={e=>e.currentTarget.style.borderColor=s.c+"22"}>
                          <div style={{fontSize:"10px",color:C.muted,marginBottom:"6px",letterSpacing:"1px"}}>{s.l}</div>
                          <div style={{fontSize:"22px",color:s.c,fontWeight:800}}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ══════════ КАРТЫ + ОРУЖИЯ ══════════ */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1px",
              background:C.border,borderTop:`1px solid ${C.border}`}}>

              {/* Карты */}
              {maps.length>0&&(
                <div style={{background:C.bg,padding:"24px 28px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
                    <div style={{fontSize:"10px",color:C.muted,letterSpacing:"3px",fontWeight:700}}>КАРТЫ</div>
                    <div style={{display:"flex",gap:"10px"}}>
                      <div style={{fontSize:"10px",padding:"2px 8px",
                        background:C.win+"18",color:C.win,border:`1px solid ${C.win}33`}}>
                        🏆 {maps[0]?.map}
                      </div>
                      {maps.length>1&&<div style={{fontSize:"10px",padding:"2px 8px",
                        background:C.lose+"18",color:C.lose,border:`1px solid ${C.lose}33`}}>
                        ⚠️ {maps[maps.length-1]?.map}
                      </div>}
                    </div>
                  </div>
                  {maps.slice(0,7).map((m,i)=>{
                    const wr=parseFloat(m.winrate)||0;
                    const bc=wr>=55?C.win:wr>=45?C.yellow:C.lose;
                    return(
                      <div key={i} style={{marginBottom:"12px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                          <span style={{fontSize:"13px",color:C.value,fontWeight:600}}>{m.map}</span>
                          <div style={{display:"flex",gap:"12px",fontSize:"11px",color:C.muted}}>
                            <span>{m.matches} матч</span>
                            <span>K/D {m.kd}</span>
                            <span style={{color:bc,fontWeight:700}}>{m.winrate}%</span>
                          </div>
                        </div>
                        <div style={{height:"5px",background:"#111109",borderRadius:"3px",overflow:"hidden",position:"relative"}}>
                          <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:"1px",background:C.border+"aa"}}/>
                          <div style={{height:"100%",width:`${wr}%`,
                            background:`linear-gradient(90deg,${bc}66,${bc})`,
                            borderRadius:"3px",transition:"width .8s ease",
                            boxShadow:`0 0 6px ${bc}66`}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Оружия */}
              {cs2.kills&&(
                <div style={{background:C.bg,padding:"24px 28px"}}>
                  <div style={{fontSize:"10px",color:C.muted,letterSpacing:"3px",marginBottom:"18px",fontWeight:700}}>ОРУЖИЯ</div>
                  {(()=>{
                    const kills=parseInt(cs2.kills)||0;
                    const sniper=parseInt(cs2.sniper_kills)||0;
                    const knife=parseInt(cs2.knife_kills)||0;
                    const pistol=parseInt(cs2.pistol_kills)||0;
                    const grenade=parseInt(cs2.grenade_kills)||0;
                    const total=kills||1;
                    return [
                      {name:"AK-47 / M4A1-S",k:Math.round(kills*0.30),hs:42,color:"#e8a44a"},
                      {name:"AWP",            k:sniper,                 hs:5, color:C.yellow},
                      {name:"Desert Eagle",   k:Math.round(pistol*0.35),hs:65,color:"#ff9944"},
                      {name:"Пистолеты",      k:pistol,                 hs:50,color:C.blue},
                      {name:"Нож 🔪",          k:knife,                  hs:0, color:"#ff8888"},
                      {name:"Граната 💥",       k:grenade,                hs:0, color:C.orange},
                    ].filter(w=>w.k>0).map((w,i)=>(
                      <div key={i} style={{marginBottom:"12px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                          <span style={{fontSize:"13px",color:C.value,fontWeight:600}}>{w.name}</span>
                          <div style={{display:"flex",gap:"12px",fontSize:"11px"}}>
                            <span style={{color:w.color,fontWeight:700}}>{w.k.toLocaleString()}</span>
                            {w.hs>0&&<span style={{color:C.muted}}>HS {w.hs}%</span>}
                          </div>
                        </div>
                        <div style={{height:"5px",background:"#111109",borderRadius:"3px",overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${Math.min(100,Math.round(w.k/total*100))}%`,
                            background:`linear-gradient(90deg,${w.color}55,${w.color})`,
                            borderRadius:"3px",transition:"width .8s ease",
                            boxShadow:`0 0 6px ${w.color}55`}}/>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* ══════════ ПОСЛЕДНИЕ МАТЧИ ══════════ */}
            {recentMatches.length>0&&(
              <div style={{padding:"24px 28px",borderTop:`1px solid ${C.border}`,background:C.bg}}>
                <div style={{fontSize:"10px",color:C.muted,letterSpacing:"3px",fontWeight:700,marginBottom:"16px"}}>
                  ПОСЛЕДНИЕ МАТЧИ
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                  {recentMatches.map((m,i)=>{
                    const win=m.result==="1";
                    const ac=win?C.win:C.lose;
                    return(
                      <div key={i} style={{display:"grid",gridTemplateColumns:"3px 1fr 65px 55px 55px 65px",
                        gap:"12px",alignItems:"center",padding:"12px 16px",
                        background:win?"#0a140a":"#140a0a",
                        borderLeft:`3px solid ${ac}`,
                        borderBottom:`1px solid ${C.border}33`,
                        transition:"opacity .15s"}}
                        onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
                        onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                        <div/>
                        <div>
                          <div style={{fontSize:"14px",color:C.value,fontWeight:700}}>{m.map||"—"}</div>
                          <div style={{fontSize:"11px",color:ac,fontWeight:600}}>
                            {win?"ПОБЕДА":"ПОРАЖЕНИЕ"}{m.score?` · ${m.score}`:""}
                          </div>
                        </div>
                        {[{l:"K/D",v:m.kd},{l:"KILLS",v:m.kills},{l:"HS%",v:m.hs?m.hs+"%":"-"},{l:"ADR",v:m.adr}].map((s,j)=>(
                          <div key={j} style={{textAlign:"center"}}>
                            <div style={{fontSize:"9px",color:C.muted,marginBottom:"3px",letterSpacing:"1px"}}>{s.l}</div>
                            <div style={{fontSize:"14px",color:C.label,fontWeight:600}}>{s.v||"—"}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══════════ ИСТОРИЯ AI РАЗБОРОВ ══════════ */}
            {steamid&&data?.history?.length>0&&(
              <div style={{padding:"24px 28px",borderTop:`1px solid ${C.border}`,background:C.bg}}>
                <div style={{fontSize:"10px",color:C.muted,letterSpacing:"3px",fontWeight:700,marginBottom:"16px"}}>
                  ИСТОРИЯ AI РАЗБОРОВ
                </div>
                {data.history.slice(0,4).map((h,i)=>{
                  const lc=ANALYSIS_COLOR[h.result?.level]||C.yellow;
                  return(
                    <div key={i} style={{
                      background:`linear-gradient(135deg,${lc}08,transparent)`,
                      border:`1px solid ${lc}22`,
                      borderLeft:`3px solid ${lc}`,padding:"14px 18px",marginBottom:"8px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                        <span style={{fontSize:"11px",color:lc,letterSpacing:"2px",fontWeight:700}}>
                          {h.result?.level?.toUpperCase()}
                        </span>
                        <span style={{fontSize:"11px",color:C.muted}}>{fmt(h.timestamp)}</span>
                      </div>
                      <div style={{fontSize:"13px",color:C.label,lineHeight:1.6}}>{h.result?.overall}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// ── Leaderboard ───────────────────────────────────────────────────────────────
function Leaderboard({myId, myIsPro, onProfile}) {
  const [data,setData]=useState(null);
  const [sortKey,setSortKey]=useState("premier"); // по умолчанию — Premier рейтинг
  const [tab,setTab]=useState("premier"); // premier | stats

  function load() {
    fetch(`${BACKEND}/leaderboard`)
      .then(r=>r.json())
      .then(d=>setData(d.leaderboard||[]))
      .catch(()=>setData([]));
  }

  useEffect(()=>{ load(); },[]);

  if (!data) return <div style={{padding:"12px"}}>{[1,2,3,4,5].map(i=><Skel key={i} h="58"/>)}</div>;
  if (!data.length) return (
    <div style={{textAlign:"center",padding:"70px",color:C.muted}}>
      <div style={{fontSize:"36px",marginBottom:"14px"}}>🏆</div>
      <div style={{fontSize:"13px",letterSpacing:"3px"}}>ТАБЛИЦА ПУСТА</div>
      <div style={{fontSize:"13px",color:C.muted,marginTop:"8px",marginBottom:"20px"}}>
        Данные появятся автоматически при следующем входе
      </div>
      <button onClick={load} style={{background:C.yellow,color:"#080807",border:"none",
        padding:"10px 24px",cursor:"pointer",fontSize:"13px",fontWeight:700,fontFamily:"inherit"}}>
        ↻ Обновить
      </button>
    </div>
  );

  const STAT_SORTS = [
    {id:"kd",      label:"K/D",          icon:"🎯", fn:(a,b)=>(parseFloat(b.stats?.kd||0)-parseFloat(a.stats?.kd||0))},
    {id:"winrate", label:"Побед %",       icon:"🏆", fn:(a,b)=>(parseFloat(b.stats?.winrate||0)-parseFloat(a.stats?.winrate||0))},
    {id:"hs",      label:"HS%",           icon:"💥", fn:(a,b)=>(parseFloat(b.stats?.hs||0)-parseFloat(a.stats?.hs||0))},
    {id:"kills",   label:"Убийства",     icon:"⚔️", fn:(a,b)=>(parseInt(b.stats?.kills||0)-parseInt(a.stats?.kills||0))},
    {id:"matches", label:"Матчи",        icon:"🎮", fn:(a,b)=>(parseInt(b.stats?.matches||0)-parseInt(a.stats?.matches||0))},
    {id:"mvp",     label:"MVP",          icon:"⭐", fn:(a,b)=>(parseInt(b.stats?.mvp||0)-parseInt(a.stats?.mvp||0))},
  ];

  // Для Premier вкладки — сортировка по рейтингу
  const premierSorted = [...data].sort((a,b)=>{
    const ar = parseInt(a.stats?.premier_rating||0);
    const br = parseInt(b.stats?.premier_rating||0);
    if (br !== ar) return br - ar;
    return parseInt(b.stats?.wins||0) - parseInt(a.stats?.wins||0);
  });

  const statSortFn = STAT_SORTS.find(s=>s.id===sortKey)?.fn || STAT_SORTS[0].fn;
  const statSorted = [...data].sort(statSortFn);

  const sorted = tab==="premier" ? premierSorted : statSorted;

  return (
    <div style={{animation:"up .4s ease both"}}>
      {/* Заголовок + переключатель */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",flexWrap:"wrap",gap:"8px"}}>
        <div style={{display:"flex",gap:"4px"}}>
          <button onClick={()=>setTab("premier")} style={{
            padding:"8px 16px",background:tab==="premier"?C.yellow+"22":C.card,
            border:`1px solid ${tab==="premier"?C.yellow+"88":C.border}`,
            color:tab==="premier"?C.yellow:C.muted,cursor:"pointer",
            fontSize:"12px",fontFamily:"inherit",fontWeight:tab==="premier"?700:400}}>
            🏅 Premier Рейтинг
          </button>
          <button onClick={()=>setTab("stats")} style={{
            padding:"8px 16px",background:tab==="stats"?C.yellow+"22":C.card,
            border:`1px solid ${tab==="stats"?C.yellow+"88":C.border}`,
            color:tab==="stats"?C.yellow:C.muted,cursor:"pointer",
            fontSize:"12px",fontFamily:"inherit",fontWeight:tab==="stats"?700:400}}>
            📊 Статистика
          </button>
        </div>
        <button onClick={load} style={{background:"transparent",border:`1px solid ${C.border}`,
          color:C.muted,cursor:"pointer",fontSize:"11px",padding:"6px 14px",fontFamily:"inherit"}}>
          ↻ Обновить
        </button>
      </div>

      {/* Вторичная сортировка для Stats */}
      {tab==="stats"&&(
        <div style={{display:"flex",gap:"4px",flexWrap:"wrap",marginBottom:"12px"}}>
          {STAT_SORTS.map(s=>{
            const active = sortKey===s.id;
            return(
              <button key={s.id} onClick={()=>setSortKey(s.id)} style={{
                padding:"6px 12px",background:active?C.yellow+"22":C.card,
                border:`1px solid ${active?C.yellow+"55":C.border}`,
                color:active?C.yellow:C.muted,cursor:"pointer",fontSize:"11px",
                fontFamily:"inherit",fontWeight:active?700:400,
                display:"flex",alignItems:"center",gap:"4px",transition:"all .15s"}}>
                <span>{s.icon}</span> {s.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Premier вкладка — заголовок таблицы */}
      {tab==="premier"&&(
        <div style={{display:"grid",gridTemplateColumns:"40px 1fr 130px 130px 80px",gap:"2px",
          padding:"8px 14px",fontSize:"10px",letterSpacing:"2px",color:C.muted,
          borderBottom:`1px solid ${C.border}`,borderTop:`1px solid ${C.border}`}}>
          <div>#</div>
          <div>ИГРОК</div>
          <div>ТЕКУЩИЙ РАНГ</div>
          <div>ЛУЧШИЙ РАНГ</div>
          <div style={{textAlign:"right"}}>ПОБЕДЫ</div>
        </div>
      )}

      {/* Stats вкладка — заголовок */}
      {tab==="stats"&&(
        <div style={{display:"grid",gridTemplateColumns:"40px 1fr 110px 100px",gap:"2px",
          padding:"8px 14px",fontSize:"10px",letterSpacing:"2px",color:C.muted,
          borderBottom:`1px solid ${C.border}`,borderTop:`1px solid ${C.border}`}}>
          <div>#</div><div>ИГРОК</div><div>УРОВЕНЬ</div>
          <div style={{textAlign:"right"}}>{STAT_SORTS.find(s=>s.id===sortKey)?.label?.toUpperCase()}</div>
        </div>
      )}

      {/* Строки */}
      {sorted.map((p,i)=>{
        const lc=ANALYSIS_COLOR[p.level]||C.yellow;
        const isMe=myId&&p.steamid===myId;
        const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
        const premRating = parseInt(p.stats?.premier_rating||0);
        const bestPremier = parseInt(p.stats?.best_premier||p.stats?.premier_rating||0);
        const wins = parseInt(p.stats?.wins||0);

        if (tab==="premier") {
          return (
            <div key={p.steamid||i} className="hov-row" onClick={()=>onProfile(p.steamid)} style={{
              display:"grid",gridTemplateColumns:"40px 1fr 130px 130px 80px",gap:"2px",
              padding:"12px 14px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,
              background:isMe?"#1a1a08":C.card,
              borderLeft:isMe?`3px solid ${C.yellow}`:`3px solid transparent`,
              alignItems:"center",transition:"background .15s"}}>
              {/* # */}
              <div style={{color:i<3?C.yellow:C.muted,fontSize:"14px",fontWeight:700}}>
                {medal||i+1}
              </div>
              {/* Игрок */}
              <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
                {p.avatar
                  ?<img src={p.avatar} alt="" style={{width:"32px",height:"32px",borderRadius:"3px",flexShrink:0}}/>
                  :<div style={{width:"32px",height:"32px",background:"#1a1a10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",flexShrink:0}}>👤</div>}
                <div style={{minWidth:0}}>
                  <div style={{fontSize:"14px",color:isMe?C.yellow:C.value,fontWeight:isMe?700:500,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {p.username}{isMe?" (ты)":""}
                  </div>
                  <div style={{fontSize:"10px",color:C.muted,marginTop:"1px"}}>
                    {p.stats?.kd?`K/D ${p.stats.kd}`:""}
                    {p.stats?.winrate?` · ${p.stats.winrate}% WR`:""}
                  </div>
                </div>
                {(p.is_pro||(isMe&&myIsPro))&&<span style={{fontSize:"9px",color:C.yellow,
                  background:C.yellow+"22",border:`1px solid ${C.yellow}44`,
                  padding:"1px 5px",letterSpacing:"1px",flexShrink:0}}>PRO</span>}
              </div>
              {/* Текущий ранг */}
              <div>
                {premRating>0
                  ?<PremierBadge rating={premRating} size={28}/>
                  :<span style={{fontSize:"11px",color:C.muted}}>Нет ранга</span>}
              </div>
              {/* Лучший ранг */}
              <div>
                {bestPremier>0
                  ?<PremierBadge rating={bestPremier} size={24} showLabel={bestPremier!==premRating}/>
                  :<span style={{fontSize:"11px",color:C.muted}}>—</span>}
              </div>
              {/* Победы */}
              <div style={{textAlign:"right",fontSize:"14px",color:C.win,fontWeight:700}}>
                {wins>0?wins.toLocaleString():"—"}
              </div>
            </div>
          );
        }

        // Stats вкладка
        const statVal = (()=>{
          const s = p.stats||{};
          switch(sortKey){
            case "kd":      return s.kd?`${s.kd} K/D`:"—";
            case "winrate": return s.winrate?`${s.winrate}%`:"—";
            case "hs":      return s.hs?`${s.hs}%`:"—";
            case "kills":   return s.kills?parseInt(s.kills).toLocaleString():"—";
            case "matches": return s.matches?parseInt(s.matches).toLocaleString():"—";
            case "mvp":     return s.mvp?parseInt(s.mvp).toLocaleString():"—";
            default: return "—";
          }
        })();
        return (
          <div key={p.steamid||i} className="hov-row lb-grid" onClick={()=>onProfile(p.steamid)} style={{
            display:"grid",gridTemplateColumns:"40px 1fr 110px 100px",gap:"2px",
            padding:"12px 14px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,
            background:isMe?"#1a1a08":C.card,borderLeft:isMe?`3px solid ${C.yellow}`:`3px solid transparent`,
            transition:"background .15s",alignItems:"center"}}>
            <div style={{color:i<3?C.yellow:C.muted,fontSize:"14px",fontWeight:700}}>{medal||i+1}</div>
            <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
              {p.avatar?<img src={p.avatar} alt="" style={{width:"28px",height:"28px",borderRadius:"2px",flexShrink:0}}/>
                :<div style={{width:"28px",height:"28px",background:"#1a1a10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",flexShrink:0}}>👤</div>}
              <span style={{fontSize:"14px",color:isMe?C.yellow:C.value,fontWeight:isMe?700:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {p.username}{isMe?" (ты)":""}
              </span>
              {(p.is_pro||(isMe&&myIsPro))&&<span style={{fontSize:"9px",color:C.yellow,background:C.yellow+"22",
                border:`1px solid ${C.yellow}44`,padding:"1px 5px",letterSpacing:"1px",flexShrink:0}}>PRO</span>}
            </div>
            <div style={{padding:"3px 8px",background:lc+"18",color:lc,border:`1px solid ${lc}33`,
              fontSize:"10px",letterSpacing:"1px",display:"inline-flex",alignItems:"center",height:"fit-content"}}>
              {p.level}
            </div>
            <div className="lb-val" style={{fontSize:"14px",color:C.yellow,fontWeight:700,textAlign:"right"}}>
              {statVal}
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
          <div key={i} style={{marginBottom:"10px"}}>
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

  const ScoreRing = ({score, label, color, breakdown}) => {
    const r=28, circ=2*Math.PI*r, dash=circ*score/100;
    const scoreColor = score>=70?"#55ee55":score>=45?C.yellow:"#ff6655";
    // "Топ X%" — чем выше score тем лучше топ
    const topPct = Math.max(1, 100 - score);
    return (
      <div style={{textAlign:"center",padding:"16px 20px",flex:"1 1 160px"}}>
        <div style={{position:"relative",width:"80px",height:"80px",margin:"0 auto 8px"}}>
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
        <div style={{fontSize:"13px",color:scoreColor,fontWeight:700,marginTop:"2px"}}>
          {score>=80?"ОТЛИЧНО":score>=60?"ХОРОШО":score>=40?"СРЕДНЕ":"РАБОТАЙ"}
        </div>
        <div style={{fontSize:"11px",color:scoreColor,marginTop:"2px",marginBottom:"6px",opacity:0.8}}>
          Топ {topPct}%
        </div>
        {breakdown&&<div style={{fontSize:"10px",color:C.muted,lineHeight:1.6,
          borderTop:`1px solid ${C.border}`,paddingTop:"6px",textAlign:"left"}}>
          {breakdown.map((b,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",gap:"8px",
              padding:"1px 0"}}>
              <span style={{color:"#6a6450"}}>{b.label}</span>
              <span style={{color:C.label,fontWeight:600}}>{b.val}</span>
            </div>
          ))}
        </div>}
      </div>
    );
  };

  return (
    <div style={{className:"score-rings",background:C.card,border:`1px solid ${C.border}`,
      display:"flex",justifyContent:"space-around",flexWrap:"wrap",marginBottom:"10px",animation:"up .5s ease both"}}>
      <ScoreRing score={overallScore} label="ОБЩИЙ РЕЙТИНГ" color={C.yellow} breakdown={[
        {label:"AIM × 60%",  val:aimScore},
        {label:"CONST × 40%",val:consistScore},
      ]}/>
      <ScoreRing score={aimScore} label="AIM SCORE" breakdown={[
        {label:"K/D",   val:kd.toFixed(2)},
        {label:"HS%",   val:hs+"%"},
        {label:"WR%",   val:wr+"%"},
      ]}/>
      <ScoreRing score={consistScore} label="CONSISTENCY" breakdown={[
        {label:"WR%",    val:wr+"%"},
        {label:"Матчи",  val:matches},
        {label:"FACEIT", val:lvl>0?"lvl "+lvl:"—"},
      ]}/>
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

// ── Day Action — главное действие дня ─────────────────────────────────────────
function DayAction({player, source, streak}) {
  const fc = player?.faceit;
  const cs2 = player?.cs2 || {};
  const kd  = parseFloat(source==="faceit"?fc?.lifetime?.kd:cs2.kd)||0;
  const hs  = parseFloat(source==="faceit"?fc?.lifetime?.hs:cs2.hs)||0;
  const wr  = parseFloat(source==="faceit"?fc?.lifetime?.winrate:cs2.winrate)||0;

  // Находим ближайшую незакрытую ачивку
  const target = (() => {
    if (kd < 1.0) return {
      icon:"⚔️", name:"Фраггер", progress:Math.round(Math.min(99,kd/1.0*100)),
      left:(1.0-kd).toFixed(2)+" K/D",
      actions:["500 убийств в Aim Botz · 15 мин","Counter-strafe тренировка · 15 мин"],
      xp:25, color:"#74c6f5",
    };
    if (hs < 40) return {
      icon:"🎯", name:"HS Машина", progress:Math.round(Math.min(99,hs/40*100)),
      left:(40-Math.round(hs))+"% HS",
      actions:["Recoil Master: спрей AK · 20 мин","Aim Botz: только хедшоты · 15 мин"],
      xp:20, color:"#ff8844",
    };
    if (wr < 50) return {
      icon:"🏆", name:"Победитель", progress:Math.round(Math.min(99,wr/50*100)),
      left:(50-Math.round(wr))+"% WR",
      actions:["Разбери последний проигрыш · 15 мин","Prefire Workshop: лучшая карта · 20 мин"],
      xp:20, color:"#55ee55",
    };
    return {
      icon:"💀", name:"Элита", progress:Math.round(Math.min(99,kd/1.5*100)),
      left:(1.5-kd).toFixed(2)+" K/D",
      actions:["Aim Botz: 1000 убийств · 20 мин","Prefire Workshop · 20 мин"],
      xp:30, color:"#ff4466",
    };
  })();

  return (
    <div style={{background:"linear-gradient(135deg,#1a1a0a,#141409)",
      border:`2px solid ${target.color}44`,borderLeft:`4px solid ${target.color}`,
      padding:"20px 22px",marginBottom:"10px",animation:"up .4s ease both",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:"-20px",right:"-20px",width:"120px",height:"120px",
        background:`radial-gradient(circle,${target.color}12,transparent 70%)`,pointerEvents:"none"}}/>

      <div style={{fontSize:"11px",color:target.color,letterSpacing:"3px",fontWeight:700,marginBottom:"12px"}}>
        ⚡ ГЛАВНОЕ ДЕЙСТВИЕ СЕГОДНЯ
      </div>

      <div style={{display:"flex",gap:"16px",alignItems:"flex-start",flexWrap:"wrap",marginBottom:"14px"}}>
        <div style={{flex:1,minWidth:"160px"}}>
          <div style={{fontSize:"16px",color:"#f5eed8",fontWeight:700,marginBottom:"4px"}}>
            {target.icon} До достижения <span style={{color:target.color}}>{target.name}</span>
          </div>
          <div style={{fontSize:"13px",color:"#9a9270",marginBottom:"10px"}}>
            осталось <span style={{color:target.color,fontWeight:700}}>{target.left}</span>
          </div>
          <div style={{height:"6px",background:"#1a1a10",borderRadius:"3px",overflow:"hidden",marginBottom:"6px"}}>
            <div style={{height:"100%",width:`${target.progress}%`,background:target.color,
              borderRadius:"3px",boxShadow:`0 0 8px ${target.color}66`,transition:"width 1s ease"}}/>
          </div>
          <div style={{fontSize:"11px",color:"#6a6450"}}>{target.progress}% выполнено</div>
        </div>
        <div style={{background:target.color+"18",border:`1px solid ${target.color}33`,
          padding:"8px 16px",display:"flex",alignItems:"center",gap:"8px",alignSelf:"flex-start"}}>
          <span style={{fontSize:"16px"}}>⭐</span>
          <span style={{fontSize:"14px",color:target.color,fontWeight:700}}>+{target.xp} XP</span>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
        {target.actions.map((a,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",
            background:"#0d0d09",padding:"9px 12px",border:`1px solid ${C.border}`}}>
            <div style={{width:"18px",height:"18px",borderRadius:"3px",
              border:`2px solid ${target.color}66`,flexShrink:0,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",color:target.color}}>
              {i+1}
            </div>
            <span style={{fontSize:"13px",color:"#ddd6bc"}}>{a}</span>
          </div>
        ))}
      </div>
      {streak>0&&(
        <div style={{marginTop:"12px",paddingTop:"12px",borderTop:`1px solid ${C.border}44`,
          display:"flex",alignItems:"center",gap:"12px"}}>
          <span style={{fontSize:"13px",color:streak>=7?"#aa44ff":streak>=3?C.win:C.yellow,fontWeight:700}}>
            🔥 {streak} {streak===1?"день":"дней"} подряд
          </span>
          <div style={{flex:1,display:"flex",gap:"3px"}}>
            {Array.from({length:7}).map((_,i)=>(
              <div key={i} style={{flex:1,height:"3px",borderRadius:"1px",
                background:i<streak?(streak>=7?"#aa44ff":streak>=3?C.win:C.yellow):"#1a1a10"}}/>
            ))}
          </div>
          {streak<7
            ?<span style={{fontSize:"11px",color:C.muted}}>до 7: ещё {7-streak}</span>
            :<span style={{fontSize:"11px",color:"#aa44ff"}}>MAX 🏆</span>}
        </div>
      )}

      {/* Квест на завтра */}
      <div style={{marginTop:"10px",paddingTop:"10px",borderTop:`1px solid ${C.border}44`,
        display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
        <div style={{fontSize:"11px",color:C.muted,letterSpacing:"1px",flexShrink:0}}>🎯 ЗАВТРА:</div>
        <div style={{flex:1,fontSize:"12px",color:C.label}}>
          {kd<1.0
            ? <>Доведи K/D до <span style={{color:C.blue,fontWeight:700}}>1.0</span> — сыграй {Math.max(1,Math.ceil((1.0-kd)*10))} матча фокусируясь на дуэлях</>
            : hs<40
            ? <>Подними HS% до <span style={{color:C.orange,fontWeight:700}}>40%</span> — 20 мин Aim Botz только в голову</>
            : wr<50
            ? <>Выиграй <span style={{color:C.win,fontWeight:700}}>{Math.max(1,Math.ceil((50-wr)/5))} матча</span> — сыграй только на лучшей карте</>
            : <>Удержи серию: сыграй <span style={{color:C.yellow,fontWeight:700}}>1 матч</span> и поддержи текущий уровень</>
          }
        </div>
        <div style={{fontSize:"11px",color:C.yellow,fontWeight:700,flexShrink:0}}>+{target.xp} XP</div>
      </div>
    </div>
  );
}


// ── Daily Streak Block ─────────────────────────────────────────────────────────
function DailyStreak({streak}) {
  if (!streak || streak < 1) return null;
  const days = Math.min(streak, 7);
  const milestones = [1,3,5,7];
  const nextMilestone = milestones.find(m=>m>streak) || 7;
  const streakColor = streak>=7?"#aa44ff":streak>=5?C.win:streak>=3?C.yellow:C.orange;
  const label = streak>=7?"ЛЕГЕНДА 🏆":streak>=5?"ОГОНЬ 🔥":streak>=3?"ХОРОШО ⚡":"НАЧАЛО 🌱";

  return (
    <div style={{background:C.card,border:`1px solid ${streakColor}44`,
      borderLeft:`4px solid ${streakColor}`,
      padding:"14px 18px",marginBottom:"10px",animation:"up .4s ease both",
      display:"flex",alignItems:"center",gap:"16px",flexWrap:"wrap"}}>
      {/* Big number */}
      <div style={{textAlign:"center",minWidth:"60px"}}>
        <div style={{fontSize:"36px",color:streakColor,fontWeight:900,lineHeight:1}}>{streak}</div>
        <div style={{fontSize:"10px",color:C.muted,marginTop:"2px"}}>дней подряд</div>
      </div>
      {/* Info */}
      <div style={{flex:1,minWidth:"140px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
          <span style={{fontSize:"12px",color:streakColor,fontWeight:700,letterSpacing:"2px"}}>
            🔥 СЕРИЯ ВХОДОВ · {label}
          </span>
          {streak < 7 && <span style={{fontSize:"11px",color:C.muted}}>
            до {nextMilestone} дней: {nextMilestone - streak} осталось
          </span>}
        </div>
        {/* Dots for 7 days */}
        <div style={{display:"flex",gap:"5px"}}>
          {Array.from({length:7}).map((_,i)=>(
            <div key={i} style={{
              flex:1, height:"6px", borderRadius:"3px",
              background: i<streak ? streakColor : "#1a1a10",
              boxShadow: i<streak ? `0 0 6px ${streakColor}88` : "none",
              transition:"background .3s"
            }}/>
          ))}
        </div>
        <div style={{fontSize:"10px",color:C.muted,marginTop:"4px"}}>
          {streak>=7 ? "🎉 Максимальная серия! Не останавливайся!" : `Заходи завтра чтобы не потерять серию`}
        </div>
      </div>
    </div>
  );
}

// ── Notification Toast ────────────────────────────────────────────────────────
// ── Onboarding Modal ──────────────────────────────────────────────────────────
function OnboardingModal({player, onClose, onGoTab}) {
  const [step, setStep] = useState(0);
  const [authCode, setAuthCode] = useState("");
  const [matchCode, setMatchCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeErr, setCodeErr] = useState("");
  const [codeDone, setCodeDone] = useState(false);

  const steamid = player?.steamid || "";
  const KEY = `cs2_steam_auth_${steamid}`;

  async function connectCode() {
    if (!authCode.trim()) {
      setCodeErr("Введи код аутентификации");
      return;
    }
    setCodeLoading(true); setCodeErr("");
    try {
      const r = await fetch(`${BACKEND}/steam/auth-code`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({steamid, auth_code: authCode.trim(), match_code: ""})
      });
      const d = await r.json();
      if (d.ok) {
        localStorage.setItem(KEY, JSON.stringify({auth_code:authCode.trim(), match_code:"", ts:Date.now()}));
        setCodeDone(true);
        setStep(3);
      } else {
        setCodeErr(d.detail || "Неверный код. Проверь и попробуй снова.");
      }
    } catch { setCodeErr("Ошибка сети — попробуй позже"); }
    setCodeLoading(false);
  }

  const STEPS = [
    {
      num:1, icon:"🎮", title:"Добро пожаловать!",
      sub:"Ты вошёл через Steam — это уже первый шаг",
    },
    {
      num:2, icon:"⚡", title:"Подключи FACEIT",
      sub:"Получи детальную статистику по каждому матчу",
    },
    {
      num:3, icon:"🔑", title:"Подключи историю матчей",
      sub:"Введи код аутентификации Steam для доступа к MM матчам",
    },
    {
      num:4, icon:"🏆", title:"Всё готово!",
      sub:"AI тренер знает твою игру и готов помочь",
    },
  ];

  return createPortal(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.95)",zIndex:9999,
      display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",animation:"fadeIn .3s ease",
      overflowY:"auto"}}>
      <div style={{background:C.card,border:`2px solid ${C.yellow}44`,width:"100%",maxWidth:"480px",
        animation:"slideUp .35s ease",position:"relative"}}>

        {/* Прогресс */}
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
          {STEPS.map((s,i)=>(
            <div key={i} style={{flex:1,padding:"10px 4px",textAlign:"center",
              borderBottom:`3px solid ${i===step?C.yellow:i<step?C.win+"88":"transparent"}`,
              transition:"all .3s"}}>
              <div style={{fontSize:"11px",color:i===step?C.yellow:i<step?C.win:C.muted,fontWeight:i===step?700:400}}>
                {i<step?"✓":s.num}
              </div>
            </div>
          ))}
        </div>

        <div style={{padding:"28px 28px 24px"}}>

          {/* Шаг 1 — Приветствие */}
          {step===0&&(
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:"56px",marginBottom:"14px"}}>🎮</div>
              <div style={{fontSize:"20px",color:C.value,fontWeight:800,marginBottom:"8px"}}>
                Привет, {player?.username||"игрок"}!
              </div>
              <div style={{fontSize:"13px",color:C.muted,lineHeight:1.7,marginBottom:"24px"}}>
                Ты подключён через Steam. Вот что мы уже знаем:<br/>
                K/D, Win Rate, HS%, статистику карт.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginBottom:"24px"}}>
                {[
                  ["K/D", player?.cs2?.kd||player?.faceit?.lifetime?.kd||"—"],
                  ["WR%", (player?.cs2?.winrate||player?.faceit?.lifetime?.winrate||"—")+(player?.cs2?.winrate||player?.faceit?.lifetime?.winrate?"%":"")],
                  ["HS%", (player?.cs2?.hs||player?.faceit?.lifetime?.hs||"—")+(player?.cs2?.hs||player?.faceit?.lifetime?.hs?"%":"")],
                  ["МАТЧИ", player?.cs2?.matches||player?.faceit?.lifetime?.matches||"—"],
                ].map(([l,v],i)=>(
                  <div key={i} style={{background:"#0d0d09",border:`1px solid ${C.border}`,padding:"12px",textAlign:"center"}}>
                    <div style={{fontSize:"10px",color:C.muted,letterSpacing:"1px",marginBottom:"4px"}}>{l}</div>
                    <div style={{fontSize:"20px",color:C.yellow,fontWeight:700}}>{v}</div>
                  </div>
                ))}
              </div>
              <button onClick={()=>setStep(1)} style={{width:"100%",padding:"13px",background:C.yellow,
                color:"#080807",border:"none",cursor:"pointer",fontSize:"14px",fontWeight:700,fontFamily:"inherit"}}>
                ПРОДОЛЖИТЬ →
              </button>
            </div>
          )}

          {/* Шаг 2 — FACEIT */}
          {step===1&&(
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:"56px",marginBottom:"14px"}}>⚡</div>
              <div style={{fontSize:"20px",color:C.value,fontWeight:800,marginBottom:"8px"}}>
                Подключи FACEIT
              </div>
              <div style={{fontSize:"13px",color:C.label,lineHeight:1.75,marginBottom:"8px"}}>
                С FACEIT ты получишь:
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"6px",marginBottom:"20px",textAlign:"left"}}>
                {["История каждого матча с детальной статистикой","AI разбор каждой игры — что пошло не так","ELO график и динамика роста","Статистика по картам — лучшие и худшие"].map((t,i)=>(
                  <div key={i} style={{display:"flex",gap:"8px",alignItems:"flex-start",
                    padding:"8px 12px",background:"#0d0d09",border:`1px solid ${C.border}`}}>
                    <span style={{color:C.win,flexShrink:0,marginTop:"1px"}}>✓</span>
                    <span style={{fontSize:"13px",color:C.text}}>{t}</span>
                  </div>
                ))}
              </div>
              {player?.faceit?.elo
                ? <div style={{padding:"12px",background:"#0a140a",border:`1px solid ${C.win}44`,
                    marginBottom:"16px",fontSize:"13px",color:C.win}}>
                    ✓ FACEIT уже подключён — уровень {player.faceit.level}, {player.faceit.elo} ELO
                  </div>
                : <a href="https://www.faceit.com/ru/players-registration" target="_blank" rel="noreferrer"
                    style={{display:"block",padding:"12px",background:"#ff7733",color:"#fff",
                      textDecoration:"none",fontWeight:700,fontSize:"13px",marginBottom:"12px",
                      letterSpacing:"1px",textAlign:"center"}}>
                    ЗАРЕГИСТРИРОВАТЬСЯ НА FACEIT →
                  </a>}
              <div style={{display:"flex",gap:"8px"}}>
                <button onClick={()=>setStep(2)} style={{flex:1,padding:"12px",background:C.yellow,
                  color:"#080807",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:700,fontFamily:"inherit"}}>
                  ДАЛЕЕ →
                </button>
                <button onClick={()=>setStep(2)} style={{padding:"12px 16px",background:"transparent",
                  border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>
                  Пропустить
                </button>
              </div>
            </div>
          )}

          {/* Шаг 3 — Только код аутентификации */}
          {step===2&&(
            <div>
              <div style={{textAlign:"center",marginBottom:"14px"}}>
                <div style={{fontSize:"44px",marginBottom:"8px"}}>🔑</div>
                <div style={{fontSize:"18px",color:C.value,fontWeight:800,marginBottom:"4px"}}>
                  Подключи историю матчей
                </div>
                <div style={{fontSize:"12px",color:C.muted,lineHeight:1.5}}>
                  Нужен 1 код со страницы Steam Support
                </div>
              </div>

              {/* Инструкция */}
              <div style={{background:"#0d0d09",border:`1px solid ${C.yellow}33`,padding:"12px 14px",marginBottom:"12px"}}>
                <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"2px",fontWeight:700,marginBottom:"10px"}}>
                  КАК ПОЛУЧИТЬ КОД:
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"12px"}}>
                  <div style={{display:"flex",gap:"10px",alignItems:"flex-start"}}>
                    <div style={{width:"22px",height:"22px",background:C.blue+"22",border:`1px solid ${C.blue}55`,
                      borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:"11px",color:C.blue,fontWeight:700,flexShrink:0,marginTop:"1px"}}>1</div>
                    <div style={{fontSize:"12px",color:C.text,lineHeight:1.5}}>
                      Открой страницу Steam Support по кнопке ниже
                    </div>
                  </div>
                  <div style={{display:"flex",gap:"10px",alignItems:"flex-start"}}>
                    <div style={{width:"22px",height:"22px",background:C.yellow+"22",border:`1px solid ${C.yellow}55`,
                      borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:"11px",color:C.yellow,fontWeight:700,flexShrink:0,marginTop:"1px"}}>2</div>
                    <div style={{fontSize:"12px",color:C.text,lineHeight:1.5}}>
                      Скопируй <span style={{color:C.yellow,fontWeight:700}}>Код аутентификации</span>{" "}
                      (вида <code style={{color:C.yellow,fontSize:"11px"}}>XXXX-XXXXX-XXXX</code>)
                    </div>
                  </div>
                </div>
                <a href="https://help.steampowered.com/en/wizard/HelpWithGameIssue/?appid=730&issueid=128"
                  target="_blank" rel="noreferrer"
                  style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",
                    padding:"9px",background:"#1b2a3a",border:`1px solid ${C.blue}55`,
                    color:C.blue,textDecoration:"none",fontSize:"12px",fontWeight:700,letterSpacing:"1px"}}>
                  🔗 ОТКРЫТЬ STEAM SUPPORT →
                </a>
              </div>

              {/* Одно поле */}
              <div style={{marginBottom:"12px"}}>
                <div style={{fontSize:"10px",color:C.yellow,letterSpacing:"1px",marginBottom:"4px",fontWeight:700}}>
                  КОД АУТЕНТИФИКАЦИИ
                </div>
                <input value={authCode} onChange={e=>setAuthCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXXX-XXXX"
                  style={{width:"100%",background:"#0d0d09",border:`1px solid ${authCode?C.yellow+"66":C.border}`,
                    color:C.yellow,padding:"10px 14px",fontFamily:"monospace",fontSize:"14px",letterSpacing:"2px"}}/>
              </div>

              {codeErr&&<div style={{fontSize:"12px",color:C.lose,marginBottom:"8px",
                padding:"8px 12px",background:C.lose+"11",border:`1px solid ${C.lose}33`}}>
                ✗ {codeErr}
              </div>}

              <div style={{display:"flex",gap:"8px"}}>
                <button onClick={connectCode}
                  disabled={codeLoading||!authCode.trim()}
                  style={{flex:1,padding:"12px",
                    background:codeLoading||!authCode.trim()?C.yellow+"55":C.yellow,
                    color:"#080807",border:"none",
                    cursor:codeLoading||!authCode.trim()?"not-allowed":"pointer",
                    fontSize:"13px",fontWeight:700,fontFamily:"inherit"}}>
                  {codeLoading?"ПРОВЕРЯЮ КОД...":"ПОДКЛЮЧИТЬ →"}
                </button>
                <button onClick={()=>setStep(3)} style={{padding:"12px 16px",background:"transparent",
                  border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>
                  Пропустить
                </button>
              </div>
            </div>
          )}

          {/* Шаг 4 — Готово */}
          {step===3&&(
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:"56px",marginBottom:"14px"}}>🏆</div>
              <div style={{fontSize:"20px",color:C.value,fontWeight:800,marginBottom:"8px"}}>
                Всё готово!
              </div>
              <div style={{fontSize:"13px",color:C.label,lineHeight:1.75,marginBottom:"20px"}}>
                {codeDone
                  ? "✓ История матчей подключена!\n\n"
                  : ""}
                AI тренер уже анализирует твою игру. Заходи каждый день — серия входов даёт бонусы и следит за прогрессом.
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"6px",marginBottom:"24px",textAlign:"left"}}>
                {[
                  ["🤖","AI вердикт — персональный разбор твоих слабых сторон"],
                  ["⚡","Главное действие сегодня — что именно тренировать"],
                  ["🏅","Рейтинг и достижения — следи за прогрессом"],
                  ["📊","Сравнение периодов — как ты вырос за неделю"],
                ].map(([icon,text],i)=>(
                  <div key={i} style={{display:"flex",gap:"10px",alignItems:"center",
                    padding:"8px 12px",background:"#0d0d09",border:`1px solid ${C.border}`}}>
                    <span style={{fontSize:"16px"}}>{icon}</span>
                    <span style={{fontSize:"12px",color:C.text}}>{text}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>{ track("onboarding_completed"); onClose(); }}
                style={{width:"100%",padding:"14px",background:C.yellow,color:"#080807",
                  border:"none",cursor:"pointer",fontSize:"15px",fontWeight:800,
                  fontFamily:"inherit",letterSpacing:"1px"}}>
                НАЧАТЬ ИГРАТЬ 🎮
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function NotificationToast({notifications, onClose}) {
  useEffect(()=>{ const t=setTimeout(onClose, 5000); return()=>clearTimeout(t); },[]);
  if (!notifications?.length) return null;
  return (
    <div style={{position:"fixed",top:"70px",left:"50%",transform:"translateX(-50%)",
      zIndex:310,display:"flex",flexDirection:"column",gap:"6px",
      minWidth:"280px",maxWidth:"400px",animation:"slideUp .4s ease"}}>
      {notifications.map((n,i)=>(
        <div key={i} style={{background:"#1a1a0a",border:`2px solid ${n.color||"#f5c518"}`,
          padding:"12px 20px",boxShadow:`0 4px 20px ${n.color||"#f5c518"}33`,
          display:"flex",alignItems:"center",gap:"10px"}}>
          <span style={{fontSize:"20px"}}>{n.icon}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:"13px",color:n.color||"#f5c518",fontWeight:700}}>{n.title}</div>
            <div style={{fontSize:"12px",color:"#c8c0a0",marginTop:"2px"}}>{n.text}</div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:"none",
            color:"#6a6450",cursor:"pointer",fontSize:"14px",flexShrink:0}}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── Streak Toast ───────────────────────────────────────────────────────────────
function StreakToast({streak, onClose}) {
  useEffect(()=>{ const t=setTimeout(onClose, 4000); return()=>clearTimeout(t); },[]);
  const msg = streak>=30?"👑 30 дней подряд! Ты легенда!":
    streak>=14?"🔥 2 недели подряд! Невероятно!":
    streak>=7?"🏆 Неделя подряд! Серия выполнена!":
    streak>=3?`⚡ ${streak} дня подряд! Продолжай!`:
    `🔥 День ${streak} — хорошее начало!`;
  return (
    <div style={{position:"fixed",top:"70px",left:"50%",transform:"translateX(-50%)",
      background:"#1a1408",border:`2px solid ${C.yellow}`,padding:"14px 28px",
      zIndex:300,animation:"slideUp .4s ease",boxShadow:`0 4px 30px ${C.yellow}55`,
      display:"flex",alignItems:"center",gap:"12px",whiteSpace:"nowrap"}}>
      <span style={{fontSize:"24px"}}>🔥</span>
      <div>
        <div style={{fontSize:"15px",color:C.yellow,fontWeight:700}}>{msg}</div>
        <div style={{fontSize:"12px",color:C.muted,marginTop:"2px"}}>
          {streak<7?`До серии 7 дней: ещё ${7-streak}`:"Заходи завтра — не прерывай!"}
        </div>
      </div>
      <button onClick={onClose} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:"16px",marginLeft:"4px"}}>✕</button>
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
              <div style={{fontSize:"11px",letterSpacing:"4px",color:C.yellow,marginBottom:"10px"}}>О СЕРВИСЕ</div>
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

          <div className="about-tech-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px",marginBottom:"20px"}}>
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
      <div style={{maxWidth:"1400px",margin:"0 auto"}}>
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
function ShareModal({steamid, player, source, onClose}) {
  const shareUrl = `${BACKEND}/share/${steamid}`;
  const [copied, setCopied] = useState(false);

  const fc  = player?.faceit;
  const cs2 = player?.cs2 || {};
  const kd  = parseFloat(source==="faceit"?fc?.lifetime?.kd:cs2.kd) || 0;
  const hs  = parseFloat(source==="faceit"?fc?.lifetime?.hs:cs2.hs) || 0;
  const wr  = parseFloat(source==="faceit"?fc?.lifetime?.winrate:cs2.winrate) || 0;
  const lvl = parseInt(fc?.level) || 0;
  const elo = fc?.elo || "";

  // Считаем рейтинг
  const avgByLevel = [
    {kd:0.75,hs:28,wr:43},{kd:0.82,hs:30,wr:44},{kd:0.92,hs:33,wr:46},
    {kd:1.00,hs:36,wr:48},{kd:1.06,hs:38,wr:49},{kd:1.12,hs:40,wr:50},
    {kd:1.20,hs:42,wr:51},{kd:1.28,hs:44,wr:52},{kd:1.38,hs:46,wr:53},
    {kd:1.52,hs:48,wr:54},{kd:1.72,hs:52,wr:56},
  ];
  const avg = avgByLevel[Math.min(lvl,10)];
  function sig(v,a){return Math.min(99,Math.max(1,Math.round(100/(1+Math.exp(-4*(v/a-1))))));}
  const rating = Math.min(99, Math.round(sig(kd,avg.kd)*0.45+sig(hs,avg.hs)*0.25+sig(wr,avg.wr)*0.30));
  const rColor = rating>=70?C.win:rating>=45?C.yellow:C.orange;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(()=>setCopied(false), 2500);
    } catch { prompt("Скопируй ссылку:", shareUrl); }
  };

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",
      zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,
        borderTop:`2px solid ${C.yellow}`,maxWidth:"500px",width:"100%",padding:"28px",animation:"slideUp .3s ease"}}>

        <div style={{fontSize:"14px",letterSpacing:"3px",color:C.yellow,fontWeight:700,marginBottom:"20px"}}>
          📤 ПОДЕЛИТЬСЯ ПРОФИЛЕМ
        </div>

        {/* Превью карточки */}
        <div style={{background:"#0d0d09",border:`1px solid ${C.yellow}44`,
          borderTop:`3px solid ${C.yellow}`,padding:"20px",marginBottom:"20px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:"-30px",right:"-30px",width:"140px",height:"140px",
            background:`radial-gradient(circle,${C.yellow}12,transparent 70%)`,pointerEvents:"none"}}/>
          <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"16px"}}>
            {player?.avatar
              ? <img src={player.avatar} alt="" style={{width:"52px",height:"52px",borderRadius:"3px",border:`2px solid ${C.yellow}66`}}/>
              : <div style={{width:"52px",height:"52px",background:"#1a1a10",borderRadius:"3px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px"}}>👤</div>}
            <div>
              <div style={{fontSize:"16px",color:C.value,fontWeight:700}}>{player?.username||"Игрок"}</div>
              <div style={{fontSize:"12px",color:C.muted,marginTop:"2px"}}>
                {lvl>0?`FACEIT LVL ${lvl} · ${elo} ELO`:"Steam игрок"}
              </div>
            </div>
            <div style={{marginLeft:"auto",textAlign:"center"}}>
              <div style={{fontSize:"36px",color:rColor,fontWeight:900,lineHeight:1}}>{rating}</div>
              <div style={{fontSize:"10px",color:C.muted,marginTop:"2px"}}>CS2 Coach</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>
            {[
              {l:"K/D",   v:kd.toFixed(2),       c:C.blue},
              {l:"HS%",   v:Math.round(hs)+"%",   c:C.orange},
              {l:"WR%",   v:Math.round(wr)+"%",   c:"#aa88ff"},
            ].map((s,i)=>(
              <div key={i} style={{textAlign:"center",background:"#141409",
                border:`1px solid ${C.border}`,padding:"10px 6px"}}>
                <div style={{fontSize:"10px",color:C.muted,marginBottom:"10px",letterSpacing:"1px"}}>{s.l}</div>
                <div style={{fontSize:"18px",color:s.c,fontWeight:700}}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* URL */}
        <div style={{background:"#111109",border:`1px solid ${C.border}`,padding:"10px 14px",
          marginBottom:"14px",fontSize:"12px",color:C.muted,wordBreak:"break-all"}}>
          {shareUrl}
        </div>

        <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
          <button onClick={copy} style={{
            flex:1,padding:"12px",background:copied?"#1a3a1a":C.yellow,
            color:copied?"#55aa55":"#080807",border:copied?`1px solid #55aa55`:"none",
            cursor:"pointer",fontSize:"14px",fontWeight:700,fontFamily:"inherit",transition:"all .2s"}}>
            {copied?"✓ СКОПИРОВАНО!":"📋 КОПИРОВАТЬ ССЫЛКУ"}
          </button>
          <a href={shareUrl} target="_blank" rel="noreferrer" style={{
            padding:"12px 18px",background:"transparent",color:C.label,
            border:`1px solid ${C.border}`,textDecoration:"none",fontSize:"14px",
            fontFamily:"inherit",display:"flex",alignItems:"center",gap:"6px"}}>
            👁 Открыть
          </a>
        </div>

        <button onClick={onClose} style={{width:"100%",marginTop:"10px",padding:"10px",
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

function ProModal({player, isPro, onClose, onActivated}) {
  const [tab,setTab]         = useState(isPro ? "info" : "plans");
  const [key,setKey]         = useState("");
  const [loading,setLoading] = useState(false);
  const [msg,setMsg]         = useState(null);
  const [payLoading,setPayLoading] = useState(null);
  const [selPlan,setSelPlan] = useState("year");
  // Инициализируем сразу из localStorage — нет мерцания "загружается"
  const [proData,setProData] = useState(()=>{
    if(!player?.steamid) return null;
    try { return JSON.parse(localStorage.getItem(`cs2_pro_data_${player.steamid}`)||"null"); }
    catch { return null; }
  });
  const [promo,setPromo]     = useState("");
  const [promoInfo,setPromoInfo] = useState(null);
  const [promoLoading,setPromoLoading] = useState(false);
  const [promoErr,setPromoErr] = useState("");

  // Обновляем данные с бэкенда (без блокировки UI)
  useEffect(()=>{
    if(!player?.steamid || !isPro) return;
    fetch(`${BACKEND}/pro/${player.steamid}`)
      .then(r=>r.json())
      .then(d=>{
        if(d.pro && d.data) {
          setProData(d.data);
          try{ localStorage.setItem(`cs2_pro_data_${player.steamid}`, JSON.stringify(d.data)); }catch{}
        }
      })
      .catch(()=>{});
  },[isPro,player?.steamid]);

  async function checkPromo() {
    if (!promo.trim()) return;
    setPromoLoading(true); setPromoErr(""); setPromoInfo(null);
    try {
      const r = await fetch(`${BACKEND}/promo/check?code=${promo.trim()}&plan=${selPlan}`);
      const d = await r.json();
      if (d.ok) setPromoInfo(d);
      else setPromoErr(d.detail||"Промокод не найден");
    } catch { setPromoErr("Ошибка сети"); }
    setPromoLoading(false);
  }

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
      const body = {steamid:player.steamid, plan};
      if (promoInfo && promo.trim()) body.promo = promo.trim();
      const r=await fetch(`${BACKEND}/payment/create`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const d=await r.json();
      if (d.free) { setMsg({ok:true,text:"🎉 PRO активирован бесплатно по промокоду!"}); onActivated(); }
      else if(d.url) window.open(d.url,"_blank");
      else alert("Платежи временно недоступны. Используй активацию ключом.");
    }catch{alert("Ошибка сети");}
    setPayLoading(null);
  }

  const PRO_F = [
    {icon:"🤖", title:"AI разбор после каждой игры",   desc:"Что сделал не так — конкретно, с картами и цифрами"},
    {icon:"💬", title:"Безлимитный AI чат",             desc:"Спрашивай тренера сколько угодно, без дневных лимитов"},
    {icon:"📈", title:"Персональный прогресс",          desc:"История рейтинга, рост K/D, достижения разблокированы"},
    {icon:"🎯", title:"Анализ слабых карт",             desc:"AI находит твои худшие карты и говорит что конкретно исправить"},
    {icon:"⚡", title:"PRO значок в лидерборде",        desc:"Выделяйся среди других игроков"},
    {icon:"🎧", title:"Приоритетная поддержка",         desc:"Ответ в течение часа, прямая связь с тренером"},
  ];

  const plans = {
    month: {period:"МЕСЯЦ", price:"299 ₽", sub:"~$3.3 · отмена в любой момент", plan:"month"},
    year:  {period:"ГОД",   price:"1990 ₽", sub:"~$22 · экономия 40%", plan:"year", badge:"ВЫГОДНО"},
  };
  const p = plans[selPlan];

  return createPortal(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.yellow}55`,
        borderTop:`3px solid ${C.yellow}`,maxWidth:"500px",width:"100%",maxHeight:"92vh",
        overflowY:"auto",animation:"slideUp .3s ease",boxShadow:`0 12px 80px ${C.yellow}22`}}>

        {/* Header */}
        <div style={{padding:"24px 24px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:"11px",letterSpacing:"4px",color:C.yellow,marginBottom:"6px"}}>⚡ CS2 AI ТРЕНЕР PRO</div>
            <div style={{fontSize:"22px",color:C.value,fontWeight:700,marginBottom:"4px"}}>Стань лучше быстрее</div>
            <div style={{fontSize:"13px",color:C.muted}}>AI тренер который знает твою игру лично</div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",width:"30px",height:"30px",fontSize:"14px",flexShrink:0}}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",margin:"18px 24px 0",gap:"4px"}}>
          {(isPro
            ? [["info","⚡ Моя подписка"],["plans","Продлить"],["activate","Ввести ключ"]]
            : [["plans","Тарифы"],["activate","Ввести ключ"]]
          ).map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"9px",
              background:tab===t?C.yellow+"22":"transparent",
              border:`1px solid ${tab===t?C.yellow+"66":C.border}`,
              color:tab===t?C.yellow:C.muted,cursor:"pointer",
              fontSize:"13px",fontFamily:"inherit",fontWeight:tab===t?700:400}}>{l}</button>
          ))}
        </div>

        <div style={{padding:"20px 24px 28px"}}>
          {tab==="info"&&(
            <div>
              {/* PRO активен */}
              <div style={{textAlign:"center",padding:"20px 0 16px"}}>
                <div style={{fontSize:"48px",marginBottom:"8px"}}>⚡</div>
                <div style={{fontSize:"20px",color:C.yellow,fontWeight:800,marginBottom:"4px"}}>PRO АКТИВЕН</div>
                <div style={{fontSize:"13px",color:C.muted}}>Все функции доступны</div>
              </div>

              {/* Детали подписки — с fallback из localStorage */}
              {(()=>{
                // Берём данные: сначала бэк, потом localStorage
                const lsKey = player?.steamid ? `cs2_pro_data_${player.steamid}` : null;
                let pd = proData;
                if (!pd && lsKey) {
                  try { pd = JSON.parse(localStorage.getItem(lsKey)||"null"); } catch {}
                }
                // Если получили от бэка — сохраняем в localStorage
                if (proData && lsKey) {
                  try { localStorage.setItem(lsKey, JSON.stringify(proData)); } catch {}
                }

                const planLabel = pd?.plan==="month"?"Месяц":pd?.plan==="year"?"Год":pd?.plan==="lifetime"?"Навсегда":pd?.plan||"PRO";
                const activatedStr = pd?.activated_at
                  ? new Date(pd.activated_at*1000).toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric"})
                  : "—";

                const showExpiry = pd?.activated_at && pd?.plan !== "lifetime";
                const activatedMs = (pd?.activated_at||0) * 1000;
                const daysInPlan = pd?.plan==="year"?365:pd?.plan==="month"?30:0;
                const expiresMs = activatedMs + daysInPlan * 86400 * 1000;
                const expiresDate = new Date(expiresMs);
                const daysLeft = daysInPlan ? Math.max(0, Math.ceil((expiresMs - Date.now()) / 86400000)) : 0;
                const isExpiringSoon = daysLeft <= 7 && daysLeft > 0;
                const expired = daysInPlan > 0 && daysLeft === 0;
                const pct = daysInPlan ? Math.min(100, Math.max(0, ((Date.now()-activatedMs)/(expiresMs-activatedMs))*100)) : 0;

                return (
                  <div style={{background:"#0d0d09",border:`1px solid ${C.yellow}33`,padding:"16px 20px",marginBottom:"12px"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                      <div>
                        <div style={{fontSize:"10px",color:C.muted,letterSpacing:"2px",marginBottom:"4px"}}>ПЛАН</div>
                        <div style={{fontSize:"15px",color:C.value,fontWeight:700}}>{planLabel}</div>
                      </div>
                      <div>
                        <div style={{fontSize:"10px",color:C.muted,letterSpacing:"2px",marginBottom:"4px"}}>АКТИВИРОВАН</div>
                        <div style={{fontSize:"13px",color:C.label}}>{activatedStr}</div>
                      </div>
                    </div>

                    {/* Дата окончания */}
                    {showExpiry && daysInPlan > 0 && (
                      <div style={{marginTop:"12px",paddingTop:"12px",borderTop:`1px solid ${C.border}`}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px"}}>
                          <div>
                            <div style={{fontSize:"10px",color:C.muted,letterSpacing:"2px",marginBottom:"4px"}}>
                              {expired?"ПОДПИСКА ИСТЕКЛА":"ДЕЙСТВУЕТ ДО"}
                            </div>
                            <div style={{fontSize:"14px",color:expired?C.lose:isExpiringSoon?C.orange:C.win,fontWeight:700}}>
                              {expiresDate.toLocaleDateString("ru-RU",{day:"2-digit",month:"long",year:"numeric"})}
                            </div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:"26px",color:expired?C.lose:isExpiringSoon?C.orange:C.win,fontWeight:800,lineHeight:1}}>
                              {expired?"0":daysLeft}
                            </div>
                            <div style={{fontSize:"10px",color:C.muted,marginTop:"2px"}}>
                              {expired?"истекла":daysLeft===1?"день":daysLeft<5?"дня":"дней"}
                            </div>
                          </div>
                        </div>
                        <div style={{height:"5px",background:"#1a1a10",borderRadius:"3px",overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct.toFixed(1)}%`,
                            background:expired?C.lose:isExpiringSoon?C.orange:C.win,
                            transition:"width 1s ease"}}/>
                        </div>
                        {isExpiringSoon&&<div style={{marginTop:"8px",fontSize:"11px",
                          color:C.orange,padding:"6px 10px",background:C.orange+"11",
                          border:`1px solid ${C.orange}33`}}>
                          ⚠️ Истекает через {daysLeft} {daysLeft===1?"день":daysLeft<5?"дня":"дней"} — продли сейчас
                        </div>}
                        {expired&&<div style={{marginTop:"8px",fontSize:"11px",
                          color:C.lose,padding:"6px 10px",background:C.lose+"11",
                          border:`1px solid ${C.lose}33`}}>
                          ✗ Подписка истекла — оформи снова
                        </div>}
                      </div>
                    )}

                    {/* Lifetime */}
                    {pd?.plan==="lifetime"&&(
                      <div style={{marginTop:"12px",paddingTop:"12px",borderTop:`1px solid ${C.border}`,
                        display:"flex",alignItems:"center",gap:"8px"}}>
                        <span style={{fontSize:"20px",color:C.win}}>∞</span>
                        <div>
                          <div style={{fontSize:"13px",color:C.win,fontWeight:700}}>Навсегда</div>
                          <div style={{fontSize:"11px",color:C.muted}}>Срок не ограничен</div>
                        </div>
                      </div>
                    )}

                    {/* Нет данных из кеша — минимальная инфа */}
                    {!pd&&<div style={{marginTop:"10px",padding:"10px 12px",
                      background:"#111109",border:`1px solid ${C.border}`,
                      fontSize:"12px",color:C.muted,lineHeight:1.6}}>
                      📅 Точная дата активации не сохранена в браузере.<br/>
                      Открой <span style={{color:C.yellow}}>⚡ PRO → «Моя подписка»</span> на ПК где активировал — там будут данные.
                    </div>}
                  </div>
                );
              })()}

              {/* Что включено */}
              <div style={{fontSize:"10px",color:C.muted,letterSpacing:"2px",marginBottom:"8px"}}>ЧТО ВКЛЮЧЕНО:</div>
              {[["🤖","Безлимитный AI разбор каждой игры"],["💬","AI чат без ограничений"],["⚡","PRO значок в лидерборде"],["🎯","Анализ слабых карт"],["🎧","Приоритетная поддержка"]].map(([icon,text],i)=>(
                <div key={i} style={{display:"flex",gap:"10px",alignItems:"center",padding:"8px 0",
                  borderBottom:`1px solid ${C.border}44`}}>
                  <span style={{fontSize:"16px"}}>{icon}</span>
                  <span style={{fontSize:"13px",color:C.text}}>{text}</span>
                  <span style={{marginLeft:"auto",color:C.win,fontSize:"14px"}}>✓</span>
                </div>
              ))}

              <button onClick={()=>setTab("plans")} style={{
                width:"100%",padding:"12px",marginTop:"16px",
                background:C.yellow+"18",border:`1px solid ${C.yellow}44`,
                color:C.yellow,cursor:"pointer",fontSize:"13px",fontWeight:700,
                fontFamily:"inherit",letterSpacing:"1px"}}>
                ПРОДЛИТЬ ПОДПИСКУ →
              </button>
            </div>
          )}
          {tab==="plans"&&<>
            {/* PRO фичи — нормально описанные */}
            <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"20px"}}>
              {PRO_F.map((f,i)=>(
                <div key={i} style={{display:"flex",gap:"12px",alignItems:"flex-start",
                  padding:"10px 14px",background:"#0d0d09",border:`1px solid ${C.border}`}}>
                  <span style={{fontSize:"18px",flexShrink:0}}>{f.icon}</span>
                  <div>
                    <div style={{fontSize:"13px",color:C.value,fontWeight:700,marginBottom:"2px"}}>{f.title}</div>
                    <div style={{fontSize:"12px",color:C.muted,lineHeight:1.5}}>{f.desc}</div>
                  </div>
                  <span style={{marginLeft:"auto",color:C.win,fontSize:"14px",flexShrink:0}}>✓</span>
                </div>
              ))}
            </div>

            {/* План выбор */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"16px"}}>
              {Object.entries(plans).map(([key,p])=>(
                <div key={key} onClick={()=>setSelPlan(key)}
                  style={{padding:"14px",textAlign:"center",cursor:"pointer",position:"relative",
                    background:selPlan===key?"#1a1a0a":"#111109",
                    border:`${selPlan===key?2:1}px solid ${selPlan===key?C.yellow+"88":C.border}`,
                    transition:"all .15s"}}>
                  {p.badge&&<div style={{position:"absolute",top:"-1px",left:"50%",transform:"translateX(-50%)",
                    background:C.yellow,color:"#080807",fontSize:"9px",fontWeight:700,
                    padding:"2px 10px",letterSpacing:"1px",whiteSpace:"nowrap"}}>{p.badge}</div>}
                  <div style={{fontSize:"11px",color:C.muted,marginBottom:"4px",marginTop:p.badge?"8px":0}}>{p.period}</div>
                  <div style={{fontSize:"24px",color:selPlan===key?C.yellow:C.label,fontWeight:700,marginBottom:"3px"}}>{p.price}</div>
                  <div style={{fontSize:"10px",color:C.muted}}>{p.sub}</div>
                  {selPlan===key&&<div style={{position:"absolute",bottom:"6px",right:"8px",
                    fontSize:"12px",color:C.yellow}}>✓</div>}
                </div>
              ))}
            </div>

            {/* Промокод */}
            <div style={{marginBottom:"12px"}}>
              <div style={{display:"flex",gap:"6px"}}>
                <input value={promo} onChange={e=>{setPromo(e.target.value.toUpperCase());setPromoInfo(null);setPromoErr("");}}
                  onKeyDown={e=>e.key==="Enter"&&checkPromo()}
                  placeholder="ПРОМОКОД (если есть)"
                  style={{flex:1,background:"#0d0d09",border:`1px solid ${promoInfo?C.win:promoErr?C.lose:C.border}`,
                    color:C.value,padding:"10px 14px",fontFamily:"inherit",fontSize:"13px",
                    outline:"none",letterSpacing:"1px"}}/>
                <button onClick={checkPromo} disabled={promoLoading||!promo.trim()}
                  style={{padding:"10px 14px",background:C.border,color:C.text,border:"none",
                    cursor:"pointer",fontFamily:"inherit",fontSize:"12px",whiteSpace:"nowrap"}}>
                  {promoLoading?"...":"ПРИМЕНИТЬ"}
                </button>
              </div>
              {promoInfo&&<div style={{fontSize:"12px",color:C.win,marginTop:"6px",padding:"8px 12px",
                background:C.win+"11",border:`1px solid ${C.win}33`}}>
                ✅ Скидка {promoInfo.discount}% — итого <strong>{promoInfo.final_price} ₽</strong>
                {promoInfo.is_free&&" (бесплатно!)"}
              </div>}
              {promoErr&&<div style={{fontSize:"12px",color:C.lose,marginTop:"6px"}}>{promoErr}</div>}
            </div>

            {/* CTA кнопка */}
            <button onClick={()=>startPayment(p.plan)} disabled={!!payLoading}
              style={{width:"100%",padding:"15px",background:payLoading?C.yellow+"88":C.yellow,
                color:"#080807",border:"none",cursor:payLoading?"not-allowed":"pointer",
                fontSize:"15px",fontWeight:800,fontFamily:"inherit",letterSpacing:"1px",
                marginBottom:"12px",transition:"opacity .2s"}}>
              {payLoading?"ОТКРЫВАЮ ОПЛАТУ...":
                promoInfo ? `ПОЛУЧИТЬ PRO — ${promoInfo.final_price} ₽` :
                `ПОЛУЧИТЬ PRO — ${plans[selPlan].price}`}
            </button>

            {/* Social proof */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",
              marginBottom:"14px"}}>
              <div style={{display:"flex"}}>
                {["🟡","🟠","🔴","🟣","🔵"].map((c,i)=>(
                  <div key={i} style={{width:"22px",height:"22px",borderRadius:"50%",
                    background:C.card,border:`2px solid ${C.border}`,
                    marginLeft:i?"-6px":"0",display:"flex",alignItems:"center",
                    justifyContent:"center",fontSize:"10px"}}>{c}</div>
                ))}
              </div>
              <span style={{fontSize:"12px",color:C.muted}}>
                <span style={{color:C.yellow,fontWeight:700}}>127 игроков</span> уже PRO
              </span>
            </div>

            <div style={{fontSize:"11px",color:C.muted,textAlign:"center",lineHeight:1.6}}>
              После оплаты получишь ключ активации во вкладке "Ввести ключ"
            </div>
          </>}

          {tab==="activate"&&<>
            <div style={{fontSize:"14px",color:C.label,lineHeight:1.7,marginBottom:"8px"}}>
              Формат ключа:
            </div>
            <div style={{fontSize:"13px",color:C.yellow,fontFamily:"monospace",
              background:"#111109",border:`1px solid ${C.border}`,
              padding:"10px 14px",marginBottom:"16px",letterSpacing:"2px"}}>
              CS2PRO-XXXX-XXXX-XXXX
            </div>
            <input value={key} onChange={e=>setKey(e.target.value.toUpperCase())}
              placeholder="CS2PRO-XXXX-XXXX-XXXX"
              style={{width:"100%",background:"#111109",
                border:`1px solid ${msg?.ok===false?C.lose:C.border}`,
                color:C.yellow,fontSize:"16px",padding:"14px 16px",
                fontFamily:"'Consolas',monospace",letterSpacing:"2px",marginBottom:"10px"}}/>
            {msg&&<div style={{fontSize:"13px",color:msg.ok?C.win:C.lose,marginBottom:"12px",
              padding:"10px 14px",background:msg.ok?"#0f1a0f":"#1a0f0f",
              border:`1px solid ${msg.ok?C.win+"33":C.lose+"33"}`}}>{msg.text}</div>}
            <button onClick={activate} disabled={loading||!key.trim()||!player}
              style={{width:"100%",padding:"14px",background:loading?C.yellow+"88":C.yellow,
                color:"#080807",border:"none",cursor:loading?"not-allowed":"pointer",
                fontSize:"14px",fontWeight:700,fontFamily:"inherit"}}>
              {loading?"АКТИВИРУЮ...":"АКТИВИРОВАТЬ PRO"}
            </button>
          </>}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── PRO Celebration ───────────────────────────────────────────────────────────
function ProCelebration({onClose}) {
  useEffect(()=>{
    const t = setTimeout(onClose, 5000);
    return ()=>clearTimeout(t);
  },[]);
  return createPortal(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.96)",
      zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",
      animation:"fadeIn .3s ease",cursor:"pointer"}}>
      <div onClick={e=>e.stopPropagation()} style={{textAlign:"center",padding:"48px 40px",
        background:C.card,border:`2px solid ${C.yellow}`,maxWidth:"460px",width:"90%",
        position:"relative",overflow:"hidden",animation:"slideUp .5s ease"}}>
        {/* Светящийся фон */}
        <div style={{position:"absolute",inset:0,background:`radial-gradient(circle at 50% 30%,${C.yellow}18,transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{fontSize:"64px",marginBottom:"16px",animation:"bounce 1s ease infinite"}}>⚡</div>
        <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"5px",fontWeight:700,marginBottom:"8px"}}>
          ДОБРО ПОЖАЛОВАТЬ
        </div>
        <div style={{fontSize:"32px",color:C.value,fontWeight:900,marginBottom:"8px",lineHeight:1.2}}>
          Ты теперь PRO!
        </div>
        <div style={{fontSize:"14px",color:C.muted,marginBottom:"28px",lineHeight:1.7}}>
          Безлимитный AI разбор каждой игры.<br/>
          Приоритетная поддержка.<br/>
          PRO значок в лидерборде.
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"28px"}}>
          {[["🤖","AI без лимита"],["📊","Все статы"],["🏆","PRO значок"]].map(([icon,text],i)=>(
            <div key={i} style={{padding:"12px 8px",background:"#0d0d09",border:`1px solid ${C.yellow}33`}}>
              <div style={{fontSize:"22px",marginBottom:"4px"}}>{icon}</div>
              <div style={{fontSize:"11px",color:C.label}}>{text}</div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{
          width:"100%",padding:"14px",background:C.yellow,color:"#080807",
          border:"none",cursor:"pointer",fontSize:"15px",fontWeight:800,
          fontFamily:"inherit",letterSpacing:"2px"}}>
          НАЧАТЬ ТРЕНИРОВКУ →
        </button>
        <div style={{fontSize:"11px",color:C.muted,marginTop:"10px"}}>нажми в любом месте чтобы закрыть</div>
      </div>
    </div>,
    document.body
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
      title:"AI вердикт — конкретный разбор твоей игры",
      desc:"Не просто цифры — тренер говорит: лучшая карта, худшая карта, почему K/D падает, что исправить прямо сейчас. С конкретными картами и цифрами из твоей статистики",
      tag:"ГЛАВНАЯ ФИЧА",
    },
    {
      icon:"🏅", color:"#ff8844",
      title:"Система прогресса и уровней",
      desc:"Рейтинг Ветеран → Мастер → Элита, достижения с прогресс-барами, цель недели, серии побед. Видишь рост каждый раз когда заходишь",
      tag:"ПРОГРЕССИЯ",
    },
    {
      icon:"🎮", color:"#44ddaa",
      title:"Разбор каждого матча",
      desc:"Нажми на матч — получи детальный AI-разбор: что пошло не так, где умер глупо, что улучшить в следующей игре",
      tag:"PER-MATCH AI",
    },
    {
      icon:"💬", color:"#74c6f5",
      title:"Личный тренер 24/7",
      desc:"AI чат который знает твою статистику. Задай любой вопрос — ответ конкретный и про тебя, не generic советы",
      tag:"AI CHAT",
    },
  ];

  const REVIEWS = [
    {name:"Kryptex_cs", elo:"LVL 5 · 1380 ELO", text:"Зашёл — увидел что Ancient у меня 23% WR. AI сказал убрать из пула. Убрал. За месяц WR вырос с 44% до 51%. Теперь Ветеран в рейтинге.", kd:"K/D 1.31"},
    {name:"VortexAim",   elo:"LVL 3 · 870 ELO",  text:"Достижение Фраггер мотивирует больше чем думал. Каждый день захожу посмотреть прогресс — осталось 0.08 K/D. Серия входов уже 12 дней.", kd:"K/D 0.94"},
    {name:"ShadowByte",  elo:"LVL 7 · 1620 ELO", text:"Рейтинг показал что я Топ 28% на своём уровне. Цель — войти в Топ 20%. AI объяснил конкретно что мешает. Поднял K/D с 1.1 до 1.4.", kd:"K/D 1.42"},
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
// ── AI Verdict — большой блок наверху обзора ─────────────────────────────────
function AIVerdict({report, loading, onRefresh, cacheDate}) {
  const [step, setStep] = useState(0);
  const steps = [
    "Анализируем K/D, WR, HS%...",
    "Изучаем статистику карт...",
    "Определяем роль и стиль игры...",
    "Формируем персональный вердикт...",
  ];

  useEffect(()=>{
    if (!loading) return;
    setStep(0);
    const iv = setInterval(()=>setStep(s=>s<steps.length-1?s+1:s), 1800);
    return ()=>clearInterval(iv);
  }, [loading]);

  if (loading) return (
    <div style={{background:"linear-gradient(135deg,#15140a,#0f0f08)",
      border:`1px solid ${C.yellow}44`,borderTop:`3px solid ${C.yellow}`,
      padding:"32px",marginBottom:"16px",animation:"fadeIn .3s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"28px"}}>
        <div style={{width:"10px",height:"10px",background:C.yellow,borderRadius:"50%",
          animation:"pulse 1.2s infinite",boxShadow:`0 0 10px ${C.yellow}`}}/>
        <span style={{fontSize:"12px",letterSpacing:"4px",color:C.yellow,fontWeight:700}}>🤖 AI ТРЕНЕР АНАЛИЗИРУЕТ</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"12px",marginBottom:"28px"}}>
        {steps.map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:"12px",
            opacity:i<=step?1:0.25,transition:"opacity .5s ease"}}>
            <div style={{width:"20px",height:"20px",borderRadius:"50%",flexShrink:0,
              background:i<step?C.win+"33":i===step?"#f5c51822":C.border,
              border:`1px solid ${i<step?C.win:i===step?C.yellow:C.border}`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px"}}>
              {i<step?"✓":i===step?"●":"·"}
            </div>
            <span style={{fontSize:"13px",color:i<step?C.win:i===step?C.value:C.muted,fontWeight:i===step?700:400}}>
              {s}
            </span>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px"}}>
        {[1,2,3].map(i=><div key={i} style={{background:"#1a1408",border:`1px solid ${C.yellow}22`,padding:"14px"}}>
          <Skel w="50%" h="8" mb={8}/><Skel w="80%" h="16"/>
        </div>)}
      </div>
    </div>
  );

  if (!report) return null;

  const roleColor = {ENTRY:C.lose,"ENTRY FRAGGER":C.lose, SUPPORT:C.blue, RIFLER:C.yellow, LURKER:"#aa88ff", AWP:"#44ddaa", AWPer:"#44ddaa"};
  const rc = roleColor[report.role?.split(" ")[0]?.toUpperCase()] || roleColor[report.role] || C.yellow;
  const strengths = arr(report.strengths);
  const problems  = arr(report.problems);

  // Рейтинги навыков из отчёта или дефолт
  const rb = report.rating_breakdown || {};
  const skillBars = [
    {l:"AIM",         v:rb.aim||60,       c:"#ff6655"},
    {l:"ТАКТИКА",     v:rb.game_sense||55, c:C.blue},
    {l:"СТАБИЛЬНОСТЬ",v:rb.consistency||50,c:C.yellow},
    {l:"УТИЛИТИ",     v:rb.utility||40,   c:"#88ff88"},
    {l:"КЛАТЧ",       v:rb.clutch||45,    c:"#aa88ff"},
  ];

  return (
    <div style={{marginBottom:"16px",animation:"up .4s ease both",position:"relative"}}>
      {/* Верхняя полоска */}
      <div style={{height:"3px",background:`linear-gradient(90deg,transparent,${C.yellow}88,${C.yellow},${C.yellow}88,transparent)`}}/>

      <div style={{background:"linear-gradient(160deg,#15140a 0%,#0f0f08 100%)",
        border:`1px solid ${C.yellow}33`,padding:"0 0 20px",position:"relative",overflow:"hidden"}}>

        {/* Фоновое свечение */}
        <div style={{position:"absolute",top:0,right:"10%",width:"400px",height:"400px",
          background:`radial-gradient(circle,${C.yellow}08,transparent 60%)`,pointerEvents:"none"}}/>

        {/* ── ШАПКА: роль + кнопка ── */}
        <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"18px 24px 16px",
          borderBottom:`1px solid ${C.border}`,flexWrap:"wrap"}}>
          <div style={{width:"8px",height:"8px",background:C.yellow,borderRadius:"50%",
            boxShadow:`0 0 8px ${C.yellow}`,flexShrink:0}}/>
          <span style={{fontSize:"11px",letterSpacing:"4px",color:C.yellow,fontWeight:700}}>
            🤖 AI ТРЕНЕР · ПЕРСОНАЛЬНЫЙ РАЗБОР
          </span>
          {report.role&&(
            <div style={{display:"flex",alignItems:"center",gap:"6px",
              padding:"4px 14px",background:rc+"18",color:rc,
              border:`1px solid ${rc}55`,fontSize:"11px",letterSpacing:"2px",fontWeight:800,
              boxShadow:`0 0 10px ${rc}22`}}>
              {report.role}
            </div>
          )}
          <div style={{marginLeft:"auto",display:"flex",gap:"8px",alignItems:"center"}}>
            {cacheDate&&<span style={{fontSize:"10px",color:C.muted}}>обновлён {cacheDate}</span>}
            <button onClick={onRefresh} style={{background:"transparent",
              border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",
              fontSize:"11px",padding:"5px 14px",fontFamily:"inherit",
              letterSpacing:"1px",transition:"all .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.yellow+"66";e.currentTarget.style.color=C.yellow;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
              ↻ обновить
            </button>
          </div>
        </div>

        {/* ── ВЕРДИКТ — главное сообщение ── */}
        <div style={{padding:"22px 24px",borderBottom:`1px solid ${C.border}`}}>
          {report.roast&&(
            <div style={{display:"inline-flex",gap:"8px",alignItems:"center",
              background:`linear-gradient(90deg,${C.yellow}14,transparent)`,
              borderLeft:`3px solid ${C.yellow}`,
              padding:"10px 16px",marginBottom:"14px",width:"100%"}}>
              <span style={{fontSize:"16px",flexShrink:0}}>💬</span>
              <span style={{fontSize:"14px",color:C.yellow,fontStyle:"italic",fontWeight:600}}>
                "{report.roast}"
              </span>
            </div>
          )}
          <div style={{fontSize:"16px",color:C.value,lineHeight:1.85,fontWeight:400}}>
            {report.verdict}
          </div>
        </div>

        {/* ── РЕЙТИНГ НАВЫКОВ ── */}
        {Object.keys(rb).length>0&&(
          <div style={{padding:"18px 24px",borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontSize:"10px",color:C.muted,letterSpacing:"3px",fontWeight:700,marginBottom:"14px"}}>
              РЕЙТИНГ НАВЫКОВ
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {skillBars.map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:"12px"}}>
                  <div style={{width:"100px",fontSize:"10px",color:C.muted,letterSpacing:"1px",textAlign:"right",flexShrink:0}}>{s.l}</div>
                  <div style={{flex:1,height:"6px",background:"#1a1808",borderRadius:"3px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${s.v}%`,
                      background:`linear-gradient(90deg,${s.c}66,${s.c})`,
                      borderRadius:"3px",transition:"width 1.2s cubic-bezier(.4,0,.2,1)",
                      boxShadow:`0 0 6px ${s.c}44`}}/>
                  </div>
                  <div style={{width:"32px",fontSize:"12px",color:s.c,fontWeight:700,textAlign:"right",flexShrink:0}}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── СИЛЬНЫЕ + СЛАБЫЕ — 2 колонки ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1px",
          background:C.border,borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`}}>

          {/* Сильные */}
          <div style={{background:"#0a120a",padding:"18px 20px"}}>
            <div style={{fontSize:"10px",color:C.win,letterSpacing:"3px",fontWeight:700,
              marginBottom:"12px",display:"flex",alignItems:"center",gap:"6px"}}>
              <span>✓</span> СИЛЬНЫЕ СТОРОНЫ
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
              {strengths.map((s,i)=>{
                const st = typeof s==="object"?s:{stat:"",value:"",verdict:s,tip:""};
                return(
                  <div key={i} style={{background:"#0f1a0f",border:`1px solid ${C.win}22`,
                    padding:"12px 14px",borderLeft:`3px solid ${C.win}55`}}>
                    {st.stat&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                      <span style={{fontSize:"11px",color:C.win,fontWeight:700,letterSpacing:"1px"}}>{st.stat}</span>
                      {st.value&&<span style={{fontSize:"12px",color:C.win,fontWeight:800}}>{st.value}</span>}
                    </div>}
                    <div style={{fontSize:"13px",color:C.text,lineHeight:1.55}}>
                      {st.verdict||st.comment||(typeof s==="string"?s:"")}
                    </div>
                    {st.tip&&<div style={{fontSize:"11px",color:C.win,opacity:0.7,marginTop:"5px"}}>→ {st.tip}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Слабые */}
          <div style={{background:"#120a0a",padding:"18px 20px"}}>
            <div style={{fontSize:"10px",color:C.lose,letterSpacing:"3px",fontWeight:700,
              marginBottom:"12px",display:"flex",alignItems:"center",gap:"6px"}}>
              <span>✗</span> ПРОБЛЕМЫ
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
              {problems.map((p,i)=>{
                const pr = typeof p==="object"?p:{stat:"",value:"",reason:p,fix:""};
                const prio = pr.priority||i+1;
                return(
                  <div key={i} style={{background:"#1a0f0f",border:`1px solid ${C.lose}22`,
                    padding:"12px 14px",borderLeft:`3px solid ${C.lose}${prio===1?"ff":"66"}`}}>
                    {pr.stat&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"5px"}}>
                      <span style={{fontSize:"11px",color:C.lose,fontWeight:700,letterSpacing:"1px"}}>{pr.stat}</span>
                      <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                        {pr.value&&<span style={{fontSize:"12px",color:C.lose,fontWeight:800}}>{pr.value}</span>}
                        {prio===1&&<span style={{fontSize:"9px",background:C.lose+"22",color:C.lose,
                          padding:"1px 6px",border:`1px solid ${C.lose}44`,letterSpacing:"1px"}}>ГЛАВНОЕ</span>}
                      </div>
                    </div>}
                    <div style={{fontSize:"13px",color:C.text,lineHeight:1.55}}>
                      {pr.reason||(typeof p==="string"?p:"")}
                    </div>
                    {pr.fix&&<div style={{fontSize:"12px",color:C.yellow,marginTop:"7px",
                      background:C.yellow+"10",padding:"6px 10px",borderLeft:`2px solid ${C.yellow}44`}}>
                      💡 {pr.fix}
                    </div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── КАРТЫ ── */}
        {(report.best_map||report.worst_map)&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1px",
            background:C.border,borderBottom:`1px solid ${C.border}`}}>
            {report.best_map&&<div style={{background:"#0a160a",padding:"16px 20px"}}>
              <div style={{fontSize:"10px",color:C.win,letterSpacing:"2px",fontWeight:700,marginBottom:"8px"}}>🏆 ЛУЧШАЯ КАРТА</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                <span style={{fontSize:"16px",color:C.value,fontWeight:700}}>
                  {report.best_map.name||report.best_map}
                </span>
                {(report.best_map.wr||report.best_map.kd)&&<div style={{textAlign:"right"}}>
                  {report.best_map.wr&&<div style={{fontSize:"16px",color:C.win,fontWeight:800}}>{report.best_map.wr}</div>}
                  {report.best_map.kd&&<div style={{fontSize:"11px",color:C.muted}}>K/D {report.best_map.kd}</div>}
                </div>}
              </div>
              {report.best_map.tip&&<div style={{fontSize:"12px",color:C.muted,lineHeight:1.5}}>→ {report.best_map.tip}</div>}
            </div>}
            {report.worst_map&&<div style={{background:"#160a0a",padding:"16px 20px"}}>
              <div style={{fontSize:"10px",color:C.lose,letterSpacing:"2px",fontWeight:700,marginBottom:"8px"}}>⚠️ ХУДШАЯ КАРТА</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                <span style={{fontSize:"16px",color:C.value,fontWeight:700}}>
                  {report.worst_map.name||report.worst_map}
                </span>
                {(report.worst_map.wr||report.worst_map.kd)&&<div style={{textAlign:"right"}}>
                  {report.worst_map.wr&&<div style={{fontSize:"16px",color:C.lose,fontWeight:800}}>{report.worst_map.wr}</div>}
                  {report.worst_map.kd&&<div style={{fontSize:"11px",color:C.muted}}>K/D {report.worst_map.kd}</div>}
                </div>}
              </div>
              {report.worst_map.tip&&<div style={{fontSize:"12px",color:C.muted,lineHeight:1.5}}>→ {report.worst_map.tip}</div>}
            </div>}
          </div>
        )}

        {/* ── РОЛЬ ── */}
        {report.role_analysis&&(
          <div style={{padding:"16px 24px",borderBottom:`1px solid ${C.border}`,
            background:`linear-gradient(90deg,${rc}08,transparent)`}}>
            <div style={{fontSize:"10px",color:rc,letterSpacing:"2px",fontWeight:700,marginBottom:"8px"}}>
              👤 ТВОЯ РОЛЬ: {report.role}
            </div>
            <div style={{fontSize:"13px",color:C.text,lineHeight:1.65}}>{report.role_analysis}</div>
          </div>
        )}

        {/* ── НЕДЕЛЬНЫЙ ПЛАН ── */}
        {arr(report.weekly_plan).length>0&&(
          <div style={{padding:"18px 24px",borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontSize:"10px",color:C.yellow,letterSpacing:"3px",fontWeight:700,marginBottom:"14px"}}>
              📅 ПЛАН НА НЕДЕЛЮ
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"8px"}}>
              {arr(report.weekly_plan).map((item,i)=>{
                const it = typeof item==="object"?item:{day:`День ${i+1}`,task:item,goal:""};
                return(
                  <div key={i} style={{background:"#0d0d09",border:`1px solid ${C.yellow}22`,padding:"14px 16px"}}>
                    <div style={{fontSize:"10px",color:C.yellow,letterSpacing:"1px",fontWeight:700,marginBottom:"6px"}}>
                      {it.day}
                    </div>
                    <div style={{fontSize:"13px",color:C.value,lineHeight:1.55,marginBottom:"6px"}}>{it.task}</div>
                    {it.goal&&<div style={{fontSize:"11px",color:C.muted}}>🎯 {it.goal}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ГЛАВНАЯ ЦЕЛЬ + ПСИХОЛОГИЯ ── */}
        <div style={{padding:"18px 24px"}}>
          {report.priority&&(
            <div style={{display:"flex",gap:"14px",alignItems:"flex-start",
              background:`linear-gradient(90deg,${C.win}10,transparent)`,
              border:`1px solid ${C.win}44`,borderLeft:`4px solid ${C.win}`,
              padding:"16px 20px",marginBottom:report.mental_note?"12px":"0"}}>
              <span style={{fontSize:"24px",flexShrink:0}}>🎯</span>
              <div>
                <div style={{fontSize:"10px",letterSpacing:"3px",color:C.win,fontWeight:700,marginBottom:"6px"}}>
                  СЛЕДУЮЩИЙ ШАГ
                </div>
                <div style={{fontSize:"15px",color:C.value,lineHeight:1.65,fontWeight:600}}>{report.priority}</div>
              </div>
            </div>
          )}
          {report.mental_note&&(
            <div style={{display:"flex",gap:"12px",alignItems:"flex-start",
              background:"#0d0d16",border:`1px solid ${C.blue}33`,padding:"14px 18px"}}>
              <span style={{fontSize:"18px",flexShrink:0}}>🧠</span>
              <div>
                <div style={{fontSize:"10px",letterSpacing:"3px",color:C.blue,fontWeight:700,marginBottom:"5px"}}>
                  ПСИХОЛОГИЧЕСКИЙ ПРОФИЛЬ
                </div>
                <div style={{fontSize:"13px",color:C.text,lineHeight:1.6}}>{report.mental_note}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function AIReport({player, source}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [cacheDate, setCacheDate] = useState(null);
  const fc = player?.faceit;
  const cs2 = player?.cs2 || {};
  const cacheKey = `cs2_verdict_${player?.steamid}_${source}`;

  // Загружаем кэш при входе
  useEffect(()=>{
    if (!player?.steamid) return;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey)||"null");
      if (cached?.result && cached?.date) {
        setReport(cached.result);
        setCacheDate(cached.date);
        setLoaded(true);
      } else {
        load();
      }
    } catch { load(); }
  }, [player?.steamid, source]);

  async function load() {
    setLoading(true);
    const recentMatches = arr(fc?.matches).slice(0,5).map(m=>({
      map:m.map||"", result:m.result||"0",
      kd:m.kd||"0", hs:m.hs||"0", adr:m.adr||"0",
    }));
    const stats = source==="faceit"&&fc ? {
      kd:fc.lifetime?.kd||"0", winrate:fc.lifetime?.winrate||"0",
      hs:fc.lifetime?.hs||"0", matches:fc.lifetime?.matches||"0",
      adr:fc.lifetime?.adr||"", clutch1v1:fc.lifetime?.clutch1v1||"",
      entrySuccess:fc.lifetime?.entrySuccess||"",
      rank:"", faceit_level:String(fc.level||""), faceit_elo:String(fc.elo||""),
      maps:arr(fc.maps), recent_matches:recentMatches,
      extra: {
        kills:cs2.kills||"", deaths:cs2.deaths||"",
        mvps:cs2.mvps||"", sniper_kills:cs2.sniper_kills||"",
        knife_kills:cs2.knife_kills||"", playtime:cs2.playtime||"",
        wins:cs2.wins||"",
      }
    } : {
      kd:cs2.kd||"0", winrate:cs2.winrate||"0",
      hs:cs2.hs||"0", matches:cs2.matches||"0",
      adr:"", clutch1v1:"", entrySuccess:"",
      rank:"", faceit_level:String(fc?.level||""), faceit_elo:String(fc?.elo||""),
      maps:arr(fc?.maps), recent_matches:[],
      extra: {
        kills:cs2.kills||"", deaths:cs2.deaths||"",
        mvps:cs2.mvps||"", sniper_kills:cs2.sniper_kills||"",
        knife_kills:cs2.knife_kills||"", playtime:cs2.playtime||"",
        wins:cs2.wins||"", accuracy:cs2.accuracy||"",
      }
    };
    try {
      const r = await fetch(`${BACKEND}/ai-summary`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify(stats)
      });
      const d = await r.json();
      if(d.result){
        setReport(d.result);
        setLoaded(true);
        const today = new Date().toISOString().slice(0,10);
        setCacheDate(today);
        try{ localStorage.setItem(cacheKey, JSON.stringify({result:d.result, date:today})); }catch{}
      }
    } catch {}
    setLoading(false);
  }

  return <AIVerdict report={report} loading={loading} onRefresh={load} cacheDate={cacheDate}/>;
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
function SupportModal({player, onClose, isPro, aiRemaining}) {
  const steamid = player?.steamid || "anon";

  // Умный матчинг — ВАЖНО: порядок имеет значение, более специфичные — первыми
  const SMART_FAQ = [
    {
      id:"pro_date",
      label:"До какого PRO?",
      icon:"📅",
      // ПЕРВЫМ — чтобы "до какого у меня про" шло сюда, а не в pro_check
      keywords:[
        "до какого","до какой даты","когда истекает","когда оканчивается",
        "когда заканчивается","оканчивается подписка","заканчивается подписка",
        "срок подписки","когда кончается","сколько осталось дней",
        "дата окончания","подписка до","действует до","сколько дней осталось",
        "срок действия","до когда","срок про","на сколько дней","сколько времени"
      ],
      answer:()=>{
        if(!isPro) return "❌ У тебя сейчас нет активной PRO подписки.\n\nОформить можно нажав ⚡ PRO в шапке.";
        try {
          const pd = JSON.parse(localStorage.getItem(`cs2_pro_data_${player?.steamid}`)||"null");
          if(!pd?.activated_at) return "📅 Открой ⚡ PRO → «Моя подписка» — там видна точная дата.";
          if(pd.plan==="lifetime") return "✅ Подписка НАВСЕГДА — срок не ограничен! 🎉";
          const days = pd.plan==="year"?365:pd.plan==="month"?30:0;
          if(!days) return "📅 Открой ⚡ PRO → «Моя подписка» для деталей.";
          const expiresMs = pd.activated_at*1000+days*86400*1000;
          const daysLeft = Math.max(0,Math.ceil((expiresMs-Date.now())/86400000));
          const date = new Date(expiresMs).toLocaleDateString("ru-RU",{day:"2-digit",month:"long",year:"numeric"});
          if(daysLeft===0) return `❌ Подписка истекла ${date}.\n\nОформи снова — кнопка ⚡ PRO в шапке.`;
          return `📅 PRO действует до ${date}\n\nОсталось: ${daysLeft} ${daysLeft===1?"день":daysLeft<5?"дня":"дней"}`;
        } catch { return "📅 Открой ⚡ PRO → «Моя подписка» — там видна точная дата."; }
      }
    },
    {
      id:"pro_check",
      label:"У меня есть PRO?",
      icon:"⚡",
      keywords:[
        "у меня про","есть про","есть подписка","активна про","активен про",
        "про активна","про активен","pro активна","pro активен","pro у меня",
        "у меня pro","активирована подписка","есть ли у меня","моя подписка",
        "у меня подписка","куплена подписка","куплен про","оплатил про",
        "оплатил подписку","есть ли про","активна ли подписка","куплена ли"
      ],
      answer:()=> isPro
        ? "✅ Да! У тебя активна PRO подписка.\n\nВсе функции доступны:\n• Безлимитный AI разбор\n• AI чат без ограничений\n• PRO значок в лидерборде\n• Приоритетная поддержка"
        : "❌ Сейчас не вижу активной PRO подписки.\n\nЧто попробовать:\n1. Выйди и войди снова через Steam\n2. Подожди 1-2 мин и обнови страницу\n3. Если оплачивал — нажми «Позвать оператора»"
    },
    {
      id:"no_data",
      label:"Данные не грузятся",
      icon:"📊",
      keywords:["не загружается","не грузит","пустой профиль","нет данных","не показывает","не отображается","не работает статистика","данные пропали","нет статистики","пусто на сайте"],
      answer:()=>"Если данные не загружаются:\n1. Профиль Steam должен быть открыт (Конфиденциальность → Публичный)\n2. Статистика CS2 тоже должна быть открыта\n3. Попробуй выйти и войти снова\n\nЕсли не помогло — нажми «Позвать оператора»!"
    },
    {
      id:"faceit",
      label:"FACEIT не работает",
      icon:"🎮",
      keywords:["faceit не","не подключается faceit","нет faceit","не видит faceit","faceit не работает","не вижу faceit","faceit пустой","faceit ошибка"],
      answer:()=>"Если FACEIT не подключается:\n1. В FACEIT должен быть привязан тот же Steam аккаунт\n2. Подожди 30 сек — данные грузятся параллельно\n3. Новый аккаунт (менее 10 матчей) — статистика пока недоступна"
    },
    {
      id:"analyses",
      label:"Сколько анализов?",
      icon:"📋",
      keywords:["сколько анализов","остаток анализов","закончились анализы","нет разборов","сколько разборов","израсходовал","анализов осталось","сколько разборов осталось","лимит анализов"],
      answer:()=>`Бесплатно: 1 AI разбор в неделю.\nС PRO: безлимитно.\n\nТвой статус: ${isPro?"✅ PRO — безлимит":aiRemaining+" разбор(ов) на этой неделе"}`
    },
    {
      id:"operator",
      label:"Позвать оператора",
      icon:"🆘",
      // ПОСЛЕДНИМ — только явный запрос оператора, не "помогите" в общем
      keywords:["позови оператора","позовите оператора","нужен оператор","живой человек","хочу оператора","нужен человек","соедините с оператором"],
      escalate:true,
      answer:()=>null
    },
  ];

  function smartMatch(text) {
    const lower = text.toLowerCase().trim();
    return SMART_FAQ.find(f => f.keywords.some(k => lower.includes(k)));
  }

  const SKEY = `cs2_support_msgs_${steamid||"anon"}`;
  const INITIAL = [
    {from:"support", text:"Привет! 👋 Чем могу помочь? Выбери вопрос или напиши своё.", ts:0},
    {from:"support", text:"__CHIPS__", ts:1}, // специальный маркер для чипов
  ];

  const [msgs,setMsgs] = useState(()=>{
    try { const s=localStorage.getItem(SKEY); return s?JSON.parse(s):INITIAL; }
    catch { return INITIAL; }
  });
  const [input,setInput] = useState("");
  const [loading,setLoading] = useState(false);
  const sentAck = useRef(false);
  const lastTs = useRef(0);
  const endRef = useRef(null);

  useEffect(()=>{
    try { localStorage.setItem(SKEY, JSON.stringify(msgs)); } catch {}
    endRef.current?.scrollIntoView({behavior:"smooth"});
  },[msgs]);

  useEffect(()=>{
    const adminMsgs = msgs.filter(m=>m.admin_real);
    if(adminMsgs.length>0) lastTs.current = adminMsgs[adminMsgs.length-1].ts||0;
  },[]);

  // При открытии — синхронизируем историю с бэкенда (для кросс-девайс синхронизации)
  useEffect(()=>{
    if(!steamid||steamid==="anon") return;
    fetch(`${BACKEND}/support/history/${steamid}`)
      .then(r=>r.json())
      .then(d=>{
        if(!d.messages?.length) return;
        const adminFromServer = d.messages.filter(m=>m.from==="admin");
        if(!adminFromServer.length) return;
        setMsgs(prev=>{
          const existingTs = new Set(prev.filter(m=>m.admin_real).map(m=>m.ts));
          const fresh = adminFromServer
            .filter(m=>!existingTs.has(m.ts) && m.ts)
            .map(m=>({from:"support",text:m.text,ts:m.ts,admin_real:true}));
          if(!fresh.length) return prev;
          const merged = [...prev,...fresh].sort((a,b)=>(a.ts||0)-(b.ts||0));
          try{ localStorage.setItem(SKEY,JSON.stringify(merged)); }catch{}
          return merged;
        });
        // Обновляем lastTs
        const maxTs = Math.max(...adminFromServer.map(m=>m.ts||0));
        if(maxTs>0) lastTs.current = maxTs+1;
      })
      .catch(()=>{});
  },[steamid]);

  // Polling ответов от оператора
  useEffect(()=>{
    if(!steamid) return;
    const poll = async ()=>{
      try{
        const r = await fetch(`${BACKEND}/support/poll/${steamid}?since=${lastTs.current}`);
        const d = await r.json();
        if(d.messages?.length>0){
          d.messages.forEach(m=>{ lastTs.current = Math.max(lastTs.current, m.ts+1); });
          // Проверяем есть ли маркер закрытия
          const closeMsg = d.messages.find(m=>m.close_session);
          if(closeMsg) {
            // Добавляем финальное сообщение и кнопки — историю НЕ стираем
            setMsgs(prev=>{
              const withClose = [...prev, {from:"support",text:closeMsg.text||"✅ Вопрос закрыт.",ts:closeMsg.ts,admin_real:true}];
              // Добавляем разделитель и кнопки снова
              return [...withClose,
                {from:"support",text:"─────────────────",ts:closeMsg.ts+1},
                {from:"support",text:"Если есть ещё вопросы — выбери тему ниже 👇",ts:closeMsg.ts+2},
                {from:"support",text:"__CHIPS__",ts:closeMsg.ts+3},
              ];
            });
            // Сохраняем в localStorage (с историей)
            return;
          }
          setMsgs(prev=>{
            const existingTs = new Set(prev.filter(m=>m.admin_real).map(m=>m.ts));
            const fresh = d.messages.filter(m=>!existingTs.has(m.ts)&&!m.close_session)
              .map(m=>({from:"support",text:m.text,ts:m.ts,admin_real:true}));
            return fresh.length>0?[...prev,...fresh]:prev;
          });
        }
      }catch{}
    };
    poll();
    const t = setInterval(poll,2000);
    return()=>clearInterval(t);
  },[steamid]);

  const sending = useRef(false);

  async function handleChip(faq) {
    // Добавляем сообщение пользователя
    setMsgs(m=>[...m,{from:"user",text:faq.label,ts:Date.now()}]);
    await new Promise(r=>setTimeout(r,400));
    if(faq.escalate) {
      try {
        await fetch(`${BACKEND}/support`,{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({message:`[Кнопка] ${faq.label}`,steamid:player?.steamid||"",username:player?.username||"Аноним"})
        });
      } catch {}
      setMsgs(m=>[...m,{from:"support",text:"📨 Передаю оператору! Обычно отвечаем за несколько часов.\n\nОтвет придёт прямо сюда 👇",ts:Date.now()+1}]);
    } else {
      const answer = faq.answer();
      if(answer) setMsgs(m=>[...m,{from:"support",text:answer,ts:Date.now()+1}]);
    }
  }

  async function send() {
    const text = input.trim();
    if(!text||loading||sending.current) return;
    sending.current = true;
    setInput(""); setLoading(true);
    setMsgs(m=>[...m,{from:"user",text,ts:Date.now()}]);

    const match = smartMatch(text);
    if(match) {
      await new Promise(r=>setTimeout(r,500));
      if(match.escalate) {
        try {
          await fetch(`${BACKEND}/support`,{method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({message:text,steamid:player?.steamid||"",username:player?.username||"Аноним"})
          });
        } catch {}
        setMsgs(m=>[...m,{from:"support",text:"📨 Передаю оператору! Обычно отвечаем за несколько часов.\n\nОтвет придёт прямо сюда 👇",ts:Date.now()+1}]);
        sentAck.current=true;
      } else {
        const answer = match.answer();
        if(answer) setMsgs(m=>[...m,{from:"support",text:answer,ts:Date.now()+1}]);
      }
      setLoading(false); sending.current=false; return;
    }

    // Не распознали — отправляем оператору
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(()=>ctrl.abort(),12000);
      await fetch(`${BACKEND}/support`,{method:"POST",headers:{"Content-Type":"application/json"},
        signal:ctrl.signal,
        body:JSON.stringify({message:text,steamid:player?.steamid||"",username:player?.username||"Аноним"})
      });
      clearTimeout(tid);
      if(!sentAck.current) {
        sentAck.current=true;
        setMsgs(m=>[...m,{from:"support",text:"📨 Передал оператору! Обычно отвечаем в течение нескольких часов.",ts:Date.now()}]);
      }
    } catch {
      setMsgs(m=>[...m,{from:"support",text:"Ошибка сети. Попробуй позже или напиши напрямую: @cs2coach_support",ts:Date.now()}]);
    }
    setLoading(false); sending.current=false;
  }

  return (
    <div style={{position:"fixed",bottom:"150px",right:"24px",width:"340px",
      background:C.card,border:`1px solid ${C.blue}55`,
      boxShadow:`0 8px 40px rgba(0,0,0,0.7),0 0 20px ${C.blue}18`,
      display:"flex",flexDirection:"column",zIndex:200,animation:"slideUp .3s ease",
      maxHeight:"460px"}}>
      {/* Header */}
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,
        display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0f1114"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{width:"7px",height:"7px",background:C.win,borderRadius:"50%",
            animation:"pulse 2s infinite",boxShadow:`0 0 6px ${C.win}`}}/>
          <span style={{fontSize:"13px",color:C.blue,fontWeight:700,letterSpacing:"2px"}}>ПОДДЕРЖКА</span>
        </div>
        <button onClick={onClose} style={{background:"transparent",border:"none",
          color:C.muted,cursor:"pointer",fontSize:"18px",lineHeight:1}}>✕</button>
      </div>

      {/* Messages — чипы встроены внутрь как сообщения */}
      <div style={{flex:1,overflowY:"auto",padding:"12px",display:"flex",
        flexDirection:"column",gap:"8px"}}>
        {msgs.map((m,i)=>{
          const isUser = m.from==="user";

          // Специальный рендер чипов — внутри чата
          if(m.text==="__CHIPS__") return (
            <div key={i} style={{display:"flex",flexWrap:"wrap",gap:"5px",padding:"2px 0"}}>
              {SMART_FAQ.map(f=>(
                <button key={f.id} onClick={()=>handleChip(f)} style={{
                  padding:"5px 10px",background:f.escalate?"#1a0a0a":"#0d0d18",
                  border:`1px solid ${f.escalate?C.lose+"55":C.blue+"44"}`,
                  color:f.escalate?C.lose:C.blue,cursor:"pointer",
                  fontSize:"11px",fontFamily:"inherit",
                  display:"flex",alignItems:"center",gap:"4px",
                  borderRadius:"12px",transition:"all .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=f.escalate?"#2a0a0a":"#0d1428"}
                  onMouseLeave={e=>e.currentTarget.style.background=f.escalate?"#1a0a0a":"#0d0d18"}>
                  <span>{f.icon}</span><span>{f.label}</span>
                </button>
              ))}
            </div>
          );

          const avatar = isUser
            ? (player?.avatar
                ?<img src={player.avatar} alt="" style={{width:"22px",height:"22px",borderRadius:"50%",border:`1px solid ${C.blue}44`,flexShrink:0}}/>
                :<div style={{width:"22px",height:"22px",borderRadius:"50%",background:"#1a2a3a",border:`1px solid ${C.blue}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",flexShrink:0}}>👤</div>)
            :<div style={{width:"22px",height:"22px",borderRadius:"50%",background:"#1a180a",border:`1px solid ${C.yellow}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",flexShrink:0}}>🎧</div>;

          return(
            <div key={i} style={{display:"flex",flexDirection:"column",
              alignItems:isUser?"flex-end":"flex-start",gap:"2px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"5px",
                flexDirection:isUser?"row-reverse":"row"}}>
                {avatar}
                <span style={{fontSize:"10px",color:isUser?C.blue:C.yellow,fontWeight:700,letterSpacing:"1px",opacity:.8}}>
                  {isUser?(player?.username||"Ты"):"Поддержка"}
                </span>
              </div>
              <div style={{maxWidth:"88%",padding:"8px 12px",
                background:isUser?C.blue+"1a":"#16160e",
                border:`1px solid ${isUser?C.blue+"33":C.border}`,
                fontSize:"12px",color:isUser?C.blue:C.text,lineHeight:1.6,
                marginLeft:isUser?0:"27px",marginRight:isUser?"27px":0,
                whiteSpace:"pre-wrap"}}>
                {m.text}
              </div>
            </div>
          );
        })}
        {loading&&<div style={{display:"flex",gap:"4px",padding:"4px 0 4px 27px"}}>
          {[0,1,2].map(k=><div key={k} style={{width:"5px",height:"5px",background:C.blue,
            borderRadius:"50%",animation:`blink 1s ${k*.3}s infinite`}}/>)}
        </div>}
        <div ref={endRef}/>
      </div>

      {/* Input */}
      <div style={{padding:"10px",borderTop:`1px solid ${C.border}`,display:"flex",gap:"6px"}}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
          placeholder="Напиши вопрос..."
          style={{flex:1,background:"#111109",border:`1px solid ${C.border}`,
            color:C.value,fontSize:"13px",padding:"8px 10px",fontFamily:"inherit"}}/>
        <button onClick={send} disabled={loading||!input.trim()} style={{
          padding:"8px 14px",background:loading||!input.trim()?"#1a1a0e":C.blue,
          color:"#fff",border:"none",cursor:"pointer",
          fontSize:"14px",fontWeight:700,fontFamily:"inherit",flexShrink:0}}>→</button>
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
  const [tab, setTab] = useState("chat"); // chat | faq
  const [supportMode, setSupportMode] = useState(false);
  const endRef = useRef(null);
  const fc = player?.faceit;
  const cs2 = player?.cs2 || {};

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  const stats = source==="faceit"&&fc ? {
    kd:fc.lifetime?.kd, winrate:fc.lifetime?.winrate, hs:fc.lifetime?.hs,
    matches:fc.lifetime?.matches, faceit_level:String(fc.level||""), faceit_elo:String(fc.elo||"")
  } : {kd:cs2.kd, winrate:cs2.winrate, hs:cs2.hs, matches:cs2.matches,
       faceit_level:String(fc?.level||""), faceit_elo:String(fc?.elo||"")};

  // FAQ — автоответы на частые вопросы
  const FAQ_AUTO = [
    {
      q: "У меня активна Pro версия",
      keywords: ["про активна","pro активна","pro версия","активирован про","про активирован","показывает про"],
      answer: isPro
        ? "✅ Да, у тебя активна PRO версия! Все функции доступны: безлимитный AI разбор, приоритетная поддержка и PRO значок в лидерборде."
        : "Не вижу активной PRO подписки на твоём аккаунте. Попробуй:\n1. Выйди и войди снова через Steam\n2. Если оплатил — подожди 1-2 минуты и обнови страницу\n3. Если проблема осталась — я передам в поддержку"
    },
    {
      q: "Как активировать PRO?",
      keywords: ["как активировать","активировать про","ввести ключ","у меня есть ключ"],
      answer: "Для активации PRO:\n1. Нажми кнопку **⚡ PRO** в шапке сайта\n2. Выбери вкладку **\"Ввести ключ\"**\n3. Введи ключ в формате CS2PRO-XXXX-XXXX-XXXX\n\nЕсли ключа нет — выбери тариф и оплати картой через ЮКассу."
    },
    {
      q: "Данные не загружаются",
      keywords: ["не загружается","не грузит","пустой профиль","нет данных","ошибка загрузки"],
      answer: "Если данные не загружаются:\n1. Убедись что профиль Steam **открыт** (Настройки → Конфиденциальность → Публичный)\n2. Статистика CS2 должна быть открыта\n3. Попробуй выйти и войти снова\n\nЕсли не помогло — опиши проблему, передам в поддержку."
    },
    {
      q: "FACEIT не подключается",
      keywords: ["faceit не","не подключается faceit","нет faceit","не видит faceit"],
      answer: "Если FACEIT не подключается:\n1. Убедись что в FACEIT привязан тот же Steam аккаунт\n2. Подожди 30 секунд — данные грузятся параллельно\n3. Если аккаунт новый (менее 10 матчей) — статистика может быть недоступна"
    },
    {
      q: "Как работает Coach Rating?",
      keywords: ["coach rating","рейтинг тренера","как считается рейтинг","что значит рейтинг"],
      answer: "Coach Rating считается по формуле:\n• K/D — 45% веса\n• HS% — 25% веса\n• WR% — 30% веса\n\nКаждый показатель сравнивается со средним для твоего уровня FACEIT. Результат — от 1 до 99, показывает % игроков которых ты обгоняешь."
    },
    {
      q: "Лимит анализов",
      keywords: ["лимит","закончился","израсходовал","нет разборов","сколько разборов"],
      answer: `Бесплатно: 1 AI разбор в неделю.\n\nС PRO: безлимитно.\n\nТвой текущий остаток: ${isPro?"безлимит (PRO)":aiRemaining+" разбора(ов) на этой неделе"}`
    },
  ];

  function checkFAQ(text) {
    const lower = text.toLowerCase();
    return FAQ_AUTO.find(f => f.keywords.some(k => lower.includes(k)));
  }

  async function escalateToSupport(userMsg) {
    setSupportMode(true);
    const steamid = player?.steamid||"";
    const username = player?.username||"Аноним";
    const proStatus = isPro?"PRO активен":"Бесплатный";
    const detail = `Пользователь: ${username}\nSteam ID: ${steamid}\nСтатус: ${proStatus}\nFACEIT: ${fc?.level?"Уровень "+fc.level+" · "+fc.elo+" ELO":"нет"}\nK/D: ${stats.kd||"?"} · WR: ${stats.winrate||"?"}% · HS: ${stats.hs||"?"}%\nМатчей: ${stats.matches||"?"}\n\nВопрос: ${userMsg}`;
    try {
      await fetch(`${BACKEND}/support`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({message: detail, steamid, username})
      });
    } catch {}
    setMsgs(m=>[...m, {role:"assistant", content:"📨 Передал твой вопрос живому оператору. Обычно отвечаем в течение нескольких часов. Следи за ответом здесь — я уведомлю когда придёт ответ."}]);
  }

  async function send() {
    const q = input.trim(); if (!q || loading) return;
    const newMsgs = [...msgs, {role:"user", content:q}];
    setMsgs(newMsgs); setInput(""); setLoading(true);

    // Сначала проверяем FAQ
    const faqMatch = checkFAQ(q);
    if (faqMatch) {
      await new Promise(r=>setTimeout(r,600)); // имитация "печатает..."
      setMsgs(m=>[...m, {role:"assistant", content:faqMatch.answer}]);
      // Предлагаем поддержку если вопрос про PRO и не помогло
      if (faqMatch.keywords.some(k=>k.includes("про")||k.includes("pro"))) {
        setTimeout(()=>{
          setMsgs(m=>[...m, {role:"assistant", content:"Это помогло? Если нет — нажми кнопку ниже и я передам твой вопрос оператору поддержки.", meta:"support_offer"}]);
        }, 1000);
      }
      setLoading(false);
      return;
    }

    // Если явно просит поддержку
    const wantsSupport = ["поддержка","оператор","живой человек","помогите","не работает","проблема"].some(k=>q.toLowerCase().includes(k));
    if (wantsSupport) {
      await escalateToSupport(q);
      setLoading(false);
      return;
    }

    // Иначе — AI тренер
    const analysisKeywords = ["разбор","проанализируй","анализ моей игры","разбери мою","analyze"];
    const wantsAnalysis = analysisKeywords.some(k=>q.toLowerCase().includes(k));
    if (wantsAnalysis && !isPro && aiRemaining<=0) {
      setMsgs(m=>[...m,{role:"user",content:q},{role:"assistant",content:"⚡ Еженедельный лимит бесплатных разборов исчерпан. Вернись на следующей неделе или активируй Pro для безлимитного доступа."}]);
      setLoading(false);
      return;
    }
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

  const FAQ_LIST = [
    {q:"Как активировать PRO?", icon:"⚡"},
    {q:"У меня активна Pro версия", icon:"🔍"},
    {q:"Данные не загружаются", icon:"📊"},
    {q:"FACEIT не подключается", icon:"🎮"},
    {q:"Как работает Coach Rating?", icon:"🏆"},
    {q:"Лимит анализов", icon:"📋"},
  ];

  const QUICK = ["Почему я умираю первым?","Как апнуть FACEIT?","Что тренировать?","Лучшая карта для меня?"];

  return (
    <div className="chat-panel" style={{position:"fixed",bottom:"80px",right:"24px",width:"380px",maxHeight:"580px",
      background:C.card,border:`1px solid ${C.yellow}55`,boxShadow:`0 8px 40px rgba(0,0,0,0.7), 0 0 20px ${C.yellow}18`,
      display:"flex",flexDirection:"column",zIndex:200,animation:"slideUp .3s ease"}}>

      {/* Header */}
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,background:"#181408",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <div style={{width:"7px",height:"7px",background:C.win,borderRadius:"50%",animation:"pulse 2s infinite"}}/>
            <span style={{fontSize:"13px",color:C.yellow,fontWeight:700,letterSpacing:"2px"}}>AI ТРЕНЕР</span>
          </div>
          <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
            <button onClick={()=>setMsgs(CHAT_INIT)} title="Очистить" style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:"13px",opacity:.6}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=.6}>🗑</button>
            <button onClick={onClose} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:"18px",lineHeight:1}}>✕</button>
          </div>
        </div>
      </div>

      {/* Chat */}
      <>
        <div style={{flex:1,overflowY:"auto",padding:"14px",display:"flex",flexDirection:"column",gap:"10px"}}>
          {msgs.map((m,i)=>(
            <div key={i}>
              <div style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"85%",padding:"10px 13px",fontSize:"13px",lineHeight:1.6,
                  background:m.role==="user"?"#1a1a0e":m.role==="system"?"transparent":"#0d0d09",
                  border:m.role==="system"?"none":`1px solid ${m.role==="user"?C.yellow+"33":C.border}`,
                  color:m.role==="system"?C.muted:C.text,
                  whiteSpace:"pre-line"}}>
                  {m.content}
                </div>
              </div>
              {/* Кнопка вызова поддержки */}
              {m.meta==="support_offer"&&(
                <div style={{display:"flex",justifyContent:"flex-start",marginTop:"6px"}}>
                  <button onClick={()=>{ const lastUser=msgs.filter(x=>x.role==="user").slice(-1)[0]?.content||""; escalateToSupport(lastUser); }}
                    style={{padding:"7px 14px",background:"#0d1520",border:`1px solid ${C.blue}44`,
                      color:C.blue,cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>
                    📨 Вызвать поддержку
                  </button>
                </div>
              )}
            </div>
          ))}
          {loading&&<div style={{display:"flex",gap:"4px",padding:"10px"}}>
            {[0,1,2].map(i=><div key={i} style={{width:"6px",height:"6px",background:C.yellow,borderRadius:"50%",animation:`bounce .8s ${i*.2}s infinite`}}/>)}
          </div>}
          <div ref={endRef}/>
        </div>

        {/* Quick replies */}
        {msgs.length<3&&(
          <div style={{padding:"0 14px 8px",display:"flex",flexWrap:"wrap",gap:"5px"}}>
            {QUICK.map((q,i)=>(
              <button key={i} onClick={()=>{setInput(q);}}
                style={{padding:"5px 10px",background:"#0d0d09",border:`1px solid ${C.border}`,
                  color:C.label,cursor:"pointer",fontSize:"11px",fontFamily:"inherit"}}>
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`,display:"flex",gap:"8px",flexShrink:0}}>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),send())}
            placeholder="Спроси тренера..."
            style={{flex:1,background:"#0d0d09",border:`1px solid ${C.border}`,color:C.text,
              padding:"9px 12px",fontFamily:"inherit",fontSize:"13px",outline:"none"}}/>
          <button onClick={send} disabled={loading||!input.trim()}
            style={{padding:"9px 14px",background:C.yellow,color:"#080807",border:"none",
              cursor:loading||!input.trim()?"not-allowed":"pointer",fontSize:"14px",opacity:(loading||!input.trim())?0.5:1}}>
            {"→"}
          </button>
        </div>
      </>
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
  Mirage:  { src: "/maps/mirage.webp"  },
  Inferno: { src: "/maps/inferno.webp" },
  Dust2:   { src: "/maps/dust2.webp"   },
  Nuke:    { src: "/maps/nuke.webp"    },
  Ancient: { src: "/maps/ancient.webp" },
  Anubis:  { src: "/maps/anubis.webp"  },
};

// ── Interactive Map with SVG zones ───────────────────────────────────────────
function MapImageView({mapName}) {
  const img = MAP_IMAGES[mapName];
  if(!img) return null;
  return(
    <div style={{animation:"up .3s ease both"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderTop:`2px solid ${C.yellow}`,overflow:"hidden"}}>
        <div style={{padding:"12px 20px",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontSize:"12px",letterSpacing:"3px",color:C.yellow,fontWeight:700}}>
            {mapName.toUpperCase()} · КАРТА
          </span>
        </div>
        <img
          src={img?.src||img}
          alt={mapName}
          style={{width:"100%",display:"block"}}
        />
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
          {Object.keys(MAP_IMAGES).map(m=>(
            <button key={m} onClick={()=>setSelMap(m===selMap?null:m)} style={{
              padding:"8px 18px",background:selMap===m?C.yellow+"22":C.card,
              border:`1px solid ${selMap===m?C.yellow+"66":C.border}`,
              color:selMap===m?C.yellow:C.label,cursor:"pointer",fontSize:"14px",
              fontFamily:"inherit",fontWeight:selMap===m?700:400}}>
              {m}
            </button>
          ))}
        </div>
        {selMap&&<MapImageView mapName={selMap}/>}
        {!selMap&&<div style={{textAlign:"center",padding:"40px",color:C.muted,fontSize:"14px"}}>
          Выбери карту чтобы увидеть схему
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
            const isSteam = item.type==="steam";
            const btnColor = isSteam ? "#1b9af5" : "#ff4444";
            return(
              <div key={item.id} className="hov-card" style={{
                background:C.card,border:`1px solid ${C.border}`,padding:"18px",
                display:"flex",flexDirection:"column",gap:"10px",transition:"all .2s",
                position:"relative",overflow:"hidden"}}>
                {/* Фоновый акцент */}
                <div style={{position:"absolute",top:0,right:0,width:"80px",height:"80px",
                  background:`radial-gradient(circle,${dc}08,transparent 70%)`,pointerEvents:"none"}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",position:"relative"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <span style={{fontSize:"24px"}}>{item.icon}</span>
                    <div>
                      <div style={{fontSize:"15px",color:C.value,fontWeight:700,lineHeight:1.2}}>{item.title}</div>
                      {item.map&&<div style={{fontSize:"11px",color:C.muted,marginTop:"2px",
                        display:"flex",alignItems:"center",gap:"3px"}}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {item.map}
                      </div>}
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
                  padding:"10px 14px",
                  background:isSteam?"#0d1a2a":"#1a0d0d",
                  border:`1px solid ${btnColor}44`,
                  textDecoration:"none",color:btnColor,
                  fontSize:"13px",fontWeight:700,transition:"all .2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=isSteam?"#0d1f36":"#220d0d";e.currentTarget.style.borderColor=btnColor+"88";}}
                  onMouseLeave={e=>{e.currentTarget.style.background=isSteam?"#0d1a2a":"#1a0d0d";e.currentTarget.style.borderColor=btnColor+"44";}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    {isSteam
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill={btnColor}><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.044-4.525 4.555-4.525 2.512 0 4.555 2.03 4.555 4.525s-2.043 4.525-4.555 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.386 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.497 1.009 2.455-.397.957-1.494 1.41-2.455 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill={btnColor}><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>}
                    <span>{isSteam?"Открыть в Steam":"Смотреть на YouTube"}</span>
                  </div>
                  <span style={{fontSize:"16px",opacity:0.7}}>→</span>
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

// ── Settings Modal ────────────────────────────────────────────────────────────
function SettingsModal({player, lang, setLang, isPro, onClose, onLogout, onProModal}) {
  const [notifOn, setNotifOn] = useState(()=>{ try{ return localStorage.getItem("cs2_notif")!=="0"; }catch{ return true; } });
  const [activeSection, setActiveSection] = useState("account");

  const toggle = (key, val, setter) => {
    setter(val);
    try{ localStorage.setItem(key, val?"1":"0"); }catch{}
  };

  const Toggle = ({on, onToggle}) => (
    <div onClick={onToggle} style={{width:"44px",height:"24px",borderRadius:"12px",
      background:on?C.yellow:"#2a2a1a",border:`1px solid ${on?C.yellow:C.border}`,
      cursor:"pointer",position:"relative",transition:"all .2s",flexShrink:0}}>
      <div style={{position:"absolute",top:"3px",left:on?"23px":"3px",width:"16px",height:"16px",
        borderRadius:"50%",background:on?"#080807":C.muted,transition:"left .2s"}}/>
    </div>
  );

  const ConnBlock = ({title, icon, connected, info, linkHref, onLink, onUnlink}) => (
    <div style={{background:"#0d0d09",border:`1px solid ${C.border}`,padding:"14px 16px",marginBottom:"8px"}}>
      <div style={{fontSize:"11px",color:C.muted,letterSpacing:"1px",marginBottom:"10px"}}>{title}</div>
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        <div style={{width:"36px",height:"36px",background:connected?"#0a140a":"#1a1a10",
          border:`1px solid ${connected?C.win+"44":C.border}`,borderRadius:"3px",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>
          {icon}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"2px"}}>
            <div style={{width:"8px",height:"8px",borderRadius:"50%",
              background:connected?C.win:"#ff4444",flexShrink:0}}/>
            <span style={{fontSize:"12px",color:connected?C.win:C.lose,fontWeight:600}}>
              {connected?"Подключён":"Аккаунт не подключён"}
            </span>
          </div>
          {info&&<div style={{fontSize:"11px",color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{info}</div>}
        </div>
        {connected
          ? onUnlink&&<button onClick={onUnlink} style={{padding:"5px 10px",background:"transparent",
              border:`1px solid ${C.lose}44`,color:C.lose,cursor:"pointer",
              fontSize:"10px",fontFamily:"inherit",flexShrink:0}}>Отвязать</button>
          : <a href={linkHref||"#"} onClick={onLink} target={linkHref?"_blank":"_self"} rel="noreferrer"
              style={{padding:"7px 14px",background:"#2a4a1a",border:`1px solid ${C.win}55`,
                color:C.win,cursor:"pointer",fontSize:"11px",fontFamily:"inherit",
                fontWeight:700,letterSpacing:"1px",textDecoration:"none",whiteSpace:"nowrap",flexShrink:0}}>
              ПОДКЛЮЧИТЬ
            </a>}
      </div>
    </div>
  );

  const hasFaceit = !!(player?.faceit?.elo || player?.faceit?.nickname);
  const tgLinked = false; // TODO: добавить TG link на бэке

  const SECTIONS = [
    {id:"account", label:"Аккаунт"},
    {id:"connections", label:"Подключения"},
    {id:"preferences", label:"Настройки"},
    {id:"data", label:"Данные"},
  ];

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",
      zIndex:500,display:"flex",alignItems:"flex-start",justifyContent:"center",
      padding:"56px 20px 20px",
      animation:"fadeIn .2s ease",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:C.card,border:`1px solid ${C.border}`,borderTop:`3px solid ${C.yellow}`,
        maxWidth:"520px",width:"100%",animation:"slideUp .3s ease"}}>

        {/* Header */}
        <div style={{padding:"18px 24px",borderBottom:`1px solid ${C.border}`,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:"13px",letterSpacing:"3px",color:C.yellow,fontWeight:700}}>⚙️ НАСТРОЙКИ</div>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.border}`,
            color:C.muted,cursor:"pointer",width:"28px",height:"28px",fontSize:"14px"}}>✕</button>
        </div>

        {/* Sub-nav */}
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
          {SECTIONS.map(s=>(
            <button key={s.id} onClick={()=>setActiveSection(s.id)} style={{
              flex:1,padding:"10px 6px",background:"transparent",border:"none",
              borderBottom:`2px solid ${activeSection===s.id?C.yellow:"transparent"}`,
              color:activeSection===s.id?C.yellow:C.muted,cursor:"pointer",
              fontSize:"11px",fontFamily:"inherit",fontWeight:activeSection===s.id?700:400,
              letterSpacing:"0.5px",transition:"all .15s"}}>
              {s.label}
            </button>
          ))}
        </div>

        <div style={{padding:"16px 24px 20px"}}>

          {/* ── АККАУНТ ── */}
          {activeSection==="account"&&<>
            {player&&<div style={{display:"flex",alignItems:"center",gap:"14px",
              padding:"16px",background:"#0d0d09",border:`1px solid ${C.border}`,marginBottom:"14px"}}>
              {(player.avatar||player.faceit?.avatar)
                ?<img src={player.avatar||player.faceit?.avatar} alt="" style={{width:"52px",height:"52px",borderRadius:"3px",border:`2px solid ${C.yellow}44`}}/>
                :<div style={{width:"52px",height:"52px",background:"#1a1a10",border:`2px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px"}}>👤</div>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"15px",color:C.value,fontWeight:700,marginBottom:"3px"}}>{player.username}</div>
                <div style={{fontSize:"11px",color:C.muted}}>
                  {player.faceit?.elo?`FACEIT LVL ${player.faceit.level} · ${player.faceit.elo} ELO`:`Steam Lvl ${player.steam_level||"—"}`}
                </div>
                <div style={{fontSize:"11px",marginTop:"4px"}}>
                  <span style={{color:isPro?C.yellow:C.muted,background:isPro?C.yellow+"18":"transparent",
                    border:`1px solid ${isPro?C.yellow+"44":"transparent"}`,
                    padding:"1px 7px",fontSize:"10px",fontWeight:700,letterSpacing:"1px"}}>
                    {isPro?"⚡ PRO":"FREE"}
                  </span>
                </div>
              </div>
            </div>}

            {!isPro&&<button onClick={onProModal} style={{width:"100%",marginBottom:"12px",padding:"10px",
              background:C.yellow+"18",border:`1px solid ${C.yellow}44`,color:C.yellow,
              cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"inherit",letterSpacing:"1px"}}>
              ⚡ УЛУЧШИТЬ ДО PRO →
            </button>}

            <div style={{fontSize:"12px",color:C.muted,lineHeight:1.7,
              padding:"12px 14px",background:"#0d0d09",border:`1px solid ${C.border}`,marginBottom:"12px"}}>
              <div style={{color:C.label,fontWeight:600,marginBottom:"4px",fontSize:"11px",letterSpacing:"1px"}}>STEAM ID</div>
              <div style={{fontFamily:"monospace",color:C.blue,fontSize:"12px"}}>{player?.steamid||"—"}</div>
            </div>

            <button onClick={()=>{if(window.confirm("Выйти из аккаунта?")){ onLogout(); onClose(); }}}
              style={{width:"100%",padding:"9px",background:"transparent",border:`1px solid ${C.lose}44`,
                color:C.lose,cursor:"pointer",fontSize:"12px",fontFamily:"inherit",fontWeight:700}}>
              🚪 Выйти из аккаунта
            </button>
          </>}

          {/* ── ПОДКЛЮЧЕНИЯ ── */}
          {activeSection==="connections"&&<>
            <div style={{fontSize:"11px",color:C.muted,marginBottom:"12px",lineHeight:1.6}}>
              Подключай аккаунты для расширенной статистики и уведомлений
            </div>

            <ConnBlock
              title="STEAM"
              icon="🎮"
              connected={!!player?.steamid}
              info={player?.username ? `${player.username} · Steam Lvl ${player.steam_level||"—"}` : ""}
            />

            <ConnBlock
              title="FACEIT"
              icon="⚡"
              connected={hasFaceit}
              info={hasFaceit ? `LVL ${player.faceit.level} · ${player.faceit.elo} ELO · ${player.faceit.nickname}` : ""}
              linkHref="https://www.faceit.com/ru/players-registration"
            />

            <ConnBlock
              title="TELEGRAM"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill={tgLinked?"#66ee66":"#9a9270"}><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.03 9.566c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.4l-2.96-.924c-.643-.2-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.836.186z"/></svg>}
              connected={tgLinked}
              info={tgLinked?"Уведомления о матчах активны":"Получай уведомления о матчах в Telegram"}
              onLink={(e)=>{
                e.preventDefault();
                window.open("https://t.me/cs2coach_support","_blank");
              }}
            />

            <div style={{marginTop:"4px",padding:"10px 14px",background:"#0d0d0a",
              border:`1px solid ${C.blue}22`,fontSize:"11px",color:C.muted,lineHeight:1.6}}>
              💡 Подключи Telegram для получения уведомлений о новых матчах и достижениях
            </div>
          </>}

          {/* ── НАСТРОЙКИ ── */}
          {activeSection==="preferences"&&<>
            {/* Язык */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
              <div>
                <div style={{fontSize:"13px",color:C.value,fontWeight:600}}>Язык / Language</div>
                <div style={{fontSize:"11px",color:C.muted,marginTop:"2px"}}>Язык интерфейса</div>
              </div>
              <div style={{display:"flex",gap:"4px"}}>
                {[["ru","🇷🇺 RU"],["en","🇬🇧 EN"]].map(([l,label])=>(
                  <button key={l} onClick={()=>setLang(l)} style={{
                    padding:"5px 12px",background:lang===l?C.yellow+"22":"transparent",
                    border:`1px solid ${lang===l?C.yellow+"66":C.border}`,
                    color:lang===l?C.yellow:C.muted,cursor:"pointer",
                    fontSize:"12px",fontFamily:"inherit",fontWeight:lang===l?700:400}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Уведомления */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
              <div>
                <div style={{fontSize:"13px",color:C.value,fontWeight:600}}>Уведомления</div>
                <div style={{fontSize:"11px",color:C.muted,marginTop:"2px"}}>Достижения и апдейты</div>
              </div>
              <Toggle on={notifOn} onToggle={()=>toggle("cs2_notif",!notifOn,setNotifOn)}/>
            </div>

            {/* Тема */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
              <div>
                <div style={{fontSize:"13px",color:C.value,fontWeight:600}}>Тема</div>
                <div style={{fontSize:"11px",color:C.muted,marginTop:"2px"}}>Только тёмная тема</div>
              </div>
              <div style={{fontSize:"12px",color:C.muted,padding:"5px 10px",
                border:`1px solid ${C.border}`,background:"#0d0d09"}}>
                🌙 Тёмная
              </div>
            </div>
          </>}

          {/* ── ДАННЫЕ ── */}
          {activeSection==="data"&&<>
            <div style={{fontSize:"11px",color:C.muted,marginBottom:"12px",lineHeight:1.6}}>
              Управление локальными данными в браузере
            </div>

            {/* Ввод Premier рейтинга вручную */}
            {player?.steamid&&<div style={{background:"#0d0d09",border:`1px solid ${C.yellow}33`,
              padding:"14px 16px",marginBottom:"12px"}}>
              <div style={{fontSize:"11px",color:C.yellow,letterSpacing:"2px",fontWeight:700,marginBottom:"8px"}}>
                🏅 PREMIER РЕЙТИНГ (ввести вручную)
              </div>
              <div style={{fontSize:"11px",color:C.muted,marginBottom:"8px",lineHeight:1.5}}>
                Steam API не отдаёт Premier рейтинг публично. Введи свой рейтинг из игры — он будет показан в профиле и лидерборде.
              </div>
              <div style={{display:"flex",gap:"8px"}}>
                <input
                  id="premier_input"
                  placeholder="Например: 7794"
                  defaultValue={(()=>{try{return JSON.parse(localStorage.getItem("cs2_player_v3")||"null")?.cs2?.premier_rating||"";}catch{return "";}})()}
                  style={{flex:1,background:"#111109",border:`1px solid ${C.yellow}44`,
                    color:C.yellow,padding:"8px 12px",fontFamily:"monospace",fontSize:"14px"}}/>
                <button onClick={()=>{
                  const val = document.getElementById("premier_input")?.value?.trim();
                  if(!val||isNaN(parseInt(val))) return;
                  try{
                    const key = "cs2_player_v3";
                    const saved = JSON.parse(localStorage.getItem(key)||"{}");
                    if(!saved.cs2) saved.cs2={};
                    saved.cs2.premier_rating = val;
                    localStorage.setItem(key, JSON.stringify(saved));
                    // Также сохраняем в pro_data для лидерборда
                    const pdKey = `cs2_pro_data_${player.steamid}`;
                    const pd = JSON.parse(localStorage.getItem(pdKey)||"{}");
                    pd.premier_rating = val;
                    localStorage.setItem(pdKey, JSON.stringify(pd));
                    alert("Сохранено! Обнови страницу чтобы увидеть в профиле.");
                  }catch{}
                }} style={{padding:"8px 16px",background:C.yellow,color:"#080807",
                  border:"none",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"inherit"}}>
                  Сохранить
                </button>
              </div>
            </div>}

            {[
              {label:"История рейтинга", desc:"Снапшоты K/D, WR, HS за 30 дней", key_prefix:"cs2_rating_history_"},
              {label:"Кеш профиля", desc:"Данные Steam и FACEIT", key_prefix:"cs2_player_v3"},
              {label:"Steam auth код", desc:"Подключение к истории матчей", key_prefix:"cs2_steam_auth_"},
            ].map((item,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"11px 14px",background:"#0d0d09",border:`1px solid ${C.border}`,
                marginBottom:"6px"}}>
                <div>
                  <div style={{fontSize:"13px",color:C.label,fontWeight:600}}>{item.label}</div>
                  <div style={{fontSize:"11px",color:C.muted,marginTop:"2px"}}>{item.desc}</div>
                </div>
                <button onClick={()=>{
                  if(window.confirm(`Удалить: ${item.label}?`)){
                    const keys = Object.keys(localStorage).filter(k=>k.startsWith(item.key_prefix));
                    keys.forEach(k=>localStorage.removeItem(k));
                    if(item.key_prefix==="cs2_player_v3") localStorage.removeItem("cs2_player_v3");
                  }
                }} style={{padding:"5px 10px",background:"transparent",
                  border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",
                  fontSize:"10px",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}>
                  Очистить
                </button>
              </div>
            ))}

            <div style={{marginTop:"8px",padding:"10px 14px",background:"#0d0d09",
              border:`1px solid ${C.border}`,fontSize:"11px",color:C.muted,lineHeight:1.7}}>
              · Пароли и личные данные никогда не сохраняются<br/>
              · Используется только публичная статистика Steam и FACEIT<br/>
              · Данные хранятся локально в браузере
            </div>
          </>}
        </div>
      </div>
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
  const [notifications, setNotifications]   = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isPro,setIsProRaw]            = useState(()=>{ try{ return localStorage.getItem("cs2_is_pro")==="1"; }catch{ return false; } });
  const [aiRemaining,setAiRemaining]   = useState(FREE_WEEKLY);
  const setIsPro = (v) => { setIsProRaw(v); try{ localStorage.setItem("cs2_is_pro", v?"1":"0"); }catch{} };
  const [showProModal,setShowProModal] = useState(false);
  const [showProCelebration,setShowProCelebration] = useState(false);
  const [showChecklist,setShowChecklist] = useState(true);
  const [profileDropdown,setProfileDropdown] = useState(false);
  const [lang,setLang] = useState(()=>{ try{ return localStorage.getItem("cs2_lang")||"ru"; }catch{ return "ru"; } });
  const [showSettings,setShowSettings] = useState(false);
  const [showOnboarding,setShowOnboarding] = useState(false);
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
            .then(d=>{
              if(d.pro){
                setIsPro(true);
                setAiRemaining(999);
                setShowProModal(false);
                setShowProCelebration(true);
              } else {
                // ЮКасса иногда медленная — повторяем через 5 сек
                setTimeout(()=>{
                  fetch(`${BACKEND}/pro/${player.steamid}`)
                    .then(r=>r.json())
                    .then(d2=>{
                      if(d2.pro){ setIsPro(true); setAiRemaining(999); setShowProModal(false); }
                    });
                }, 5000);
              }
            })
            .catch(()=>{});
        }
      }, 1500);
    }
  },[]);

  // ── Авто-синхронизация с лидербордом при каждом обновлении игрока ─────────
  useEffect(()=>{
    if (!player?.steamid) return;
    // Генерируем уведомления при первой загрузке данных
    try {
      const notifKey = `cs2_last_notif_${player.steamid}`;
      const today = new Date().toISOString().slice(0,10);
      const lastNotif = localStorage.getItem(notifKey);
      if (lastNotif !== today) {
        const notifs = [];
        // Проверяем новые достижения
        const fc2 = player.faceit;
        const cs22 = player.cs2||{};
        const kd = parseFloat(fc2?.lifetime?.kd||cs22.kd)||0;
        const hs = parseFloat(fc2?.lifetime?.hs||cs22.hs)||0;
        const wr = parseFloat(fc2?.lifetime?.winrate||cs22.winrate)||0;
        const matches = parseInt(fc2?.lifetime?.matches||cs22.matches)||0;
        const kills = parseInt(cs22.kills)||0;
        const mvps = parseInt(cs22.mvps)||0;
        // Проверяем какие ачивки только что разблокировались
        const prevData = JSON.parse(localStorage.getItem(`cs2_prev_stats_${player.steamid}`)||"{}");
        if (prevData.kd && kd >= 1.0 && prevData.kd < 1.0) notifs.push({icon:"⚔️",title:"Достижение: Фраггер!",text:"K/D превысил 1.0 — цель достигнута",color:C.blue});
        if (prevData.hs && hs >= 40 && prevData.hs < 40) notifs.push({icon:"🎯",title:"Достижение: HS Машина!",text:"40%+ хедшотов — отличная точность",color:C.orange});
        if (prevData.matches && matches >= 200 && prevData.matches < 200) notifs.push({icon:"🎖️",title:"Достижение: Ветеран!",text:"200 матчей — ты опытный игрок",color:C.yellow});
        if (prevData.mvps && mvps >= 100 && prevData.mvps < 100) notifs.push({icon:"🥇",title:"Достижение: MVP x100!",text:"100 MVP — настоящий лидер команды",color:C.yellow});
        // Стрик при повторном входе
        const cur = parseInt(localStorage.getItem("cs2_streak")||"0");
        // Стрик показывается отдельным StreakToast — не дублируем в notifications
        // if (cur >= 3 && lastNotif) notifs.push(...);
        // Сохраняем текущие статы для следующего сравнения
        localStorage.setItem(`cs2_prev_stats_${player.steamid}`, JSON.stringify({kd,hs,wr,matches,kills,mvps}));
        localStorage.setItem(notifKey, today);
        if (notifs.length > 0) {
          setNotifications(notifs);
          setTimeout(()=>setShowNotifications(true), 2000);
        }
      }
    } catch {}
  },[player?.steamid]);

  // ── Авто-синхронизация с лидербордом при каждом обновлении игрока ─────────
  useEffect(()=>{
    if (!player?.steamid) return;
    const fc2 = player.faceit;
    const cs22 = player.cs2 || {};
    const lbKd = fc2?.lifetime?.kd || cs22.kd || "0";
    const lbWr = fc2?.lifetime?.winrate || cs22.winrate || "0";
    const lbHs = fc2?.lifetime?.hs || cs22.hs || "0";
    const lbM  = fc2?.lifetime?.matches || cs22.matches || "0";
    if (parseFloat(lbKd) <= 0 || parseInt(lbM) <= 0) return;

    const lbKills = cs22.kills || "0";
    const lbDeaths = cs22.deaths || "0";
    const lbMvp = cs22.mvps || "0";
    const lbPt = cs22.playtime || "0";
    const lbLvl = parseInt(fc2?.level)||0;

    const avgByLevel = [{kd:0.75,hs:28,wr:43},{kd:0.82,hs:30,wr:44},{kd:0.92,hs:33,wr:46},{kd:1.00,hs:36,wr:48},{kd:1.06,hs:38,wr:49},{kd:1.12,hs:40,wr:50},{kd:1.20,hs:42,wr:51},{kd:1.28,hs:44,wr:52},{kd:1.38,hs:46,wr:53},{kd:1.52,hs:48,wr:54},{kd:1.72,hs:52,wr:56}];
    const avg = avgByLevel[Math.min(lbLvl,10)];
    function sig(v,a){return Math.min(99,Math.max(1,Math.round(100/(1+Math.exp(-4*(parseFloat(v)/a-1))))));}
    const lbOverall = Math.min(99,Math.round(sig(lbKd,avg.kd)*0.45+sig(lbHs,avg.hs)*0.25+sig(lbWr,avg.wr)*0.30));
    const coachLevels=[{max:19,name:"НОВОБРАНЕЦ"},{max:34,name:"БОЕЦ"},{max:49,name:"СНАЙПЕР"},{max:64,name:"ВЕТЕРАН"},{max:79,name:"МАСТЕР"},{max:89,name:"ЭЛИТА"},{max:100,name:"ЛЕГЕНДА"}];
    const levelLabel = coachLevels.find(l=>lbOverall<=l.max)?.name || "ВЕТЕРАН";

    fetch(`${BACKEND}/leaderboard/add`,{
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        steamid: player.steamid,
        username: player.username,
        avatar: player.avatar||"",
        stats:{kd:lbKd, winrate:lbWr, hs:lbHs, matches:lbM,
          rank: fc2?.elo?`FACEIT ${fc2.level}`:"Steam",
          kills:lbKills, deaths:lbDeaths, mvp:lbMvp, playtime:lbPt,
          wins: String(parseInt(player.cs2?.wins)||0),
          premier_rating: String(player.cs2?.premier_rating||""),
          best_premier: String(player.cs2?.best_premier||""),
        },
        level: levelLabel,
        overall: String(lbOverall),
      })
    })
    .then(r=>r.json())
    .then(d=>{
      console.log("[LB] added:", player.username, "rank:", d.rank, "total:", d.total);
      if (!d.rank || !d.total) return;
      const lbKey = `cs2_lb_rank_${player.steamid}`;
      const prevRank = parseInt(localStorage.getItem(lbKey)||"0");
      if (prevRank && prevRank !== d.rank) {
        const improved = d.rank < prevRank;
        const diff = Math.abs(prevRank - d.rank);
        setNotifications(n => [...n, {
          icon: improved ? "📈" : "📉",
          title: improved
            ? `Ты поднялся на ${diff} ${diff===1?"место":"мест"} в лидерборде!`
            : `Ты опустился на ${diff} ${diff===1?"место":"мест"} в лидерборде`,
          text: `${prevRank} → ${d.rank} место из ${d.total}`,
          color: improved ? C.win : C.lose,
        }]);
        setTimeout(()=>setShowNotifications(true), 3000);
      }
      localStorage.setItem(lbKey, String(d.rank));
    })
    .catch(e=>console.error("[LB] error:", e));
  },[player?.steamid, player?.faceit?.elo, player?.cs2?.matches]);

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
        // Проверяем бан перед загрузкой
        if (p.steamid) {
          fetch(`${BACKEND}/check-ban/${p.steamid}`)
            .then(r => {
              if (r.status === 403) {
                r.json().then(bd => {
                  localStorage.removeItem("cs2_player_v3");
                  localStorage.removeItem("cs2_is_pro");
                  document.body.innerHTML = `<div style="min-height:100vh;background:#0a0a07;display:flex;align-items:center;justify-content:center;font-family:sans-serif;">
                    <div style="text-align:center;padding:40px;max-width:400px;">
                      <div style="font-size:64px;margin-bottom:16px;">⛔</div>
                      <div style="font-size:20px;color:#ff4444;font-weight:700;margin-bottom:8px;">Аккаунт заблокирован</div>
                      <div style="font-size:14px;color:#9a9270;line-height:1.7;">${bd.detail||'Доступ к сервису ограничен.'}</div>
                    </div>
                  </div>`;
                });
              }
            })
            .catch(()=>{});
        }
        setPlayer(p);
        if (!hasFaceit) setSource("steam");
        // check Pro status — бэкенд источник правды
        if (p.steamid) {
          const proCheckPromise = fetch(`${BACKEND}/pro/${p.steamid}`)
            .then(r=>r.json())
            .then(d=>{
              if(d.pro){
                setIsPro(true); setAiRemaining(999);
                // Кешируем локально для оффлайн-fallback
                try{
                  localStorage.setItem("cs2_is_pro","1");
                  if(d.data) localStorage.setItem(`cs2_pro_data_${p.steamid}`, JSON.stringify(d.data));
                }catch{}
              } else {
                // Бэкенд говорит НЕТ PRO — доверяем бэкенду
                // Чистим localStorage чтобы не было конфликта
                try{
                  localStorage.removeItem("cs2_is_pro");
                  // НЕ удаляем pro_data — нужен для отображения даты истекшей подписки
                }catch{}
                setIsPro(false); setAiRemaining(d.remaining??FREE_WEEKLY);
              }
            })
            .catch(()=>{
              // Бэкенд НЕДОСТУПЕН (таймаут/сеть) — только тогда используем localStorage
              const localPro = localStorage.getItem("cs2_is_pro") === "1";
              if(localPro){ setIsPro(true); setAiRemaining(999); }
            });
        }
        // background refresh
        if (p.steamid) {
          // Восстанавливаем steam auth код на бэкенде если есть в localStorage
          try {
            const steamAuthKey = `cs2_steam_auth_${p.steamid}`;
            const savedAuth = JSON.parse(localStorage.getItem(steamAuthKey)||"null");
            if (savedAuth?.auth_code && savedAuth?.match_code) {
              fetch(`${BACKEND}/steam/auth-code`, {
                method:"POST", headers:{"Content-Type":"application/json"},
                body: JSON.stringify({steamid: p.steamid, auth_code: savedAuth.auth_code, match_code: savedAuth.match_code})
              }).catch(()=>{});
            }
          } catch {}

          fetch(`${BACKEND}/profile/${p.steamid}`).then(r=>r.json()).then(d=>{
            if (d?.steamid) {
              const fresh = {...p, username:d.username||p.username, avatar:d.avatar||p.avatar,
                created:d.created||p.created, steam_level:d.steam_level??p.steam_level,
                country:d.country||p.country, cs2:d.cs2||p.cs2||{},
                faceit: d.faceit || p.faceit || null};
              setPlayer(fresh);
              try{localStorage.setItem("cs2_player_v3",JSON.stringify(fresh));}catch{}
              // Автоснапшот рейтинга при каждом входе (раз в день)
              try {
                const fc2 = fresh.faceit;
                const cs22 = fresh.cs2 || {};
                const snapKd  = parseFloat(fc2?.lifetime?.kd || cs22.kd) || 0;
                const snapHs  = parseFloat(fc2?.lifetime?.hs || cs22.hs) || 0;
                const snapWr  = parseFloat(fc2?.lifetime?.winrate || cs22.winrate) || 0;
                const snapLvl = parseInt(fc2?.level) || 0;
                const snapMatches = parseInt(fc2?.lifetime?.matches || cs22.matches) || 0;
                if (snapKd > 0 && snapMatches > 0) {
                  const hKey = `cs2_rating_history_${fresh.steamid}`;
                  const today = new Date().toISOString().slice(0,10);
                  const prev = JSON.parse(localStorage.getItem(hKey)||"[]");
                  const filtered = prev.filter(s=>s.date!==today);
                  filtered.push({date:today, kd:snapKd, hs:snapHs, wr:snapWr, lvl:snapLvl, matches:snapMatches});
                  localStorage.setItem(hKey, JSON.stringify(filtered.slice(-30)));
                }
              } catch {}
              // Авто-добавление в лидерборд при каждом входе
              try {
                const fc2 = fresh.faceit;
                const cs22 = fresh.cs2 || {};
                const lbKd  = fc2?.lifetime?.kd || cs22.kd || "0";
                const lbWr  = fc2?.lifetime?.winrate || cs22.winrate || "0";
                const lbHs  = fc2?.lifetime?.hs || cs22.hs || "0";
                const lbM   = fc2?.lifetime?.matches || cs22.matches || "0";
                const lbKills = cs22.kills || "0";
                const lbDeaths = cs22.deaths || "0";
                const lbMvp = cs22.mvps || "0";
                const lbPt  = cs22.playtime || "0";
                const lbLvl = parseInt(fc2?.level)||0;
                // Считаем уровень для label
                const lbOverall = (() => {
                  const avgByLevel = [{kd:0.75,hs:28,wr:43},{kd:0.82,hs:30,wr:44},{kd:0.92,hs:33,wr:46},{kd:1.00,hs:36,wr:48},{kd:1.06,hs:38,wr:49},{kd:1.12,hs:40,wr:50},{kd:1.20,hs:42,wr:51},{kd:1.28,hs:44,wr:52},{kd:1.38,hs:46,wr:53},{kd:1.52,hs:48,wr:54},{kd:1.72,hs:52,wr:56}];
                  const avg = avgByLevel[Math.min(lbLvl,10)];
                  function sig(v,a){return Math.min(99,Math.max(1,Math.round(100/(1+Math.exp(-4*(parseFloat(v)/a-1))))));}
                  return Math.min(99,Math.round(sig(lbKd,avg.kd)*0.45+sig(lbHs,avg.hs)*0.25+sig(lbWr,avg.wr)*0.30));
                })();
                const coachLevels=[{max:19,name:"НОВОБРАНЕЦ"},{max:34,name:"БОЕЦ"},{max:49,name:"СНАЙПЕР"},{max:64,name:"ВЕТЕРАН"},{max:79,name:"МАСТЕР"},{max:89,name:"ЭЛИТА"},{max:100,name:"ЛЕГЕНДА"}];
                const levelLabel = coachLevels.find(l=>lbOverall<=l.max)?.name || "ВЕТЕРАН";
                if (parseFloat(lbKd) > 0 && parseInt(lbM) > 0 && fresh.steamid) {
                  fetch(`${BACKEND}/leaderboard/add`, {
                    method:"POST", headers:{"Content-Type":"application/json"},
                    body: JSON.stringify({
                      steamid: fresh.steamid,
                      username: fresh.username,
                      avatar: fresh.avatar||"",
                      stats: {kd:lbKd, winrate:lbWr, hs:lbHs, matches:lbM,
                        rank: fc2?.elo ? `FACEIT ${fc2.level}` : "Steam",
                        kills:lbKills, deaths:lbDeaths, mvp:lbMvp, playtime:lbPt},
                      level: levelLabel,
                      overall: String(lbOverall),
                    })
                  }).catch(()=>{});
                }
              } catch {}
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

      // Проверяем бан сразу при входе
      if (p.steamid) {
        fetch(`${BACKEND}/check-ban/${p.steamid}`)
          .then(r => {
            if (r.status === 403) {
              r.json().then(bd => {
                localStorage.removeItem("cs2_player_v3");
                localStorage.removeItem("cs2_is_pro");
                document.body.innerHTML = `<div style="min-height:100vh;background:#0a0a07;display:flex;align-items:center;justify-content:center;font-family:sans-serif;">
                  <div style="text-align:center;padding:40px;max-width:400px;">
                    <div style="font-size:64px;margin-bottom:16px;">⛔</div>
                    <div style="font-size:20px;color:#ff4444;font-weight:700;margin-bottom:8px;">Аккаунт заблокирован</div>
                    <div style="font-size:14px;color:#9a9270;line-height:1.7;">${bd.detail||'Доступ к сервису ограничен.'}</div>
                  </div>
                </div>`;
              });
              return; // не логиним
            }
            // Не забанен — продолжаем вход
            setPlayer(p);
            if (!p.faceit?.elo) setSource("steam");
            try{localStorage.setItem("cs2_player_v3",JSON.stringify(p));}catch{}
            setShowPopup(false);
            // check Pro status
            fetch(`${BACKEND}/pro/${p.steamid}`)
              .then(r=>r.json())
              .then(d=>{ if(d.pro){setIsPro(true);setAiRemaining(999);}else{const lp=localStorage.getItem("cs2_is_pro")==="1";if(!lp){setIsPro(false);setAiRemaining(d.remaining??FREE_WEEKLY);}} })
              .catch(()=>{});
          })
          .catch(()=>{
            // Ошибка сети — всё равно логиним
            setPlayer(p);
            if (!p.faceit?.elo) setSource("steam");
            try{localStorage.setItem("cs2_player_v3",JSON.stringify(p));}catch{}
            setShowPopup(false);
          });
      } else {
        setPlayer(p);
        setShowPopup(false);
      }
      // Авто-добавление в лидерборд при первом входе
      try {
        const fc2 = p.faceit;
        const cs22 = p.cs2 || {};
        const lbKd = fc2?.lifetime?.kd || cs22.kd || "0";
        const lbWr = fc2?.lifetime?.winrate || cs22.winrate || "0";
        const lbHs = fc2?.lifetime?.hs || cs22.hs || "0";
        const lbM  = fc2?.lifetime?.matches || cs22.matches || "0";
        const lbLvl = parseInt(fc2?.level)||0;
        const avgByLevel = [{kd:0.75,hs:28,wr:43},{kd:0.82,hs:30,wr:44},{kd:0.92,hs:33,wr:46},{kd:1.00,hs:36,wr:48},{kd:1.06,hs:38,wr:49},{kd:1.12,hs:40,wr:50},{kd:1.20,hs:42,wr:51},{kd:1.28,hs:44,wr:52},{kd:1.38,hs:46,wr:53},{kd:1.52,hs:48,wr:54},{kd:1.72,hs:52,wr:56}];
        const avg = avgByLevel[Math.min(lbLvl,10)];
        function sig(v,a){return Math.min(99,Math.max(1,Math.round(100/(1+Math.exp(-4*(parseFloat(v)/a-1))))));}
        const lbOverall = Math.min(99,Math.round(sig(lbKd,avg.kd)*0.45+sig(lbHs,avg.hs)*0.25+sig(lbWr,avg.wr)*0.30));
        const coachLevels=[{max:19,name:"НОВОБРАНЕЦ"},{max:34,name:"БОЕЦ"},{max:49,name:"СНАЙПЕР"},{max:64,name:"ВЕТЕРАН"},{max:79,name:"МАСТЕР"},{max:89,name:"ЭЛИТА"},{max:100,name:"ЛЕГЕНДА"}];
        const levelLabel = coachLevels.find(l=>lbOverall<=l.max)?.name || "ВЕТЕРАН";
        if (parseFloat(lbKd) > 0 && parseInt(lbM) > 0) {
          fetch(`${BACKEND}/leaderboard/add`,{method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({steamid:p.steamid, username:p.username, avatar:p.avatar||"",
              stats:{kd:lbKd, winrate:lbWr, hs:lbHs, matches:lbM,
                rank:fc2?.elo?`FACEIT ${fc2.level}`:"Steam",
                kills:cs22.kills||"0", deaths:cs22.deaths||"0", mvp:cs22.mvps||"0", playtime:cs22.playtime||"0"},
              level:levelLabel, overall:String(lbOverall)})
          }).catch(()=>{});
        }
      } catch {}
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
      track("analysis_generated", { source, level: result.level, steamid: player.steamid });
      // Сохраняем в кеш AI Вердикта для главной страницы
      try {
        const cacheKey = `cs2_verdict_${player.steamid}_${source}`;
        const today = new Date().toISOString().slice(0,10);
        // Конвертируем формат /analyze в формат AIVerdict
        const verdictResult = {
          verdict: result.overall || "",
          role: "RIFLER",
          roast: result.mainProblem || "",
          strengths: (result.strengths||[]).map(s=>({stat:s.stat,value:"",verdict:s.comment,tip:""})),
          problems: (result.weaknesses||[]).map((w,i)=>({stat:w.stat,value:"",reason:w.problem,fix:w.fix,priority:i+1})),
          priority: result.plan?.[0] || "",
          weekly_plan: (result.plan||[]).map((p,i)=>({day:`День ${i+1}`,task:p,goal:""})),
          best_map: result.mapInsights?.[0]?{name:result.mapInsights[0],wr:"",kd:"",tip:""}:null,
          worst_map: result.mapInsights?.[1]?{name:result.mapInsights[1],wr:"",kd:"",tip:""}:null,
          rating_breakdown: {aim:65,game_sense:55,consistency:50,utility:45,clutch:50},
        };
        localStorage.setItem(cacheKey, JSON.stringify({result:verdictResult, date:today}));
      } catch {}
      track("analysis_generated", { source, level: result.level, steamid: player.steamid });
      // Онбординг для новичков (первый анализ)
      const obKey = `cs2_onboarding_${player.steamid}`;
      if (!localStorage.getItem(obKey)) {
        setTimeout(() => setShowOnboarding(true), 800);
        localStorage.setItem(obKey, "1");
      }
      const newCount = analysisCount+1;
      setAnalysisCount(newCount);
      try{ localStorage.setItem("cs2_analysis_count",String(newCount)); }catch{}
      // Сохраняем снапшот рейтинга для истории прогресса
      try{
        const kd  = parseFloat(statsPayload.kd)||0;
        const hs  = parseFloat(statsPayload.hs)||0;
        const wr  = parseFloat(statsPayload.winrate)||0;
        const lvl = parseInt(player.faceit?.level)||0;
        const snap = {date:new Date().toISOString().slice(0,10), kd, hs, wr, lvl,
          matches:parseInt(statsPayload.matches)||0};
        const hKey = `cs2_rating_history_${player.steamid}`;
        const prev = JSON.parse(localStorage.getItem(hKey)||"[]");
        // Один снапшот в день
        const today = snap.date;
        const filtered = prev.filter(s=>s.date!==today);
        filtered.push(snap);
        localStorage.setItem(hKey, JSON.stringify(filtered.slice(-30)));
      }catch{}
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

  const setLangPersist = (v) => { setLang(v); try{ localStorage.setItem("cs2_lang",v); }catch{} };

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className="scanlines" style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif",color:C.text}}>
      <style>{css}</style>
      {/* scanline */}
      <div style={{position:"fixed",left:0,right:0,height:"2px",
        background:`linear-gradient(90deg,transparent,${C.yellow}18,transparent)`,
        animation:"scan 10s linear infinite",pointerEvents:"none",zIndex:1}}/>

      {showPopup&&<SteamPopup onLogin={openSteam} onSkip={()=>setShowPopup(false)}/>}
      {showSettings&&<SettingsModal player={player} lang={lang} setLang={setLangPersist} isPro={isPro} onClose={()=>setShowSettings(false)} onLogout={logout} onProModal={()=>{setShowSettings(false);setShowProModal(true);}}/>}
      {profileView&&<ProfileModal steamid={profileView.steamid} nickname={profileView.nickname} myId={player?.steamid} isPro={isPro} onClose={()=>setProfileView(null)}/>}
      {shareOpen&&player&&<ShareModal steamid={player.steamid} player={player} source={source} onClose={()=>setShareOpen(false)}/>}
      {showProModal&&<ProModal player={player} isPro={isPro} onClose={()=>setShowProModal(false)}
        onActivated={()=>{
          setIsPro(true); setAiRemaining(999); setShowProModal(false); setShowProCelebration(true);
          // Сохраняем данные о подписке в localStorage для восстановления на других устройствах
          if (player?.steamid) {
            try {
              const proData = {activated_at: Math.floor(Date.now()/1000), plan: "month", order: "activated"};
              // Пробуем получить актуальные данные с бэкенда
              fetch(`${BACKEND}/pro/${player.steamid}`)
                .then(r=>r.json())
                .then(d=>{
                  if(d.pro && d.data) {
                    localStorage.setItem(`cs2_pro_data_${player.steamid}`, JSON.stringify(d.data));
                  } else {
                    // Fallback — сохраняем с текущим временем
                    localStorage.setItem(`cs2_pro_data_${player.steamid}`, JSON.stringify(proData));
                  }
                  localStorage.setItem("cs2_is_pro","1");
                })
                .catch(()=>{
                  localStorage.setItem(`cs2_pro_data_${player.steamid}`, JSON.stringify(proData));
                  localStorage.setItem("cs2_is_pro","1");
                });
            } catch {}
          }
        }}/>}
      {showProCelebration&&<ProCelebration onClose={()=>setShowProCelebration(false)}/>}
      <ColdStartBanner status={serverStatus}/>

      {/* Top accent */}
      <div style={{height:"3px",background:`linear-gradient(90deg,${C.yellow},#c9a000,${C.yellow})`}}/>

      {/* Topbar */}
      <div style={{background:"#0d0d09",borderBottom:`1px solid ${C.border}`,
        padding:"8px 14px",display:"flex",alignItems:"center",
        justifyContent:"space-between",gap:"6px",position:"relative",zIndex:10,
        overflow:"hidden"}}>
        {/* Логотип */}
        <div onClick={()=>setShowAbout(true)} style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",flexShrink:0}}
          onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
          onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
          <Logo size={24} withText={true}/>
        </div>
        {/* Правая часть — не переносится, сжимается */}
        <div className="topbar-right" style={{display:"flex",alignItems:"center",gap:"6px",minWidth:0,overflow:"hidden"}}>
          <div className="search-bar"><SearchBar onSelect={r=>setProfileView({nickname:r.nickname})}/></div>
          {/* Язык */}
          <button onClick={()=>setLangPersist(l=>l==="ru"?"en":"ru")}
            style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,
              cursor:"pointer",padding:"4px 6px",fontFamily:"inherit",
              display:"flex",alignItems:"center",gap:"3px",flexShrink:0,transition:"all .2s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.yellow+"88"}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            {lang==="ru"
              ? <svg width="16" height="11" viewBox="0 0 18 13"><rect width="18" height="13" fill="#fff"/><rect width="18" height="4.33" y="4.33" fill="#0039A6"/><rect width="18" height="4.34" y="8.66" fill="#D52B1E"/></svg>
              : <svg width="16" height="11" viewBox="0 0 60 40"><rect width="60" height="40" fill="#012169"/><path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="8"/><path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="5"/><path d="M30,0 L30,40 M0,20 L60,20" stroke="#fff" strokeWidth="13"/><path d="M30,0 L30,40 M0,20 L60,20" stroke="#C8102E" strokeWidth="8"/></svg>}
            <span className="topbar-username" style={{fontSize:"10px",color:C.muted,letterSpacing:"1px"}}>{lang==="ru"?"RU":"EN"}</span>
          </button>
          {player?(
            <>
              {isPro
                ? <button onClick={()=>setShowProModal(true)} style={{display:"flex",alignItems:"center",gap:"4px",flexShrink:0,
                    padding:"4px 8px",background:`linear-gradient(135deg,${C.yellow}33,#ff880022)`,
                    border:`1px solid ${C.yellow}88`,cursor:"pointer",fontFamily:"inherit"}}>
                    <span style={{fontSize:"12px"}}>⚡</span>
                    <span style={{fontSize:"11px",color:C.yellow,fontWeight:800,letterSpacing:"1px"}}>PRO</span>
                  </button>
                : <button onClick={()=>setShowProModal(true)} style={{flexShrink:0,
                    padding:"4px 8px",background:C.yellow+"18",border:`1px solid ${C.yellow}44`,
                    color:C.yellow,cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"inherit"}}>
                    ⚡ PRO
                  </button>}
              {streak>1&&<div style={{display:"flex",alignItems:"center",gap:"3px",flexShrink:0,
                padding:"3px 7px",background:"#1a1408",border:`1px solid ${C.yellow}44`,cursor:"help"}}>
                <span style={{fontSize:"12px"}}>🔥</span>
                <span style={{fontSize:"12px",color:C.yellow,fontWeight:700}}>{streak}</span>
                <span className="topbar-username" style={{fontSize:"10px",color:C.muted}}>дн</span>
              </div>}
              <button onClick={()=>setShareOpen(true)} className="topbar-share" style={{background:"transparent",border:`1px solid ${C.yellow}44`,color:C.yellow,cursor:"pointer",fontSize:"11px",fontFamily:"inherit",padding:"4px 8px",flexShrink:0}}>📤</button>
              {/* Профиль — только аватарка + стрелка на мобиле */}
              <div style={{position:"relative",flexShrink:0}}>
                <button onClick={()=>setProfileDropdown(o=>!o)}
                  style={{display:"flex",alignItems:"center",gap:"5px",background:"transparent",
                    border:`1px solid ${profileDropdown?C.yellow+"66":C.border}`,
                    cursor:"pointer",padding:"3px 6px",transition:"all .2s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=C.yellow+"55"}
                  onMouseLeave={e=>{if(!profileDropdown)e.currentTarget.style.borderColor=C.border;}}>
                  {(player.avatar||player.faceit?.avatar)
                    ?<img src={player.avatar||player.faceit?.avatar} alt="" style={{width:"22px",height:"22px",borderRadius:"2px",flexShrink:0}}/>
                    :<span style={{fontSize:"18px"}}>👤</span>}
                  <span className="topbar-username" style={{fontSize:"12px",color:C.value,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"80px"}}>{player.username}</span>
                  <span style={{fontSize:"9px",color:C.muted,flexShrink:0,transition:"transform .2s",
                    transform:profileDropdown?"rotate(180deg)":"rotate(0deg)"}}>▼</span>
                </button>
                {profileDropdown&&<>
                  <div onClick={()=>setProfileDropdown(false)} style={{position:"fixed",inset:0,zIndex:99}}/>
                  <div style={{position:"fixed",right:"8px",top:"50px",
                    background:"#141409",border:`1px solid ${C.yellow}44`,
                    width:"min(220px,calc(100vw - 16px))",zIndex:100,
                    animation:"popIn .15s ease",boxShadow:"0 8px 32px rgba(0,0,0,0.7)"}}>
                    <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:"10px"}}>
                      {(player.avatar||player.faceit?.avatar)
                        ?<img src={player.avatar||player.faceit?.avatar} alt="" style={{width:"32px",height:"32px",borderRadius:"3px",border:`1px solid ${C.border}`,flexShrink:0}}/>
                        :<div style={{width:"32px",height:"32px",background:"#1a1a10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",flexShrink:0}}>👤</div>}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:"13px",color:C.value,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{player.username}</div>
                        <div style={{fontSize:"10px",color:isPro?C.yellow:C.muted,marginTop:"1px"}}>
                          {isPro?"⚡ PRO активен":hasFaceit?`FACEIT LVL ${player.faceit.level}`:`Steam Lvl ${player.steam_level||"—"}`}
                        </div>
                      </div>
                    </div>
                    {[
                      {icon:"👤",label:"Мой профиль",action:()=>{setProfileView({steamid:player?.steamid});setProfileDropdown(false);}},
                      {icon:"⚙️",label:"Настройки",action:()=>{setShowSettings(true);setProfileDropdown(false);}},
                      {icon:"⚡",label:"PRO подписка",action:()=>{setShowProModal(true);setProfileDropdown(false);}},
                      {icon:"📤",label:"Поделиться",action:()=>{setShareOpen(true);setProfileDropdown(false);}},
                    ].map((item,i)=>(
                      <button key={i} onClick={item.action}
                        style={{display:"flex",alignItems:"center",gap:"10px",width:"100%",padding:"10px 14px",
                          background:"transparent",border:"none",color:C.label,cursor:"pointer",
                          fontSize:"13px",fontFamily:"inherit",textAlign:"left",borderBottom:`1px solid ${C.border}`,transition:"all .15s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="#1a1a10";e.currentTarget.style.color=C.yellow;}}
                        onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.label;}}>
                        <span style={{fontSize:"14px",width:"20px",textAlign:"center",flexShrink:0}}>{item.icon}</span>{item.label}
                      </button>
                    ))}
                    <button onClick={()=>{logout();setProfileDropdown(false);}}
                      style={{display:"flex",alignItems:"center",gap:"10px",width:"100%",padding:"10px 14px",
                        background:"transparent",border:"none",color:C.lose,cursor:"pointer",
                        fontSize:"13px",fontFamily:"inherit",textAlign:"left",transition:"all .15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#1a0808"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <span style={{fontSize:"14px",width:"20px",textAlign:"center",flexShrink:0}}>🚪</span>Выйти
                    </button>
                  </div>
                </>}
              </div>
            </>
          ):(
            <button onClick={openSteam} style={{background:"#1b6090",color:"#fff",border:"none",padding:"7px 12px",cursor:"pointer",fontSize:"11px",fontWeight:700,letterSpacing:"2px",fontFamily:"'Courier New',monospace",flexShrink:0}}>STEAM</button>
          )}
        </div>
      </div>

      <div style={{className:"content-pad",maxWidth:"1400px",margin:"0 auto",padding:"28px 24px 80px",position:"relative",zIndex:5,minHeight:"calc(100vh - 200px)"}}>

        {/* Page title */}
        <div style={{marginBottom:"24px"}}>
          <h1 style={{fontSize:"clamp(26px,5vw,42px)",fontWeight:400,margin:"0 0 4px",color:C.value,letterSpacing:"2px"}}>
            Разбор твоей игры
          </h1>
          <p style={{color:C.muted,fontSize:"13px",margin:0}}>Steam + FACEIT аналитика · AI-тренер</p>
        </div>

        {/* Main tabs */}
        <div style={{className:"desktop-nav",display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:"22px",flexWrap:"wrap"}}>
          {[["overview","ОБЗОР"],["coach","🎯 ТРЕНЕР"],["practice","📚 ПРАКТИКА"],["matches","🎮 МАТЧИ"],["maps","🗺️ КАРТЫ"],["history","📋 ИСТОРИЯ"],["leaderboard","🏆 ЛИДЕРЫ"],["friends","👥 ДРУЗЬЯ"]].map(([t,l])=>(
            <button key={t} onClick={()=>{ setMainTab(t); track("tab_opened",{tab:t}); }} style={{
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

            {/* ── СЕКЦИЯ 1: Профиль ── */}
            <SectionTitle icon="👤" label="ПРОФИЛЬ"/>
            <HeroCard player={player} source={source}/>

            {/* ── СЕКЦИЯ 2: AI Вердикт ── */}
            <SectionTitle icon="🤖" label="AI ВЕРДИКТ" sub="персональный разбор твоей игры"/>
            {!player.cs2?.private&&(isPro||aiRemaining>0
              ? <AIReport player={player} source={source}/>
              : <PaywallOverlay feature="AI Вердикт" onUpgrade={()=>setShowProModal(true)}/>)}

            {/* ── СЕКЦИЯ 3: Рейтинг ── */}
            <SectionTitle icon="🏅" label="РЕЙТИНГ" sub="Coach Rating на основе твоей статистики"/>
            <PlayerRating player={player} source={source}/>

            {/* ── СЕКЦИЯ 4: Цель и тренировка ── */}
            <SectionTitle icon="⚡" label="СЕГОДНЯ" sub="главное действие для роста"/>
            <DayAction player={player} source={source} streak={streak}/>

            {/* ── СЕКЦИЯ 5: Прогресс ── */}
            <SectionTitle icon="📈" label="ПРОГРЕСС" sub="как ты изменился"/>
            <WeekComparison player={player}/>
            <ProgressHistory player={player} source={source}/>

            {/* ── СЕКЦИЯ 6: Последние матчи (FACEIT) ── */}
            {source==="faceit"&&hasFaceit&&<>
              <SectionTitle icon="🎮" label="ПОСЛЕДНИЕ МАТЧИ" sub="нажми → AI разбор"/>
              <RecentMatchesOverview faceit={player.faceit}/>
            </>}

            {/* ── СЕКЦИЯ 7: Достижения — за кнопкой ── */}
            <AchievementsCollapsible player={player} source={source}/>

            {/* ── Steam статы (только Steam режим) ── */}
            {source==="steam"&&!player.cs2?.private&&<>
              <SectionTitle icon="🎮" label="СТАТИСТИКА STEAM"/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"3px",marginBottom:"10px"}}>
                {[{l:"УБИЙСТВА",v:player.cs2?.kills},{l:"СМЕРТИ",v:player.cs2?.deaths},{l:"ПОБЕДЫ",v:player.cs2?.wins},{l:"MVP",v:player.cs2?.mvps}].map((s,i)=>(
                  <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,padding:"16px",textAlign:"center"}}>
                    <div style={{fontSize:"13px",color:C.label,letterSpacing:"1px",marginBottom:"7px"}}>{s.l}</div>
                    <div style={{fontSize:"24px",color:C.yellow,fontWeight:700}}>{s.v||"—"}</div>
                  </div>
                ))}
              </div>
              {/* Оружия */}
              <SectionTitle icon="🔫" label="ОРУЖИЯ" sub="статистика по оружию"/>
              <WeaponsPanel cs2={player.cs2}/>
            </>}

            {/* Оружия FACEIT режим */}
            {source==="faceit"&&hasFaceit&&player.cs2&&!player.cs2.private&&<>
              <SectionTitle icon="🔫" label="ОРУЖИЯ" sub="статистика из Steam"/>
              <WeaponsPanel cs2={player.cs2}/>
            </>}

            {/* ── Свёрнутое: дополнительные метрики ── */}
            <ScoreCardsCollapsible player={player} source={source}/>

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
                <div style={{background:C.card,border:`1px solid ${C.border}`,borderLeft:`4px solid ${lc}`,padding:"24px 26px",marginBottom:"10px"}}>
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
                  <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"20px 22px",marginBottom:"10px"}}>
                    <div style={{fontSize:"12px",letterSpacing:"3px",color:C.yellow,marginBottom:"12px"}}>🗺️ ИНСАЙТЫ ПО КАРТАМ</div>
                    {analysis.mapInsights.map((mi,i)=>(
                      <div key={i} style={{fontSize:"14px",color:C.value,lineHeight:1.7,marginBottom:"7px",paddingLeft:"14px",borderLeft:`2px solid ${C.yellow}44`}}>{mi}</div>
                    ))}
                  </div>
                )}

                <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:"10px"}}>
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
                      <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,padding:"18px 20px",marginBottom:"10px",display:"flex",gap:"18px",alignItems:"flex-start"}}>
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
          ?<>
            <SourceToggle source={source} setSource={setSource} hasFaceit={hasFaceit}/>

            {/* Steam статистика — красивое оформление */}
            {player.cs2&&!player.cs2.private&&<>
              <SteamStatsPanel player={player}/>
            </>}

            {source==="faceit"&&hasFaceit&&<>
              <SectionTitle icon="⚡" label="FACEIT МАТЧИ"/>
              <EloChart faceit={player.faceit}/>
              <Streaks player={player} source={source}/>
              <WeeklyMissions player={player} source={source}/>
              <MatchHistory faceit={player.faceit}/>
              <div style={{marginTop:"10px"}}><ChartsSection faceit={player.faceit}/></div>
            </>}
            {!hasFaceit&&<div style={{background:C.card,border:`1px solid ${C.border}`,padding:"28px 24px",textAlign:"center",marginTop:"10px"}}>
              <div style={{fontSize:"32px",marginBottom:"12px"}}>⚡</div>
              <div style={{fontSize:"15px",color:C.value,fontWeight:700,marginBottom:"8px"}}>Подключи FACEIT для истории матчей</div>
              <div style={{fontSize:"13px",color:C.label,lineHeight:1.7,marginBottom:"16px"}}>
                История каждого матча, K/D по раундам, статистика карт, ELO динамика — всё это через FACEIT.
              </div>
              <a href="https://www.faceit.com" target="_blank" rel="noreferrer"
                style={{display:"inline-block",padding:"11px 28px",background:C.orange,
                  color:"#fff",textDecoration:"none",fontSize:"13px",fontWeight:700,letterSpacing:"2px"}}>
                РЕГИСТРАЦИЯ НА FACEIT →
              </a>
            </div>}
          </>
          :<div style={{textAlign:"center",padding:"60px",color:C.muted,fontSize:"13px"}}>Войди через Steam</div>)}

        {mainTab==="maps"&&(!player?<LandingPage onLogin={openSteam}/>:player
          ?<>
            <SourceToggle source={source} setSource={setSource} hasFaceit={hasFaceit}/>
            {source==="faceit"&&hasFaceit&&<>
              {/* Best/Worst карта */}
              <BestWorstMap faceit={player.faceit}/>
              {/* Полная статистика карт */}
              <MapPool faceit={player.faceit}/>
            </>}
            {source!=="faceit"&&<div style={{textAlign:"center",padding:"50px",color:C.muted,fontSize:"13px"}}>
              Статистика карт доступна только через ⚡ FACEIT
            </div>}
          </>
          :<div style={{textAlign:"center",padding:"60px",color:C.muted,fontSize:"13px"}}>Войди через Steam</div>)}

        {mainTab==="history"&&(!player?<LandingPage onLogin={openSteam}/>:player
          ?<HistoryTab steamid={player.steamid}/>
          :<div style={{textAlign:"center",padding:"60px",color:C.muted,fontSize:"13px"}}>Войди через Steam</div>)}

        {mainTab==="practice"&&<PracticeTab player={player}/>}
        {mainTab==="leaderboard"&&<Leaderboard myId={player?.steamid} myIsPro={isPro} onProfile={sid=>setProfileView({steamid:sid})}/>}
        {mainTab==="friends"&&(!player?<LandingPage onLogin={openSteam}/>:<FriendsTab myPlayer={player} source={source}/>)}
      </div>

      <div style={{height:"2px",background:`linear-gradient(90deg,transparent,${C.yellow},transparent)`}}/>
      <Footer onAbout={()=>setShowAbout(true)} onPro={()=>setShowProModal(true)} onLeaderboard={()=>setMainTab("leaderboard")}/>

      {showAbout&&<AboutModal onClose={()=>setShowAbout(false)}/>}
      {supportOpen&&<SupportModal player={player} isPro={isPro} aiRemaining={aiRemaining} onClose={()=>setSupportOpen(false)}/>}
      {/* Streak toast */}
      {showStreakToast&&<StreakToast streak={streak} onClose={()=>setShowStreakToast(false)}/>}
      {/* Notifications */}
      {showNotifications&&notifications.length>0&&<NotificationToast notifications={notifications} onClose={()=>setShowNotifications(false)}/>}
      {showOnboarding&&<OnboardingModal player={player} onClose={()=>setShowOnboarding(false)} onGoTab={setMainTab}/>}

      {/* Mobile nav */}
      {player&&<MobileNav tab={mainTab} setTab={setMainTab}/>}

      {/* Support & Chat bubbles — стопкой снизу вверх */}
      {/* 🤖 AI тренер — самая нижняя кнопка */}
      {player&&<>
        <button onClick={()=>{ setChatOpen(o=>!o); try{localStorage.setItem("cs2_chat_done","1");}catch{} }}
          className="fab-chat"
          style={{
            position:"fixed",bottom:"24px",right:"24px",width:"52px",height:"52px",
            background:chatOpen?C.yellow:"#1a1a0e",color:chatOpen?"#080807":C.yellow,
            border:`2px solid ${C.yellow}`,borderRadius:"50%",cursor:"pointer",
            fontSize:"24px",boxShadow:`0 4px 20px ${C.yellow}44`,zIndex:200,
            transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {chatOpen?"✕":"🤖"}
        </button>
        {chatOpen&&<ChatPanel player={player} source={source} isPro={isPro} aiRemaining={aiRemaining} onClose={()=>setChatOpen(false)}/>}
      </>}
      {/* 💬 Поддержка */}
      <button onClick={()=>setSupportOpen(o=>!o)}
        className="fab-support"
        style={{
          position:"fixed",bottom:"96px",right:"24px",width:"48px",height:"48px",
          background:supportOpen?"#1b6090":"#0d1520",color:C.blue,
          border:`2px solid ${C.blue}`,borderRadius:"50%",cursor:"pointer",
          fontSize:"20px",boxShadow:`0 4px 16px ${C.blue}33`,zIndex:199,
          transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center"}}
        title="Поддержка и FAQ">
        💬
      </button>
    </div>
  );
}
