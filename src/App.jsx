import { useState, useMemo, useRef } from "react";
import { useEffect } from "react"
import { supabase } from "./supabaseClient"

// ─── Dados ────────────────────────────────────────────────────────────────────
const TIPOS_OS = [
  { id:"troca_pecas", label:"Troca de Peças",    short:"Peças",    icon:"⚙️", color:"#E8A020", bg:"#E8A02012" },
  { id:"ria",         label:"RIA",                short:"RIA",      icon:"🔍", color:"#3B8BEB", bg:"#3B8BEB12" },
  { id:"corretiva",   label:"Mant. Corretiva",   short:"Corretiva",icon:"🔧", color:"#E8534A", bg:"#E8534A12" },
  { id:"diversos",    label:"Serviços Diversos",  short:"Diversos", icon:"📋", color:"#22C48A", bg:"#22C48A12" },
];
const STATUS = [
  { id:"aberta",       label:"Aberta",       dot:"#E8A020" },
  { id:"em_andamento", label:"Em Andamento", dot:"#3B8BEB" },
  { id:"concluida",    label:"Concluída",    dot:"#22C48A" },
  { id:"cancelada",    label:"Cancelada",    dot:"#8A8F98" },
];
const CLIENTES = ["TK Elevadores","Otis","New Elevadores","MDA","Outro"];
const TECNICOS = ["Matheus Torres","John Torres"];
const EMPRESA  = { nome:"Torres Elevadores", cnpj:"52.019.285/0001-06", email:"aetservicecorp@gmail.com" };

