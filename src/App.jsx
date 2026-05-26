import { useState, useEffect, useRef } from "react";

const BACKEND = "https://cs2-coach-backend.onrender.com";

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
  useEffect(()=>{fetch(`${BACKEND}/leaderboard`).then(r=>r.json()).then(d=>setData(d.leaderboard||[])).catch(()=>setData([]));},[]);
  if (!data) return <div style={{padding:"12px"}}>{[1,2,3,4,5].map(i=><Skel key={i} h="50"/>)}</div>;
  if (!data.length) return (
    <div style={{textAlign:"center",padding:"70px",color:C.muted}}>
      <div style={{fontSize:"36px",marginBottom:"14px"}}>🏆</div>
      <div style={{fontSize:"13px",letterSpacing:"3px"}}>ТАБЛИЦА ПУСТА</div>
      <div style={{fontSize:"13px",color:C.muted,marginTop:"8px"}}>Войди через Steam и сделай анализ</div>
    </div>
  );
  return (
    <div style={{animation:"up .4s ease both"}}>
      <div style={{fontSize:"12px",color:C.muted,marginBottom:"14px"}}>Нажми на игрока — откроется профиль</div>
      <div style={{className:"lb-grid",display:"grid",gridTemplateColumns:"48px 1fr 100px 68px 68px 68px 90px",gap:"2px",
        padding:"8px 14px",fontSize:"11px",letterSpacing:"2px",color:C.muted,borderBottom:`1px solid ${C.border}`}}>
        <div>#</div><div>ИГРОК</div><div>RANK</div><div>K/D</div><div>WIN%</div><div>HS%</div><div>УРОВЕНЬ</div>
      </div>
      {data.map((p,i)=>{
        const lc=ANALYSIS_COLOR[p.level]||C.yellow;
        const isMe=myId&&p.steamid===myId;
        const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
        return (
          <div key={i} className="hov-row" onClick={()=>onProfile(p.steamid)} style={{
            className:"lb-grid",display:"grid",gridTemplateColumns:"48px 1fr 100px 68px 68px 68px 90px",gap:"2px",
            padding:"14px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,
            background:isMe?"#1a1a08":C.card,borderLeft:isMe?`2px solid ${C.yellow}`:`2px solid transparent`,
            transition:"background .15s"}}>
            <div style={{color:i<3?C.yellow:C.muted,fontSize:"15px",fontWeight:700}}>{medal||i+1}</div>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              {p.avatar?<img src={p.avatar} alt="" style={{width:"30px",height:"30px",borderRadius:"2px"}}/>
                :<div style={{width:"30px",height:"30px",background:"#1a1a10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px"}}>👤</div>}
              <span style={{fontSize:"15px",color:isMe?C.yellow:C.value,fontWeight:isMe?700:400}}>
                {p.username}{isMe?" (ты)":""}
              </span>
            </div>
            <div style={{fontSize:"15px",color:C.yellow,fontWeight:700}}>{p.stats?.rank||"—"}</div>
            <div style={{fontSize:"15px",color:C.label}}>{p.stats?.kd||"—"}</div>
            <div style={{fontSize:"14px",color:C.label}}>{p.stats?.winrate||"—"}%</div>
            <div style={{fontSize:"14px",color:C.label}}>{p.stats?.hs||"—"}%</div>
            <div style={{padding:"3px 10px",background:lc+"18",color:lc,border:`1px solid ${lc}33`,
              fontSize:"11px",letterSpacing:"1px",display:"inline-flex",alignItems:"center",height:"fit-content"}}>
              {p.level}
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

// ── Cold Start Banner ─────────────────────────────────────────────────────────
function ColdStartBanner({status}) {
  if (status !== 'slow' && status !== 'waking') return null;
  return (
    <div style={{position:"fixed",bottom:"88px",left:"50%",transform:"translateX(-50%)",
      background:"#1a1a0a",border:`1px solid ${C.yellow}55`,padding:"10px 20px",
      zIndex:150,display:"flex",alignItems:"center",gap:"10px",whiteSpace:"nowrap",
      boxShadow:`0 4px 20px rgba(0,0,0,0.5)`,animation:"slideUp .3s ease"}}>
      <div style={{display:"flex",gap:"4px"}}>
        {[0,1,2].map(i=><div key={i} style={{width:"5px",height:"5px",background:C.yellow,
          borderRadius:"50%",animation:`blink 1s ${i*.25}s infinite`}}/>)}
      </div>
      <span style={{fontSize:"13px",color:C.label}}>Сервер запускается</span>
      <span style={{fontSize:"12px",color:C.muted}}>~30 сек при первом заходе</span>
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

// ── Landing Page ──────────────────────────────────────────────────────────────
function LandingPage({onLogin}) {
  const FEATURES = [
    {icon:"🤖", title:"AI разбор за 10 секунд", desc:"Тренер анализирует твои статы и говорит конкретно что исправить — не просто числа, а причины поражений"},
    {icon:"📊", title:"Steam + FACEIT в одном месте", desc:"Все данные собираются автоматически. Видишь динамику K/D, карты, историю матчей и прогресс ELO"},
    {icon:"💬", title:"Спроси тренера", desc:"Чат с AI который знает твою статистику. Задай любой вопрос — получи ответ основанный на твоей игре"},
  ];
  const STATS = [
    {val:"2.1K+",label:"разборов сделано"},
    {val:"89%",label:"игроков улучшили K/D"},
    {val:"<10s",label:"время анализа"},
  ];
  const [tick,setTick] = useState(0);
  useEffect(()=>{ const t=setInterval(()=>setTick(x=>x+1),1800);return()=>clearInterval(t);},[]);
  const INSIGHTS = [
    "Ты проигрываешь большинство дуэлей в движении",
    "Counter-strafe timing нужно исправить",
    "Слишком ранний peek без флешки",
    "Weak CT positioning на Mirage",
    "Низкий trade success после первого килла",
  ];

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      {/* Hero */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        padding:"60px 24px 40px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        {/* Background glow */}
        <div style={{position:"absolute",top:"20%",left:"50%",transform:"translateX(-50%)",
          width:"600px",height:"400px",
          background:`radial-gradient(ellipse,${C.yellow}0e,transparent 70%)`,
          pointerEvents:"none"}}/>

        <div style={{fontSize:"13px",letterSpacing:"5px",color:C.yellow,marginBottom:"24px",
          display:"flex",alignItems:"center",gap:"8px",justifyContent:"center"}}>
          <div style={{width:"7px",height:"7px",background:C.yellow,borderRadius:"50%",animation:"pulse 2s infinite"}}/>
          CS2 AI ТРЕНЕР
        </div>

        <h1 style={{fontSize:"clamp(32px,6vw,64px)",fontWeight:700,margin:"0 0 20px",
          color:C.value,lineHeight:1.15,maxWidth:"700px"}}>
          AI скажет тебе<br/>
          <span style={{color:C.yellow}}>почему ты проигрываешь</span>
        </h1>

        <p style={{fontSize:"18px",color:C.label,maxWidth:"520px",lineHeight:1.7,margin:"0 0 40px"}}>
          Подключи Steam — получи персональный разбор от AI тренера за 10 секунд. Конкретные причины, не просто статы.
        </p>

        {/* Animated insight */}
        <div style={{background:"#1a1a0a",border:`1px solid ${C.yellow}44`,padding:"16px 28px",
          marginBottom:"40px",maxWidth:"460px",width:"100%",position:"relative",overflow:"hidden",animation:"fadeIn .5s ease"}}>
          <div style={{fontSize:"11px",letterSpacing:"3px",color:C.yellow,marginBottom:"8px"}}>
            AI REPORT · ПРИМЕР
          </div>
          <div key={tick} style={{fontSize:"15px",color:C.text,lineHeight:1.6,animation:"up .4s ease"}}>
            ✗ {INSIGHTS[tick % INSIGHTS.length]}
          </div>
        </div>

        <button onClick={onLogin} style={{
          padding:"16px 40px",background:C.yellow,color:"#080807",border:"none",
          cursor:"pointer",fontSize:"16px",fontWeight:700,letterSpacing:"2px",
          fontFamily:"inherit",boxShadow:`0 0 30px ${C.yellow}44`,transition:"all .2s",
          display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 4px 40px ${C.yellow}66`;}}
          onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=`0 0 30px ${C.yellow}44`;}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#080807">
            <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z"/>
          </svg>
          ВОЙТИ ЧЕРЕЗ STEAM
        </button>
        <div style={{fontSize:"13px",color:C.muted}}>Бесплатно · Данные не сохраняются на сторонних серверах</div>

        {/* Stats row */}
        <div style={{display:"flex",gap:"40px",marginTop:"48px",flexWrap:"wrap",justifyContent:"center"}}>
          {STATS.map((s,i)=>(
            <div key={i} style={{textAlign:"center"}}>
              <div style={{fontSize:"28px",color:C.yellow,fontWeight:700}}>{s.val}</div>
              <div style={{fontSize:"13px",color:C.muted,marginTop:"3px"}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{padding:"40px 24px 60px",maxWidth:"900px",margin:"0 auto",width:"100%"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:"3px"}}>
          {FEATURES.map((f,i)=>(
            <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,
              padding:"28px 24px",transition:"all .2s",cursor:"default"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.yellow+"55";e.currentTarget.style.background="#19190e";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.card;}}>
              <div style={{fontSize:"32px",marginBottom:"14px"}}>{f.icon}</div>
              <div style={{fontSize:"16px",color:C.value,fontWeight:700,marginBottom:"10px"}}>{f.title}</div>
              <div style={{fontSize:"14px",color:C.label,lineHeight:1.7}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ── Setup Checklist ───────────────────────────────────────────────────────────
function SetupChecklist({player, hasFaceit, analysisCount, onDismiss}) {
  const cs2 = player?.cs2 || {};
  const steps = [
    {id:"steam",    done:true,                         label:"Войти через Steam",              action:null},
    {id:"stats",    done:!cs2.private,                 label:"Открыть статистику CS2 в Steam", action:"privacy"},
    {id:"faceit",   done:hasFaceit,                    label:"Подключить FACEIT аккаунт",      action:"faceit"},
    {id:"analysis", done:analysisCount>0,              label:"Получить первый AI разбор",      action:"coach"},
    {id:"chat",     done:!!localStorage.getItem("cs2_chat_done"), label:"Поговорить с AI тренером", action:"chat"},
    {id:"training", done:!!localStorage.getItem("cs2_training_done"), label:"Выполнить первую тренировку", action:"coach"},
  ];
  const done = steps.filter(s=>s.done).length;
  const total = steps.length;
  const pct = Math.round(done/total*100);
  if (done===total) { onDismiss(); return null; }

  const ACTIONS = {
    privacy: ()=>window.open("https://steamcommunity.com/my/edit/settings","_blank"),
    faceit:  ()=>window.open("https://www.faceit.com","_blank"),
  };

  return (
    <div style={{background:"#141409",border:`1px solid ${C.yellow}44`,
      borderLeft:`3px solid ${C.yellow}`,padding:"20px 24px",marginBottom:"16px",
      animation:"up .4s ease both",position:"relative"}}>
      <button onClick={onDismiss} style={{position:"absolute",top:"12px",right:"14px",
        background:"transparent",border:"none",color:C.muted,cursor:"pointer",
        fontSize:"16px",lineHeight:1}}>✕</button>

      <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"16px",flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:"14px",color:C.yellow,fontWeight:700,marginBottom:"2px"}}>
            🚀 Настройка профиля
          </div>
          <div style={{fontSize:"13px",color:C.muted}}>{done} из {total} шагов выполнено</div>
        </div>
        <div style={{flex:1,minWidth:"120px"}}>
          <div style={{height:"6px",background:"#1a1a10",borderRadius:"3px",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,background:C.yellow,
              transition:"width .8s ease",borderRadius:"3px"}}/>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:"6px"}}>
        {steps.map(step=>(
          <div key={step.id} onClick={()=>ACTIONS[step.action]?.()}
            style={{display:"flex",gap:"10px",alignItems:"center",padding:"9px 12px",
              background:step.done?"#0f1a0f":"#111109",
              border:`1px solid ${step.done?"#2a5a1a":C.border}`,
              cursor:step.action&&!step.done?"pointer":"default",
              transition:"border-color .2s"}}>
            <div style={{width:"20px",height:"20px",flexShrink:0,borderRadius:"50%",
              background:step.done?C.win:"transparent",
              border:`2px solid ${step.done?C.win:C.muted}`,
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              {step.done&&<span style={{color:"#080807",fontSize:"11px",fontWeight:700}}>✓</span>}
            </div>
            <span style={{fontSize:"13px",color:step.done?C.win:C.label,lineHeight:1.4}}>
              {step.label}
              {!step.done&&step.action&&["privacy","faceit"].includes(step.action)&&
                <span style={{color:C.muted,fontSize:"11px"}}> →</span>}
            </span>
          </div>
        ))}
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

// ── AI Chat ───────────────────────────────────────────────────────────────────
function ChatPanel({player, source, onClose}) {
  const [msgs, setMsgs] = useState([
    {role:"assistant", content:"Привет! Я твой AI-тренер. Вижу твои статы и готов отвечать на конкретные вопросы — например: Почему я умираю первым? Как апнуть FACEIT? Что тренировать на Mirage?"}
  ]);
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
        <button onClick={onClose} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:"18px",lineHeight:1}}>✕</button>
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
  const [chatOpen,setChatOpen] = useState(false);
  const [serverStatus,setServerStatus] = useState("checking");
  const [shareOpen,setShareOpen]   = useState(false);
  const [streak,setStreak]         = useState(0);
  const [showStreakToast,setShowStreakToast] = useState(false);

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
      fetch(`${BACKEND}/leaderboard/add`,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({steamid:player.steamid,username:player.username,
          avatar:player.avatar||"",stats:statsPayload,level:result.level,overall:result.overall})}).catch(()=>{});
    } catch(e) { setErrorMsg(e.message); }
    finally { setLoading(false); }
  }

  const lc = ANALYSIS_COLOR[analysis?.level] || C.yellow;

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif",color:C.text}}>
      <style>{css}</style>
      {/* scanline */}
      <div style={{position:"fixed",left:0,right:0,height:"2px",
        background:`linear-gradient(90deg,transparent,${C.yellow}18,transparent)`,
        animation:"scan 10s linear infinite",pointerEvents:"none",zIndex:1}}/>

      {showPopup&&<SteamPopup onLogin={openSteam} onSkip={()=>setShowPopup(false)}/>}
      {profileView&&<ProfileModal steamid={profileView.steamid} nickname={profileView.nickname} onClose={()=>setProfileView(null)}/>}
      {shareOpen&&player&&<ShareModal steamid={player.steamid} onClose={()=>setShareOpen(false)}/>}
      <ColdStartBanner status={serverStatus}/>

      {/* Top accent */}
      <div style={{height:"3px",background:`linear-gradient(90deg,${C.yellow},#c9a000,${C.yellow})`}}/>

      {/* Topbar */}
      <div style={{background:"#0d0d09",borderBottom:`1px solid ${C.border}`,padding:"12px 28px",
        display:"flex",alignItems:"center",justifyContent:"space-between",gap:"16px",flexWrap:"wrap",position:"relative",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"8px",height:"8px",background:C.yellow,borderRadius:"50%",animation:"pulse 2s infinite"}}/>
          <span style={{fontSize:"13px",letterSpacing:"4px",color:C.yellow,fontWeight:700}}>CS2 AI ТРЕНЕР</span>
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
              {streak>1&&<div style={{display:"flex",alignItems:"center",gap:"4px",
                padding:"4px 10px",background:"#1a1408",border:`1px solid ${C.yellow}44`}}>
                <span style={{fontSize:"14px"}}>🔥</span>
                <span style={{fontSize:"13px",color:C.yellow,fontWeight:700}}>{streak}</span>
              </div>}
              <button onClick={()=>setShareOpen(true)} style={{background:"transparent",border:`1px solid ${C.yellow}44`,color:C.yellow,cursor:"pointer",fontSize:"11px",letterSpacing:"1px",fontFamily:"inherit",padding:"5px 12px"}}>📤</button>
              <button onClick={logout} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.label,cursor:"pointer",fontSize:"11px",letterSpacing:"1px",fontFamily:"inherit",padding:"5px 10px"}}>ВЫЙТИ</button>
            </>
          ):(
            <button onClick={openSteam} style={{background:"#1b6090",color:"#fff",border:"none",padding:"9px 18px",cursor:"pointer",fontSize:"11px",fontWeight:700,letterSpacing:"2px",fontFamily:"'Courier New',monospace"}}>STEAM</button>
          )}
        </div>
      </div>

      <div style={{className:"content-pad",maxWidth:"1100px",margin:"0 auto",padding:"28px 24px 80px",position:"relative",zIndex:5}}>

        {/* Page title */}
        <div style={{marginBottom:"24px"}}>
          <h1 style={{fontSize:"clamp(26px,5vw,42px)",fontWeight:400,margin:"0 0 4px",color:C.value,letterSpacing:"2px"}}>
            Разбор твоей игры
          </h1>
          <p style={{color:C.muted,fontSize:"13px",margin:0}}>Steam + FACEIT аналитика · AI-тренер</p>
        </div>

        {/* Main tabs */}
        <div style={{className:"desktop-nav",display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:"22px",flexWrap:"wrap"}}>
          {[["overview","ОБЗОР"],["coach","🎯 ТРЕНЕР"],["matches","🎮 МАТЧИ"],["maps","🗺️ КАРТЫ"],["history","📋 ИСТОРИЯ"],["leaderboard","🏆 ЛИДЕРЫ"]].map(([t,l])=>(
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
            {!player.cs2?.private&&<AIReport player={player} source={source}/>}
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

        {mainTab==="matches"&&(player
          ?<><SourceToggle source={source} setSource={setSource} hasFaceit={hasFaceit}/>{source==="faceit"?<MatchHistory faceit={player.faceit}/>:
            <div style={{background:C.card,border:`1px solid ${C.border}`,padding:"28px 24px",textAlign:"center"}}>
              <div style={{fontSize:"24px",marginBottom:"10px"}}>⚡</div>
              <div style={{fontSize:"15px",color:C.value,fontWeight:700,marginBottom:"8px"}}>Переключись на FACEIT</div>
              <div style={{fontSize:"14px",color:C.label,lineHeight:1.7}}>История матчей доступна только через FACEIT. Нажми кнопку ⚡ FACEIT выше.</div>
            </div>}</>
          :<div style={{textAlign:"center",padding:"60px",color:C.muted,fontSize:"13px"}}>Войди через Steam</div>)}

        {mainTab==="maps"&&(player
          ?<><SourceToggle source={source} setSource={setSource} hasFaceit={hasFaceit}/>{source==="faceit"?<MapPool faceit={player.faceit}/>:<div style={{textAlign:"center",padding:"50px",color:C.muted,fontSize:"13px"}}>Статистика карт доступна только через ⚡ FACEIT</div>}</>
          :<div style={{textAlign:"center",padding:"60px",color:C.muted,fontSize:"13px"}}>Войди через Steam</div>)}

        {mainTab==="history"&&(player
          ?<HistoryTab steamid={player.steamid}/>
          :<div style={{textAlign:"center",padding:"60px",color:C.muted,fontSize:"13px"}}>Войди через Steam</div>)}

        {mainTab==="leaderboard"&&<Leaderboard myId={player?.steamid} onProfile={sid=>setProfileView({steamid:sid})}/>}
      </div>

      <div style={{height:"2px",background:`linear-gradient(90deg,transparent,${C.yellow},transparent)`}}/>

      {/* Streak toast */}
      {showStreakToast&&<StreakToast streak={streak} onClose={()=>setShowStreakToast(false)}/>}

      {/* Mobile nav */}
      {player&&<MobileNav tab={mainTab} setTab={setMainTab}/>}

      {/* Chat bubble */}
      {player&&<>
        <button onClick={()=>{ setChatOpen(o=>!o); try{localStorage.setItem("cs2_chat_done","1");}catch{} }} style={{
          position:"fixed",bottom:"24px",right:"24px",width:"56px",height:"56px",
          background:chatOpen?C.yellow:"#1a1a0e",color:chatOpen?"#080807":C.yellow,
          border:`2px solid ${C.yellow}`,borderRadius:"50%",cursor:"pointer",
          fontSize:"24px",boxShadow:`0 4px 20px ${C.yellow}44`,zIndex:200,
          transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {chatOpen?"✕":"🤖"}
        </button>
        {chatOpen&&<ChatPanel player={player} source={source} onClose={()=>setChatOpen(false)}/>}
      </>}
    </div>
  );
}
