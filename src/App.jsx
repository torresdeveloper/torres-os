import { useState, useMemo, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   DADOS CONSTANTES
═══════════════════════════════════════════════════════════════════════════ */
const ATIVIDADES_RIA_PADRAO = [
  "Lubrificação geral",
  "Limpeza da cabina",
  "Limpeza do poço",
  "Verificação do nível de óleo",
  "Inspeção dos cabos de aço",
  "Teste de nivelamento",
  "Verificação das portas",
  "Inspeção elétrica geral",
];

const TIPOS = [
  { id:"troca_pecas", label:"Troca de Peças",   abbr:"Peças",    icon:"⚙", cor:"#B45309", bg:"rgba(180,83,9,.08)"  },
  { id:"ria",         label:"RIA",               abbr:"RIA",      icon:"◎", cor:"#0369A1", bg:"rgba(3,105,161,.08)" },
  { id:"corretiva",   label:"Mant. Corretiva",  abbr:"Corretiva",icon:"⚒", cor:"#9F1239", bg:"rgba(159,18,57,.08)" },
  { id:"diversos",    label:"Serviços Diversos", abbr:"Diversos", icon:"≡", cor:"#065F46", bg:"rgba(6,95,70,.08)"   },
];

const STATUS = [
  { id:"aberta",       label:"Aberta",       cor:"#92400E", bg:"rgba(146,64,14,.1)"  },
  { id:"em_andamento", label:"Em Andamento", cor:"#1D4ED8", bg:"rgba(29,78,216,.1)"  },
  { id:"concluida",    label:"Concluída",    cor:"#065F46", bg:"rgba(6,95,70,.1)"    },
  { id:"cancelada",    label:"Cancelada",    cor:"#374151", bg:"rgba(55,65,81,.1)"   },
];

const CLIENTES = ["TK Elevadores","Otis","New Elevadores","MDA","Outro"];
const TECNICOS = ["Matheus Torres","John Torres"];
const EMPRESA  = { nome:"Torres Elevadores", cnpj:"52.019.285/0001-06", email:"aetservicecorp@gmail.com" };

const FORM_ZERO = {
  numero:"", data:new Date().toISOString().split("T")[0],
  cliente:"", condominio:"", equipamento:"", tipo:"", tecnico:"",
  status:"aberta", descricao:"", pecas:"", obs:"",
  numeros_os:[], fotos:[],
  ria_atividades: ATIVIDADES_RIA_PADRAO.map(a => ({ label:a, feito:false })),
};

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITÁRIOS
═══════════════════════════════════════════════════════════════════════════ */
const uid    = () => Date.now().toString(36) + Math.random().toString(36).slice(2,5);
const getTipo= id  => TIPOS.find(t => t.id === id) || {};
const getSt  = id  => STATUS.find(s => s.id === id) || {};
const seqOS  = list => String(list.reduce((a,o) => { const n=parseInt(o.numero,10); return isNaN(n)?a:Math.max(a,n); }, 0) + 1).padStart(4,"0");

/* ═══════════════════════════════════════════════════════════════════════════
   PDF GENERATOR
═══════════════════════════════════════════════════════════════════════════ */
function gerarPDF(ordens, periodo) {
  const mk = (w,h) => { const c=document.createElement("canvas"); c.width=w; c.height=h; return c; };

  function donut(cv, labels, vals, colors) {
    const ctx=cv.getContext("2d"), W=cv.width, H=cv.height;
    ctx.fillStyle="#FAFAF9"; ctx.fillRect(0,0,W,H);
    const total = vals.reduce((a,b)=>a+b,0) || 1;
    const cx=W*.37, cy=H*.54, r=Math.min(cx,cy)*.80;
    let a = -Math.PI/2;
    vals.forEach((v,i) => {
      const s=(v/total)*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,a,a+s); ctx.closePath();
      ctx.fillStyle=colors[i]; ctx.fill();
      ctx.strokeStyle="#FAFAF9"; ctx.lineWidth=3; ctx.stroke();
      if(v>0 && Math.round((v/total)*100)>5) {
        const m=a+s/2;
        ctx.fillStyle="#fff"; ctx.font="bold 13px Georgia,serif"; ctx.textAlign="center";
        ctx.fillText(Math.round((v/total)*100)+"%", cx+Math.cos(m)*r*.63, cy+Math.sin(m)*r*.63+5);
      }
      a+=s;
    });
    ctx.beginPath(); ctx.arc(cx,cy,r*.40,0,Math.PI*2);
    ctx.fillStyle="#FAFAF9"; ctx.fill();
    ctx.fillStyle="#1C1917"; ctx.font="bold 18px Georgia,serif"; ctx.textAlign="center";
    ctx.fillText(total, cx, cy+6);
    ctx.fillStyle="#A8A29E"; ctx.font="11px sans-serif"; ctx.fillText("OS", cx, cy+21);
    const lx=W*.70, ly0=H*.14;
    labels.forEach((lb,i) => {
      if(!vals[i]) return;
      const ly=ly0+i*30;
      ctx.fillStyle=colors[i]; ctx.fillRect(lx,ly,14,14);
      ctx.fillStyle="#1C1917"; ctx.font="bold 12px sans-serif"; ctx.textAlign="left"; ctx.fillText(vals[i], lx+20, ly+11);
      ctx.fillStyle="#78716C"; ctx.font="11px sans-serif"; ctx.fillText(lb, lx+20, ly+25);
    });
  }

  function bars(cv, labels, vals, colors) {
    const ctx=cv.getContext("2d"), W=cv.width, H=cv.height;
    ctx.fillStyle="#FAFAF9"; ctx.fillRect(0,0,W,H);
    const pL=44,pR=16,pT=16,pB=44, cW=W-pL-pR, cH=H-pT-pB;
    const max=Math.max(...vals,1), bW=Math.min(48,(cW/labels.length)*.52);
    [.5,1].forEach(f => {
      const gy=pT+cH*(1-f);
      ctx.strokeStyle="#E7E5E4"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(pL,gy); ctx.lineTo(pL+cW,gy); ctx.stroke();
      ctx.fillStyle="#A8A29E"; ctx.font="9px sans-serif"; ctx.textAlign="right";
      ctx.fillText(Math.round(max*f), pL-4, gy+3);
    });
    labels.forEach((lb,i) => {
      const bx=pL+(cW/labels.length)*i+(cW/labels.length-bW)/2;
      const bh=Math.max((vals[i]/max)*cH, vals[i]>0?4:0);
      const by=pT+cH-bh;
      ctx.fillStyle=colors[i%colors.length]; ctx.fillRect(bx,by,bW,bh);
      if(vals[i]>0) {
        ctx.fillStyle="#fff"; ctx.font="bold 12px sans-serif"; ctx.textAlign="center";
        if(bh>20) ctx.fillText(vals[i], bx+bW/2, by+14);
        else { ctx.fillStyle=colors[i%colors.length]; ctx.fillText(vals[i], bx+bW/2, by-5); }
      }
      ctx.fillStyle="#78716C"; ctx.font="10px sans-serif"; ctx.textAlign="center";
      ctx.fillText(lb.length>9?lb.slice(0,9)+"…":lb, bx+bW/2, pT+cH+17);
    });
  }

  const c1=mk(540,290); donut(c1, TIPOS.map(t=>t.label), TIPOS.map(t=>ordens.filter(o=>o.tipo===t.id).length), TIPOS.map(t=>t.cor));
  const c2=mk(520,230); bars(c2, STATUS.map(s=>s.label), STATUS.map(s=>ordens.filter(o=>o.status===s.id).length), STATUS.map(s=>s.cor));
  const c3=mk(520,230); bars(c3, TECNICOS, TECNICOS.map(t=>ordens.filter(o=>o.tecnico===t).length), ["#1C1917","#B45309"]);

  const i1=c1.toDataURL("image/png"), i2=c2.toDataURL("image/png"), i3=c3.toDataURL("image/png");
  const pSt=Object.fromEntries(STATUS.map(s=>[s.id, ordens.filter(o=>o.status===s.id).length]));
  const per = periodo.inicio&&periodo.fim ? `${periodo.inicio} — ${periodo.fim}`
    : periodo.inicio ? `A partir de ${periodo.inicio}` : periodo.fim ? `Até ${periodo.fim}` : "Seleção manual";
  const agora = new Date().toLocaleString("pt-BR");

  const sc = (v,l,c) => `<div style="flex:1;background:#fff;border-radius:8px;padding:14px 16px;border-top:3px solid ${c}"><div style="font-size:26px;font-weight:700;color:${c};font-variant-numeric:tabular-nums">${v}</div><div style="font-size:10px;color:#78716C;margin-top:4px;letter-spacing:.8px;text-transform:uppercase">${l}</div></div>`;
  const badge = (l,c,b) => `<span style="font-size:10px;font-weight:600;color:${c};background:${b};padding:2px 9px;border-radius:20px">${l}</span>`;

  const rows = ordens.map((os,i) => {
    const tp=getTipo(os.tipo), st=getSt(os.status);
    return `<tr style="background:${i%2===0?"#FAFAF9":"#fff"}"><td style="padding:6px 10px;border-left:3px solid ${tp.cor||"#ccc"};font-family:monospace;font-weight:700;color:#1C1917;font-size:11px">#${os.numero}</td><td style="padding:6px 10px;font-family:monospace;font-size:10px;color:#78716C">${os.data}</td><td style="padding:6px 10px;font-size:10px;font-weight:600;color:${tp.cor||"#333"}">${tp.label||"—"}</td><td style="padding:6px 10px;font-size:10px">${os.cliente||"—"}</td><td style="padding:6px 10px;font-family:monospace;font-size:10px;font-weight:700;color:#1C1917">${os.equipamento||"—"}</td><td style="padding:6px 10px;font-size:10px">${os.tecnico||"—"}</td><td style="padding:6px 10px">${badge(st.label||"—",st.cor||"#888",st.bg||"#eee")}</td></tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
  <title>Relatório — Torres Elevadores</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'IBM Plex Mono',monospace;background:#F5F5F4;color:#1C1917;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{max-width:860px;margin:0 auto;background:#fff;min-height:100vh}
    .hdr{background:#1C1917;padding:28px 36px 24px;position:relative}
    .hdr-line{position:absolute;left:0;top:0;bottom:0;width:4px;background:#B45309}
    .brand{font-family:'IBM Plex Mono',monospace;font-size:22px;color:#fff;letter-spacing:-.3px;font-weight:700}
    .brand em{color:#D97706;font-style:italic;font-weight:300}
    .meta{color:#78716C;font-size:11px;margin-top:5px;letter-spacing:.3px}
    .tag{display:inline-block;border:1px solid #3D3731;color:#78716C;font-size:9px;font-weight:600;padding:3px 10px;border-radius:3px;letter-spacing:2px;margin-top:12px}
    .per{position:absolute;right:36px;top:28px;text-align:right}
    .per .p1{color:#D97706;font-weight:600;font-size:13px}
    .per .p2{color:#57534E;font-size:10px;margin-top:4px}
    .rule{height:1px;background:linear-gradient(90deg,#B45309,#D97706 30%,transparent)}
    .body{padding:28px 36px}
    .cards{display:flex;gap:10px;margin-bottom:26px}
    .st{font-size:10px;font-weight:600;color:#A8A29E;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:8px}
    .st::after{content:'';flex:1;height:1px;background:#E7E5E4}
    .sec{margin-bottom:24px}
    .cbox{background:#FAFAF9;border:1px solid #E7E5E4;border-radius:8px;padding:12px}
    .cbox img{width:100%;display:block}
    .row2{display:flex;gap:14px}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#1C1917}
    th{padding:7px 10px;text-align:left;font-size:9px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:1px}
    .ftr{background:#FAFAF9;border-top:1px solid #E7E5E4;padding:12px 36px;display:flex;justify-content:space-between;font-size:9px;color:#A8A29E}
    @media print{body{background:#fff}.page{max-width:100%}@page{margin:8mm;size:A4}}
  </style></head><body>
  <div class="page">
    <div class="hdr">
      <div class="hdr-line"></div>
      <div class="per"><div class="p1">${per}</div><div class="p2">${agora}</div></div>
      <div class="brand">Torres <em>Elevadores</em></div>
      <div class="meta">CNPJ ${EMPRESA.cnpj} · ${EMPRESA.email}</div>
      <div class="tag">RELATÓRIO DE SERVIÇOS</div>
    </div>
    <div class="rule"></div>
    <div class="body">
      <div class="cards">${sc(ordens.length,"Total","#1C1917")}${sc(pSt["concluida"]||0,"Concluídas","#065F46")}${sc(pSt["em_andamento"]||0,"Andamento","#1D4ED8")}${sc(pSt["aberta"]||0,"Abertas","#B45309")}</div>
      <div class="sec"><div class="st">Distribuição por tipo</div><div class="cbox"><img src="${i1}"/></div></div>
      <div class="sec"><div class="row2"><div style="flex:1"><div class="st">Por status</div><div class="cbox"><img src="${i2}"/></div></div><div style="flex:1"><div class="st">Por técnico</div><div class="cbox"><img src="${i3}"/></div></div></div></div>
      <div class="sec"><div class="st">Listagem · <span style="background:#1C1917;color:#fff;padding:1px 8px;border-radius:3px;font-size:9px">${ordens.length} OS</span></div>
        <div style="border-radius:8px;overflow:hidden;border:1px solid #E7E5E4"><table><thead><tr><th>OS#</th><th>Data</th><th>Tipo</th><th>Cliente</th><th>Equipamento</th><th>Técnico</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>
    </div>
    <div class="ftr"><span>${EMPRESA.nome} · CNPJ ${EMPRESA.cnpj} · ${EMPRESA.email}</span><span>${agora}</span></div>
  </div>
  <script>setTimeout(function(){window.print();},700);<\/script>
  </body></html>`;

  const blob = new Blob([html], {type:"text/html;charset=utf-8"});
  const url  = URL.createObjectURL(blob);
  if(!window.open(url,"_blank")) { const a=document.createElement("a"); a.href=url; a.download="Torres_Relatorio.html"; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
  setTimeout(()=>URL.revokeObjectURL(url), 60000);
}

/* ═══════════════════════════════════════════════════════════════════════════
   CSS GLOBAL — Preto profundo + branco gelo + cobre
═══════════════════════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{font-family:'IBM Plex Mono',monospace;background:#F5F5F4;color:#1C1917}
:root{
  --ink:     #1C1917;
  --ink2:    #44403C;
  --ink3:    #78716C;
  --ghost:   #A8A29E;
  --paper:   #FAFAF9;
  --cloud:   #F5F5F4;
  --line:    #E7E5E4;
  --line2:   #D6D3D1;
  --copper:  #B45309;
  --copper2: #D97706;
  --copper3: #FEF3C7;
  --mono:    'IBM Plex Mono',monospace;
  --serif:   'IBM Plex Mono',monospace;
}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:var(--cloud)}
::-webkit-scrollbar-thumb{background:var(--line2);border-radius:4px}
select option{background:var(--paper);color:var(--ink)}
input[type=date]::-webkit-calendar-picker-indicator{opacity:.4;cursor:pointer}
textarea{resize:vertical}
input::placeholder,textarea::placeholder{color:var(--ghost)}
button,select,input,textarea{font-family:'IBM Plex Mono',monospace}
@keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes in{from{opacity:0}to{opacity:1}}
`;

/* ═══════════════════════════════════════════════════════════════════════════
   ATOMS
═══════════════════════════════════════════════════════════════════════════ */
const F = { width:"100%", background:"var(--paper)", border:"1px solid var(--line2)", borderRadius:8, color:"var(--ink)", padding:"11px 13px", fontSize:14, outline:"none", WebkitAppearance:"none", transition:"border-color .15s" };
const L = { display:"block", fontSize:10, color:"var(--ghost)", fontWeight:600, letterSpacing:2, textTransform:"uppercase", marginBottom:7 };

function Chip({label, cor, bg}) {
  return <span style={{fontSize:11,fontWeight:600,color:cor,background:bg,padding:"3px 10px",borderRadius:4,whiteSpace:"nowrap",letterSpacing:.2}}>{label}</span>;
}

function Rule() { return <div style={{height:1,background:"var(--line)"}}/>; }

function Section({label, children, action}) {
  return <div style={{marginBottom:22}}>
    {label&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <div style={{fontSize:10,fontWeight:600,color:"var(--ghost)",letterSpacing:2.5,textTransform:"uppercase"}}>{label}</div>
      {action}
    </div>}
    {children}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOP BAR
═══════════════════════════════════════════════════════════════════════════ */
function TopBar({title, sub, back, right}) {
  return <div style={{background:"var(--ink)",position:"sticky",top:0,zIndex:60,borderBottom:"1px solid #2C2824"}}>
    <div style={{display:"flex",alignItems:"center",gap:12,height:56,padding:"0 16px"}}>
      {back
        ? <button onClick={back} style={{width:34,height:34,borderRadius:6,border:"1px solid #3D3731",background:"transparent",color:"var(--ghost)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>←</button>
        : <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <div style={{width:6,bottom:0,top:0,background:"var(--copper)",alignSelf:"stretch",borderRadius:1}}/>
            <div>
              <div style={{fontFamily:"var(--mono)",fontSize:15,color:"#FAFAF9",lineHeight:1.1,letterSpacing:-.2,fontWeight:700}}>Torres <em style={{color:"var(--copper2)",fontStyle:"italic",fontWeight:300}}>Elevadores</em></div>
              <div style={{fontSize:8,color:"#57534E",letterSpacing:3,marginTop:1}}>SISTEMA DE OS</div>
            </div>
          </div>
      }
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:15,fontWeight:500,color:"#FAFAF9",lineHeight:1.2}}>{title}</div>
        {sub&&<div style={{fontSize:11,color:"#57534E",marginTop:1,fontFamily:"var(--mono)"}}>{sub}</div>}
      </div>
      {right}
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   BOTTOM NAV
═══════════════════════════════════════════════════════════════════════════ */
function Nav({view, setView, onNova}) {
  return <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,zIndex:100,background:"var(--ink)",borderTop:"1px solid #2C2824",display:"flex",alignItems:"center",height:60}}>
    {[{id:"dashboard",lbl:"Início"},{id:"_",special:true},{id:"lista",lbl:"OS"}].map(it => {
      if(it.special) return <button key="_" onClick={onNova} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,border:"none",background:"transparent",cursor:"pointer",padding:"4px 0"}}>
        <div style={{width:42,height:42,borderRadius:10,background:"var(--copper)",display:"flex",alignItems:"center",justifyContent:"center",marginTop:-18,boxShadow:"0 8px 24px rgba(180,83,9,.45)"}}>
          <span style={{fontSize:22,color:"#fff",fontWeight:300,lineHeight:1}}>+</span>
        </div>
        <span style={{fontSize:9,color:"var(--copper2)",fontWeight:600,letterSpacing:1.5}}>NOVA OS</span>
      </button>;
      const on=view===it.id;
      return <button key={it.id} onClick={()=>setView(it.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,border:"none",background:"transparent",cursor:"pointer",padding:"10px 0",color:on?"var(--copper2)":"#57534E",transition:"color .15s",position:"relative"}}>
        {it.id==="dashboard"?<IcoHome/>:<IcoList/>}
        <span style={{fontSize:9,fontWeight:600,letterSpacing:1.5}}>{it.lbl?.toUpperCase()}</span>
        {on&&<div style={{position:"absolute",bottom:0,width:16,height:2,background:"var(--copper)",borderRadius:"2px 2px 0 0"}}/>}
      </button>;
    })}
  </nav>;
}
const IcoHome = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IcoList = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const IcoPdf  = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;

/* ═══════════════════════════════════════════════════════════════════════════
   OS CARD
═══════════════════════════════════════════════════════════════════════════ */
function OSCard({os, onTap, onEdit, onDelete, selected, onSelect, selectMode}) {
  const tp=getTipo(os.tipo), st=getSt(os.status);
  return <div
    onClick={()=>selectMode?onSelect(os.id):onTap(os)}
    style={{background:"var(--paper)",border:`1px solid ${selected?"var(--copper)":"var(--line)"}`,borderRadius:10,marginBottom:8,cursor:"pointer",overflow:"hidden",transition:"border-color .15s",boxShadow:selected?"0 0 0 2px rgba(180,83,9,.15)":"0 1px 2px rgba(0,0,0,.04)"}}>
    <div style={{height:2,background:tp.cor,opacity:.7}}/>
    <div style={{padding:"11px 13px",display:"flex",alignItems:"flex-start",gap:11}}>
      {selectMode
        ? <div style={{width:18,height:18,borderRadius:4,border:`1.5px solid ${selected?"var(--copper)":"var(--line2)"}`,background:selected?"var(--copper)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:3,transition:"all .15s"}}>
            {selected&&<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="2,6 5,9 10,3"/></svg>}
          </div>
        : <div style={{width:36,height:36,borderRadius:8,background:tp.bg,border:`1px solid ${tp.cor}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:16,color:tp.cor,fontWeight:700}}>{tp.icon}</div>
      }
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4,flexWrap:"wrap"}}>
          <span style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--copper)",fontWeight:500,letterSpacing:.5}}>#{os.numero}</span>
          <Chip label={st.label||"?"} cor={st.cor||"#888"} bg={st.bg||"#eee"}/>
          {os.fotos?.length>0&&<span style={{fontSize:10,color:"var(--ghost)"}}>📷 {os.fotos.length}</span>}
        </div>
        <div style={{fontSize:14,fontWeight:500,color:"var(--ink)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginBottom:4,lineHeight:1.3}}>{os.condominio||os.cliente}</div>
        {os.equipamento&&<div style={{display:"inline-flex",alignItems:"center",gap:5,background:"var(--copper3)",border:"1px solid #FCD34D",borderRadius:4,padding:"2px 8px",marginBottom:4}}>
          <span style={{fontSize:10,color:"var(--copper)"}}>▣</span>
          <span style={{fontSize:11,color:"var(--copper)",fontFamily:"var(--mono)",fontWeight:500}}>{os.equipamento}</span>
        </div>}
        {os.tipo==="troca_pecas"&&os.numeros_os?.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:4}}>
          {os.numeros_os.map((n,i)=><span key={i} style={{fontSize:10,background:"var(--copper3)",border:"1px solid #FCD34D",color:"var(--copper)",borderRadius:3,padding:"1px 6px",fontFamily:"var(--mono)"}}>OS {n}</span>)}
        </div>}
        {/* RIA: preview atividades */}
        {os.tipo==="ria"&&os.ria_atividades?.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:4}}>
          <span style={{fontSize:10,color:"var(--ghost)"}}>
            {os.ria_atividades.filter(a=>a.feito).length}/{os.ria_atividades.length} atividades
          </span>
        </div>}
        <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",marginTop:1}}>
          <span style={{fontSize:11,color:tp.cor,fontWeight:500}}>{tp.abbr}</span>
          <span style={{color:"var(--line2)"}}>·</span>
          <span style={{fontSize:11,color:"var(--ghost)",fontFamily:"var(--mono)"}}>{os.data}</span>
          <span style={{color:"var(--line2)"}}>·</span>
          <span style={{fontSize:11,color:"var(--ghost)"}}>{os.tecnico}</span>
        </div>
      </div>
      {!selectMode&&<div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
        <button onClick={()=>onEdit(os)} style={{width:30,height:30,borderRadius:6,border:"1px solid var(--line2)",background:"var(--cloud)",color:"var(--ink2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>✏</button>
        <button onClick={()=>onDelete(os.id)} style={{width:30,height:30,borderRadius:6,border:"1px solid #FECACA",background:"#FEF2F2",color:"#DC2626",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>✕</button>
      </div>}
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   RIA CHECKLIST — atividades persistem via window.storage
═══════════════════════════════════════════════════════════════════════════ */
const STORAGE_KEY = "torres_ria_atividades_v1";

async function loadAtividadesBase() {
  try {
    const r = await window.storage.get(STORAGE_KEY);
    if (r?.value) return JSON.parse(r.value);
  } catch(_) {}
  return ATIVIDADES_RIA_PADRAO;
}

async function saveAtividadesBase(lista) {
  try { await window.storage.set(STORAGE_KEY, JSON.stringify(lista)); } catch(_) {}
}

function RIAChecklist({value=[], onChange}) {
  const [novo, setNovo] = useState("");

  const toggle = idx => onChange(value.map((a,i) => i===idx ? {...a, feito:!a.feito} : a));

  const addAtividade = async () => {
    const t = novo.trim();
    if(!t) return;
    const nova = {label:t, feito:false};
    onChange([...value, nova]);
    // persiste o label na base global
    try {
      const r = await window.storage.get(STORAGE_KEY);
      const base = r?.value ? JSON.parse(r.value) : ATIVIDADES_RIA_PADRAO;
      if(!base.includes(t)) {
        const atualizada = [...base, t];
        await window.storage.set(STORAGE_KEY, JSON.stringify(atualizada));
      }
    } catch(_) {}
    setNovo("");
  };

  const remove = idx => onChange(value.filter((_,i) => i!==idx));

  const feitos = value.filter(a=>a.feito).length;
  const pct    = value.length ? Math.round((feitos/value.length)*100) : 0;

  return <div style={{background:"rgba(3,105,161,.04)",border:"1px solid rgba(3,105,161,.2)",borderRadius:10,padding:"14px 15px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <div>
        <div style={{fontSize:10,color:"var(--ghost)",fontWeight:600,letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>Atividades RIA</div>
        <div style={{fontSize:12,color:"#0369A1",fontWeight:500}}>{feitos} de {value.length} concluídas</div>
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#0369A1",fontFamily:"var(--mono)"}}>{pct}%</div>
        <div style={{width:60,height:4,background:"rgba(3,105,161,.15)",borderRadius:2,marginTop:3}}>
          <div style={{width:`${pct}%`,height:"100%",background:"#0369A1",borderRadius:2,transition:"width .3s"}}/>
        </div>
      </div>
    </div>

    <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:12}}>
      {value.map((a,i) => <div key={i}
        onClick={()=>toggle(i)}
        style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",background:a.feito?"rgba(3,105,161,.08)":"var(--paper)",border:`1px solid ${a.feito?"rgba(3,105,161,.25)":"var(--line)"}`,borderRadius:7,cursor:"pointer",transition:"all .15s",userSelect:"none"}}>
        <div style={{width:18,height:18,borderRadius:4,border:`1.5px solid ${a.feito?"#0369A1":"var(--line2)"}`,background:a.feito?"#0369A1":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}>
          {a.feito&&<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="2,6 5,9 10,3"/></svg>}
        </div>
        <span style={{flex:1,fontSize:13,color:a.feito?"#0369A1":"var(--ink2)",fontWeight:a.feito?500:400,transition:"color .15s"}}>{a.label}</span>
        <button onClick={e=>{e.stopPropagation();remove(i);}} style={{background:"none",border:"none",color:"var(--ghost)",cursor:"pointer",fontSize:14,lineHeight:1,padding:2,flexShrink:0,opacity:.6}}>✕</button>
      </div>)}
    </div>

    <div style={{display:"flex",gap:8}}>
      <input
        placeholder="Nova atividade..."
        value={novo}
        onChange={e=>setNovo(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addAtividade();}}}
        style={{...F,flex:1,padding:"9px 12px",fontSize:13,borderColor:"rgba(3,105,161,.3)",background:"var(--paper)"}}
      />
      <button onClick={addAtividade} style={{padding:"9px 14px",background:"#0369A1",border:"none",borderRadius:8,color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer",flexShrink:0,fontFamily:"var(--mono)"}}>
        + Add
      </button>
    </div>
    <div style={{fontSize:10,color:"rgba(3,105,161,.6)",marginTop:6}}>
      ✦ Novas atividades são salvas e aparecem automaticamente nas próximas OS.
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MULTI OS INPUT
═══════════════════════════════════════════════════════════════════════════ */
function MultiOS({value=[], onChange}) {
  const [d,setD] = useState("");
  const add = () => { const t=d.trim(); if(!t||value.includes(t))return; onChange([...value,t]); setD(""); };
  return <div>
    <div style={{display:"flex",gap:8,marginBottom:8}}>
      <input placeholder="Número da OS da OEM..." value={d} onChange={e=>setD(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add();}}} style={{...F,flex:1,fontSize:13,fontFamily:"var(--mono)"}}/>
      <button onClick={add} style={{padding:"9px 14px",background:"var(--copper)",border:"none",borderRadius:8,color:"#fff",fontWeight:600,fontSize:18,cursor:"pointer",lineHeight:1}}>+</button>
    </div>
    {value.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6}}>
      {value.map((n,i)=><span key={i} style={{display:"inline-flex",alignItems:"center",gap:6,background:"var(--copper3)",border:"1px solid #FCD34D",borderRadius:5,padding:"5px 11px",fontSize:12,color:"var(--copper)",fontFamily:"var(--mono)",fontWeight:500}}>
        OS {n}
        <button onClick={()=>onChange(value.filter((_,x)=>x!==i))} style={{background:"none",border:"none",color:"#92400E",cursor:"pointer",fontSize:13,lineHeight:1,padding:0}}>×</button>
      </span>)}
    </div>}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOTO PICKER / VIEWER
═══════════════════════════════════════════════════════════════════════════ */
function FotoPicker({fotos=[], onChange}) {
  const ref = useRef();
  const handle = e => {
    Array.from(e.target.files).forEach(f=>{const r=new FileReader();r.onload=ev=>onChange(p=>[...p,{id:uid(),dataUrl:ev.target.result,name:f.name}]);r.readAsDataURL(f);});
    e.target.value="";
  };
  return <div>
    <input ref={ref} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handle}/>
    <button onClick={()=>ref.current.click()} style={{width:"100%",padding:"12px",background:"var(--cloud)",border:"1px dashed var(--line2)",borderRadius:8,color:"var(--ghost)",fontWeight:500,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      Adicionar fotos
    </button>
    {fotos.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:10}}>
      {fotos.map(f=><div key={f.id} style={{position:"relative",borderRadius:8,overflow:"hidden",aspectRatio:"1",border:"1px solid var(--line)"}}>
        <img src={f.dataUrl} alt={f.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        <button onClick={()=>onChange(p=>p.filter(x=>x.id!==f.id))} style={{position:"absolute",top:4,right:4,width:20,height:20,borderRadius:"50%",background:"rgba(28,25,23,.8)",border:"none",color:"#fff",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>×</button>
      </div>)}
    </div>}
  </div>;
}

function FotoViewer({fotos=[]}) {
  const [lb,setLb] = useState(null);
  if(!fotos?.length) return null;
  return <>
    <div style={{background:"var(--paper)",border:"1px solid var(--line)",borderRadius:10,padding:"13px",marginBottom:10}}>
      <div style={{fontSize:10,color:"var(--ghost)",fontWeight:600,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Fotos · {fotos.length}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
        {fotos.map(f=><div key={f.id} onClick={()=>setLb(f)} style={{borderRadius:7,overflow:"hidden",aspectRatio:"1",border:"1px solid var(--line)",cursor:"pointer"}}>
          <img src={f.dataUrl} alt={f.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        </div>)}
      </div>
    </div>
    {lb&&<div onClick={()=>setLb(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <img src={lb.dataUrl} alt={lb.name} style={{maxWidth:"100%",maxHeight:"90vh",borderRadius:10,objectFit:"contain"}}/>
    </div>}
  </>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL PDF
═══════════════════════════════════════════════════════════════════════════ */
function ModalPDF({ordens, selecionadas, onClose}) {
  const manual = selecionadas != null;
  const [ini,setIni] = useState("");
  const [fim,setFim] = useState("");
  const [load,setLoad] = useState(false);

  const lista = useMemo(()=>{
    if(manual) return selecionadas;
    return ordens.filter(o=>{
      if(ini&&o.data<ini) return false;
      if(fim&&o.data>fim) return false;
      return true;
    });
  },[ordens,ini,fim,manual,selecionadas]);

  const gerar = () => {
    if(!lista.length) return;
    setLoad(true);
    setTimeout(()=>{ try{gerarPDF(lista,manual?{ini:"",fim:""}:{ini,fim});}finally{setLoad(false);} }, 120);
  };

  return <div style={{position:"fixed",inset:0,background:"rgba(28,25,23,.6)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:"var(--paper)",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:480,maxHeight:"86vh",overflowY:"auto",boxShadow:"0 -8px 48px rgba(0,0,0,.2)"}}>
      <div style={{display:"flex",justifyContent:"center",paddingTop:10}}>
        <div style={{width:32,height:3,background:"var(--line2)",borderRadius:2}}/>
      </div>
      <div style={{padding:"16px 20px 36px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22}}>
          <div>
            <div style={{fontFamily:"var(--mono)",fontSize:20,color:"var(--ink)",lineHeight:1.1,fontWeight:700,letterSpacing:-.5}}>
              {manual?"Seleção manual":"Relatório por período"}
            </div>
            <div style={{fontSize:12,color:"var(--ghost)",marginTop:4}}>
              {manual?`${selecionadas.length} OS selecionadas`:"Defina o período abaixo"}
            </div>
          </div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:6,border:"1px solid var(--line2)",background:"transparent",color:"var(--ghost)",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>

        {!manual&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
          <div><label style={L}>Data inicial</label><input type="date" value={ini} onChange={e=>setIni(e.target.value)} style={{...F,fontFamily:"var(--mono)",fontSize:13}}/></div>
          <div><label style={L}>Data final</label><input type="date" value={fim} onChange={e=>setFim(e.target.value)} style={{...F,fontFamily:"var(--mono)",fontSize:13}}/></div>
        </div>}

        {/* preview */}
        <div style={{background:"var(--cloud)",border:"1px solid var(--line)",borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{fontSize:10,color:"var(--ghost)",fontWeight:600,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>{lista.length} OS no relatório</div>
          {TIPOS.map(t=>{const c=lista.filter(o=>o.tipo===t.id).length; return <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
            <span style={{fontSize:14,color:t.cor,flexShrink:0,width:18,textAlign:"center"}}>{t.icon}</span>
            <div style={{flex:1,background:"var(--line)",borderRadius:3,height:5,overflow:"hidden"}}>
              <div style={{width:`${lista.length?Math.round((c/lista.length)*100):0}%`,background:t.cor,height:"100%",borderRadius:3,transition:"width .4s"}}/>
            </div>
            <span style={{fontSize:11,color:t.cor,fontFamily:"var(--mono)",fontWeight:500,minWidth:20,textAlign:"right"}}>{c}</span>
            <span style={{fontSize:10,color:"var(--ghost)",minWidth:64}}>{t.abbr}</span>
          </div>;})}
        </div>

        <div style={{background:"var(--copper3)",border:"1px solid #FDE68A",borderRadius:8,padding:"10px 14px",marginBottom:18,fontSize:12,color:"#92400E",lineHeight:1.65}}>
          💡 Uma nova aba abrirá com o relatório. Use <strong>Imprimir → Salvar como PDF</strong>.
        </div>

        <button onClick={gerar} disabled={!lista.length||load} style={{width:"100%",padding:"14px",background:lista.length&&!load?"var(--copper)":"var(--line)",color:lista.length&&!load?"#fff":"var(--ghost)",border:"none",borderRadius:10,fontWeight:600,fontSize:14,cursor:lista.length&&!load?"pointer":"not-allowed",letterSpacing:.3,boxShadow:lista.length&&!load?"0 4px 16px rgba(180,83,9,.3)":"none",transition:"all .2s"}}>
          {load?"Gerando...":lista.length?`Gerar PDF — ${lista.length} OS`:"Sem OS no período"}
        </button>
      </div>
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   APP
═══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [ordens,setOrdens]   = useState([]);
  const [view,setView]       = useState("dashboard");
  const [editing,setEditing] = useState(null);
  const [detId,setDetId]     = useState(null);
  const [form,setForm]       = useState(FORM_ZERO);
  const [filtros,setFiltros] = useState({tipo:"",status:"",cliente:"",data:""});
  const [busca,setBusca]     = useState("");
  const [showFilt,setShowFilt]   = useState(false);
  const [showPDF,setShowPDF]     = useState(false);
  const [selectMode,setSelectMode] = useState(false);
  const [selecionados,setSelecionados] = useState(new Set());
  const [showPDFSel,setShowPDFSel] = useState(false);

  const P = patch => setForm(f=>({...f,...patch}));
  const hoje = new Date().toISOString().split("T")[0];

  const stats = useMemo(()=>({
    total:     ordens.length,
    hoje:      ordens.filter(o=>o.data===hoje).length,
    abertas:   ordens.filter(o=>o.status==="aberta").length,
    andamento: ordens.filter(o=>o.status==="em_andamento").length,
    concluidas:ordens.filter(o=>o.status==="concluida").length,
  }),[ordens,hoje]);

  const filtradas = useMemo(()=>ordens.filter(o=>{
    if(filtros.tipo    &&o.tipo!==filtros.tipo)      return false;
    if(filtros.status  &&o.status!==filtros.status)  return false;
    if(filtros.cliente &&o.cliente!==filtros.cliente)return false;
    if(filtros.data    &&o.data!==filtros.data)      return false;
    if(busca&&![o.numero,o.condominio,o.equipamento,o.cliente].some(v=>v?.toLowerCase().includes(busca.toLowerCase())))return false;
    return true;
  }),[ordens,filtros,busca]);

  const temFiltro = Object.values(filtros).some(Boolean)||!!busca;

  const novaOS = () => { setForm({...FORM_ZERO,numero:seqOS(ordens),data:hoje,ria_atividades:ATIVIDADES_RIA_PADRAO.map(a=>({label:a,feito:false}))}); setEditing(null); setView("form"); };
  const editOS = os => { setForm({...os, ria_atividades: os.ria_atividades||ATIVIDADES_RIA_PADRAO.map(a=>({label:a,feito:false}))}); setEditing(os.id); setView("form"); };
  const salvar = () => {
    if(!form.cliente||!form.tipo||!form.equipamento||!form.tecnico) return;
    editing
      ? setOrdens(p=>p.map(o=>o.id===editing?{...form,id:editing}:o))
      : setOrdens(p=>[{...form,id:uid()},...p]);
    setView("lista"); setEditing(null);
  };
  const excluir = id => { if(window.confirm("Excluir esta OS?")){ setOrdens(p=>p.filter(o=>o.id!==id)); if(detId===id)setView("lista"); }};
  const verDet  = os => { setDetId(os.id); setView("detalhe"); };
  const det     = ordens.find(o=>o.id===detId);
  const ok      = form.cliente&&form.tipo&&form.equipamento&&form.tecnico;

  const toggleSel = id => setSelecionados(s=>{ const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const sairSel   = () => { setSelectMode(false); setSelecionados(new Set()); };
  const selTodos  = () => setSelecionados(new Set(filtradas.map(o=>o.id)));
  const selArr    = ordens.filter(o=>selecionados.has(o.id));

  const btnPDF = (onClick) => <button onClick={onClick} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.15)",color:"rgba(250,250,249,.8)",borderRadius:7,padding:"6px 11px",cursor:"pointer",fontSize:12,fontWeight:500,letterSpacing:.3}}><IcoPdf/>PDF</button>;

  const kpi = (v,l,c) => <div style={{background:"var(--paper)",border:"1px solid var(--line)",borderRadius:9,padding:"14px 15px",flex:1,minWidth:0}}>
    <div style={{fontFamily:"var(--mono)",fontSize:24,fontWeight:600,color:c,lineHeight:1,letterSpacing:-1}}>{v}</div>
    <div style={{fontSize:10,color:"var(--ghost)",marginTop:5,fontWeight:600,letterSpacing:1.5,textTransform:"uppercase"}}>{l}</div>
  </div>;

  return <>
    <style>{CSS}</style>
    <div style={{background:"var(--cloud)",minHeight:"100vh",maxWidth:480,margin:"0 auto"}}>

      {/* ══════════ DASHBOARD ══════════ */}
      {view==="dashboard"&&<div style={{paddingBottom:80}}>
        <TopBar title="" right={btnPDF(()=>setShowPDF(true))}/>
        <div style={{padding:"20px 16px 0"}}>
          {/* hero */}
          <div style={{background:"var(--ink)",borderRadius:14,padding:"20px 22px",marginBottom:18,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",right:-20,top:-20,width:110,height:110,borderRadius:"50%",border:"30px solid rgba(180,83,9,.12)"}}/>
            <div style={{position:"absolute",right:30,bottom:-28,width:70,height:70,borderRadius:"50%",border:"20px solid rgba(180,83,9,.07)"}}/>
            <div style={{fontSize:9,color:"var(--copper2)",fontWeight:600,letterSpacing:3,textTransform:"uppercase",marginBottom:8}}>Torres Elevadores · Sistema de OS</div>
            <div style={{fontFamily:"var(--mono)",fontSize:22,color:"#FAFAF9",lineHeight:1.15,letterSpacing:-.5,fontWeight:700}}>Ordens de <em style={{color:"var(--copper2)",fontStyle:"italic",fontWeight:300}}>Serviço</em></div>
            <div style={{fontSize:12,color:"#57534E",marginTop:8,fontFamily:"var(--mono)"}}>{ordens.length} registros · {stats.hoje} hoje</div>
          </div>

          {/* KPIs */}
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            {kpi(stats.total,    "Total",      "var(--ink)"  )}
            {kpi(stats.hoje,     "Hoje",        "var(--copper)")}
          </div>
          <div style={{display:"flex",gap:8,marginBottom:22}}>
            {kpi(stats.abertas,    "Abertas",    "#92400E")}
            {kpi(stats.andamento,  "Andamento",  "#1D4ED8")}
            {kpi(stats.concluidas, "Concluídas", "#065F46")}
          </div>

          {/* por tipo */}
          <Section label="Tipos de serviço">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {TIPOS.map(t=>{const c=ordens.filter(o=>o.tipo===t.id).length; return <div key={t.id} style={{background:"var(--paper)",border:"1px solid var(--line)",borderRadius:9,padding:"13px 14px",display:"flex",alignItems:"center",gap:11}}>
                <div style={{width:34,height:34,borderRadius:7,background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:t.cor,flexShrink:0}}>{t.icon}</div>
                <div><div style={{fontFamily:"var(--mono)",fontSize:20,fontWeight:600,color:t.cor,lineHeight:1}}>{c}</div><div style={{fontSize:10,color:"var(--ghost)",fontWeight:600,marginTop:3,letterSpacing:.5}}>{t.abbr}</div></div>
              </div>;})}
            </div>
          </Section>

          {/* recentes */}
          <Section label="Recentes" action={ordens.length>0&&<button onClick={()=>setView("lista")} style={{background:"none",border:"none",color:"var(--copper)",fontSize:11,fontWeight:600,cursor:"pointer",letterSpacing:.5}}>Ver todas →</button>}>
            {ordens.length===0
              ? <div style={{background:"var(--paper)",border:"1px dashed var(--line2)",borderRadius:10,padding:36,textAlign:"center"}}>
                  <div style={{fontFamily:"var(--mono)",fontSize:32,color:"var(--line2)",marginBottom:10}}>◎</div>
                  <div style={{fontSize:14,color:"var(--ink2)",marginBottom:3}}>Nenhuma OS cadastrada</div>
                  <div style={{fontSize:12,color:"var(--ghost)",marginBottom:18}}>Crie sua primeira ordem de serviço</div>
                  <button onClick={novaOS} style={{padding:"10px 22px",background:"var(--copper)",color:"#fff",border:"none",borderRadius:8,fontWeight:600,fontSize:13,cursor:"pointer",boxShadow:"0 4px 12px rgba(180,83,9,.3)"}}>+ Nova OS</button>
                </div>
              : ordens.slice(0,4).map(os=><OSCard key={os.id} os={os} onTap={verDet} onEdit={editOS} onDelete={excluir} selectMode={false}/>)
            }
          </Section>
        </div>
      </div>}

      {/* ══════════ LISTA ══════════ */}
      {view==="lista"&&<div style={{paddingBottom:80}}>
        <TopBar
          title={selectMode?`${selecionados.size} selecionada${selecionados.size!==1?"s":""}`:"Ordens de Serviço"}
          sub={selectMode?"Toque para marcar":`${filtradas.length} registro${filtradas.length!==1?"s":""}`}
          back={selectMode?sairSel:undefined}
          right={selectMode
            ? <div style={{display:"flex",gap:7}}>
                <button onClick={selTodos} style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.15)",color:"rgba(250,250,249,.8)",borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:11,fontWeight:500}}>Todos</button>
                <button onClick={()=>{if(selecionados.size)setShowPDFSel(true);}} disabled={!selecionados.size} style={{background:selecionados.size?"var(--copper)":"rgba(255,255,255,.06)",border:"none",color:selecionados.size?"#fff":"rgba(255,255,255,.25)",borderRadius:7,padding:"6px 12px",cursor:selecionados.size?"pointer":"not-allowed",fontSize:11,fontWeight:600}}>PDF</button>
              </div>
            : <div style={{display:"flex",gap:7}}>
                <button onClick={()=>setSelectMode(true)} style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.15)",color:"rgba(250,250,249,.8)",borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:11,fontWeight:500}}>☑ Selec.</button>
                {btnPDF(()=>setShowPDF(true))}
              </div>
          }
        />
        <div style={{padding:"13px 16px 0"}}>
          {!selectMode&&<>
            <div style={{position:"relative",marginBottom:9}}>
              <svg style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"var(--ghost)"}} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder="Buscar OS, condomínio, equipamento..." value={busca} onChange={e=>setBusca(e.target.value)} style={{...F,paddingLeft:33,fontSize:13}}/>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <button onClick={()=>setShowFilt(f=>!f)} style={{flex:1,padding:"9px 13px",background:showFilt?"#EFF6FF":"var(--paper)",border:`1px solid ${showFilt?"#BFDBFE":"var(--line2)"}`,borderRadius:8,color:showFilt?"#1D4ED8":"var(--ghost)",fontWeight:600,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
                Filtros {temFiltro&&<span style={{width:6,height:6,borderRadius:"50%",background:"#1D4ED8",display:"inline-block"}}/>}
              </button>
              {temFiltro&&<button onClick={()=>{setFiltros({tipo:"",status:"",cliente:"",data:""});setBusca("");}} style={{padding:"9px 13px",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,color:"#DC2626",fontWeight:600,fontSize:12,cursor:"pointer"}}>Limpar</button>}
            </div>
            {showFilt&&<div style={{background:"var(--paper)",border:"1px solid var(--line)",borderRadius:10,padding:14,marginBottom:14,display:"flex",flexDirection:"column",gap:10}}>
              {[{k:"tipo",opts:TIPOS.map(t=>({v:t.id,l:`${t.icon} ${t.label}`})),ph:"Todos os tipos"},
                {k:"status",opts:STATUS.map(s=>({v:s.id,l:s.label})),ph:"Todos os status"},
                {k:"cliente",opts:CLIENTES.map(c=>({v:c,l:c})),ph:"Todos os clientes"}].map(({k,opts,ph})=>(
                <select key={k} value={filtros[k]} onChange={e=>setFiltros(f=>({...f,[k]:e.target.value}))} style={F}><option value="">{ph}</option>{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>
              ))}
              <input type="date" value={filtros.data} onChange={e=>setFiltros(f=>({...f,data:e.target.value}))} style={{...F,fontFamily:"var(--mono)"}}/>
            </div>}
          </>}

          {selectMode&&selecionados.size===0&&<div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12,color:"#1D4ED8"}}>Toque nas OS que deseja incluir no relatório.</div>}

          {filtradas.length===0
            ? <div style={{background:"var(--paper)",border:"1px dashed var(--line2)",borderRadius:10,padding:40,textAlign:"center"}}><div style={{fontSize:28,color:"var(--line2)",marginBottom:8}}>◎</div><div style={{color:"var(--ghost)",fontSize:13}}>{ordens.length===0?"Nenhuma OS cadastrada.":"Nenhuma OS encontrada."}</div></div>
            : filtradas.map(os=><OSCard key={os.id} os={os} onTap={verDet} onEdit={editOS} onDelete={excluir} selected={selecionados.has(os.id)} onSelect={toggleSel} selectMode={selectMode}/>)
          }

          {/* barra flutuante */}
          {selectMode&&selecionados.size>0&&<div style={{position:"fixed",bottom:68,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 32px)",maxWidth:448,background:"var(--ink)",borderRadius:12,padding:"11px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 8px 32px rgba(0,0,0,.3)",zIndex:90,border:"1px solid #2C2824"}}>
            <span style={{color:"#FAFAF9",fontWeight:500,fontSize:13}}>{selecionados.size} OS selecionada{selecionados.size!==1?"s":""}</span>
            <div style={{display:"flex",gap:8}}>
              <button onClick={sairSel} style={{background:"rgba(255,255,255,.08)",border:"none",color:"rgba(250,250,249,.6)",borderRadius:7,padding:"7px 12px",cursor:"pointer",fontSize:12,fontWeight:500}}>Cancelar</button>
              <button onClick={()=>setShowPDFSel(true)} style={{background:"var(--copper)",border:"none",color:"#fff",borderRadius:7,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600,boxShadow:"0 3px 10px rgba(180,83,9,.4)"}}>Gerar PDF</button>
            </div>
          </div>}
        </div>
      </div>}

      {/* ══════════ FORMULÁRIO ══════════ */}
      {view==="form"&&<div style={{paddingBottom:40}}>
        <TopBar title={editing?"Editar OS":"Nova OS"} sub={`OS #${form.numero}`} back={()=>setView(editing?"detalhe":"lista")}/>
        <div style={{padding:"18px 16px"}}>

          {/* tipo */}
          <div style={{marginBottom:16}}>
            <label style={L}>Tipo de serviço *</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {TIPOS.map(t=><button key={t.id} onClick={()=>P({tipo:t.id})} style={{display:"flex",alignItems:"center",gap:9,padding:"12px 13px",border:`1.5px solid ${form.tipo===t.id?t.cor:"var(--line2)"}`,background:form.tipo===t.id?t.bg:"var(--paper)",borderRadius:9,cursor:"pointer",color:form.tipo===t.id?t.cor:"var(--ink3)",fontWeight:500,fontSize:13,textAlign:"left",transition:"all .15s"}}>
                <span style={{fontSize:17,flexShrink:0,color:form.tipo===t.id?t.cor:"var(--ghost)"}}>{t.icon}</span>
                <span style={{lineHeight:1.25}}>{t.label}</span>
              </button>)}
            </div>
          </div>

          {/* OS OEM — troca de peças */}
          {form.tipo==="troca_pecas"&&<div style={{marginBottom:16,background:"var(--copper3)",border:"1px solid #FCD34D",borderRadius:10,padding:"13px 14px"}}>
            <label style={{...L,color:"var(--copper)"}}>Nº(s) OS da OEM</label>
            <MultiOS value={form.numeros_os} onChange={v=>P({numeros_os:v})}/>
            <div style={{fontSize:10,color:"#92400E",marginTop:8}}>Enter ou + para adicionar múltiplos números.</div>
          </div>}

          {/* RIA checklist */}
          {form.tipo==="ria"&&<div style={{marginBottom:16}}>
            <RIAChecklist value={form.ria_atividades||[]} onChange={v=>P({ria_atividades:v})}/>
          </div>}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div><label style={L}>Data *</label><input type="date" value={form.data} onChange={e=>P({data:e.target.value})} style={{...F,fontFamily:"var(--mono)",fontSize:13}}/></div>
            <div><label style={L}>Status</label><select value={form.status} onChange={e=>P({status:e.target.value})} style={F}>{STATUS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
          </div>

          <div style={{marginBottom:14}}><label style={L}>Cliente / OEM *</label><select value={form.cliente} onChange={e=>P({cliente:e.target.value})} style={F}><option value="">Selecione...</option>{CLIENTES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div style={{marginBottom:14}}><label style={L}>Técnico *</label><select value={form.tecnico} onChange={e=>P({tecnico:e.target.value})} style={F}><option value="">Selecione...</option>{TECNICOS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div style={{marginBottom:14}}><label style={L}>Condomínio</label><input placeholder="Nome do condomínio" value={form.condominio} onChange={e=>P({condominio:e.target.value})} style={F}/></div>

          {/* equipamento */}
          <div style={{marginBottom:14,background:"var(--copper3)",border:"1px solid #FCD34D",borderRadius:9,padding:"12px 14px"}}>
            <label style={{...L,color:"var(--copper)"}}>▣ Equipamento *</label>
            <input placeholder="Nº ou identificação" value={form.equipamento} onChange={e=>P({equipamento:e.target.value})} style={{...F,borderColor:"#FCD34D",background:"#fff",fontFamily:"var(--mono)",fontSize:15,fontWeight:500,color:"var(--copper)"}}/>
          </div>

          <div style={{marginBottom:14}}><label style={L}>Descrição</label><textarea placeholder="Descreva o serviço realizado..." value={form.descricao} onChange={e=>P({descricao:e.target.value})} rows={3} style={{...F,lineHeight:1.6}}/></div>
          <div style={{marginBottom:14}}><label style={L}>Peças utilizadas</label><textarea placeholder="Liste as peças e quantidades..." value={form.pecas} onChange={e=>P({pecas:e.target.value})} rows={2} style={{...F,lineHeight:1.6}}/></div>
          <div style={{marginBottom:14}}><label style={L}>Observações</label><textarea placeholder="Informações adicionais..." value={form.obs} onChange={e=>P({obs:e.target.value})} rows={2} style={{...F,lineHeight:1.6}}/></div>
          <div style={{marginBottom:24}}><label style={L}>Fotos / Evidências</label><FotoPicker fotos={form.fotos} onChange={upd=>setForm(f=>({...f,fotos:typeof upd==="function"?upd(f.fotos):upd}))}/></div>

          <button onClick={salvar} disabled={!ok} style={{width:"100%",padding:"14px",background:ok?"var(--copper)":"var(--line)",color:ok?"#fff":"var(--ghost)",border:"none",borderRadius:10,fontWeight:600,fontSize:15,cursor:ok?"pointer":"not-allowed",letterSpacing:.3,boxShadow:ok?"0 4px 16px rgba(180,83,9,.3)":"none",transition:"all .2s"}}>
            {editing?"Salvar alterações":"Cadastrar OS"}
          </button>
        </div>
      </div>}

      {/* ══════════ DETALHE ══════════ */}
      {view==="detalhe"&&det&&(()=>{
        const os=det, tp=getTipo(os.tipo), st=getSt(os.status);
        return <div style={{paddingBottom:80}}>
          <TopBar title={`OS #${os.numero}`} sub={os.condominio||os.cliente} back={()=>setView("lista")}/>
          <div style={{padding:"0 16px 20px"}}>
            {/* banner */}
            <div style={{background:tp.bg||"var(--cloud)",border:`1px solid ${tp.cor||"var(--line)"}20`,borderRadius:13,padding:"16px 18px",marginTop:14,marginBottom:12,display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:46,height:46,borderRadius:11,background:"var(--paper)",border:`1px solid ${tp.cor||"var(--line)"}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:tp.cor,flexShrink:0,boxShadow:"0 2px 6px rgba(0,0,0,.06)"}}>{tp.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:16,fontWeight:500,color:tp.cor||"var(--ink)",lineHeight:1.2,marginBottom:6}}>{tp.label}</div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <Chip label={st.label||"?"} cor={st.cor||"#888"} bg={st.bg||"#eee"}/>
                  <span style={{fontSize:11,color:"var(--ghost)",fontFamily:"var(--mono)"}}>{os.data}</span>
                </div>
              </div>
            </div>

            {/* equipamento */}
            <div style={{background:"var(--copper3)",border:"1.5px solid #FCD34D",borderRadius:11,padding:"13px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:13}}>
              <span style={{fontSize:22,color:"var(--copper)"}}>▣</span>
              <div>
                <div style={{fontSize:9,color:"#92400E",fontWeight:600,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>Equipamento</div>
                <div style={{fontFamily:"var(--mono)",fontSize:20,fontWeight:600,color:"var(--copper)"}}>{os.equipamento}</div>
              </div>
            </div>

            {/* RIA atividades no detalhe */}
            {os.tipo==="ria"&&os.ria_atividades?.length>0&&<div style={{background:"rgba(3,105,161,.05)",border:"1px solid rgba(3,105,161,.2)",borderRadius:11,padding:"13px 15px",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:9,color:"#0369A1",fontWeight:600,letterSpacing:2,textTransform:"uppercase"}}>Atividades RIA</div>
                <div style={{fontSize:12,color:"#0369A1",fontFamily:"var(--mono)",fontWeight:500}}>
                  {os.ria_atividades.filter(a=>a.feito).length}/{os.ria_atividades.length}
                </div>
              </div>
              {/* barra progresso */}
              <div style={{height:4,background:"rgba(3,105,161,.15)",borderRadius:2,marginBottom:10,overflow:"hidden"}}>
                <div style={{height:"100%",background:"#0369A1",borderRadius:2,width:`${os.ria_atividades.length?Math.round((os.ria_atividades.filter(a=>a.feito).length/os.ria_atividades.length)*100):0}%`}}/>
              </div>
              {os.ria_atividades.map((a,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:9,padding:"6px 0",borderBottom:i<os.ria_atividades.length-1?"1px solid rgba(3,105,161,.1)":"none"}}>
                <div style={{width:16,height:16,borderRadius:4,background:a.feito?"#0369A1":"transparent",border:`1.5px solid ${a.feito?"#0369A1":"rgba(3,105,161,.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {a.feito&&<svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="2,6 5,9 10,3"/></svg>}
                </div>
                <span style={{fontSize:13,color:a.feito?"#0369A1":"var(--ink2)",fontWeight:a.feito?500:400}}>{a.label}</span>
              </div>)}
            </div>}

            {/* OS OEM */}
            {os.tipo==="troca_pecas"&&os.numeros_os?.length>0&&<div style={{background:"var(--copper3)",border:"1px solid #FDE68A",borderRadius:10,padding:"12px 15px",marginBottom:12}}>
              <div style={{fontSize:9,color:"#92400E",fontWeight:600,letterSpacing:2,textTransform:"uppercase",marginBottom:9}}>OS da OEM</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {os.numeros_os.map((n,i)=><span key={i} style={{fontSize:14,background:"#fff",border:"1px solid #FCD34D",color:"var(--copper)",borderRadius:6,padding:"6px 14px",fontFamily:"var(--mono)",fontWeight:500}}>OS {n}</span>)}
              </div>
            </div>}

            {/* infos */}
            <div style={{background:"var(--paper)",border:"1px solid var(--line)",borderRadius:10,overflow:"hidden",marginBottom:12}}>
              {[{l:"Cliente / OEM",v:os.cliente},{l:"Técnico",v:os.tecnico},{l:"Condomínio",v:os.condominio||"—"}].map(({l,v},i,a)=><div key={l}>
                <div style={{padding:"11px 15px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                  <span style={{fontSize:10,color:"var(--ghost)",fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,flexShrink:0}}>{l}</span>
                  <span style={{fontSize:14,fontWeight:400,textAlign:"right",color:"var(--ink)"}}>{v}</span>
                </div>
                {i<a.length-1&&<Rule/>}
              </div>)}
            </div>

            {[{l:"Descrição",v:os.descricao},{l:"Peças utilizadas",v:os.pecas,m:true},{l:"Observações",v:os.obs}].filter(x=>x.v).map(({l,v,m})=><div key={l} style={{background:"var(--paper)",border:"1px solid var(--line)",borderRadius:10,padding:"13px 15px",marginBottom:10}}>
              <div style={{fontSize:9,color:"var(--ghost)",fontWeight:600,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>{l}</div>
              <p style={{fontSize:13,color:m?"var(--ink)":"var(--ink2)",lineHeight:1.75,fontFamily:m?"var(--mono)":"inherit"}}>{v}</p>
            </div>)}

            <FotoViewer fotos={os.fotos}/>

            <div style={{display:"flex",gap:9,marginTop:10}}>
              <button onClick={()=>editOS(os)} style={{flex:1,padding:"13px",background:"var(--copper3)",color:"var(--copper)",border:"1px solid #FCD34D",borderRadius:10,fontWeight:600,fontSize:14,cursor:"pointer"}}>✏ Editar</button>
              <button onClick={()=>excluir(os.id)} style={{padding:"13px 16px",background:"#FEF2F2",color:"#DC2626",border:"1px solid #FECACA",borderRadius:10,fontWeight:600,fontSize:14,cursor:"pointer"}}>✕</button>
            </div>
          </div>
        </div>;
      })()}

      {view!=="form"&&!selectMode&&<Nav view={view} setView={setView} onNova={novaOS}/>}
      {showPDF&&<ModalPDF ordens={ordens} onClose={()=>setShowPDF(false)}/>}
      {showPDFSel&&<ModalPDF ordens={ordens} selecionadas={selArr} onClose={()=>{setShowPDFSel(false);sairSel();}}/>}
    </div>
  </>;
}