const INIT = {
  numero:"", data:new Date().toISOString().split("T")[0],
  cliente:"", condominio:"", equipamento:"", tipo:"", tecnico:"",
  status:"aberta", descricao:"", pecas:"", obs:"",
  numeros_os:[], fotos:[],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const gId  = ()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const gTipo= id=>TIPOS_OS.find(t=>t.id===id)||{};
const gSt  = id=>STATUS.find(s=>s.id===id)||{};
const gNum = l=>String(l.reduce((a,o)=>{const n=parseInt(o.numero,10);return isNaN(n)?a:Math.max(a,n);},0)+1).padStart(4,"0");

// ─── PDF Premium ─────────────────────────────────────────────────────────────
function gerarPDF(ordens, periodo) {
  function makeCanvas(w,h){const c=document.createElement("canvas");c.width=w;c.height=h;return c;}

  function pie(cv,labels,vals,colors){
    const ctx=cv.getContext("2d"),W=cv.width,H=cv.height;
    // fundo
    ctx.fillStyle="#FAFBFC";ctx.fillRect(0,0,W,H);
    const total=vals.reduce((a,b)=>a+b,0)||1;
    const cx=W*0.36,cy=H*0.52,r=Math.min(cx,cy)*0.82;
    // sombra do círculo
    ctx.shadowColor="rgba(0,0,0,0.10)";ctx.shadowBlur=18;
    let a=-Math.PI/2;
    vals.forEach((v,i)=>{
      const s=(v/total)*Math.PI*2;
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,a,a+s);ctx.closePath();
      ctx.fillStyle=colors[i];ctx.fill();
      a+=s;
    });
    ctx.shadowBlur=0;
    // separadores
    a=-Math.PI/2;
    vals.forEach((v,i)=>{
      const s=(v/total)*Math.PI*2;
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,a,a+s);ctx.closePath();
      ctx.strokeStyle="#FAFBFC";ctx.lineWidth=3;ctx.stroke();
      if(v>0){
        const m=a+s/2;
        ctx.fillStyle="#fff";ctx.font="bold 14px 'Segoe UI',Arial";ctx.textAlign="center";
        const pct=Math.round((v/total)*100);
        if(pct>5) ctx.fillText(pct+"%",cx+Math.cos(m)*r*0.63,cy+Math.sin(m)*r*0.63+5);
      }
      a+=s;
    });
    // buraco central (donut)
    ctx.beginPath();ctx.arc(cx,cy,r*0.42,0,Math.PI*2);
    ctx.fillStyle="#FAFBFC";ctx.fill();
    // total no centro
    ctx.fillStyle="#1A1D23";ctx.font="bold 20px 'Segoe UI',Arial";ctx.textAlign="center";
    ctx.fillText(total,cx,cy+7);
    ctx.fillStyle="#8A8F98";ctx.font="11px 'Segoe UI',Arial";
    ctx.fillText("OS",cx,cy+22);
    // legenda
    const lx=W*0.67,ly0=H*0.12;
    labels.forEach((lb,i)=>{
      if(!vals[i])return;
      const ly=ly0+i*34;
      ctx.fillStyle=colors[i];
      // pill
      ctx.beginPath();ctx.roundRect(lx,ly,12,12,3);ctx.fill();
      ctx.fillStyle="#1A1D23";ctx.font="bold 13px 'Segoe UI',Arial";ctx.textAlign="left";
      ctx.fillText(vals[i],lx+18,ly+11);
      ctx.fillStyle="#8A8F98";ctx.font="12px 'Segoe UI',Arial";
      ctx.fillText(lb,lx+18,ly+26);
    });
  }

  function bar(cv,labels,vals,colors){
    const ctx=cv.getContext("2d"),W=cv.width,H=cv.height;
    ctx.fillStyle="#FAFBFC";ctx.fillRect(0,0,W,H);
    const pL=20,pR=20,pT=20,pB=50,cW=W-pL-pR,cH=H-pT-pB;
    const max=Math.max(...vals,1);
    const bW=Math.min(54,(cW/labels.length)*0.5);
    // grid
    [0.5,1].forEach(f=>{
      const gy=pT+cH*(1-f);
      ctx.strokeStyle="#EAEDF0";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(pL,gy);ctx.lineTo(pL+cW,gy);ctx.stroke();
      ctx.fillStyle="#C0C4CC";ctx.font="10px 'Segoe UI',Arial";ctx.textAlign="right";
      ctx.fillText(Math.round(max*f),pL-4,gy+4);
    });
    labels.forEach((lb,i)=>{
      const bx=pL+(cW/labels.length)*i+(cW/labels.length-bW)/2;
      const bh=Math.max((vals[i]/max)*cH,vals[i]>0?4:0);
      const by=pT+cH-bh;
      // sombra
      ctx.shadowColor=colors[i%colors.length]+"55";ctx.shadowBlur=8;ctx.shadowOffsetY=2;
      // pill bar
      ctx.fillStyle=colors[i%colors.length];
      ctx.beginPath();
      if(ctx.roundRect){ctx.roundRect(bx,by,bW,bh,bh>8?[6,6,0,0]:[0]);}
      else{ctx.rect(bx,by,bW,bh);}
      ctx.fill();
      ctx.shadowBlur=0;ctx.shadowOffsetY=0;
      if(vals[i]>0){
        ctx.fillStyle="#fff";ctx.font="bold 13px 'Segoe UI',Arial";ctx.textAlign="center";
        if(bh>22)ctx.fillText(vals[i],bx+bW/2,by+15);
        else{ctx.fillStyle=colors[i%colors.length];ctx.fillText(vals[i],bx+bW/2,by-5);}
      }
      ctx.fillStyle="#6B7280";ctx.font="11px 'Segoe UI',Arial";ctx.textAlign="center";
      ctx.fillText(lb.length>9?lb.slice(0,9)+"…":lb,bx+bW/2,pT+cH+18);
    });
  }

  const c1=makeCanvas(560,310);
  pie(c1,TIPOS_OS.map(t=>t.label),TIPOS_OS.map(t=>ordens.filter(o=>o.tipo===t.id).length),TIPOS_OS.map(t=>t.color));
  const c2=makeCanvas(540,240);
  bar(c2,STATUS.map(s=>s.label),STATUS.map(s=>ordens.filter(o=>o.status===s.id).length),STATUS.map(s=>s.dot));
  const c3=makeCanvas(540,240);
  bar(c3,TECNICOS,TECNICOS.map(t=>ordens.filter(o=>o.tecnico===t).length),["#0B1D3A","#E8A020"]);

  const i1=c1.toDataURL("image/png"),i2=c2.toDataURL("image/png"),i3=c3.toDataURL("image/png");

  const per=periodo.inicio&&periodo.fim?`${periodo.inicio} — ${periodo.fim}`:periodo.inicio?`A partir de ${periodo.inicio}`:periodo.fim?`Até ${periodo.fim}`:"Todos os registros";
  const pSt=Object.fromEntries(STATUS.map(s=>[s.id,ordens.filter(o=>o.status===s.id).length]));
  const agora=new Date().toLocaleString("pt-BR");

  const badge=(label,color)=>`<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700;color:${color};background:${color}18;border:1px solid ${color}40">${label}</span>`;

  const rows=ordens.map((os,i)=>{
    const tp=gTipo(os.tipo),st=gSt(os.status);
    return `<tr style="background:${i%2===0?"#F8FAFB":"#FFFFFF"}">
      <td style="padding:7px 10px;border-left:3px solid ${tp.color||"#ccc"};font-family:monospace;font-weight:700;color:#0B1D3A;font-size:12px">#${os.numero}</td>
      <td style="padding:7px 10px;font-family:monospace;font-size:11px;color:#6B7280">${os.data}</td>
      <td style="padding:7px 10px;font-size:11px;font-weight:600;color:${tp.color||"#333"}">${tp.label||"—"}</td>
      <td style="padding:7px 10px;font-size:11px">${os.cliente||"—"}</td>
      <td style="padding:7px 10px;font-family:monospace;font-size:11px;font-weight:700;color:#0B1D3A">${os.equipamento||"—"}</td>
      <td style="padding:7px 10px;font-size:11px">${os.tecnico||"—"}</td>
      <td style="padding:7px 10px">${badge(st.label||"—",st.dot||"#888")}</td>
    </tr>`;
  }).join("");

  const statCard=(label,val,color)=>`
    <div style="flex:1;background:#fff;border-radius:12px;padding:16px 14px;border-top:4px solid ${color};box-shadow:0 2px 12px rgba(0,0,0,0.06)">
      <div style="font-size:28px;font-weight:800;color:${color};font-family:monospace;line-height:1">${val}</div>
      <div style="font-size:11px;color:#8A8F98;margin-top:4px;font-weight:600">${label}</div>
    </div>`;

  const html=`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <title>Relatório — Torres Elevadores</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Plus Jakarta Sans',Arial,sans-serif;background:#F2F4F7;color:#1A1D23;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{max-width:900px;margin:0 auto;background:#fff}
    .hdr{background:linear-gradient(135deg,#0B1D3A 0%,#152B55 100%);padding:28px 36px 22px;position:relative;overflow:hidden}
    .hdr::before{content:'';position:absolute;right:-40px;top:-40px;width:200px;height:200px;border-radius:50%;background:rgba(232,160,32,0.08)}
    .hdr::after{content:'';position:absolute;right:60px;bottom:-60px;width:140px;height:140px;border-radius:50%;background:rgba(232,160,32,0.05)}
    .hdr-brand{font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px}
    .hdr-brand span{color:#E8A020}
    .hdr-meta{color:rgba(255,255,255,0.55);font-size:11px;margin-top:5px;letter-spacing:0.3px}
    .hdr-badge{display:inline-block;background:rgba(232,160,32,0.15);border:1px solid rgba(232,160,32,0.3);color:#E8A020;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:1.5px;margin-top:10px}
    .per-box{position:absolute;right:36px;top:28px;text-align:right}
    .per-label{color:#E8A020;font-weight:700;font-size:13px}
    .per-emit{color:rgba(255,255,255,0.4);font-size:10px;margin-top:4px}
    .gold-bar{height:3px;background:linear-gradient(90deg,#E8A020,#F5C842,#E8A020)}
    .body{padding:28px 36px}
    .cards-row{display:flex;gap:12px;margin-bottom:28px}
    .section{margin-bottom:28px}
    .sec-title{font-size:11px;font-weight:700;color:#8A8F98;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:8px}
    .sec-title::after{content:'';flex:1;height:1px;background:#EAEDF0}
    .charts-2{display:flex;gap:16px}
    .chart-wrap{background:#FAFBFC;border-radius:12px;padding:14px;border:1px solid #EAEDF0}
    .chart-wrap img{width:100%;display:block;border-radius:8px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    thead tr{background:#0B1D3A}
    th{padding:8px 10px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.8px;color:rgba(255,255,255,0.75);text-transform:uppercase}
    tr:last-child td{border-bottom:none}
    .ftr{background:#F8FAFB;border-top:1px solid #EAEDF0;padding:12px 36px;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#ADB1B8}
    .ftr strong{color:#0B1D3A}
    @media print{body{background:#fff}.page{max-width:100%}@page{margin:8mm;size:A4}}
  </style></head><body>
  <div class="page">
    <div class="hdr">
      <div class="per-box"><div class="per-label">${per}</div><div class="per-emit">Emitido em ${agora}</div></div>
      <div class="hdr-brand">Torres <span>Elevadores</span></div>
      <div class="hdr-meta">CNPJ: ${EMPRESA.cnpj} &nbsp;·&nbsp; ${EMPRESA.email}</div>
      <div class="hdr-badge">RELATÓRIO DE SERVIÇOS</div>
    </div>
    <div class="gold-bar"></div>
    <div class="body">
      <div class="cards-row">
        ${statCard("Total de OS",ordens.length,"#0B1D3A")}
        ${statCard("Concluídas",pSt["concluida"]||0,"#22C48A")}
        ${statCard("Em Andamento",pSt["em_andamento"]||0,"#3B8BEB")}
        ${statCard("Abertas",pSt["aberta"]||0,"#E8A020")}
        ${statCard("Canceladas",pSt["cancelada"]||0,"#8A8F98")}
      </div>
      <div class="section">
        <div class="sec-title">Distribuição por Tipo de Serviço</div>
        <div class="chart-wrap"><img src="${i1}"/></div>
      </div>
      <div class="section">
        <div class="charts-2">
          <div style="flex:1"><div class="sec-title">Por Status</div><div class="chart-wrap"><img src="${i2}"/></div></div>
          <div style="flex:1"><div class="sec-title">Por Técnico</div><div class="chart-wrap"><img src="${i3}"/></div></div>
        </div>
      </div>
      <div class="section">
        <div class="sec-title">Listagem Detalhada &nbsp; <span style="font-size:10px;background:#0B1D3A;color:#fff;padding:2px 8px;border-radius:20px;font-weight:700;letter-spacing:0">${ordens.length} OS</span></div>
        <div style="border-radius:12px;overflow:hidden;border:1px solid #EAEDF0">
          <table><thead><tr>
            <th>OS#</th><th>Data</th><th>Tipo</th><th>Cliente</th><th>Equipamento</th><th>Técnico</th><th>Status</th>
          </tr></thead><tbody>${rows}</tbody></table>
        </div>
      </div>
    </div>
    <div class="ftr">
      <span><strong>${EMPRESA.nome}</strong> &nbsp;·&nbsp; CNPJ ${EMPRESA.cnpj} &nbsp;·&nbsp; ${EMPRESA.email}</span>
      <span>${agora}</span>
    </div>
  </div>
  <script>setTimeout(function(){window.print();},700);<\/script>
  </body></html>`;

  const blob=new Blob([html],{type:"text/html;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const win=window.open(url,"_blank");
  if(!win){const a=document.createElement("a");a.href=url;a.download="Torres_Relatorio.html";document.body.appendChild(a);a.click();document.body.removeChild(a);}
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}

// ─── CSS Global ──────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#0E1117;color:#E2E6EE;min-height:100vh}
:root{
  --bg:       #0E1117;
  --bg2:      #161B26;
  --bg3:      #1E2535;
  --border:   #252D3D;
  --border2:  #2E3A50;
  --text:     #E2E6EE;
  --muted:    #7A8499;
  --gold:     #E8A020;
  --gold2:    #F5C842;
  --navy:     #0B1D3A;
  --blue:     #3B8BEB;
  --green:    #22C48A;
  --red:      #E8534A;
  --mono:     'JetBrains Mono',monospace;
}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px}
select option{background:#1E2535}
input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.5);cursor:pointer}
textarea{resize:vertical}
input::placeholder,textarea::placeholder{color:var(--muted)}
button{font-family:'Plus Jakarta Sans',system-ui,sans-serif}
`;

// ─── Atoms ───────────────────────────────────────────────────────────────────
const field = {
  width:"100%", background:"var(--bg3)", border:"1.5px solid var(--border2)",
  borderRadius:10, color:"var(--text)", padding:"12px 14px", fontSize:14,
  fontFamily:"inherit", outline:"none", WebkitAppearance:"none", transition:"border-color .15s",
};
const label = {
  display:"block", fontSize:10, color:"var(--muted)", fontWeight:700,
  letterSpacing:2, textTransform:"uppercase", marginBottom:7,
};

function Pill({ label, color, size=10 }) {
  return <span style={{ display:"inline-flex",alignItems:"center",gap:5,fontSize:size,fontWeight:700,color,background:color+"18",border:`1px solid ${color}30`,padding:"2px 9px",borderRadius:20,lineHeight:1.6 }}><span style={{ width:5,height:5,borderRadius:"50%",background:color,display:"inline-block" }}/>{label}</span>;
}

function Card({ children, style={} }) {
  return <div style={{ background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,...style }}>{children}</div>;
}

function Divider() { return <div style={{ height:1,background:"var(--border)",margin:"0" }}/>; }

// ─── Top Bar ─────────────────────────────────────────────────────────────────
function TopBar({ title, subtitle, onBack, onPDF }) {
  return (
    <div style={{ position:"sticky",top:0,zIndex:50,background:"var(--bg)",borderBottom:"1px solid var(--border)",padding:"0 16px" }}>
      <div style={{ display:"flex",alignItems:"center",gap:12,height:58 }}>
        {onBack
          ? <button onClick={onBack} style={{ background:"var(--bg3)",border:"1.5px solid var(--border2)",color:"var(--muted)",borderRadius:10,width:36,height:36,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s" }}>←</button>
          : <div style={{ flexShrink:0,paddingRight:8,borderRight:"1.5px solid var(--border)",marginRight:4 }}>
              <div style={{ fontSize:8,color:"var(--gold)",letterSpacing:3.5,fontWeight:700,fontFamily:"var(--mono)",marginBottom:1 }}>TORRES</div>
              <div style={{ fontSize:14,fontWeight:800,color:"var(--text)",lineHeight:1,letterSpacing:-0.3 }}>Elevadores</div>
            </div>
        }
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:16,fontWeight:700,color:"var(--text)",lineHeight:1.2 }}>{title}</div>
          {subtitle && <div style={{ fontSize:11,color:"var(--muted)",marginTop:2,fontFamily:"var(--mono)" }}>{subtitle}</div>}
        </div>
        {onPDF && (
          <button onClick={onPDF} style={{ display:"flex",alignItems:"center",gap:6,background:"var(--gold)15",border:"1.5px solid var(--gold)35",color:"var(--gold)",borderRadius:10,padding:"7px 13px",cursor:"pointer",fontSize:12,fontWeight:700,flexShrink:0,letterSpacing:.3 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Relatório
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Bottom Nav ──────────────────────────────────────────────────────────────
function BottomNav({ view, setView, onNova }) {
  return (
    <nav style={{ position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:"var(--bg2)",borderTop:"1px solid var(--border)",display:"flex",alignItems:"center",height:64,maxWidth:480,margin:"0 auto",left:"50%",transform:"translateX(-50%)",width:"100%" }}>
      {[
        { id:"dashboard", label:"Início",    icon:<DashIcon/> },
        { id:"_nova",     label:"Nova OS",   special:true      },
        { id:"lista",     label:"Listagem",  icon:<ListIcon/>  },
      ].map(item=>{
        if(item.special) return (
          <button key="_nova" onClick={onNova} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:1,border:"none",background:"transparent",cursor:"pointer",padding:"8px 0",position:"relative" }}>
            <div style={{ width:44,height:44,borderRadius:14,background:"linear-gradient(135deg,var(--gold),var(--gold2))",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px var(--gold)40",marginTop:-10 }}>
              <span style={{ fontSize:22,color:"var(--navy)",fontWeight:900,lineHeight:1,marginTop:-1 }}>+</span>
            </div>
            <span style={{ fontSize:10,color:"var(--gold)",fontWeight:700,letterSpacing:.3,marginTop:1 }}>Nova OS</span>
          </button>
        );
        const active=view===item.id;
        return (
          <button key={item.id} onClick={()=>setView(item.id)} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,border:"none",background:"transparent",cursor:"pointer",padding:"10px 0",color:active?"var(--gold)":"var(--muted)",transition:"color .15s" }}>
            <div style={{ opacity:active?1:.6 }}>{item.icon}</div>
            <span style={{ fontSize:10,fontWeight:active?700:600,letterSpacing:.3 }}>{item.label}</span>
            {active && <div style={{ width:18,height:2.5,background:"var(--gold)",borderRadius:2,position:"absolute",bottom:6 }}/>}
          </button>
        );
      })}
    </nav>
  );
}

function DashIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>; }
function ListIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>; }

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ val, lbl, color, icon }) {
  return (
    <div style={{ background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"14px 16px",flex:1,minWidth:0,position:"relative",overflow:"hidden" }}>
      <div style={{ position:"absolute",top:-8,right:-8,fontSize:32,opacity:.07 }}>{icon}</div>
      <div style={{ fontSize:26,fontWeight:800,color,fontFamily:"var(--mono)",lineHeight:1,letterSpacing:-1 }}>{val}</div>
      <div style={{ fontSize:11,color:"var(--muted)",marginTop:5,fontWeight:600,lineHeight:1.2 }}>{lbl}</div>
    </div>
  );
}

// ─── OS Card ─────────────────────────────────────────────────────────────────
function OSCard({ os, onTap, onEdit, onDelete }) {
  const tp=gTipo(os.tipo), st=gSt(os.status);
  return (
    <Card style={{ marginBottom:10,cursor:"pointer",overflow:"hidden",transition:"border-color .15s" }}
      onMouseEnter={e=>e.currentTarget.style.borderColor="var(--border2)"}
      onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}
      onClick={()=>onTap(os)}>
      {/* cor topo */}
      <div style={{ height:2,background:`linear-gradient(90deg,${tp.color||"var(--border)"},transparent)` }}/>
      <div style={{ padding:"12px 14px",display:"flex",alignItems:"flex-start",gap:12 }}>
        {/* avatar tipo */}
        <div style={{ width:40,height:40,borderRadius:11,background:tp.bg||"var(--bg3)",border:`1.5px solid ${tp.color||"var(--border)"}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0 }}>{tp.icon}</div>
        <div style={{ flex:1,minWidth:0 }}>
          {/* linha 1 */}
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap" }}>
            <span style={{ fontFamily:"var(--mono)",fontSize:12,color:"var(--gold)",fontWeight:600,letterSpacing:.5 }}>#{os.numero}</span>
            <Pill label={st.label||"?"} color={st.dot||"#888"} size={9}/>
            {os.fotos?.length>0 && <span style={{ fontSize:9,color:"var(--muted)",background:"var(--bg3)",padding:"1px 6px",borderRadius:8,border:"1px solid var(--border)" }}>📷 {os.fotos.length}</span>}
          </div>
          {/* condomínio / cliente */}
          <div style={{ fontSize:14,fontWeight:700,color:"var(--text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.2,marginBottom:5 }}>{os.condominio||os.cliente}</div>
          {/* chip equipamento */}
          {os.equipamento && <div style={{ display:"inline-flex",alignItems:"center",gap:5,background:"var(--gold)12",border:"1px solid var(--gold)25",borderRadius:7,padding:"3px 9px",marginBottom:5 }}>
            <span style={{ fontSize:9,color:"var(--gold)" }}>▣</span>
            <span style={{ fontSize:11,color:"var(--gold)",fontFamily:"var(--mono)",fontWeight:600,letterSpacing:.3 }}>{os.equipamento}</span>
          </div>}
          {/* OS OEM */}
          {os.tipo==="troca_pecas"&&os.numeros_os?.length>0 && <div style={{ display:"flex",gap:4,flexWrap:"wrap",marginBottom:5 }}>
            {os.numeros_os.map((n,i)=><span key={i} style={{ fontSize:9,background:"#E8A02015",border:"1px solid #E8A02030",color:"#E8A020",borderRadius:5,padding:"1px 7px",fontFamily:"var(--mono)" }}>OS {n}</span>)}
          </div>}
          {/* meta */}
          <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
            <span style={{ fontSize:11,color:tp.color||"var(--muted)",fontWeight:600 }}>{tp.short||tp.label}</span>
            <span style={{ color:"var(--border2)" }}>·</span>
            <span style={{ fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)" }}>{os.data}</span>
            <span style={{ color:"var(--border2)" }}>·</span>
            <span style={{ fontSize:11,color:"var(--muted)" }}>{os.tecnico}</span>
          </div>
        </div>
        {/* ações */}
        <div style={{ display:"flex",flexDirection:"column",gap:6,flexShrink:0 }} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>onEdit(os)} style={{ background:"var(--bg3)",border:"1.5px solid var(--border2)",color:"var(--gold)",borderRadius:9,width:34,height:34,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center" }}>✏️</button>
          <button onClick={()=>onDelete(os.id)} style={{ background:"var(--red)0A",border:"1.5px solid var(--red)25",color:"var(--red)",borderRadius:9,width:34,height:34,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center" }}>🗑</button>
        </div>
      </div>
    </Card>
  );
}

// ─── Multi OS Input ──────────────────────────────────────────────────────────
function MultiOSInput({ value=[], onChange }) {
  const [draft,setDraft]=useState("");
  const add=()=>{const t=draft.trim();if(!t||value.includes(t))return;onChange([...value,t]);setDraft("");};
  return (
    <div>
      <div style={{ display:"flex",gap:8,marginBottom:8 }}>
        <input placeholder="Número da OS da OEM..." value={draft} onChange={e=>setDraft(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add();}}}
          style={{ ...field,flex:1,padding:"10px 13px",fontSize:13,fontFamily:"var(--mono)" }}/>
        <button onClick={add} style={{ padding:"10px 14px",background:"#E8A02020",border:"1.5px solid #E8A02040",borderRadius:10,color:"var(--gold)",fontWeight:800,fontSize:18,cursor:"pointer",lineHeight:1 }}>+</button>
      </div>
      {value.length>0 && <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
        {value.map((n,i)=><span key={i} style={{ display:"inline-flex",alignItems:"center",gap:6,background:"#E8A02015",border:"1px solid #E8A02035",borderRadius:8,padding:"5px 11px",fontSize:12,color:"var(--gold)",fontFamily:"var(--mono)",fontWeight:600 }}>
          OS {n}
          <button onClick={()=>onChange(value.filter((_,x)=>x!==i))} style={{ background:"none",border:"none",color:"#E8A02060",cursor:"pointer",fontSize:14,lineHeight:1,padding:0 }}>×</button>
        </span>)}
      </div>}
    </div>
  );
}

// ─── Photo Picker ────────────────────────────────────────────────────────────
function PhotoPicker({ fotos=[], onChange }) {
  const ref=useRef();
  const handle=e=>{
    Array.from(e.target.files).forEach(f=>{const r=new FileReader();r.onload=ev=>onChange(p=>[...p,{id:gId(),dataUrl:ev.target.result,name:f.name}]);r.readAsDataURL(f);});
    e.target.value="";
  };
  return (
    <div>
      <input ref={ref} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handle}/>
      <button onClick={()=>ref.current.click()} style={{ width:"100%",padding:"13px",background:"var(--bg3)",border:"1.5px dashed var(--border2)",borderRadius:11,color:"var(--muted)",fontWeight:600,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"border-color .15s" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        Adicionar Fotos
      </button>
      {fotos.length>0 && <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:10 }}>
        {fotos.map(f=><div key={f.id} style={{ position:"relative",borderRadius:10,overflow:"hidden",aspectRatio:"1",border:"1.5px solid var(--border)" }}>
          <img src={f.dataUrl} alt={f.name} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
          <button onClick={()=>onChange(p=>p.filter(x=>x.id!==f.id))} style={{ position:"absolute",top:4,right:4,width:22,height:22,borderRadius:"50%",background:"rgba(14,17,23,.85)",border:"none",color:"var(--red)",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>×</button>
        </div>)}
      </div>}
    </div>
  );
}

// ─── Photo Viewer ────────────────────────────────────────────────────────────
function PhotoViewer({ fotos=[] }) {
  const [lb,setLb]=useState(null);
  if(!fotos?.length) return null;
  return (<>
    <Card style={{ padding:"14px 16px",marginBottom:10 }}>
      <div style={{ fontSize:10,color:"var(--muted)",fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:10 }}>Fotos · {fotos.length}</div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
        {fotos.map(f=><div key={f.id} onClick={()=>setLb(f)} style={{ borderRadius:9,overflow:"hidden",aspectRatio:"1",border:"1.5px solid var(--border)",cursor:"pointer" }}>
          <img src={f.dataUrl} alt={f.name} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
        </div>)}
      </div>
    </Card>
    {lb && <div onClick={()=>setLb(null)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <img src={lb.dataUrl} alt={lb.name} style={{ maxWidth:"100%",maxHeight:"90vh",borderRadius:12,objectFit:"contain",boxShadow:"0 24px 64px rgba(0,0,0,.6)" }}/>
    </div>}
  </>);
}

// ─── Modal PDF ────────────────────────────────────────────────────────────────
function ModalPDF({ ordens, onClose }) {
  const [inicio,setInicio]=useState("");
  const [fim,setFim]=useState("");
  const [loading,setLoading]=useState(false);

  const filtradas=useMemo(()=>ordens.filter(o=>{
    if(inicio&&o.data<inicio)return false;
    if(fim&&o.data>fim)return false;
    return true;
  }),[ordens,inicio,fim]);

  const handle=()=>{
    if(!filtradas.length)return;
    setLoading(true);
    setTimeout(()=>{try{gerarPDF(filtradas,{inicio,fim});}finally{setLoading(false);}},120);
  };

  const pTipo=TIPOS_OS.map(t=>({...t,c:filtradas.filter(o=>o.tipo===t.id).length}));

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center" }} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{ background:"var(--bg2)",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,maxHeight:"88vh",overflowY:"auto",border:"1px solid var(--border)",borderBottom:"none" }}>
        {/* handle */}
        <div style={{ display:"flex",justifyContent:"center",padding:"10px 0 2px" }}>
          <div style={{ width:36,height:4,background:"var(--border2)",borderRadius:2 }}/>
        </div>
        <div style={{ padding:"12px 20px 32px" }}>
          {/* header */}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22 }}>
            <div>
              <div style={{ fontSize:18,fontWeight:800,color:"var(--text)",lineHeight:1.2 }}>Gerar Relatório</div>
              <div style={{ fontSize:12,color:"var(--muted)",marginTop:3 }}>Selecione o período e baixe em PDF</div>
            </div>
            <button onClick={onClose} style={{ background:"var(--bg3)",border:"1.5px solid var(--border2)",color:"var(--muted)",borderRadius:9,width:32,height:32,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
          </div>

          {/* datas */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18 }}>
            <div><label style={label}>Data Inicial</label><input type="date" value={inicio} onChange={e=>setInicio(e.target.value)} style={{ ...field,fontFamily:"var(--mono)",fontSize:13 }}/></div>
            <div><label style={label}>Data Final</label><input type="date" value={fim} onChange={e=>setFim(e.target.value)} style={{ ...field,fontFamily:"var(--mono)",fontSize:13 }}/></div>
          </div>

          {/* preview */}
          <Card style={{ padding:14,marginBottom:16 }}>
            <div style={{ fontSize:10,color:"var(--muted)",fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:12 }}>Preview — {filtradas.length} OS no período</div>
            {pTipo.map(t=>(
              <div key={t.id} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                <span style={{ fontSize:15 }}>{t.icon}</span>
                <div style={{ flex:1,background:"var(--bg3)",borderRadius:6,height:6,overflow:"hidden" }}>
                  <div style={{ width:`${filtradas.length?Math.round((t.c/filtradas.length)*100):0}%`,background:t.color,height:"100%",borderRadius:6,transition:"width .4s" }}/>
                </div>
                <span style={{ fontSize:11,color:t.color,fontFamily:"var(--mono)",fontWeight:700,minWidth:20,textAlign:"right" }}>{t.c}</span>
                <span style={{ fontSize:10,color:"var(--muted)",minWidth:80 }}>{t.short}</span>
              </div>
            ))}
          </Card>

          {/* info */}
          <div style={{ background:"var(--gold)08",border:"1px solid var(--gold)20",borderRadius:10,padding:"10px 14px",marginBottom:18,fontSize:12,color:"#C8882A",lineHeight:1.6 }}>
            💡 Uma nova aba abrirá com o relatório formatado. Use <strong>Imprimir → Salvar como PDF</strong> para salvar o arquivo.
          </div>

          <button onClick={handle} disabled={!filtradas.length||loading}
            style={{ width:"100%",padding:"15px",background:filtradas.length&&!loading?"linear-gradient(135deg,var(--gold),var(--gold2))":"var(--bg3)",color:filtradas.length&&!loading?"var(--navy)":"var(--muted)",border:"none",borderRadius:12,fontWeight:800,fontSize:15,cursor:filtradas.length&&!loading?"pointer":"not-allowed",transition:"all .2s",letterSpacing:.3 }}>
            {loading?"Gerando...":filtradas.length?`Gerar Relatório PDF — ${filtradas.length} OS`:"Nenhuma OS no período"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [ordens, setOrdens] = useState([]);
  useEffect(() => {
  supabase.from('ordens_servico')
    .select('*').order('created_at', { ascending: false })
    .then(({ data }) => { if (data) setOrdens(data) })
}, []);
  const [view,setView]           = useState("dashboard");
  const [editing,setEditing]     = useState(null);
  const [detId,setDetId]         = useState(null);
  const [form,setForm]           = useState(INIT);
  const [filtros,setFiltros]     = useState({tipo:"",status:"",cliente:"",data:""});
  const [busca,setBusca]         = useState("");
  const [showFilt,setShowFilt]   = useState(false);
  const [showPDF,setShowPDF]     = useState(false);

  const F = p=>setForm(f=>({...f,...p}));
  const hoje=new Date().toISOString().split("T")[0];

  const stats=useMemo(()=>({
    total:ordens.length,
    hoje:ordens.filter(o=>o.data===hoje).length,
    abertas:ordens.filter(o=>o.status==="aberta").length,
    andamento:ordens.filter(o=>o.status==="em_andamento").length,
    concluidas:ordens.filter(o=>o.status==="concluida").length,
  }),[ordens]);

  const filtradas=useMemo(()=>ordens.filter(o=>{
    if(filtros.tipo    &&o.tipo!==filtros.tipo)      return false;
    if(filtros.status  &&o.status!==filtros.status)  return false;
    if(filtros.cliente &&o.cliente!==filtros.cliente)return false;
    if(filtros.data    &&o.data!==filtros.data)      return false;
    if(busca&&![o.numero,o.condominio,o.equipamento,o.cliente].some(v=>v?.toLowerCase().includes(busca.toLowerCase()))) return false;
    return true;
  }),[ordens,filtros,busca]);

  const temFiltro=Object.values(filtros).some(Boolean)||!!busca;
  const novaOS=()=>{setForm({...INIT,numero:gNum(ordens),data:hoje});setEditing(null);setView("form");};
  const editOS=os=>{setForm({...os});setEditing(os.id);setView("form");};
  
const salvar = async () => {
  if (!ok) return
  if (editing) {
    await supabase.from('ordens_servico').update(form).eq('id', editing)
    setOrdens(p => p.map(o => o.id === editing ? { ...form, id: editing } : o))
  } else {
    const nova = { ...form, id: crypto.randomUUID() }
    await supabase.from('ordens_servico').insert(nova)
    setOrdens(p => [nova, ...p])
  }
  setView('lista'); setEditing(null)
}
 const excluir = async (id) => {
  if (!window.confirm('Excluir esta OS?')) return
  await supabase.from('ordens_servico').delete().eq('id', id)
  setOrdens(p => p.filter(o => o.id !== id))
  //if (detalheId === id) setView('lista')
}
  const verDet=os=>{setDetId(os.id);setView("detalhe");};
  const det=ordens.find(o=>o.id===detId);
  const ok=form.cliente&&form.tipo&&form.equipamento&&form.tecnico;

  // ── FORM FIELD component
  const Field=({lbl:l,children,gold})=>(
    <div style={{ marginBottom:14,...(gold?{background:"var(--gold)07",border:"1px solid var(--gold)20",borderRadius:12,padding:"12px 14px"}:{}) }}>
      <label style={{ ...label,...(gold?{color:"var(--gold)"}:{}) }}>{l}</label>
      {children}
    </div>
  );

  return (<>
    <style>{GLOBAL_CSS}</style>
    <div style={{ background:"var(--bg)",minHeight:"100vh",maxWidth:480,margin:"0 auto",position:"relative" }}>

      {/* ══ DASHBOARD ══ */}
      {view==="dashboard" && <div style={{ paddingBottom:80 }}>
        <TopBar title="Dashboard" onPDF={()=>setShowPDF(true)}/>
        <div style={{ padding:"20px 16px 0" }}>

          {/* boas-vindas */}
          <div style={{ background:"linear-gradient(135deg,var(--bg2) 0%,#1A2540 100%)",border:"1px solid var(--border)",borderRadius:16,padding:"18px 20px",marginBottom:20,position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",right:-16,top:-16,width:100,height:100,borderRadius:"50%",background:"var(--gold)08" }}/>
            <div style={{ fontSize:10,color:"var(--gold)",fontWeight:700,letterSpacing:2.5,textTransform:"uppercase",marginBottom:6 }}>Torres Elevadores</div>
            <div style={{ fontSize:20,fontWeight:800,color:"var(--text)",lineHeight:1.2,letterSpacing:-0.5 }}>Ordens de Serviço</div>
            <div style={{ fontSize:12,color:"var(--muted)",marginTop:6 }}>Sistema de gestão de campo</div>
          </div>

          {/* stats linha 1 */}
          <div style={{ display:"flex",gap:10,marginBottom:10 }}>
            <StatCard val={stats.total}  lbl="Total de OS"  color="var(--text)" icon="📋"/>
            <StatCard val={stats.hoje}   lbl="Hoje"         color="var(--gold)" icon="📅"/>
          </div>
          <div style={{ display:"flex",gap:10,marginBottom:22 }}>
            <StatCard val={stats.abertas}    lbl="Abertas"    color="#E8A020" icon="🔓"/>
            <StatCard val={stats.andamento}  lbl="Andamento"  color="#3B8BEB" icon="⚡"/>
            <StatCard val={stats.concluidas} lbl="Concluídas" color="#22C48A" icon="✅"/>
          </div>

          {/* por tipo */}
          <div style={{ fontSize:10,color:"var(--muted)",fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:10 }}>Tipos de Serviço</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24 }}>
            {TIPOS_OS.map(t=>{
              const c=ordens.filter(o=>o.tipo===t.id).length;
              return <Card key={t.id} style={{ padding:"14px 16px",display:"flex",alignItems:"center",gap:12 }}>
                <div style={{ width:38,height:38,borderRadius:10,background:t.bg,border:`1.5px solid ${t.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>{t.icon}</div>
                <div>
                  <div style={{ fontSize:22,fontWeight:800,color:t.color,fontFamily:"var(--mono)",lineHeight:1 }}>{c}</div>
                  <div style={{ fontSize:10,color:"var(--muted)",fontWeight:600,marginTop:3,lineHeight:1.2 }}>{t.short}</div>
                </div>
              </Card>;
            })}
          </div>

          {/* recentes */}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
            <div style={{ fontSize:10,color:"var(--muted)",fontWeight:700,letterSpacing:2,textTransform:"uppercase" }}>Recentes</div>
            {ordens.length>0 && <button onClick={()=>setView("lista")} style={{ background:"none",border:"none",color:"var(--gold)",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4 }}>Ver todas <span style={{ fontSize:14 }}>→</span></button>}
          </div>

          {ordens.length===0
            ? <Card style={{ padding:36,textAlign:"center" }}>
                <div style={{ fontSize:36,marginBottom:10 }}>🛗</div>
                <div style={{ color:"var(--muted)",fontSize:14,fontWeight:600,marginBottom:4 }}>Nenhuma OS cadastrada</div>
                <div style={{ color:"var(--muted)",fontSize:12,opacity:.6,marginBottom:16 }}>Comece registrando sua primeira ordem de serviço</div>
                <button onClick={novaOS} style={{ padding:"11px 22px",background:"linear-gradient(135deg,var(--gold),var(--gold2))",color:"var(--navy)",border:"none",borderRadius:10,fontWeight:800,fontSize:13,cursor:"pointer" }}>+ Nova OS</button>
              </Card>
            : ordens.slice(0,4).map(os=><OSCard key={os.id} os={os} onTap={verDet} onEdit={editOS} onDelete={excluir}/>)
          }
        </div>
      </div>}

      {/* ══ LISTA ══ */}
      {view==="lista" && <div style={{ paddingBottom:80 }}>
        <TopBar title="Ordens de Serviço" subtitle={`${filtradas.length} registro${filtradas.length!==1?"s":""}`} onPDF={()=>setShowPDF(true)}/>
        <div style={{ padding:"14px 16px 0" }}>
          {/* busca */}
          <div style={{ position:"relative",marginBottom:10 }}>
            <svg style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--muted)" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Buscar por OS, condomínio, equipamento..." value={busca} onChange={e=>setBusca(e.target.value)} style={{ ...field,paddingLeft:36,fontSize:13 }}/>
          </div>
          {/* filtro toggle */}
          <div style={{ display:"flex",gap:8,marginBottom:14 }}>
            <button onClick={()=>setShowFilt(f=>!f)} style={{ flex:1,padding:"10px 14px",background:showFilt?"var(--gold)15":"var(--bg3)",border:`1.5px solid ${showFilt?"var(--gold)40":"var(--border2)"}`,borderRadius:10,color:showFilt?"var(--gold)":"var(--muted)",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,letterSpacing:.3 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              Filtros {temFiltro && <span style={{ width:6,height:6,borderRadius:"50%",background:"var(--gold)",display:"inline-block" }}/>}
            </button>
            {temFiltro && <button onClick={()=>{setFiltros({tipo:"",status:"",cliente:"",data:""});setBusca("");}} style={{ padding:"10px 14px",background:"var(--red)0A",border:"1.5px solid var(--red)25",borderRadius:10,color:"var(--red)",fontWeight:700,fontSize:12,cursor:"pointer" }}>Limpar</button>}
          </div>
          {showFilt && <Card style={{ padding:14,marginBottom:14,display:"flex",flexDirection:"column",gap:10 }}>
            {[
              {k:"tipo",    opts:TIPOS_OS.map(t=>({v:t.id,l:`${t.icon} ${t.label}`})), ph:"Todos os tipos"    },
              {k:"status",  opts:STATUS.map(s=>({v:s.id,l:s.label})),                  ph:"Todos os status"  },
              {k:"cliente", opts:CLIENTES.map(c=>({v:c,l:c})),                         ph:"Todos os clientes"},
            ].map(({k,opts,ph})=>(
              <select key={k} value={filtros[k]} onChange={e=>setFiltros(f=>({...f,[k]:e.target.value}))} style={field}>
                <option value="">{ph}</option>{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            ))}
            <input type="date" value={filtros.data} onChange={e=>setFiltros(f=>({...f,data:e.target.value}))} style={{ ...field,fontFamily:"var(--mono)" }}/>
          </Card>}

          {filtradas.length===0
            ? <Card style={{ padding:40,textAlign:"center" }}><div style={{ fontSize:28,marginBottom:8 }}>🔍</div><div style={{ color:"var(--muted)",fontSize:13 }}>{ordens.length===0?"Nenhuma OS cadastrada.":"Nenhuma OS encontrada."}</div></Card>
            : filtradas.map(os=><OSCard key={os.id} os={os} onTap={verDet} onEdit={editOS} onDelete={excluir}/>)
          }
        </div>
      </div>}

      {/* ══ FORMULÁRIO ══ */}
      {view==="form" && <div style={{ paddingBottom:40 }}>
        <TopBar title={editing?"Editar OS":"Nova OS"} subtitle={`OS #${form.numero}`} onBack={()=>setView(editing?"detalhe":"lista")}/>
        <div style={{ padding:"18px 16px" }}>

          {/* tipo */}
          <div style={{ marginBottom:18 }}>
            <label style={label}>Tipo de Serviço *</label>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
              {TIPOS_OS.map(t=>(
                <button key={t.id} onClick={()=>F({tipo:t.id})} style={{ display:"flex",alignItems:"center",gap:9,padding:"13px 13px",border:`2px solid ${form.tipo===t.id?t.color:"var(--border2)"}`,background:form.tipo===t.id?t.bg:"var(--bg3)",borderRadius:11,cursor:"pointer",color:form.tipo===t.id?t.color:"var(--muted)",fontWeight:700,fontSize:12,textAlign:"left",transition:"all .15s",fontFamily:"inherit" }}>
                  <span style={{ fontSize:20,flexShrink:0 }}>{t.icon}</span>
                  <span style={{ lineHeight:1.25 }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {form.tipo==="troca_pecas" && <div style={{ marginBottom:18,background:"var(--gold)08",border:"1px solid var(--gold)25",borderRadius:12,padding:"14px" }}>
            <label style={{ ...label,color:"var(--gold)" }}>Números de OS da OEM ⚙️</label>
            <MultiOSInput value={form.numeros_os} onChange={v=>F({numeros_os:v})}/>
            <div style={{ fontSize:10,color:"var(--muted)",marginTop:8 }}>Pressione Enter ou + para adicionar múltiplas OS ao mesmo equipamento.</div>
          </div>}

          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
            <div><label style={label}>Data *</label><input type="date" value={form.data} onChange={e=>F({data:e.target.value})} style={{ ...field,fontFamily:"var(--mono)",fontSize:13 }}/></div>
            <div><label style={label}>Status</label>
              <select value={form.status} onChange={e=>F({status:e.target.value})} style={field}>
                {STATUS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={label}>Cliente / OEM *</label>
            <select value={form.cliente} onChange={e=>F({cliente:e.target.value})} style={field}>
              <option value="">Selecione o cliente...</option>
              {CLIENTES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={label}>Técnico Responsável *</label>
            <select value={form.tecnico} onChange={e=>F({tecnico:e.target.value})} style={field}>
              <option value="">Selecione o técnico...</option>
              {TECNICOS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={label}>Condomínio</label>
            <input placeholder="Nome do condomínio" value={form.condominio} onChange={e=>F({condominio:e.target.value})} style={field}/>
          </div>

          {/* equipamento destaque */}
          <div style={{ marginBottom:14,background:"var(--gold)07",border:"1.5px solid var(--gold)25",borderRadius:12,padding:"13px 14px" }}>
            <label style={{ ...label,color:"var(--gold)" }}>▣ Número do Equipamento *</label>
            <input placeholder="Nº ou identificação do equipamento" value={form.equipamento} onChange={e=>F({equipamento:e.target.value})} style={{ ...field,borderColor:"var(--gold)35",background:"var(--bg3)",fontFamily:"var(--mono)",fontSize:15,fontWeight:600,color:"var(--gold)" }}/>
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={label}>Descrição do Serviço</label>
            <textarea placeholder="Descreva detalhadamente o serviço realizado..." value={form.descricao} onChange={e=>F({descricao:e.target.value})} rows={3} style={{ ...field,lineHeight:1.6 }}/>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={label}>Peças Utilizadas</label>
            <textarea placeholder="Liste as peças, referências e quantidades..." value={form.pecas} onChange={e=>F({pecas:e.target.value})} rows={2} style={{ ...field,lineHeight:1.6 }}/>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={label}>Observações</label>
            <textarea placeholder="Informações adicionais, pendências, alertas..." value={form.obs} onChange={e=>F({obs:e.target.value})} rows={2} style={{ ...field,lineHeight:1.6 }}/>
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={label}>Fotos / Evidências</label>
            <PhotoPicker fotos={form.fotos} onChange={upd=>setForm(f=>({...f,fotos:typeof upd==="function"?upd(f.fotos):upd}))}/>
          </div>

          <button onClick={salvar} disabled={!ok} style={{ width:"100%",padding:"16px",background:ok?"linear-gradient(135deg,var(--gold),var(--gold2))":"var(--bg3)",color:ok?"var(--navy)":"var(--muted)",border:"none",borderRadius:13,fontWeight:800,fontSize:15,cursor:ok?"pointer":"not-allowed",letterSpacing:.3,transition:"all .2s" }}>
            {editing?"💾 Salvar Alterações":"✅ Cadastrar OS"}
          </button>
        </div>
      </div>}

      {/* ══ DETALHE ══ */}
      {view==="detalhe" && det && (()=>{
        const os=det, tp=gTipo(os.tipo), st=gSt(os.status);
        return <div style={{ paddingBottom:80 }}>
          <TopBar title={`OS #${os.numero}`} subtitle={os.condominio||os.cliente} onBack={()=>setView("lista")}/>
          <div style={{ padding:"0 16px 20px" }}>
            {/* banner tipo */}
            <div style={{ background:`linear-gradient(135deg,${tp.bg||"var(--bg2)"} 0%,var(--bg2) 100%)`,border:`1.5px solid ${tp.color||"var(--border)"}30`,borderRadius:16,padding:"18px 20px",marginTop:16,marginBottom:14,display:"flex",alignItems:"center",gap:16 }}>
              <div style={{ width:52,height:52,borderRadius:14,background:tp.bg,border:`2px solid ${tp.color||"var(--border)"}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0 }}>{tp.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16,fontWeight:800,color:tp.color||"var(--text)",lineHeight:1.2,marginBottom:6 }}>{tp.label}</div>
                <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
                  <Pill label={st.label||"?"} color={st.dot||"#888"} size={10}/>
                  <span style={{ fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)" }}>{os.data}</span>
                </div>
              </div>
            </div>

            {/* equipamento destaque */}
            <div style={{ background:"var(--gold)12",border:"2px solid var(--gold)35",borderRadius:14,padding:"14px 18px",marginBottom:14,display:"flex",alignItems:"center",gap:14 }}>
              <div style={{ fontSize:28 }}>▣</div>
              <div>
                <div style={{ fontSize:9,color:"var(--gold)80",fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:3 }}>Equipamento</div>
                <div style={{ fontSize:22,fontWeight:800,color:"var(--gold)",fontFamily:"var(--mono)",letterSpacing:.5 }}>{os.equipamento}</div>
              </div>
            </div>

            {/* OS OEM */}
            {os.tipo==="troca_pecas"&&os.numeros_os?.length>0 && <Card style={{ padding:"14px 16px",marginBottom:14 }}>
              <div style={{ fontSize:9,color:"#E8A02080",fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:10 }}>OS da OEM ⚙️</div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                {os.numeros_os.map((n,i)=><span key={i} style={{ fontSize:14,background:"#E8A02015",border:"1.5px solid #E8A02035",color:"var(--gold)",borderRadius:9,padding:"7px 14px",fontFamily:"var(--mono)",fontWeight:700 }}>OS {n}</span>)}
              </div>
            </Card>}

            {/* infos */}
            <Card style={{ marginBottom:14,overflow:"hidden" }}>
              {[{l:"Cliente / OEM",v:os.cliente},{l:"Técnico",v:os.tecnico},{l:"Condomínio",v:os.condominio||"—"}].map(({l,v},i,a)=>(
                <div key={l}>
                  <div style={{ padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10 }}>
                    <span style={{ fontSize:10,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:1,flexShrink:0 }}>{l}</span>
                    <span style={{ fontSize:14,fontWeight:600,textAlign:"right",color:"var(--text)" }}>{v}</span>
                  </div>
                  {i<a.length-1&&<Divider/>}
                </div>
              ))}
            </Card>

            {/* textos */}
            {[{l:"Descrição do Serviço",v:os.descricao},{l:"Peças Utilizadas",v:os.pecas,m:true},{l:"Observações",v:os.obs}].filter(x=>x.v).map(({l,v,m})=>(
              <Card key={l} style={{ padding:"14px 16px",marginBottom:10 }}>
                <div style={{ fontSize:9,color:"var(--muted)",fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:8 }}>{l}</div>
                <p style={{ fontSize:13,color:m?"var(--text)":"#B0B8CC",lineHeight:1.75,fontFamily:m?"var(--mono)":"inherit" }}>{v}</p>
              </Card>
            ))}

            <PhotoViewer fotos={os.fotos}/>

            {/* ações */}
            <div style={{ display:"flex",gap:10,marginTop:8 }}>
              <button onClick={()=>editOS(os)} style={{ flex:1,padding:"14px",background:"var(--gold)18",color:"var(--gold)",border:"1.5px solid var(--gold)35",borderRadius:12,fontWeight:800,fontSize:14,cursor:"pointer" }}>✏️ Editar</button>
              <button onClick={()=>excluir(os.id)} style={{ padding:"14px 18px",background:"var(--red)0A",color:"var(--red)",border:"1.5px solid var(--red)25",borderRadius:12,fontWeight:800,fontSize:14,cursor:"pointer" }}>🗑</button>
            </div>
          </div>
        </div>;
      })()}

      {view!=="form" && <BottomNav view={view} setView={setView} onNova={novaOS}/>}
      {showPDF && <ModalPDF ordens={ordens} onClose={()=>setShowPDF(false)}/>}
    </div>
  </>);
}
