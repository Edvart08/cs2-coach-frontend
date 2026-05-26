import { useState, useEffect, useRef } from "react";

const BACKEND = "https://cs2-coach-backend.onrender.com";

const FACEIT_ELO = [
  [1,100,500],[2,501,750],[3,751,900],[4,901,1050],[5,1051,1200],
  [6,1201,1350],[7,1351,1530],[8,1531,1750],[9,1751,2000],[10,2001,3500],
];
const LVL_COLOR = {1:"#EEEEEE",2:"#EEEEEE",3:"#1CE400",4:"#1CE400",5:"#FFC800",
  6:"#FFC800",7:"#FF6309",8:"#FF6309",9:"#FE1F00",10:"#FE1F00"};
const LEVEL_COLOR = {Новичок:"#ff5544",Средний:"#ffaa33",Хороший:"#f5c518",Про:"#44ddaa"};

const css = `
  @keyframes blink{0%,100%{opacity:.15}50%{opacity:1}}
  @keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
  @keyframes scan{0%{transform:translateY(0)}100%{transform:translateY(100vh)}}
  @keyframes shimmer{0%{background-position:-300px 0}100%{background-position:300px 0}}
  @keyframes glowPulse{0%,100%{opacity:.4}50%{opacity:.75}}
  @keyframes dash{to{stroke-dashoffset:0}}
  *{box-sizing:border-box;} input:focus{outline:none;}
  ::-webkit-scrollbar{width:5px;height:5px;} ::-webkit-scrollbar-thumb{background:#3a3418;}
  ::-webkit-scrollbar-track{background:#0a0a06;}
  .hov-row:hover{background:#12120a !important;}
  .hov-card{transition:all .2s;}
  .hov-card:hover{border-color:#f5c51855 !important;transform:translateY(-2px);}
  .match-row:hover{background:#13130a !important;}
  .skel{background:linear-gradient(90deg,#101008 25%,#1a1a10 50%,#101008 75%);
    background-size:600px 100%;animation:shimmer 1.4s infinite linear;}
  .glow-btn:hover:not(:disabled){box-shadow:0 0 24px #f5c51866;}
`;

// ── helpers ──────────────────────────────────────────────────────────────────
const arr = x => Array.isArray(x) ? x : [];
function flag(cc){
  if(!cc||cc.length!==2)return"";
  try{return cc.toUpperCase().replace(/./g,c=>String.fromCodePoint(127397+c.charCodeAt()));}catch{return"";}
}
function fmt(ts){
  if(!ts)return"";
  return new Date(ts*1000).toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric"});
}
function levelInfo(elo){
  const e=parseInt(elo)||0;
  const row=FACEIT_ELO.find(r=>e>=r[1]&&e<=r[2])||FACEIT_ELO[0];
  const[lvl,lo,hi]=row;
  return{lvl,progress:Math.min(100,Math.max(0,(e-lo)/(hi-lo)*100)),toNext:hi-e};
}
function roleOf(kd){
  const k=parseFloat(kd)||0;
  if(k>=1.1)return{name:"FRAGGER",color:"#ff5544"};
  if(k>=0.95)return{name:"RIFLER",color:"#f5c518"};
  return{name:"SUPPORT",color:"#44aaff"};
}

// ── count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target,dur=900,dec=0){
  const[v,setV]=useState(0);
  const ref=useRef(0);
  useEffect(()=>{
    const t=parseFloat(target)||0;const from=ref.current;let raf,start;
    const tick=(now)=>{
      if(!start)start=now;
      const p=Math.min((now-start)/dur,1);
      const e=1-Math.pow(1-p,3);
      const cur=from+(t-from)*e;
      setV(cur);ref.current=cur;
      if(p<1)raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf);
  },[target,dur]);
  return dec>0?v.toFixed(dec):Math.round(v);
}

// ── Sparkline chart ──────────────────────────────────────────────────────────
function Sparkline({data,color="#f5c518",h=70,label,fill=true}){
  if(!data||data.length<2)return(
    <div style={{height:h,display:"flex",alignItems:"center",justifyContent:"center",color:"#2a2a18",fontSize:"10px",letterSpacing:"1px"}}>
      МАЛО ДАННЫХ
    </div>
  );
  const w=320,pad=10;
  const nums=data.map(d=>parseFloat(d)||0);
  const min=Math.min(...nums),max=Math.max(...nums),rng=max-min||1;
  const pts=nums.map((v,i)=>{
    const x=pad+(i/(nums.length-1))*(w-2*pad);
    const y=h-pad-((v-min)/rng)*(h-2*pad);
    return[x,y];
  });
  const line=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const area=line+` L${pts[pts.length-1][0].toFixed(1)} ${h-pad} L${pts[0][0].toFixed(1)} ${h-pad} Z`;
  const last=pts[pts.length-1];
  return(
    <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height:h,display:"block"}}>
      <defs>
        <linearGradient id={`g${label}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {fill&&<path d={area} fill={`url(#g${label})`}/>}
      <path d={line} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        style={{strokeDasharray:1000,strokeDashoffset:1000,animation:"dash 1.4s ease forwards"}}/>
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color}/>
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} opacity="0.4">
        <animate attributeName="r" values="3.5;7;3.5" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

