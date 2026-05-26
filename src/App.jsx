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
  bg:"#0a0a07", card:"#131309", border:"#26261a",
  yellow:"#f5c518", orange:"#ff7733", blue:"#66c0f4",
  label:"#a8a280", value:"#f0e8c0", muted:"#6e6850",
  win:"#55dd55", lose:"#ff5544", text:"#c8bc98",
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
      <div style={{fontSize:"13px",color:C.text,lineHeight:1.7,marginBottom:"12px"}}>
        Valve не даёт доступ к статистике, если профиль закрыт. Чтобы открыть:
      </div>
      <div style={{fontSize:"13px",color:C.label,lineHeight:2}}>
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
            <span style={{fontSize:"24px",color:C.value,fontWeight:700}}>{player.username}</span>
            <span style={{fontSize:"18px"}}>{flag(player.country||fc?.country)}</span>
          </div>
          <div style={{fontSize:"13px",color:C.label,marginBottom:"6px"}}>
            {player.created&&`Steam с ${new Date(player.created*1000).getFullYear()} г.`}
            {player.steam_level!=null&&`  ·  Steam Lvl ${player.steam_level}`}
          </div>
          {fc?.nickname&&fc.nickname!==player.username&&(
            <div style={{fontSize:"12px",color:C.orange,marginBottom:"8px"}}>
              FACEIT: {fc.nickname}
            </div>
          )}
          {form.length>0&&(
            <div style={{display:"flex",alignItems:"center",gap:"5px",marginTop:"6px"}}>
              <span style={{fontSize:"11px",color:C.muted,marginRight:"2px"}}>ФОРМА</span>
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
          <div style={{textAlign:"right",minWidth:"145px"}}>
            <div style={{fontSize:"11px",letterSpacing:"3px",color:C.orange,marginBottom:"2px"}}>FACEIT ELO</div>
            <div style={{fontSize:"44px",fontWeight:700,color:lvlColor,lineHeight:1,textShadow:`0 0 18px ${lvlColor}55`}}>
              {eloCount}
            </div>
            <div style={{fontSize:"12px",color:C.label,marginTop:"5px"}}>
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
            <div style={{fontSize:"12px",color:C.label,letterSpacing:"2px",marginBottom:"6px"}}>{s.l}</div>
            <div style={{fontSize:"22px",color:C.yellow,fontWeight:700}}>{s.v}</div>
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
      <div style={{fontSize:"13px",letterSpacing:"3px",color:C.yellow,padding:"8px 0 14px"}}>ДИНАМИКА МАТЧЕЙ</div>
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
  const [exp,setExp] = useState(null);
  const matches = arr(faceit?.matches);
  if (!matches.length) return (
    <div style={{textAlign:"center",padding:"60px",color:C.muted,fontSize:"13px"}}>
      <div style={{fontSize:"30px",marginBottom:"12px"}}>🎮</div>
      НЕТ МАТЧЕЙ FACEIT
    </div>
  );
  return (
    <div style={{animation:"up .4s ease both"}}>
      <div style={{fontSize:"13px",letterSpacing:"3px",color:C.yellow,padding:"8px 0 14px"}}>ИСТОРИЯ МАТЧЕЙ · FACEIT</div>
      {matches.map((m,i)=>{
        const win=m.result==="1", ac=win?C.win:C.lose, isExp=exp===i;
        return (
          <div key={i}>
            <div className="match-row" onClick={()=>setExp(isExp?null:i)} style={{
              display:"grid",gridTemplateColumns:"4px 1fr 100px 88px 72px 64px",
              gap:"14px",padding:"15px 16px",cursor:"pointer",alignItems:"center",
              background:isExp?"#181810":C.card,border:`1px solid ${C.border}`,
              borderLeft:`3px solid ${ac}`,marginBottom:"3px",transition:"background .15s"}}>
              <div/>
              <div>
                <div style={{fontSize:"15px",color:C.value,fontWeight:700}}>{m.map||"—"}</div>
                <div style={{fontSize:"12px",color:ac,letterSpacing:"1px",marginTop:"2px"}}>
                  {win?"ПОБЕДА":"ПОРАЖЕНИЕ"} · {m.score}
                </div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"11px",color:C.label,marginBottom:"3px"}}>K/D</div>
                <div style={{fontSize:"16px",color:C.yellow,fontWeight:700}}>{m.kd}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"11px",color:C.label,marginBottom:"3px"}}>K — D</div>
                <div style={{fontSize:"15px",color:C.text}}>{m.kills}—{m.deaths}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"11px",color:C.label,marginBottom:"3px"}}>HS%</div>
                <div style={{fontSize:"15px",color:C.text}}>{m.hs}%</div>
              </div>
              <div style={{textAlign:"center",fontSize:"18px"}}>{parseInt(m.mvps)>0?"⭐":""}</div>
            </div>
            {isExp&&(
              <div style={{background:"#0f0f09",border:`1px solid ${C.border}`,borderTop:"none",
                padding:"16px 20px",marginBottom:"3px",animation:"up .2s ease both"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(90px,1fr))",gap:"4px"}}>
                  {[{l:"УБИЙСТВА",v:m.kills},{l:"СМЕРТИ",v:m.deaths},{l:"АССИСТЫ",v:m.assists},
                    {l:"K/R",v:m.kr},{l:"ADR",v:m.adr},{l:"MVP",v:m.mvps}].map((s,j)=>(
                    <div key={j} style={{background:C.card,border:`1px solid ${C.border}`,padding:"10px 12px"}}>
                      <div style={{fontSize:"10px",color:C.muted,letterSpacing:"1px",marginBottom:"4px"}}>{s.l}</div>
                      <div style={{fontSize:"17px",color:C.yellow,fontWeight:700}}>{s.v||"—"}</div>
                    </div>
                  ))}
                </div>
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
    <div style={{textAlign:"center",padding:"60px",color:C.muted,fontSize:"13px"}}>
      <div style={{fontSize:"30px",marginBottom:"12px"}}>🗺️</div>
      НЕТ ДАННЫХ ПО КАРТАМ
    </div>
  );
  const best=maps[0], worst=maps[maps.length-1];
  const bans=maps.filter(m=>parseFloat(m.winrate)<45).slice(-2);
  return (
    <div style={{animation:"up .4s ease both"}}>
      <div style={{fontSize:"13px",letterSpacing:"3px",color:C.yellow,padding:"8px 0 14px"}}>ПУЛ КАРТ · FACEIT</div>
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
            <div style={{fontSize:"15px",color:C.value,fontWeight:700}}>{m.map}</div>
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
          color:C.yellow,fontSize:"12px",padding:"9px 13px",fontFamily:"'Courier New',monospace"}}/>
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
              <span style={{fontSize:"13px",color:C.value,flex:1}}>{r.nickname}</span>
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
                <div style={{fontSize:"13px",letterSpacing:"3px",color:C.yellow,padding:"6px 0 12px"}}>ИСТОРИЯ РАЗБОРОВ</div>
                {data.history.map((h,i)=>{
                  const lc=ANALYSIS_COLOR[h.result?.level]||C.yellow;
                  return <div key={i} style={{background:"#111109",border:`1px solid ${C.border}`,borderLeft:`2px solid ${lc}`,padding:"13px 16px",marginBottom:"3px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                      <span style={{fontSize:"11px",color:lc,letterSpacing:"2px"}}>{h.result?.level?.toUpperCase()}</span>
                      <span style={{fontSize:"11px",color:C.muted}}>{fmt(h.timestamp)}</span>
                    </div>
                    <div style={{fontSize:"13px",color:C.label,lineHeight:1.5}}>{h.result?.overall}</div>
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
      <div style={{display:"grid",gridTemplateColumns:"48px 1fr 100px 68px 68px 68px 90px",gap:"2px",
        padding:"8px 14px",fontSize:"11px",letterSpacing:"2px",color:C.muted,borderBottom:`1px solid ${C.border}`}}>
        <div>#</div><div>ИГРОК</div><div>RANK</div><div>K/D</div><div>WIN%</div><div>HS%</div><div>УРОВЕНЬ</div>
      </div>
      {data.map((p,i)=>{
        const lc=ANALYSIS_COLOR[p.level]||C.yellow;
        const isMe=myId&&p.steamid===myId;
        const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
        return (
          <div key={i} className="hov-row" onClick={()=>onProfile(p.steamid)} style={{
            display:"grid",gridTemplateColumns:"48px 1fr 100px 68px 68px 68px 90px",gap:"2px",
            padding:"14px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,
            background:isMe?"#1a1a08":C.card,borderLeft:isMe?`2px solid ${C.yellow}`:`2px solid transparent`,
            transition:"background .15s"}}>
            <div style={{color:i<3?C.yellow:C.muted,fontSize:"15px",fontWeight:700}}>{medal||i+1}</div>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              {p.avatar?<img src={p.avatar} alt="" style={{width:"30px",height:"30px",borderRadius:"2px"}}/>
                :<div style={{width:"30px",height:"30px",background:"#1a1a10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px"}}>👤</div>}
              <span style={{fontSize:"14px",color:isMe?C.yellow:C.value,fontWeight:isMe?700:400}}>
                {p.username}{isMe?" (ты)":""}
              </span>
            </div>
            <div style={{fontSize:"15px",color:C.yellow,fontWeight:700}}>{p.stats?.rank||"—"}</div>
            <div style={{fontSize:"14px",color:C.label}}>{p.stats?.kd||"—"}</div>
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
              <div style={{fontSize:"14px",color:C.text,lineHeight:1.6}}>{h.result?.overall}</div>
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

  const hasFaceit = !!(player?.faceit && (player.faceit.elo || arr(player.faceit.matches).length));

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
      fetch(`${BACKEND}/leaderboard/add`,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({steamid:player.steamid,username:player.username,
          avatar:player.avatar||"",stats:statsPayload,level:result.level,overall:result.overall})}).catch(()=>{});
    } catch(e) { setErrorMsg(e.message); }
    finally { setLoading(false); }
  }

  const lc = ANALYSIS_COLOR[analysis?.level] || C.yellow;

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Courier New',monospace",color:C.text}}>
      <style>{css}</style>
      {/* scanline */}
      <div style={{position:"fixed",left:0,right:0,height:"2px",
        background:`linear-gradient(90deg,transparent,${C.yellow}18,transparent)`,
        animation:"scan 10s linear infinite",pointerEvents:"none",zIndex:1}}/>

      {showPopup&&<SteamPopup onLogin={openSteam} onSkip={()=>setShowPopup(false)}/>}
      {profileView&&<ProfileModal steamid={profileView.steamid} nickname={profileView.nickname} onClose={()=>setProfileView(null)}/>}

      {/* Top accent */}
      <div style={{height:"3px",background:`linear-gradient(90deg,${C.yellow},#c9a000,${C.yellow})`}}/>

      {/* Topbar */}
      <div style={{background:"#0d0d09",borderBottom:`1px solid ${C.border}`,padding:"12px 28px",
        display:"flex",alignItems:"center",justifyContent:"space-between",gap:"16px",flexWrap:"wrap",position:"relative",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"8px",height:"8px",background:C.yellow,borderRadius:"50%",animation:"pulse 2s infinite"}}/>
          <span style={{fontSize:"12px",letterSpacing:"5px",color:C.yellow,fontWeight:700}}>CS2 AI ТРЕНЕР</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
          <SearchBar onSelect={r=>setProfileView({nickname:r.nickname})}/>
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
              <button onClick={logout} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.label,cursor:"pointer",fontSize:"10px",letterSpacing:"1px",fontFamily:"'Courier New',monospace",padding:"5px 10px"}}>ВЫЙТИ</button>
            </>
          ):(
            <button onClick={openSteam} style={{background:"#1b6090",color:"#fff",border:"none",padding:"9px 18px",cursor:"pointer",fontSize:"11px",fontWeight:700,letterSpacing:"2px",fontFamily:"'Courier New',monospace"}}>STEAM</button>
          )}
        </div>
      </div>

      <div style={{maxWidth:"980px",margin:"0 auto",padding:"28px 20px 80px",position:"relative",zIndex:5}}>

        {/* Page title */}
        <div style={{marginBottom:"24px"}}>
          <h1 style={{fontSize:"clamp(26px,5vw,42px)",fontWeight:400,margin:"0 0 4px",color:C.value,letterSpacing:"2px"}}>
            Разбор твоей игры
          </h1>
          <p style={{color:C.muted,fontSize:"13px",margin:0}}>Steam + FACEIT аналитика · AI-тренер</p>
        </div>

        {/* Main tabs */}
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:"22px",flexWrap:"wrap"}}>
          {[["overview","ОБЗОР"],["coach","🎯 ТРЕНЕР"],["matches","🎮 МАТЧИ"],["maps","🗺️ КАРТЫ"],["history","📋 ИСТОРИЯ"],["leaderboard","🏆 ЛИДЕРЫ"]].map(([t,l])=>(
            <button key={t} onClick={()=>setMainTab(t)} style={{
              padding:"11px 18px",background:"transparent",
              color:mainTab===t?C.yellow:C.muted,border:"none",
              borderBottom:`2px solid ${mainTab===t?C.yellow:"transparent"}`,
              cursor:"pointer",fontSize:"12px",letterSpacing:"1px",
              fontFamily:"'Courier New',monospace",marginBottom:"-1px",transition:"color .15s"}}>{l}</button>
          ))}
        </div>

        {!player&&(
          <div style={{background:"#14140a",border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.yellow}`,
            padding:"20px 24px",marginBottom:"20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
            <div>
              <div style={{fontSize:"14px",color:C.value,marginBottom:"4px",fontWeight:700}}>Войди через Steam</div>
              <div style={{fontSize:"13px",color:C.label}}>Доступ к аналитике, истории и разбору от тренера</div>
            </div>
            <button onClick={openSteam} style={{background:"#1b6090",color:"#fff",border:"none",padding:"11px 22px",cursor:"pointer",fontSize:"12px",fontWeight:700,letterSpacing:"2px",fontFamily:"'Courier New',monospace"}}>ВОЙТИ</button>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {mainTab==="overview"&&(player?(
          <div style={{animation:"up .4s ease both"}}>
            <SourceToggle source={source} setSource={setSource} hasFaceit={hasFaceit}/>
            {source==="steam"&&player.cs2?.private&&<PrivateWarning/>}
            <HeroCard player={player} source={source}/>
            {source==="faceit"&&hasFaceit
              ?<div style={{marginTop:"12px"}}><ChartsSection faceit={player.faceit}/></div>
              :source==="steam"&&!player.cs2?.private&&(
                <div style={{marginTop:"12px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"3px"}}>
                  {[{l:"УБИЙСТВА",v:player.cs2?.kills},{l:"СМЕРТИ",v:player.cs2?.deaths},{l:"ПОБЕДЫ",v:player.cs2?.wins},{l:"MVP",v:player.cs2?.mvps}].map((s,i)=>(
                    <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,padding:"16px",textAlign:"center"}}>
                      <div style={{fontSize:"12px",color:C.label,letterSpacing:"2px",marginBottom:"6px"}}>{s.l}</div>
                      <div style={{fontSize:"22px",color:C.yellow,fontWeight:700}}>{s.v||"—"}</div>
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
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"3px",marginBottom:"16px"}}>
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
                    <div style={{fontSize:"22px",color:C.yellow,fontWeight:700}}>{f.v}</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:"12px",color:C.muted,marginBottom:"16px"}}>
                Источник данных: <span style={{color:source==="faceit"?C.orange:C.blue,fontWeight:700}}>{source==="faceit"?"FACEIT":"STEAM"}</span>
                {source==="steam"&&player.faceit&&" (переключись на FACEIT для более детального анализа)"}
              </div>
            </>}

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
                  <div style={{fontSize:"16px",color:C.value,lineHeight:1.7,marginBottom:"14px"}}>{analysis.overall}</div>
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
                      fontFamily:"'Courier New',monospace",marginBottom:"-1px",transition:"color .15s"}}>{l}</button>
                  ))}
                </div>

                {subTab==="weak"&&(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px",animation:"up .25s ease both"}}>
                    {analysis.weaknesses?.map((w,i)=>(
                      <div key={i} style={{background:C.card,border:"1px solid #2e1414",borderTop:"2px solid #ff5544",padding:"20px"}}>
                        <div style={{display:"inline-block",padding:"3px 13px",background:"#ff554422",color:"#ff8866",fontSize:"12px",letterSpacing:"2px",fontWeight:700,marginBottom:"12px"}}>{w.stat?.toUpperCase()}</div>
                        <div style={{fontSize:"14px",color:C.label,lineHeight:1.7,marginBottom:"12px"}}>{w.problem}</div>
                        <div style={{background:C.yellow+"12",border:`1px solid ${C.yellow}33`,padding:"11px 14px",fontSize:"13px",color:C.yellow,lineHeight:1.6}}>💡 {w.fix}</div>
                      </div>
                    ))}
                  </div>
                )}
                {subTab==="strong"&&(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px",animation:"up .25s ease both"}}>
                    {analysis.strengths?.map((s,i)=>(
                      <div key={i} style={{background:C.card,border:"1px solid #142814",borderTop:"2px solid #55aa55",padding:"20px"}}>
                        <div style={{display:"inline-block",padding:"3px 13px",background:"#55aa5522",color:"#88ee88",fontSize:"12px",letterSpacing:"2px",fontWeight:700,marginBottom:"12px"}}>{s.stat?.toUpperCase()}</div>
                        <div style={{fontSize:"14px",color:"#66aa66",lineHeight:1.7}}>{s.comment}</div>
                      </div>
                    ))}
                  </div>
                )}
                {subTab==="plan"&&(
                  <div style={{animation:"up .25s ease both"}}>
                    {analysis.plan?.map((day,i)=>(
                      <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,padding:"18px 20px",marginBottom:"3px",display:"flex",gap:"18px",alignItems:"flex-start"}}>
                        <div style={{minWidth:"32px",height:"32px",background:C.yellow+"18",border:`1px solid ${C.yellow}44`,color:C.yellow,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",fontWeight:700,flexShrink:0}}>{i+1}</div>
                        <div style={{fontSize:"15px",color:C.value,lineHeight:1.7}}>{day}</div>
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
          ?<><SourceToggle source={source} setSource={setSource} hasFaceit={hasFaceit}/>{source==="faceit"?<MatchHistory faceit={player.faceit}/>:<div style={{textAlign:"center",padding:"50px",color:C.muted,fontSize:"13px"}}>История матчей доступна только через ⚡ FACEIT</div>}</>
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
    </div>
  );
}