// ── Radar chart (playstyle) ──────────────────────────────────────────────────
function Radar({axes}){
  const size=180,cx=size/2,cy=size/2,r=size/2-26;
  const n=axes.length;
  const pt=(i,frac)=>{
    const ang=(Math.PI*2*i)/n-Math.PI/2;
    return[cx+Math.cos(ang)*r*frac,cy+Math.sin(ang)*r*frac];
  };
  const poly=axes.map((a,i)=>pt(i,Math.max(0.05,Math.min(1,a.value/100))).join(",")).join(" ");
  return(
    <svg viewBox={`0 0 ${size} ${size}`} style={{width:"100%",maxWidth:size,height:"auto"}}>
      {[0.25,0.5,0.75,1].map((f,i)=>(
        <polygon key={i} points={axes.map((_,j)=>pt(j,f).join(",")).join(" ")}
          fill="none" stroke="#1e1e12" strokeWidth="1"/>
      ))}
      {axes.map((_,i)=>{
        const e=pt(i,1);
        return<line key={i} x1={cx} y1={cy} x2={e[0]} y2={e[1]} stroke="#1e1e12" strokeWidth="1"/>;
      })}
      <polygon points={poly} fill="#f5c51833" stroke="#f5c518" strokeWidth="2"
        style={{transformOrigin:"center",animation:"fadeIn .8s ease"}}/>
      {axes.map((a,i)=>{
        const e=pt(i,1.22);
        return(
          <text key={i} x={e[0]} y={e[1]} fontSize="8" fill="#6a6448"
            textAnchor="middle" dominantBaseline="middle"
            fontFamily="'Courier New',monospace" letterSpacing="1">
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({w="100%",h=14,mb=8}){
  return<div className="skel" style={{width:w,height:h,marginBottom:mb,borderRadius:"2px"}}/>;
}

// ── Steam Popup ──────────────────────────────────────────────────────────────
function SteamPopup({onLogin,onSkip}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn .3s ease"}}>
      <div style={{background:"#0d0d07",border:"1px solid #252515",borderTop:"2px solid #f5c518",padding:"52px 48px",maxWidth:"410px",width:"90%",textAlign:"center",animation:"slideUp .35s ease",boxShadow:"0 0 60px #f5c51815"}}>
        <div style={{fontSize:"44px",marginBottom:"18px"}}>🎯</div>
        <div style={{fontSize:"10px",letterSpacing:"5px",color:"#f5c518",marginBottom:"10px"}}>CS2 AI ТРЕНЕР</div>
        <h2 style={{color:"#f0e8c0",fontWeight:400,margin:"0 0 12px",fontSize:"22px"}}>Войди через Steam</h2>
        <p style={{color:"#504838",fontSize:"13px",lineHeight:1.8,margin:"0 0 30px"}}>
          Аналитика, графики, история матчей и персональный разбор от AI-тренера
        </p>
        <button onClick={onLogin} className="glow-btn" style={{
          width:"100%",padding:"15px",marginBottom:"14px",background:"#1b6090",
          color:"#fff",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:700,
          letterSpacing:"2px",fontFamily:"'Courier New',monospace",
          display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",transition:"box-shadow .2s"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z"/>
          </svg>
          ВОЙТИ ЧЕРЕЗ STEAM
        </button>
        <button onClick={onSkip} style={{background:"transparent",border:"none",color:"#2a2a18",cursor:"pointer",fontSize:"10px",letterSpacing:"2px",fontFamily:"'Courier New',monospace",padding:"6px"}}>
          ПРОСТО ОСМОТРЕТЬСЯ →
        </button>
      </div>
    </div>
  );
}

// ── Hero Card ────────────────────────────────────────────────────────────────
function HeroCard({player}){
  const fc=player.faceit;
  const elo=fc?.elo||0;
  const li=levelInfo(elo);
  const lvlColor=LVL_COLOR[li.lvl]||"#f5c518";
  const role=roleOf(fc?.lifetime?.kd||player.cs2?.kd||0);
  const form=arr(fc?.matches).slice(0,7).map(m=>m.result==="1");
  const eloCount=useCountUp(elo,1100);
  const kdVal=fc?.lifetime?.kd||player.cs2?.kd||"0";

  return(
    <div className="hov-card" style={{
      background:"#0d0d07",border:"1px solid #1e1e12",position:"relative",
      overflow:"hidden",marginBottom:"3px"
    }}>
      {/* glow */}
      <div style={{position:"absolute",top:"-60px",right:"-40px",width:"260px",height:"260px",
        background:`radial-gradient(circle,${lvlColor}22,transparent 70%)`,
        animation:"glowPulse 4s ease-in-out infinite",pointerEvents:"none"}}/>

      <div style={{display:"flex",gap:"22px",padding:"26px",position:"relative",flexWrap:"wrap"}}>
        {/* Avatar */}
        <div style={{position:"relative",flexShrink:0}}>
          {(fc?.avatar||player.avatar)
            ?<img src={fc?.avatar||player.avatar} alt="" style={{width:"96px",height:"96px",borderRadius:"4px",border:`2px solid ${lvlColor}`,boxShadow:`0 0 20px ${lvlColor}44`}}/>
            :<div style={{width:"96px",height:"96px",background:"#1a1a10",border:`2px solid ${lvlColor}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"36px"}}>👤</div>
          }
          <div style={{position:"absolute",bottom:"-8px",left:"50%",transform:"translateX(-50%)",
            background:lvlColor,color:"#080807",fontSize:"11px",fontWeight:700,
            padding:"2px 10px",letterSpacing:"1px",whiteSpace:"nowrap"}}>
            LVL {li.lvl}
          </div>
        </div>

        {/* Identity */}
        <div style={{flex:1,minWidth:"180px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
            <span style={{fontSize:"22px",color:"#f0e8c0",fontWeight:700}}>
              {fc?.nickname||player.username}
            </span>
            <span style={{fontSize:"18px"}}>{flag(fc?.country||player.country)}</span>
          </div>
          <div style={{fontSize:"11px",color:"#3a3a28",letterSpacing:"1px",marginBottom:"12px"}}>
            {player.created&&`Steam c ${new Date(player.created*1000).getFullYear()}`}
            {player.steam_level!=null&&`  ·  Steam Lvl ${player.steam_level}`}
          </div>
          {/* Role + form */}
          <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
            <span style={{padding:"3px 12px",background:role.color+"1e",color:role.color,
              border:`1px solid ${role.color}44`,fontSize:"10px",letterSpacing:"2px",fontWeight:700}}>
              {role.name}
            </span>
            {form.length>0&&(
              <div style={{display:"flex",gap:"3px",alignItems:"center"}}>
                <span style={{fontSize:"9px",color:"#2a2a18",letterSpacing:"1px",marginRight:"2px"}}>ФОРМА</span>
                {form.map((w,i)=>(
                  <div key={i} style={{width:"18px",height:"18px",display:"flex",alignItems:"center",
                    justifyContent:"center",fontSize:"9px",fontWeight:700,
                    background:w?"#1a3a1a":"#3a1414",color:w?"#55dd55":"#ff5544",
                    border:`1px solid ${w?"#2a5a2a":"#5a2020"}`}}>
                    {w?"W":"L"}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ELO block */}
        {fc&&(
          <div style={{textAlign:"right",minWidth:"140px"}}>
            <div style={{fontSize:"9px",letterSpacing:"3px",color:"#3a3a28",marginBottom:"2px"}}>FACEIT ELO</div>
            <div style={{fontSize:"42px",fontWeight:700,color:lvlColor,lineHeight:1,
              textShadow:`0 0 20px ${lvlColor}55`}}>
              {eloCount}
            </div>
            <div style={{fontSize:"10px",color:"#3a3a28",marginTop:"4px"}}>
              до LVL {Math.min(10,li.lvl+1)}: {li.toNext>0?li.toNext:"MAX"} ELO
            </div>
            {/* progress bar */}
            <div style={{marginTop:"8px",height:"6px",background:"#1a1a10",borderRadius:"3px",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${li.progress}%`,
                background:`linear-gradient(90deg,${lvlColor}88,${lvlColor})`,
                boxShadow:`0 0 8px ${lvlColor}`,transition:"width 1s ease"}}/>
            </div>
          </div>
        )}
      </div>

      {/* quick stats strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderTop:"1px solid #1a1a0e"}}>
        {[
          {l:"K/D",v:kdVal},
          {l:"WIN %",v:(fc?.lifetime?.winrate||player.cs2?.winrate||"0")+"%"},
          {l:"HS %",v:(fc?.lifetime?.hs||player.cs2?.hs||"0")+"%"},
          {l:"МАТЧИ",v:fc?.lifetime?.matches||player.cs2?.matches||"0"},
        ].map((s,i)=>(
          <div key={i} style={{padding:"14px",textAlign:"center",
            borderRight:i<3?"1px solid #1a1a0e":"none"}}>
            <div style={{fontSize:"9px",color:"#2a2a18",letterSpacing:"2px",marginBottom:"4px"}}>{s.l}</div>
            <div style={{fontSize:"19px",color:"#f5c518",fontWeight:700}}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Charts Section ───────────────────────────────────────────────────────────
function ChartsSection({faceit}){
  const matches=arr(faceit?.matches).slice().reverse();
  const kdData=matches.map(m=>parseFloat(m.kd)||0);
  const hsData=matches.map(m=>parseFloat(m.hs)||0);
  const adrData=matches.map(m=>parseFloat(m.adr)||0).filter(v=>v>0);

  const lt=faceit?.lifetime||{};
  const radarAxes=[
    {label:"K/D",value:Math.min(100,(parseFloat(lt.kd)||0)*55)},
    {label:"HS%",value:parseFloat(lt.hs)||0},
    {label:"WIN%",value:parseFloat(lt.winrate)||0},
    {label:"K/R",value:Math.min(100,(parseFloat(lt.kr)||0)*120)},
    {label:"СТРИК",value:Math.min(100,(parseInt(lt.longest_streak)||0)*10)},
  ];

  const Chart=({title,data,color,unit=""})=>(
    <div className="hov-card" style={{background:"#0d0d07",border:"1px solid #1e1e12",padding:"16px 18px"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
        <span style={{fontSize:"9px",letterSpacing:"2px",color:"#5a5438"}}>{title}</span>
        {data.length>0&&<span style={{fontSize:"11px",color:color,fontWeight:700}}>
          {data[data.length-1]?.toFixed(unit==="%"?0:2)}{unit}
        </span>}
      </div>
      <Sparkline data={data} color={color} label={title.replace(/\s/g,"")}/>
    </div>
  );

  return(
    <div style={{animation:"up .4s ease both"}}>
      <div style={{fontSize:"11px",letterSpacing:"3px",color:"#f5c518",padding:"6px 0 12px"}}>
        ДИНАМИКА ПОСЛЕДНИХ МАТЧЕЙ
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:"3px",marginBottom:"3px"}}>
        <Chart title="K/D RATIO" data={kdData} color="#f5c518"/>
        <Chart title="HEADSHOT %" data={hsData} color="#ff8833" unit="%"/>
        {adrData.length>1&&<Chart title="ADR" data={adrData} color="#44ddaa"/>}
      </div>

      {/* Radar */}
      <div className="hov-card" style={{background:"#0d0d07",border:"1px solid #1e1e12",padding:"18px",display:"flex",gap:"24px",alignItems:"center",flexWrap:"wrap"}}>
        <div style={{flex:"0 0 auto"}}>
          <div style={{fontSize:"9px",letterSpacing:"2px",color:"#5a5438",marginBottom:"8px"}}>ПРОФИЛЬ ИГРЫ</div>
          <Radar axes={radarAxes}/>
        </div>
        <div style={{flex:1,minWidth:"180px"}}>
          <div style={{fontSize:"9px",letterSpacing:"2px",color:"#5a5438",marginBottom:"12px"}}>ПОКАЗАТЕЛИ</div>
          {radarAxes.map((a,i)=>(
            <div key={i} style={{marginBottom:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",marginBottom:"3px"}}>
                <span style={{color:"#6a6448",letterSpacing:"1px"}}>{a.label}</span>
                <span style={{color:"#f5c518"}}>{Math.round(a.value)}</span>
              </div>
              <div style={{height:"4px",background:"#1a1a10",borderRadius:"2px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(100,a.value)}%`,
                  background:"#f5c518",transition:"width 1s ease"}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Match History ────────────────────────────────────────────────────────────
function MatchHistory({faceit}){
  const[exp,setExp]=useState(null);
  const matches=arr(faceit?.matches);
  if(!matches.length)return(
    <div style={{textAlign:"center",padding:"50px",color:"#2a2a18"}}>
      <div style={{fontSize:"28px",marginBottom:"10px"}}>🎮</div>
      <div style={{fontSize:"11px",letterSpacing:"2px"}}>НЕТ МАТЧЕЙ FACEIT</div>
    </div>
  );
  return(
    <div style={{animation:"up .4s ease both"}}>
      <div style={{fontSize:"11px",letterSpacing:"3px",color:"#f5c518",padding:"6px 0 12px"}}>
        ИСТОРИЯ МАТЧЕЙ · FACEIT
      </div>
      {matches.map((m,i)=>{
        const win=m.result==="1";
        const ac=win?"#44cc66":"#ff5544";
        const isExp=exp===i;
        return(
          <div key={i}>
            <div className="match-row" onClick={()=>setExp(isExp?null:i)} style={{
              display:"grid",gridTemplateColumns:"4px 1fr 90px 80px 70px 60px",
              gap:"14px",padding:"14px 16px",cursor:"pointer",alignItems:"center",
              background:isExp?"#13130a":"#0d0d07",border:"1px solid #1a1a0e",
              borderLeft:`3px solid ${ac}`,marginBottom:"3px",transition:"background .15s"}}>
              <div/>
              <div>
                <div style={{fontSize:"14px",color:"#d0c490",fontWeight:700}}>{m.map||"—"}</div>
                <div style={{fontSize:"10px",color:ac,letterSpacing:"1px",marginTop:"2px"}}>
                  {win?"ПОБЕДА":"ПОРАЖЕНИЕ"} · {m.score}
                </div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"9px",color:"#2a2a18"}}>K/D</div>
                <div style={{fontSize:"15px",color:"#f5c518",fontWeight:700}}>{m.kd}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"9px",color:"#2a2a18"}}>K — D</div>
                <div style={{fontSize:"14px",color:"#a09060"}}>{m.kills}—{m.deaths}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"9px",color:"#2a2a18"}}>HS%</div>
                <div style={{fontSize:"14px",color:"#a09060"}}>{m.hs}%</div>
              </div>
              <div style={{textAlign:"center"}}>
                {parseInt(m.mvps)>0&&<span style={{fontSize:"15px"}}>⭐</span>}
              </div>
            </div>
            {isExp&&(
              <div style={{background:"#0a0a05",border:"1px solid #1a1a0e",borderTop:"none",
                padding:"16px 20px",marginTop:"-3px",marginBottom:"3px",animation:"up .2s ease both"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(90px,1fr))",gap:"4px"}}>
                  {[
                    {l:"УБИЙСТВА",v:m.kills},{l:"СМЕРТИ",v:m.deaths},
                    {l:"АССИСТЫ",v:m.assists},{l:"K/R",v:m.kr},
                    {l:"ADR",v:m.adr},{l:"MVP",v:m.mvps},
                  ].map((s,j)=>(
                    <div key={j} style={{background:"#111108",border:"1px solid #1a1a0e",padding:"8px 10px"}}>
                      <div style={{fontSize:"8px",color:"#2a2a18",letterSpacing:"1px",marginBottom:"3px"}}>{s.l}</div>
                      <div style={{fontSize:"15px",color:"#f5c518",fontWeight:700}}>{s.v||"—"}</div>
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

// ── Map Pool ─────────────────────────────────────────────────────────────────
function MapPool({faceit}){
  const maps=arr(faceit?.maps).slice()
    .filter(m=>parseInt(m.matches)>0)
    .sort((a,b)=>parseFloat(b.winrate)-parseFloat(a.winrate));
  if(!maps.length)return(
    <div style={{textAlign:"center",padding:"50px",color:"#2a2a18"}}>
      <div style={{fontSize:"28px",marginBottom:"10px"}}>🗺️</div>
      <div style={{fontSize:"11px",letterSpacing:"2px"}}>НЕТ ДАННЫХ ПО КАРТАМ</div>
    </div>
  );
  const best=maps[0],worst=maps[maps.length-1];
  const bans=maps.filter(m=>parseFloat(m.winrate)<45).slice(-2);
  return(
    <div style={{animation:"up .4s ease both"}}>
      <div style={{fontSize:"11px",letterSpacing:"3px",color:"#f5c518",padding:"6px 0 12px"}}>
        ПУЛ КАРТ
      </div>
      {/* summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"3px",marginBottom:"12px"}}>
        <div style={{background:"#0d1a0d",border:"1px solid #1e3a1e",padding:"14px 16px"}}>
          <div style={{fontSize:"9px",color:"#55aa55",letterSpacing:"2px",marginBottom:"4px"}}>ЛУЧШАЯ КАРТА</div>
          <div style={{fontSize:"17px",color:"#66dd66",fontWeight:700}}>{best.map} · {best.winrate}%</div>
        </div>
        <div style={{background:"#1a0d0d",border:"1px solid #3a1e1e",padding:"14px 16px"}}>
          <div style={{fontSize:"9px",color:"#cc5555",letterSpacing:"2px",marginBottom:"4px"}}>ХУДШАЯ КАРТА</div>
          <div style={{fontSize:"17px",color:"#ff6655",fontWeight:700}}>{worst.map} · {worst.winrate}%</div>
        </div>
        {bans.length>0&&(
          <div style={{background:"#1a1408",border:"1px solid #3a2e14",padding:"14px 16px"}}>
            <div style={{fontSize:"9px",color:"#f5c518",letterSpacing:"2px",marginBottom:"4px"}}>РЕКОМЕНДУЮ БАНИТЬ</div>
            <div style={{fontSize:"15px",color:"#f5c518",fontWeight:700}}>{bans.map(b=>b.map).join(", ")}</div>
          </div>
        )}
      </div>
      {/* table */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 110px 80px 70px",gap:"2px",padding:"8px 14px",fontSize:"9px",letterSpacing:"2px",color:"#2a2a18",borderBottom:"1px solid #1a1a0e"}}>
        <div>КАРТА</div><div>WINRATE</div><div>МАТЧИ</div><div>K/D</div>
      </div>
      {maps.map((m,i)=>{
        const wr=parseFloat(m.winrate)||0;
        const wc=wr>=55?"#55cc66":wr>=45?"#f5c518":"#ff5544";
        return(
          <div key={i} className="hov-row" style={{
            display:"grid",gridTemplateColumns:"1fr 110px 80px 70px",gap:"2px",
            padding:"12px 14px",alignItems:"center",borderBottom:"1px solid #1a1a0e",
            background:"#0d0d07",transition:"background .15s"}}>
            <div style={{fontSize:"14px",color:"#d0c490",fontWeight:700}}>{m.map}</div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <div style={{flex:1,height:"5px",background:"#1a1a10",borderRadius:"3px",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${wr}%`,background:wc,transition:"width .8s ease"}}/>
                </div>
                <span style={{fontSize:"12px",color:wc,fontWeight:700,minWidth:"32px"}}>{m.winrate}%</span>
              </div>
            </div>
            <div style={{fontSize:"13px",color:"#807050"}}>{m.matches}</div>
            <div style={{fontSize:"13px",color:"#807050"}}>{m.kd}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Search Bar ───────────────────────────────────────────────────────────────
function SearchBar({onSelect}){
  const[q,setQ]=useState("");
  const[results,setResults]=useState([]);
  const[open,setOpen]=useState(false);
  const[loading,setLoading]=useState(false);
  const tref=useRef(null);

  useEffect(()=>{
    if(q.trim().length<2){setResults([]);return;}
    clearTimeout(tref.current);
    setLoading(true);
    tref.current=setTimeout(async()=>{
      try{
        const r=await fetch(`${BACKEND}/search/${encodeURIComponent(q.trim())}`);
        const d=await r.json();
        setResults(d.results||[]);setOpen(true);
      }catch{setResults([]);}
      setLoading(false);
    },350);
    return()=>clearTimeout(tref.current);
  },[q]);

  return(
    <div style={{position:"relative",width:"220px"}}>
      <input value={q} onChange={e=>setQ(e.target.value)} onFocus={()=>setOpen(true)}
        placeholder="поиск игрока FACEIT..."
        style={{width:"100%",background:"#111108",border:"1px solid #252515",
          color:"#f5c518",fontSize:"12px",padding:"8px 12px",
          fontFamily:"'Courier New',monospace"}}/>
      {open&&q.trim().length>=2&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:"2px",
          background:"#0d0d07",border:"1px solid #252515",zIndex:50,maxHeight:"280px",overflowY:"auto"}}>
          {loading&&<div style={{padding:"12px",fontSize:"11px",color:"#3a3a28",textAlign:"center"}}>поиск...</div>}
          {!loading&&results.length===0&&<div style={{padding:"12px",fontSize:"11px",color:"#3a3a28",textAlign:"center"}}>ничего не найдено</div>}
          {results.map((r,i)=>(
            <div key={i} className="hov-row" onClick={()=>{onSelect(r);setOpen(false);setQ("");}} style={{
              display:"flex",alignItems:"center",gap:"10px",padding:"9px 12px",
              cursor:"pointer",borderBottom:"1px solid #1a1a0e",transition:"background .15s"}}>
              {r.avatar
                ?<img src={r.avatar} alt="" style={{width:"26px",height:"26px",borderRadius:"2px"}}/>
                :<div style={{width:"26px",height:"26px",background:"#1a1a10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px"}}>👤</div>}
              <span style={{fontSize:"12px",color:"#c8b070",flex:1}}>{r.nickname}</span>
              <span style={{fontSize:"13px"}}>{flag(r.country)}</span>
            </div>
          ))}
        </div>
      )}
      {open&&<div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:40}}/>}
    </div>
  );
}

// ── Profile Modal ────────────────────────────────────────────────────────────
function ProfileModal({steamid,nickname,onClose}){
  const[data,setData]=useState(null);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    const url=steamid?`${BACKEND}/profile/${steamid}`:`${BACKEND}/faceit/by-nickname/${encodeURIComponent(nickname)}`;
    fetch(url).then(r=>r.json()).then(d=>{setData(d);setLoading(false);}).catch(()=>setLoading(false));
  },[steamid,nickname]);

  const fc=steamid?data?.faceit:data;
  const pl=steamid?data:{username:data?.nickname,avatar:data?.faceit?.avatar,faceit:data};

  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0a0a06",border:"1px solid #252515",borderTop:"2px solid #f5c518",maxWidth:"680px",width:"100%",maxHeight:"88vh",overflowY:"auto",animation:"slideUp .3s ease"}}>
        {loading?(
          <div style={{padding:"32px"}}>
            <Skel w="60%" h="22"/><Skel w="40%" h="14"/>
            <div style={{marginTop:"20px"}}><Skel h="60"/><Skel h="60"/></div>
          </div>
        ):data&&!data.error?(
          <div>
            <div style={{padding:"22px",borderBottom:"1px solid #1a1a0e",display:"flex",justifyContent:"space-between"}}>
              <div style={{fontSize:"10px",letterSpacing:"3px",color:"#f5c518"}}>ПРОФИЛЬ ИГРОКА</div>
              <button onClick={onClose} style={{background:"transparent",border:"1px solid #2a2a18",color:"#444",cursor:"pointer",width:"24px",height:"24px",fontFamily:"monospace"}}>✕</button>
            </div>
            <div style={{padding:"4px 0"}}>
              {(fc?.elo||arr(fc?.matches).length)&&<HeroCard player={{...pl,faceit:fc,cs2:data?.cs2}}/>}
            </div>
            {arr(fc?.matches).length>0&&<div style={{padding:"0 16px"}}><ChartsSection faceit={fc}/></div>}
            {arr(fc?.matches).length>0&&<div style={{padding:"12px 16px"}}><MatchHistory faceit={fc}/></div>}
            {arr(fc?.maps).length>0&&<div style={{padding:"0 16px 20px"}}><MapPool faceit={fc}/></div>}
            {steamid&&data.history?.length>0&&(
              <div style={{padding:"0 16px 20px"}}>
                <div style={{fontSize:"11px",letterSpacing:"3px",color:"#f5c518",padding:"6px 0 12px"}}>ИСТОРИЯ РАЗБОРОВ</div>
                {data.history.map((h,i)=>{
                  const lc=LEVEL_COLOR[h.result?.level]||"#f5c518";
                  return(
                    <div key={i} style={{background:"#0d0d07",border:"1px solid #1a1a0e",borderLeft:`2px solid ${lc}`,padding:"12px 16px",marginBottom:"3px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                        <span style={{fontSize:"10px",color:lc,letterSpacing:"2px"}}>{h.result?.level?.toUpperCase()}</span>
                        <span style={{fontSize:"10px",color:"#2a2a18"}}>{fmt(h.timestamp)}</span>
                      </div>
                      <div style={{fontSize:"12px",color:"#807050",lineHeight:1.5}}>{h.result?.overall}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {!fc?.elo&&!arr(fc?.matches).length&&(
              <div style={{padding:"40px",textAlign:"center",color:"#3a3a28",fontSize:"12px"}}>
                FACEIT профиль не найден для этого игрока
              </div>
            )}
          </div>
        ):(
          <div style={{padding:"40px",textAlign:"center",color:"#3a3a28",fontSize:"12px"}}>
            Профиль не найден
            <div><button onClick={onClose} style={{marginTop:"16px",background:"transparent",border:"1px solid #2a2a18",color:"#666",cursor:"pointer",padding:"8px 16px",fontFamily:"monospace",fontSize:"11px"}}>ЗАКРЫТЬ</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Leaderboard ──────────────────────────────────────────────────────────────
function Leaderboard({currentSteamId,onProfile}){
  const[data,setData]=useState(null);
  useEffect(()=>{
    fetch(`${BACKEND}/leaderboard`).then(r=>r.json()).then(d=>setData(d.leaderboard||[])).catch(()=>setData([]));
  },[]);
  if(data===null)return(
    <div style={{padding:"10px"}}>{[1,2,3,4,5].map(i=><Skel key={i} h="48"/>)}</div>
  );
  if(!data.length)return(
    <div style={{textAlign:"center",padding:"70px",color:"#2a2a18"}}>
      <div style={{fontSize:"36px",marginBottom:"14px"}}>🏆</div>
      <div style={{fontSize:"12px",letterSpacing:"3px"}}>ТАБЛИЦА ПУСТА</div>
    </div>
  );
  return(
    <div style={{animation:"up .4s ease both"}}>
      <div style={{fontSize:"11px",color:"#2a2a18",marginBottom:"12px",letterSpacing:"1px"}}>Нажми на игрока — откроется профиль</div>
      <div style={{display:"grid",gridTemplateColumns:"44px 1fr 100px 64px 64px 64px 88px",gap:"2px",padding:"8px 14px",fontSize:"9px",letterSpacing:"2px",color:"#2a2a18",borderBottom:"1px solid #1a1a0e"}}>
        <div>#</div><div>ИГРОК</div><div>RANK</div><div>K/D</div><div>WIN%</div><div>HS%</div><div>УРОВЕНЬ</div>
      </div>
      {data.map((p,i)=>{
        const lc=LEVEL_COLOR[p.level]||"#f5c518";
        const isMe=currentSteamId&&p.steamid===currentSteamId;
        const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
        return(
          <div key={i} className="hov-row" onClick={()=>onProfile(p.steamid)} style={{
            display:"grid",gridTemplateColumns:"44px 1fr 100px 64px 64px 64px 88px",gap:"2px",
            padding:"13px 14px",cursor:"pointer",borderBottom:"1px solid #1a1a0e",
            transition:"background .15s",background:isMe?"#181808":"#0d0d07",
            borderLeft:isMe?"2px solid #f5c518":"2px solid transparent"}}>
            <div style={{color:i<3?"#f5c518":"#333320",fontSize:"14px",fontWeight:700}}>{medal||i+1}</div>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              {p.avatar?<img src={p.avatar} alt="" style={{width:"30px",height:"30px",borderRadius:"2px",border:"1px solid #252515"}}/>
                :<div style={{width:"30px",height:"30px",background:"#181810",border:"1px solid #252515",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px"}}>👤</div>}
              <span style={{fontSize:"14px",color:isMe?"#f5c518":"#c8b070",fontWeight:isMe?700:400}}>{p.username}{isMe?" (ты)":""}</span>
            </div>
            <div style={{fontSize:"15px",color:"#f5c518",fontWeight:700}}>{p.stats?.rank||"—"}</div>
            <div style={{fontSize:"14px",color:"#807050"}}>{p.stats?.kd||"—"}</div>
            <div style={{fontSize:"14px",color:"#807050"}}>{p.stats?.winrate||"—"}%</div>
            <div style={{fontSize:"14px",color:"#807050"}}>{p.stats?.hs||"—"}%</div>
            <div style={{padding:"3px 9px",background:lc+"18",color:lc,border:`1px solid ${lc}33`,fontSize:"10px",letterSpacing:"1px",display:"inline-flex",alignItems:"center",height:"fit-content"}}>{p.level}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({steamid}){
  const[data,setData]=useState(null);
  const[exp,setExp]=useState(null);
  useEffect(()=>{
    fetch(`${BACKEND}/history/${steamid}`).then(r=>r.json()).then(d=>setData(d.history||[])).catch(()=>setData([]));
  },[steamid]);
  if(data===null)return<div style={{padding:"10px"}}>{[1,2,3].map(i=><Skel key={i} h="60"/>)}</div>;
  if(!data.length)return(
    <div style={{textAlign:"center",padding:"60px",color:"#2a2a18"}}>
      <div style={{fontSize:"28px",marginBottom:"12px"}}>📋</div>
      <div style={{fontSize:"11px",letterSpacing:"3px"}}>ИСТОРИЯ ПУСТА</div>
    </div>
  );
  return(
    <div style={{animation:"up .4s ease both"}}>
      {data.map((h,i)=>{
        const lc=LEVEL_COLOR[h.result?.level]||"#f5c518";
        const isExp=exp===i;
        return(
          <div key={i} style={{marginBottom:"3px"}}>
            <div onClick={()=>setExp(isExp?null:i)} className="hov-row" style={{
              background:"#0d0d07",border:"1px solid #1a1a0e",borderLeft:`3px solid ${lc}`,
              padding:"16px 20px",cursor:"pointer",transition:"background .15s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
                  <span style={{padding:"3px 12px",background:lc+"18",color:lc,border:`1px solid ${lc}33`,fontSize:"10px",letterSpacing:"2px",fontWeight:700}}>{h.result?.level?.toUpperCase()}</span>
                  <span style={{fontSize:"12px",color:"#3a3a28"}}>Rank {h.stats?.rank} · K/D {h.stats?.kd}</span>
                </div>
                <span style={{fontSize:"11px",color:"#2a2a18"}}>{fmt(h.timestamp)}</span>
              </div>
              <div style={{fontSize:"14px",color:"#807050",lineHeight:1.6}}>{h.result?.overall}</div>
            </div>
            {isExp&&(
              <div style={{background:"#0a0a05",border:"1px solid #1a1a0e",borderTop:"none",padding:"18px 20px",animation:"up .2s ease both"}}>
                <div style={{color:"#ff7755",fontSize:"13px",marginBottom:"12px",borderLeft:"2px solid #ff4433",paddingLeft:"12px"}}>⚠ {h.result?.mainProblem}</div>
                {h.result?.mapInsights?.map((mi,j)=>(
                  <div key={j} style={{fontSize:"12px",color:"#f5c518",marginBottom:"6px"}}>🗺️ {mi}</div>
                ))}
                <div style={{fontSize:"11px",color:"#3a3820",borderTop:"1px solid #1a1a0e",paddingTop:"10px",marginTop:"10px"}}>🎯 {h.result?.goal}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App(){
  const[stats,setStats]=useState({kd:"—",winrate:"—",hltv:"—",hs:"—",adr:"—",clutch1v1:"—",entrySuccess:"—",rank:"—",matches:"—"});
  const[analysis,setAnalysis]=useState(null);
  const[loading,setLoading]=useState(false);
  const[subTab,setSubTab]=useState("weak");
  const[mainTab,setMainTab]=useState("overview");
  const[errorMsg,setErrorMsg]=useState(null);
  const[showPopup,setShowPopup]=useState(false);
  const[player,setPlayer]=useState(null);
  const[profileView,setProfileView]=useState(null);

  useEffect(()=>{
    try{
      const s=localStorage.getItem("cs2_player_v3");
      if(s)setPlayer(JSON.parse(s));
      else setTimeout(()=>setShowPopup(true),1200);
    }catch{setTimeout(()=>setShowPopup(true),1200);}
  },[]);

  useEffect(()=>{
    const handler=(e)=>{
      if(!e.data?.player)return;
      const p=e.data.player;
      setPlayer(p);
      try{localStorage.setItem("cs2_player_v3",JSON.stringify(p));}catch{}
      const s=e.data.stats||{};
      const fc=p.faceit;
      setStats({
        kd:fc?.lifetime?.kd||s.kd||"—",
        winrate:fc?.lifetime?.winrate||s.winrate||"—",
        hltv:"—",
        hs:fc?.lifetime?.hs||s.hs||"—",
        adr:(arr(fc?.matches)[0]?.adr)||"—",
        clutch1v1:"—",entrySuccess:"—",
        rank:fc?.elo||"—",
        matches:fc?.lifetime?.matches||s.matches||"—",
      });
      setShowPopup(false);
    };
    window.addEventListener("message",handler);
    return()=>window.removeEventListener("message",handler);
  },[]);

  const openSteam=()=>window.open(`${BACKEND}/auth/steam`,"steam-login","width=600,height=700,left=400,top=80");
  const logout=()=>{
    setPlayer(null);setAnalysis(null);
    setStats({kd:"—",winrate:"—",hltv:"—",hs:"—",adr:"—",clutch1v1:"—",entrySuccess:"—",rank:"—",matches:"—"});
    try{localStorage.removeItem("cs2_player_v3");}catch{}
    setShowPopup(true);
  };

  async function analyze(){
    if(!player){setShowPopup(true);return;}
    setLoading(true);setAnalysis(null);setErrorMsg(null);
    const payload={...stats,steamid:player.steamid,maps:arr(player.faceit?.maps)};
    const call=async()=>{
      const res=await fetch(`${BACKEND}/analyze`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const d=await res.json();
      if(d.error&&!d.result)throw new Error(d.error);
      const m=(d.result||"").match(/\{[\s\S]*\}/);
      if(!m)throw new Error("JSON не найден");
      return JSON.parse(m[0]);
    };
    try{
      let result=null,le=null;
      for(let i=0;i<3;i++){try{result=await call();break;}catch(e){le=e;if(i<2)await new Promise(r=>setTimeout(r,700));}}
      if(!result)throw le;
      setAnalysis(result);setSubTab("weak");
      fetch(`${BACKEND}/leaderboard/add`,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({steamid:player.steamid,username:player.faceit?.nickname||player.username,
          avatar:player.faceit?.avatar||player.avatar||"",stats,level:result.level,overall:result.overall})}).catch(()=>{});
    }catch(e){setErrorMsg(e.message);}
    finally{setLoading(false);}
  }

  const lc=LEVEL_COLOR[analysis?.level]||"#f5c518";
  const hasFaceit=player?.faceit&&(player.faceit.elo||arr(player.faceit.matches).length);

  return(
    <div style={{minHeight:"100vh",background:"#080807",fontFamily:"'Courier New',monospace",color:"#b8b090",
      backgroundImage:"linear-gradient(#0e0e0820 1px,transparent 1px),linear-gradient(90deg,#0e0e0820 1px,transparent 1px)",
      backgroundSize:"44px 44px",position:"relative"}}>
      <style>{css}</style>
      {/* scanline */}
      <div style={{position:"fixed",left:0,right:0,height:"2px",
        background:"linear-gradient(90deg,transparent,#f5c51822,transparent)",
        animation:"scan 8s linear infinite",pointerEvents:"none",zIndex:1}}/>

      {showPopup&&<SteamPopup onLogin={openSteam} onSkip={()=>setShowPopup(false)}/>}
      {profileView&&<ProfileModal steamid={profileView.steamid} nickname={profileView.nickname} onClose={()=>setProfileView(null)}/>}

      <div style={{height:"3px",background:"linear-gradient(90deg,#f5c518,#c9a000,#f5c518)"}}/>

      {/* Topbar */}
      <div style={{background:"#0a0a06",borderBottom:"1px solid #1a1a0e",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"16px",flexWrap:"wrap",position:"relative",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"8px",height:"8px",background:"#f5c518",borderRadius:"50%",animation:"pulse 2s infinite"}}/>
          <span style={{fontSize:"11px",letterSpacing:"5px",color:"#f5c518",fontWeight:700}}>CS2 AI ТРЕНЕР</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
          <SearchBar onSelect={(r)=>setProfileView({nickname:r.nickname})}/>
          {player?(
            <>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                {(player.faceit?.avatar||player.avatar)&&<img src={player.faceit?.avatar||player.avatar} alt="" style={{width:"28px",height:"28px",borderRadius:"2px"}}/>}
                <span style={{fontSize:"12px",color:"#c8b070"}}>{player.faceit?.nickname||player.username}</span>
              </div>
              <button onClick={logout} style={{background:"transparent",border:"1px solid #2a2a18",color:"#3a3a28",cursor:"pointer",fontSize:"9px",letterSpacing:"1px",fontFamily:"'Courier New',monospace",padding:"5px 10px"}}>ВЫЙТИ</button>
            </>
          ):(
            <button onClick={openSteam} style={{background:"#1b6090",color:"#fff",border:"none",padding:"8px 16px",cursor:"pointer",fontSize:"10px",fontWeight:700,letterSpacing:"2px",fontFamily:"'Courier New',monospace"}}>STEAM</button>
          )}
        </div>
      </div>

      <div style={{maxWidth:"980px",margin:"0 auto",padding:"30px 20px 80px",position:"relative",zIndex:5}}>

        {/* Main tabs */}
        <div style={{display:"flex",borderBottom:"1px solid #1a1a0e",marginBottom:"22px",flexWrap:"wrap"}}>
          {[["overview","ОБЗОР"],["coach","🎯 ТРЕНЕР"],["matches","🎮 МАТЧИ"],["maps","🗺️ КАРТЫ"],["history","📋 ИСТОРИЯ"],["leaderboard","🏆 ЛИДЕРЫ"]].map(([t,l])=>(
            <button key={t} onClick={()=>setMainTab(t)} style={{
              padding:"11px 18px",background:"transparent",
              color:mainTab===t?"#f5c518":"#333320",border:"none",
              borderBottom:`2px solid ${mainTab===t?"#f5c518":"transparent"}`,
              cursor:"pointer",fontSize:"11px",letterSpacing:"1px",
              fontFamily:"'Courier New',monospace",marginBottom:"-1px",transition:"color .15s"}}>{l}</button>
          ))}
        </div>

        {!player&&(
          <div style={{background:"#14140a",border:"1px solid #2a2a18",borderLeft:"3px solid #f5c518",padding:"20px 24px",marginBottom:"20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
            <div>
              <div style={{fontSize:"13px",color:"#c8b070",marginBottom:"4px",fontWeight:700}}>Войди через Steam</div>
              <div style={{fontSize:"11px",color:"#3a3a28",letterSpacing:"1px"}}>Аналитика, графики и история — после входа</div>
            </div>
            <button onClick={openSteam} style={{background:"#1b6090",color:"#fff",border:"none",padding:"10px 20px",cursor:"pointer",fontSize:"11px",fontWeight:700,letterSpacing:"2px",fontFamily:"'Courier New',monospace"}}>ВОЙТИ</button>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {mainTab==="overview"&&player&&(
          <div style={{animation:"up .4s ease both"}}>
            <HeroCard player={player}/>
            {hasFaceit
              ?<div style={{marginTop:"16px"}}><ChartsSection faceit={player.faceit}/></div>
              :<div style={{marginTop:"16px",padding:"30px",textAlign:"center",background:"#0d0d07",border:"1px solid #1a1a0e",color:"#3a3a28",fontSize:"12px",lineHeight:1.7}}>
                  FACEIT профиль не найден.<br/>Графики и матчи доступны для игроков FACEIT.
                </div>}
          </div>
        )}
        {mainTab==="overview"&&!player&&(
          <div style={{textAlign:"center",padding:"60px",color:"#2a2a18",fontSize:"12px"}}>Войди через Steam для просмотра обзора</div>
        )}

        {/* ── MATCHES ── */}
        {mainTab==="matches"&&(player?<MatchHistory faceit={player.faceit}/>:<div style={{textAlign:"center",padding:"60px",color:"#2a2a18",fontSize:"12px"}}>Войди через Steam</div>)}

        {/* ── MAPS ── */}
        {mainTab==="maps"&&(player?<MapPool faceit={player.faceit}/>:<div style={{textAlign:"center",padding:"60px",color:"#2a2a18",fontSize:"12px"}}>Войди через Steam</div>)}

        {/* ── COACH ── */}
        {mainTab==="coach"&&<>
          {player&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"3px",marginBottom:"16px"}}>
              {[
                {l:"K/D",v:stats.kd},{l:"WIN %",v:stats.winrate},{l:"HS %",v:stats.hs},
                {l:"FACEIT ELO",v:stats.rank},{l:"МАТЧИ",v:stats.matches},{l:"ADR",v:stats.adr},
              ].map((f,i)=>(
                <div key={i} className="hov-card" style={{background:"#0d0d07",border:"1px solid #1a1a0e",padding:"14px 16px"}}>
                  <div style={{fontSize:"9px",letterSpacing:"2px",color:"#2a2a18",marginBottom:"7px"}}>{f.l}</div>
                  <div style={{fontSize:"22px",color:"#f5c518",fontWeight:700}}>{f.v}</div>
                </div>
              ))}
            </div>
          )}

          <button onClick={analyze} disabled={loading||!player} className="glow-btn" style={{
            width:"100%",padding:"17px",marginBottom:"24px",
            background:(!player||loading)?"#0f0f08":"#f5c518",
            color:(!player||loading)?"#2a2a18":"#080807",
            border:`1px solid ${(!player||loading)?"#1a1a0e":"#f5c518"}`,
            cursor:(!player||loading)?"not-allowed":"pointer",fontSize:"13px",fontWeight:700,
            letterSpacing:"4px",fontFamily:"'Courier New',monospace",transition:"all .15s"}}>
            {loading?"АНАЛИЗИРУЮ...":!player?"ВОЙДИ ЧЕРЕЗ STEAM":"ПОЛУЧИТЬ РАЗБОР ОТ ТРЕНЕРА"}
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
              <div style={{background:"#0d0d07",border:"1px solid #1a1a0e",borderLeft:`4px solid ${lc}`,padding:"24px 26px",marginBottom:"3px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"14px",flexWrap:"wrap"}}>
                  <span style={{padding:"5px 16px",fontSize:"12px",letterSpacing:"3px",fontWeight:700,background:lc+"20",color:lc,border:`1px solid ${lc}55`}}>{analysis.level?.toUpperCase()}</span>
                  <span style={{fontSize:"13px",color:"#3a3820"}}>→ {analysis.goal}</span>
                  <span style={{marginLeft:"auto",fontSize:"10px",color:"#2a2a18",letterSpacing:"1px"}}>✓ в лидерах</span>
                </div>
                <div style={{fontSize:"16px",color:"#d8cc90",lineHeight:1.7,marginBottom:"14px"}}>{analysis.overall}</div>
                <div style={{background:"#ff440410",borderLeft:"3px solid #ff5544",padding:"12px 16px",fontSize:"14px",color:"#ff8866",lineHeight:1.6}}>⚠ {analysis.mainProblem}</div>
              </div>

              {analysis.mapInsights?.length>0&&(
                <div style={{background:"#0d0d07",border:"1px solid #1a1a0e",padding:"18px 22px",marginBottom:"3px"}}>
                  <div style={{fontSize:"10px",letterSpacing:"3px",color:"#f5c518",marginBottom:"12px"}}>🗺️ ИНСАЙТЫ ПО КАРТАМ</div>
                  {analysis.mapInsights.map((mi,i)=>(
                    <div key={i} style={{fontSize:"14px",color:"#c0a860",lineHeight:1.7,marginBottom:"6px",paddingLeft:"14px",borderLeft:"2px solid #f5c51833"}}>{mi}</div>
                  ))}
                </div>
              )}

              <div style={{display:"flex",borderBottom:"1px solid #1a1a0e",marginBottom:"3px"}}>
                {[["weak","❌ СЛАБЫЕ"],["strong","✅ СИЛЬНЫЕ"],["plan","📋 ПЛАН"]].map(([t,l])=>(
                  <button key={t} onClick={()=>setSubTab(t)} style={{
                    padding:"11px 20px",background:"transparent",
                    color:subTab===t?(t==="weak"?"#ff7755":t==="strong"?"#88dd88":"#f5c518"):"#333320",
                    border:"none",borderBottom:`2px solid ${subTab===t?(t==="weak"?"#ff5544":t==="strong"?"#55bb55":"#f5c518"):"transparent"}`,
                    cursor:"pointer",fontSize:"11px",letterSpacing:"2px",fontFamily:"'Courier New',monospace",marginBottom:"-1px"}}>{l}</button>
                ))}
              </div>

              {subTab==="weak"&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px",animation:"up .25s ease both"}}>
                  {analysis.weaknesses?.map((w,i)=>(
                    <div key={i} style={{background:"#0d0d07",border:"1px solid #2a1414",borderTop:"2px solid #ff5544",padding:"20px"}}>
                      <div style={{display:"inline-block",padding:"3px 12px",background:"#ff554420",color:"#ff7755",fontSize:"11px",letterSpacing:"2px",fontWeight:700,marginBottom:"12px"}}>{w.stat?.toUpperCase()}</div>
                      <div style={{fontSize:"14px",color:"#886655",lineHeight:1.7,marginBottom:"12px"}}>{w.problem}</div>
                      <div style={{background:"#f5c51810",border:"1px solid #f5c51830",padding:"10px 14px",fontSize:"13px",color:"#f5c518",lineHeight:1.6}}>💡 {w.fix}</div>
                    </div>
                  ))}
                </div>
              )}
              {subTab==="strong"&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px",animation:"up .25s ease both"}}>
                  {analysis.strengths?.map((s,i)=>(
                    <div key={i} style={{background:"#0d0d07",border:"1px solid #142414",borderTop:"2px solid #55aa55",padding:"20px"}}>
                      <div style={{display:"inline-block",padding:"3px 12px",background:"#55aa5520",color:"#88dd88",fontSize:"11px",letterSpacing:"2px",fontWeight:700,marginBottom:"12px"}}>{s.stat?.toUpperCase()}</div>
                      <div style={{fontSize:"14px",color:"#558855",lineHeight:1.7}}>{s.comment}</div>
                    </div>
                  ))}
                </div>
              )}
              {subTab==="plan"&&(
                <div style={{animation:"up .25s ease both"}}>
                  {analysis.plan?.map((day,i)=>(
                    <div key={i} style={{background:"#0d0d07",border:"1px solid #1a1a0e",padding:"18px 20px",marginBottom:"3px",display:"flex",gap:"18px",alignItems:"flex-start"}}>
                      <div style={{minWidth:"32px",height:"32px",background:"#f5c51818",border:"1px solid #f5c51840",color:"#f5c518",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",fontWeight:700,flexShrink:0}}>{i+1}</div>
                      <div style={{fontSize:"15px",color:"#c0a860",lineHeight:1.7}}>{day}</div>
                    </div>
                  ))}
                  <div style={{marginTop:"3px",padding:"18px 20px",background:"#f5c51808",border:"1px solid #f5c51825",fontSize:"15px",color:"#f5c518"}}>🎯 Цель: {analysis.goal}</div>
                </div>
              )}
            </div>
          )}
        </>}

        {mainTab==="history"&&(player?<HistoryTab steamid={player.steamid}/>:<div style={{textAlign:"center",padding:"60px",color:"#2a2a18",fontSize:"12px"}}>Войди через Steam</div>)}
        {mainTab==="leaderboard"&&<Leaderboard currentSteamId={player?.steamid} onProfile={(sid)=>setProfileView({steamid:sid})}/>}
      </div>

      <div style={{height:"2px",background:"linear-gradient(90deg,transparent,#f5c518,transparent)"}}/>
    </div>
  );
}
