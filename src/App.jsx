import React, { useState, useMemo, useRef, useEffect } from "react";

// ─── Dados e Configurações ───────────────────────────────────────────────────
const TIPOS_OS = [
  { id: "troca_pecas", label: "Troca de Peças", short: "Peças", icon: "⚙️", color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)" },
  { id: "ria", label: "Relatório de Inspeção Anual", short: "RIA", icon: "🔍", color: "#3B82F6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)" },
  { id: "corretiva", label: "Maint. Corretiva", short: "Corretiva", icon: "🔧", color: "#EF4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)" },
  { id: "diversos", label: "Serviços Diversos", short: "Diversos", icon: "📋", color: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)" },
];

const STATUS = [
  { id: "aberta", label: "Aberta", color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)" },
  { id: "em_andamento", label: "Em Andamento", color: "#3B82F6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)" },
  { id: "concluida", label: "Concluída", color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)" },
  { id: "cancelada", label: "Cancelada", color: "#9CA3AF", bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.3)" },
];

const CLIENTES = ["TK Elevadores", "Otis", "New Elevadores", "MDA", "Outro"];
const TECNICOS = ["Matheus Torres", "John Torres"];
const EMPRESA = { nome: "Torres Elevadores", cnpj: "52.019.285/0001-06", email: "aetservicecorp@gmail.com" };

const INIT = {
  numero: "", data: new Date().toISOString().split("T")[0],
  cliente: "", condominio: "", equipamento: "", tipo: "", tecnico: "",
  status: "aberta", descricao: "", pecas: "", obs: "",
  numeros_os: [], fotos: [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const gId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const gTipo = id => TIPOS_OS.find(t => t.id === id) || {};
const gSt = id => STATUS.find(s => s.id === id) || {};
const gNum = l => String(l.reduce((a, o) => { const n = parseInt(o.numero, 10); return isNaN(n) ? a : Math.max(a, n); }, 0) + 1).padStart(4, "0");

// ─── PDF Premium com Gráficos Aperfeiçoados ────────────────────────────────────
function gerarPDF(ordens, periodo) {
  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w * 2; // Hi-DPI
    c.height = h * 2;
    c.style.width = w + "px";
    c.style.height = h + "px";
    const ctx = c.getContext("2d");
    ctx.scale(2, 2);
    return { canvas: c, ctx };
  }

  function pie(cvObj, labels, vals, colors) {
    const { ctx } = cvObj;
    const W = cvObj.canvas.width / 2, H = cvObj.canvas.height / 2;
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, W, H);
    
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const cx = W * 0.35, cy = H * 0.5, r = Math.min(cx, cy) * 0.8;
    
    // Drop shadow para profundidade
    ctx.shadowColor = "rgba(15, 23, 42, 0.08)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    
    let a = -Math.PI / 2;
    vals.forEach((v, i) => {
      const s = (v / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a, a + s);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();
      a += s;
    });
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Linhas divisórias elegantes
    a = -Math.PI / 2;
    vals.forEach((v, i) => {
      const s = (v / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a, a + s);
      ctx.closePath();
      ctx.strokeStyle = "#F8FAFC";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      
      // Percentual no gráfico
      if (v > 0) {
        const m = a + s / 2;
        const pct = Math.round((v / total) * 100);
        if (pct > 6) {
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(pct + "%", cx + Math.cos(m) * r * 0.65, cy + Math.sin(m) * r * 0.65 + 4);
        }
      }
      a += s;
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = "#F8FAFC";
    ctx.fill();

    // Central text
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(total, cx, cy + 5);
    ctx.fillStyle = "#64748B";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("TOTAL", cx, cy + 17);

    // Legenda lateral
    const lx = W * 0.65, ly0 = H * 0.15;
    labels.forEach((lb, i) => {
      if (!vals[i]) return;
      const ly = ly0 + i * 32;
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.arc(lx + 6, ly + 6, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(vals[i] + "x", lx + 20, ly + 10);
      
      ctx.fillStyle = "#64748B";
      ctx.font = "9px sans-serif";
      ctx.fillText(lb, lx + 45, ly + 10);
    });
  }

  function bar(cvObj, labels, vals, colors) {
    const { ctx } = cvObj;
    const W = cvObj.canvas.width / 2, H = cvObj.canvas.height / 2;
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, W, H);
    
    const pL = 30, pR = 20, pT = 20, pB = 40, cW = W - pL - pR, cH = H - pT - pB;
    const max = Math.max(...vals, 1);
    const bW = Math.min(45, (cW / labels.length) * 0.5);

    // Gridlines horizontais
    [0.5, 1].forEach(f => {
      const gy = pT + cH * (1 - f);
      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pL, gy);
      ctx.lineTo(pL + cW, gy);
      ctx.stroke();
      
      ctx.fillStyle = "#94A3B8";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(Math.round(max * f), pL - 6, gy + 3);
    });

    labels.forEach((lb, i) => {
      const bx = pL + (cW / labels.length) * i + (cW / labels.length - bW) / 2;
      const bh = Math.max((vals[i] / max) * cH, vals[i] > 0 ? 4 : 0);
      const by = pT + cH - bh;

      // Sombra projetada leve na barra
      ctx.shadowColor = colors[i % colors.length] + "33";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = colors[i % colors.length];
      
      // Draw rounded rectangle manually for compatibility
      const r = Math.min(4, bh);
      ctx.beginPath();
      ctx.moveTo(bx, by + bh);
      ctx.lineTo(bx, by + r);
      ctx.quadraticCurveTo(bx, by, bx + r, by);
      ctx.lineTo(bx + bW - r, by);
      ctx.quadraticCurveTo(bx + bW, by, bx + bW, by + r);
      ctx.lineTo(bx + bW, by + bh);
      ctx.closePath();
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      if (vals[i] > 0) {
        ctx.fillStyle = bh > 18 ? "#FFFFFF" : colors[i % colors.length];
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(vals[i], bx + bW / 2, bh > 18 ? by + 12 : by - 4);
      }

      ctx.fillStyle = "#64748B";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(lb.length > 11 ? lb.slice(0, 10) + "…" : lb, bx + bW / 2, pT + cH + 15);
    });
  }

  const cv1 = makeCanvas(560, 200);
  pie(cv1, TIPOS_OS.map(t => t.label), TIPOS_OS.map(t => ordens.filter(o => o.tipo === t.id).length), TIPOS_OS.map(t => t.color));
  
  const cv2 = makeCanvas(260, 160);
  bar(cv2, STATUS.map(s => s.label), STATUS.map(s => ordens.filter(o => o.status === s.id).length), STATUS.map(s => s.color));
  
  const cv3 = makeCanvas(260, 160);
  bar(cv3, TECNICOS, TECNICOS.map(t => ordens.filter(o => o.tecnico === t).length), ["#0F172A", "#D97706"]);

  const i1 = cv1.canvas.toDataURL("image/png");
  const i2 = cv2.canvas.toDataURL("image/png");
  const i3 = cv3.canvas.toDataURL("image/png");

  const per = periodo.inicio && periodo.fim ? `${periodo.inicio} — ${periodo.fim}` : periodo.inicio ? `A partir de ${periodo.inicio}` : periodo.fim ? `Até ${periodo.fim}` : "Todos os registros";
  const pSt = Object.fromEntries(STATUS.map(s => [s.id, ordens.filter(o => o.status === s.id).length]));
  const agora = new Date().toLocaleString("pt-BR");

  const rows = ordens.map((os, i) => {
    const tp = gTipo(os.tipo), st = gSt(os.status);
    return `<tr style="background:${i % 2 === 0 ? "#FAFBFC" : "#FFFFFF"}; border-bottom:1px solid #E2E8F0">
      <td style="padding:10px; font-family:monospace; font-weight:700; color:#0F172A; font-size:11px">#${os.numero}</td>
      <td style="padding:10px; font-family:monospace; font-size:11px; color:#475569">${os.data.split("-").reverse().join("/")}</td>
      <td style="padding:10px; font-size:11px; font-weight:600; color:${tp.color || "#334155"}">${tp.label || "—"}</td>
      <td style="padding:10px; font-size:11px; color:#1E293B"><strong>${os.condominio || "—"}</strong><br/><span style="font-size:10px; color:#64748B">${os.cliente || "—"}</span></td>
      <td style="padding:10px; font-family:monospace; font-size:11px; font-weight:700; color:#0F172A">${os.equipamento || "—"}</td>
      <td style="padding:10px; font-size:11px; color:#334155">${os.tecnico || "—"}</td>
      <td style="padding:10px; text-align:right"><span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:9px; font-weight:700; color:${st.color}; background:${st.bg}">${st.label || "—"}</span></td>
    </tr>`;
  }).join("");

  const statCardHtml = (label, val, color, bg) => `
    <div style="flex:1; background:#ffffff; border-radius:8px; padding:12px; border:1px solid #E2E8F0; border-top:3px solid ${color}; text-align:center">
      <div style="font-size:18px; font-weight:800; color:${color}; font-family:monospace">${val}</div>
      <div style="font-size:9px; color:#64748B; margin-top:2px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px">${label}</div>
    </div>`;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <title>Relatório — Torres Elevadores</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Plus Jakarta Sans',Arial,sans-serif;background:#F8FAFB;color:#0F172A;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{max-width:840px;margin:20px auto;background:#fff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.05);overflow:hidden;border:1px solid #E2E8F0}
    .hdr{background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);padding:30px;color:#fff;position:relative}
    .hdr-logo{font-size:24px;font-weight:800;letter-spacing:-0.5px}
    .hdr-logo span{color:#F59E0B}
    .hdr-meta{color:#94A3B8;font-size:11px;margin-top:4px}
    .per-badge{position:absolute;right:30px;top:30px;text-align:right}
    .per-title{font-size:13px;font-weight:700;color:#F59E0B}
    .per-date{font-size:10px;color:#94A3B8;margin-top:2px}
    .body{padding:30px}
    .section{margin-bottom:30px}
    .sec-title{font-size:11px;font-weight:800;color:#64748B;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:10px}
    .sec-title::after{content:'';flex:1;height:1px;background:#E2E8F0}
    .cards-grid{display:flex;gap:12px;margin-bottom:25px}
    .charts-row{display:flex;gap:20px;margin-bottom:25px}
    .chart-container{background:#F8FAFB;border:1px solid #E2E8F0;border-radius:12px;padding:15px;display:flex;justify-content:center;align-items:center}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th{background:#0F172A;color:#FFFFFF;font-size:9px;font-weight:700;text-transform:uppercase;padding:10px;text-align:left;letter-spacing:1px}
    .ftr{background:#F8FAFB;border-top:1px solid #E2E8F0;padding:15px 30px;display:flex;justify-content:space-between;font-size:10px;color:#64748B}
    @media print{
      body{background:#fff;margin:0}
      .page{max-width:100%;border:none;box-shadow:none;border-radius:0;margin:0}
      @page{margin:1.2cm;size:A4}
    }
  </style></head><body>
  <div class="page">
    <div class="hdr">
      <div class="hdr-logo">Torres <span>Elevadores</span></div>
      <div class="hdr-meta">CNPJ: ${EMPRESA.cnpj} &nbsp;·&nbsp; ${EMPRESA.email}</div>
      <div class="per-badge">
        <div class="per-title">${per}</div>
        <div class="per-date">Emitido em: ${agora}</div>
      </div>
    </div>
    <div class="body">
      <div class="cards-grid">
        ${statCardHtml("Total OS", ordens.length, "#0F172A", "rgba(15,23,42,0.05)")}
        ${statCardHtml("Concluídas", pSt["concluida"] || 0, "#10B981", "rgba(16,185,129,0.05)")}
        ${statCardHtml("Em Andamento", pSt["em_andamento"] || 0, "#3B82F6", "rgba(59,130,246,0.05)")}
        ${statCardHtml("Abertas", pSt["aberta"] || 0, "#F59E0B", "rgba(245,158,11,0.05)")}
        ${statCardHtml("Canceladas", pSt["cancelada"] || 0, "#9CA3AF", "rgba(156,163,175,0.05)")}
      </div>

      <div class="section">
        <div class="sec-title">Distribuição de Tipos de Serviço</div>
        <div class="chart-container"><img src="${i1}" style="width:100%; max-width:560px; height:auto;"/></div>
      </div>

      <div class="section">
        <div class="charts-row">
          <div style="flex:1">
            <div class="sec-title">Produtividade por Status</div>
            <div class="chart-container"><img src="${i2}" style="width:100%; height:auto;"/></div>
          </div>
          <div style="flex:1">
            <div class="sec-title">OS por Técnico</div>
            <div class="chart-container"><img src="${i3}" style="width:100%; height:auto;"/></div>
          </div>
        </div>
      </div>

      <div class="section" style="page-break-before:always">
        <div class="sec-title">Listagem Detalhada</div>
        <div style="border:1px solid #E2E8F0; border-radius:10px; overflow:hidden">
          <table>
            <thead>
              <tr>
                <th>OS#</th>
                <th>Data</th>
                <th>Tipo de Serviço</th>
                <th>Local / Cliente</th>
                <th>Equip.</th>
                <th>Técnico</th>
                <th style="text-align:right">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="ftr">
      <span><strong>${EMPRESA.nome}</strong> &nbsp;·&nbsp; CNPJ ${EMPRESA.cnpj}</span>
      <span>Página 1 de 1</span>
    </div>
  </div>
  <script>setTimeout(function(){ window.print(); }, 800);</script>
  </body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.download = "Torres_Relatorio.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ─── Ícones Vetoriais SVG Premium ──────────────────────────────────────────
const Icon = {
  Plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  Dashboard: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  List: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </svg>
  ),
  Search: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.603 10.603z" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  ),
  Delete: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  ),
  PDF: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  Elevator: () => (
    <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 0l-10.5 3.82M17.25 3.545L6.75 7.364M6.75 7.364V21" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
};

// ─── Componentes Atômicos Premium ───────────────────────────────────────────
function Pill({ label, color, bg, border }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all border"
      style={{ color, backgroundColor: bg, borderColor: border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-lg shadow-slate-950/20 hover:border-slate-700/60 transition-all duration-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Top Bar Premium ─────────────────────────────────────────────────────────
function TopBar({ title, subtitle, onBack, onPDF }) {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-900/80 px-4 py-3">
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 active:scale-95 transition-all"
            >
              <Icon.ArrowLeft />
            </button>
          ) : (
            <div className="flex items-center gap-2 pr-3 border-r border-slate-800/80">
              <div className="bg-gradient-to-tr from-amber-600 to-amber-400 p-1.5 rounded-xl shadow-md shadow-amber-500/10">
                <svg className="w-5 h-5 text-slate-950" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              </div>
              <div>
                <span className="block text-[8px] text-amber-500 font-extrabold tracking-[0.2em] leading-none">TORRES</span>
                <span className="block text-xs font-black text-slate-100 tracking-tight leading-none mt-0.5">Elevadores</span>
              </div>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-extrabold text-slate-100 truncate leading-tight">{title}</h1>
            {subtitle && <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {onPDF && (
          <button
            onClick={onPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 border border-amber-500/30 hover:border-amber-500/50 text-amber-400 font-bold text-xs transition-all"
          >
            <Icon.PDF />
            Relatório
          </button>
        )}
      </div>
    </header>
  );
}

// ─── Bottom Navigation Premium ──────────────────────────────────────────────
function BottomNav({ view, setView, onNova }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-lg border-t border-slate-900/80 py-2">
      <div className="max-w-md mx-auto px-6 flex items-center justify-between relative">
        <button
          onClick={() => setView("dashboard")}
          className={`flex flex-col items-center gap-1 py-1.5 transition-all w-16 relative ${view === "dashboard" ? "text-amber-500" : "text-slate-500"}`}
        >
          <Icon.Dashboard />
          <span className="text-[10px] font-bold tracking-wider">Início</span>
          {view === "dashboard" && <span className="absolute bottom-0 w-8 h-1 bg-amber-500 rounded-full" />}
        </button>

        {/* Botão Flutuante Elevado no Centro */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6">
          <button
            onClick={onNova}
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 font-black flex items-center justify-center shadow-xl shadow-amber-500/20 active:scale-95 hover:brightness-110 transition-all border border-amber-400/20"
          >
            <Icon.Plus />
          </button>
        </div>
        <div className="w-14" /> {/* Espaçador */}

        <button
          onClick={() => setView("lista")}
          className={`flex flex-col items-center gap-1 py-1.5 transition-all w-16 relative ${view === "lista" ? "text-amber-500" : "text-slate-500"}`}
        >
          <Icon.List />
          <span className="text-[10px] font-bold tracking-wider">Listagem</span>
          {view === "lista" && <span className="absolute bottom-0 w-8 h-1 bg-amber-500 rounded-full" />}
        </button>
      </div>
    </nav>
  );
}

// ─── Stat Card Premium ───────────────────────────────────────────────────────
function StatCard({ val, lbl, color, bg, icon }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 flex-1 min-w-0 border transition-all duration-300 shadow-md"
      style={{
        backgroundColor: "rgba(30, 41, 59, 0.4)",
        borderColor: "rgba(51, 65, 85, 0.3)",
      }}
    >
      <div className="absolute -top-3 -right-3 text-4xl opacity-10 select-none">
        {icon}
      </div>
      <div className="text-2xl font-black tracking-tight font-mono" style={{ color }}>
        {val}
      </div>
      <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-1 truncate">
        {lbl}
      </div>
    </div>
  );
}

// ─── OS Card Premium ─────────────────────────────────────────────────────────
function OSCard({ os, onTap, onEdit, onDelete }) {
  const tp = gTipo(os.tipo);
  const st = gSt(os.status);
  
  return (
    <div
      onClick={() => onTap(os)}
      className="group relative overflow-hidden bg-slate-900/50 backdrop-blur-md border border-slate-800/80 hover:border-slate-700/60 rounded-2xl p-4 shadow-lg active:scale-[0.99] transition-all duration-200 cursor-pointer mb-3"
    >
      {/* Indicador de Tipo de Serviço na lateral */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: tp.color || "#475569" }} />

      <div className="flex items-start gap-3">
        {/* Avatar Circular com Ícone de Tipo */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border"
          style={{ backgroundColor: tp.bg, borderColor: tp.border }}
        >
          {tp.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-mono text-xs font-black tracking-wider text-amber-500">#{os.numero}</span>
            <Pill label={st.label} color={st.color} bg={st.bg} border={st.border} />
            {os.fotos?.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 font-bold">
                📷 {os.fotos.length}
              </span>
            )}
          </div>

          <h3 className="text-sm font-extrabold text-slate-100 truncate mb-1">
            {os.condominio || os.cliente}
          </h3>

          {os.equipamento && (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-950/60 border border-slate-800 rounded-lg mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[10px] text-slate-300 font-mono font-bold uppercase">{os.equipamento}</span>
            </div>
          )}

          {/* Se for troca de peças, exibe as OS associadas da OEM */}
          {os.tipo === "troca_pecas" && os.numeros_os?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {os.numeros_os.map((n, i) => (
                <span key={i} className="text-[9px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
                  OEM: {n}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
            <span className="font-bold" style={{ color: tp.color }}>{tp.short}</span>
            <span className="text-slate-800">•</span>
            <span className="font-mono">{os.data.split("-").reverse().join("/")}</span>
            <span className="text-slate-800">•</span>
            <span className="truncate max-w-[100px]">{os.tecnico}</span>
          </div>
        </div>

        {/* Painel de Ações Rápidas */}
        <div className="flex flex-col gap-1.5 pl-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onEdit(os)}
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 text-amber-400 flex items-center justify-center hover:bg-slate-700 active:scale-90 transition-all"
          >
            <Icon.Edit />
          </button>
          <button
            onClick={() => onDelete(os.id)}
            className="w-8 h-8 rounded-lg bg-red-950/20 border border-red-900/30 text-red-400 flex items-center justify-center hover:bg-red-900/20 active:scale-90 transition-all"
          >
            <Icon.Delete />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Multi OS Input Premium ──────────────────────────────────────────────────
function MultiOSInput({ value = [], onChange }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setDraft("");
  };
  
  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Número da OS da OEM..."
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-100 px-3.5 py-2.5 rounded-xl text-sm font-mono focus:outline-none transition-all"
        />
        <button
          onClick={add}
          type="button"
          className="px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl active:scale-95 transition-all text-xl"
        >
          +
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {value.map((n, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 border border-slate-850 rounded-lg text-xs text-amber-400 font-mono font-bold">
              OS {n}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, x) => x !== i))}
                className="text-amber-500/50 hover:text-red-400 font-bold text-sm ml-1"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Photo Picker Premium ────────────────────────────────────────────────────
function PhotoPicker({ fotos = [], onChange }) {
  const ref = useRef();
  const handle = e => {
    Array.from(e.target.files).forEach(f => {
      const r = new FileReader();
      r.onload = ev => onChange(p => [...p, { id: gId(), dataUrl: ev.target.result, name: f.name }]);
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };
  
  return (
    <div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={handle} />
      <button
        type="button"
        onClick={() => ref.current.click()}
        className="w-full py-4 bg-slate-950/40 hover:bg-slate-950/80 border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
        </svg>
        Adicionar Fotos / Evidências de Campo
      </button>
      
      {fotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {fotos.map(f => (
            <div key={f.id} className="relative group rounded-xl overflow-hidden aspect-square border border-slate-800 bg-slate-950">
              <img src={f.dataUrl} alt={f.name} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(p => p.filter(x => x.id !== f.id))}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-950/80 backdrop-blur-md text-red-500 font-bold flex items-center justify-center border border-slate-800 hover:bg-slate-900 active:scale-90 transition-all text-sm"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Photo Viewer Premium ────────────────────────────────────────────────────
function PhotoViewer({ fotos = [] }) {
  const [lb, setLb] = useState(null);
  if (!fotos?.length) return null;
  
  return (
    <>
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-lg mb-3">
        <h4 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <span>📷</span> Fotos de Campo ({fotos.length})
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {fotos.map(f => (
            <div
              key={f.id}
              onClick={() => setLb(f)}
              className="rounded-xl overflow-hidden aspect-square border border-slate-800/80 cursor-pointer bg-slate-950 hover:border-slate-600 transition-all"
            >
              <img src={f.dataUrl} alt={f.name} className="w-full h-full object-cover hover:scale-105 transition-all duration-300" />
            </div>
          ))}
        </div>
      </div>
      {lb && (
        <div
          onClick={() => setLb(null)}
          className="fixed inset-0 bg-slate-950/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <img src={lb.dataUrl} alt={lb.name} className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl shadow-slate-950/50" />
          <button className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 p-2.5 rounded-full text-lg">×</button>
        </div>
      )}
    </>
  );
}

// ─── Modal PDF Premium ────────────────────────────────────────────────────────
function ModalPDF({ ordens, onClose }) {
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [loading, setLoading] = useState(false);

  const filtradas = useMemo(() => ordens.filter(o => {
    if (inicio && o.data < inicio) return false;
    if (fim && o.data > fim) return false;
    return true;
  }), [ordens, inicio, fim]);

  const handle = () => {
    if (!filtradas.length) return;
    setLoading(true);
    setTimeout(() => {
      try {
        gerarPDF(filtradas, { inicio, fim });
      } finally {
        setLoading(false);
      }
    }, 120);
  };

  const pTipo = TIPOS_OS.map(t => ({ ...t, c: filtradas.filter(o => o.tipo === t.id).length }));

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-center py-2.5 sm:hidden">
          <div className="w-10 h-1 bg-slate-800 rounded-full" />
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-100">Gerar Relatório Analítico</h2>
              <p className="text-xs text-slate-400 mt-1">Gere relatórios elegantes e emita em PDF</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-slate-200 flex items-center justify-center"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div>
              <label className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mb-2">Data de Início</label>
              <input
                type="date"
                value={inicio}
                onChange={e => setInicio(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-amber-500 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mb-2">Data Limite</label>
              <input
                type="date"
                value={fim}
                onChange={e => setFim(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-amber-500 text-slate-100"
              />
            </div>
          </div>

          {/* Mini Chart Preview */}
          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-850 mb-6">
            <h3 className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mb-3">
              Pré-Visualização ({filtradas.length} OS no período)
            </h3>
            {pTipo.map(t => (
              <div key={t.id} className="flex items-center gap-2 mb-2">
                <span className="text-sm">{t.icon}</span>
                <div className="flex-1 bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${filtradas.length ? Math.round((t.c / filtradas.length) * 100) : 0}%`,
                      backgroundColor: t.color
                    }}
                  />
                </div>
                <span className="text-xs font-mono font-bold w-6 text-right" style={{ color: t.color }}>{t.c}</span>
              </div>
            ))}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-6 flex gap-2.5">
            <span className="text-amber-500 text-lg">💡</span>
            <p className="text-xs text-amber-500/90 leading-relaxed">
              O relatório será aberto em uma nova guia. Basta usar a opção de impressão e selecionar <strong>"Salvar como PDF"</strong>.
            </p>
          </div>

          <button
            onClick={handle}
            disabled={!filtradas.length || loading}
            className={`w-full py-3.5 rounded-xl text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-2 ${
              filtradas.length && !loading
                ? "bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/10 font-extrabold"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            {loading ? "Processando..." : filtradas.length ? `Gerar PDF — ${filtradas.length} OS` : "Sem registros no período"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App Principal ───────────────────────────────────────────────────────────
export default function App() {
  const [ordens, setOrdens] = useState([]);
  const [view, setView] = useState("dashboard");
  const [editing, setEditing] = useState(null);
  const [detId, setDetId] = useState(null);
  const [form, setForm] = useState(INIT);
  const [filtros, setFiltros] = useState({ tipo: "", status: "", cliente: "", data: "" });
  const [busca, setBusca] = useState("");
  const [showFilt, setShowFilt] = useState(false);
  const [showPDF, setShowPDF] = useState(false);

  const updateForm = p => setForm(f => ({ ...f, ...p }));
  const hoje = new Date().toISOString().split("T")[0];

  const stats = useMemo(() => ({
    total: ordens.length,
    hoje: ordens.filter(o => o.data === hoje).length,
    abertas: ordens.filter(o => o.status === "aberta").length,
    andamento: ordens.filter(o => o.status === "em_andamento").length,
    concluidas: ordens.filter(o => o.status === "concluida").length,
  }), [ordens, hoje]);

  const filtradas = useMemo(() => ordens.filter(o => {
    if (filtros.tipo && o.tipo !== filtros.tipo) return false;
    if (filtros.status && o.status !== filtros.status) return false;
    if (filtros.cliente && o.cliente !== filtros.cliente) return false;
    if (filtros.data && o.data !== filtros.data) return false;
    if (busca && ![o.numero, o.condominio, o.equipamento, o.cliente].some(v => v?.toLowerCase().includes(busca.toLowerCase()))) return false;
    return true;
  }), [ordens, filtros, busca]);

  const temFiltro = Object.values(filtros).some(Boolean) || !!busca;
  
  const novaOS = () => {
    setForm({ ...INIT, numero: gNum(ordens), data: hoje });
    setEditing(null);
    setView("form");
  };

  const editOS = os => {
    setForm({ ...os });
    setEditing(os.id);
    setView("form");
  };

  const salvar = () => {
    if (!form.cliente || !form.tipo || !form.equipamento || !form.tecnico) return;
    editing
      ? setOrdens(p => p.map(o => o.id === editing ? { ...form, id: editing } : o))
      : setOrdens(p => [{ ...form, id: gId() }, ...p]);
    setView("lista");
    setEditing(null);
  };

  const excluir = id => {
    if (window.confirm("Deseja realmente excluir permanentemente esta Ordem de Serviço?")) {
      setOrdens(p => p.filter(o => o.id !== id));
      if (detId === id) setView("lista");
    }
  };

  const verDet = os => {
    setDetId(os.id);
    setView("detalhe");
  };

  const det = ordens.find(o => o.id === detId);
  const ok = form.cliente && form.tipo && form.equipamento && form.tecnico;

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen pb-24 selection:bg-amber-500 selection:text-slate-950">
      <div className="max-w-lg mx-auto bg-slate-950 min-h-screen shadow-2xl relative border-x border-slate-900/60">

        {/* ══ DASHBOARD ══ */}
        {view === "dashboard" && (
          <div className="animate-fadeIn">
            <TopBar title="Painel de Controle" onPDF={() => setShowPDF(true)} />
            
            <div className="px-4 py-5">
              {/* Banner Corporativo */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800/80 p-5 mb-5 shadow-lg shadow-slate-950/50">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
                <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-widest">Torres Elevadores</span>
                <h2 className="text-lg font-black text-slate-100 tracking-tight mt-1">Gestão Inteligente de Campo</h2>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">Monitore preventivas, corretivas e envie relatórios analíticos de campo num clique.</p>
              </div>

              {/* Grid de Estatísticas */}
              <div className="flex gap-2.5 mb-2.5">
                <StatCard val={stats.total} lbl="Total OS" color="#F1F5F9" icon="📋" />
                <StatCard val={stats.hoje} lbl="Registradas Hoje" color="#F59E0B" icon="📅" />
              </div>
              <div className="flex gap-2.5 mb-6">
                <StatCard val={stats.abertas} lbl="Abertas" color="#F59E0B" icon="🔓" />
                <StatCard val={stats.andamento} lbl="Em Andamento" color="#3B82F6" icon="⚡" />
                <StatCard val={stats.concluidas} lbl="Concluídas" color="#10B981" icon="✅" />
              </div>

              {/* Indicadores Visuais de Tipo */}
              <h3 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-3">Distribuição por Serviço</h3>
              <div className="grid grid-cols-2 gap-2.5 mb-6">
                {TIPOS_OS.map(t => {
                  const count = ordens.filter(o => o.tipo === t.id).length;
                  return (
                    <div
                      key={t.id}
                      className="bg-slate-900/40 border border-slate-850 rounded-xl p-3.5 flex items-center gap-3"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                        style={{ backgroundColor: t.bg }}
                      >
                        {t.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-lg font-black font-mono leading-none" style={{ color: t.color }}>{count}</div>
                        <div className="text-[9px] text-slate-400 font-bold mt-1 truncate">{t.short}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recentes */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Últimas Atividades</h3>
                {ordens.length > 0 && (
                  <button
                    onClick={() => setView("lista")}
                    className="text-xs text-amber-500 font-bold flex items-center gap-1 hover:underline"
                  >
                    Ver Tudo →
                  </button>
                )}
              </div>

              {ordens.length === 0 ? (
                <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl p-8 text-center">
                  <Icon.Elevator />
                  <h4 className="text-slate-300 font-bold text-sm mt-3">Tudo pronto para começar</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto mb-4">Ainda não há Ordens de Serviço cadastradas no sistema local.</p>
                  <button
                    onClick={novaOS}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 text-xs font-black"
                  >
                    <Icon.Plus /> Cadastrar Primeira OS
                  </button>
                </div>
              ) : (
                ordens.slice(0, 4).map(os => (
                  <OSCard key={os.id} os={os} onTap={verDet} onEdit={editOS} onDelete={excluir} />
                ))
              )}
            </div>
          </div>
        )}

        {/* ══ LISTAGEM ══ */}
        {view === "lista" && (
          <div className="animate-fadeIn">
            <TopBar title="Ordens de Serviço" subtitle={`${filtradas.length} de ${ordens.length} OS registradas`} onPDF={() => setShowPDF(true)} />
            
            <div className="px-4 py-4">
              {/* Barra de Busca Premium */}
              <div className="relative mb-3.5">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                  <Icon.Search />
                </div>
                <input
                  type="text"
                  placeholder="Pesquise por OS, condomínio, equip. ..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800/80 focus:border-amber-500 text-slate-100 pl-11 pr-4 py-3 rounded-2xl text-sm focus:outline-none transition-all placeholder-slate-500"
                />
              </div>

              {/* Botões de Filtro */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setShowFilt(!showFilt)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    showFilt
                      ? "bg-amber-500/10 border-amber-500/50 text-amber-400"
                      : "bg-slate-900 border-slate-850 text-slate-400"
                  }`}
                >
                  <Icon.Filter />
                  Filtros Avançados
                  {temFiltro && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                </button>
                {temFiltro && (
                  <button
                    onClick={() => {
                      setFiltros({ tipo: "", status: "", cliente: "", data: "" });
                      setBusca("");
                    }}
                    className="px-4 py-2.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-xs font-bold"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Menu de Filtros Expandido */}
              {showFilt && (
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 mb-4 grid grid-cols-1 gap-2.5">
                  <select
                    value={filtros.tipo}
                    onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="">Todos os tipos de serviço</option>
                    {TIPOS_OS.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                  </select>

                  <select
                    value={filtros.status}
                    onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="">Todos os status</option>
                    {STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>

                  <select
                    value={filtros.cliente}
                    onChange={e => setFiltros(f => ({ ...f, cliente: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="">Todos os clientes/OEMs</option>
                    {CLIENTES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <div className="relative">
                    <input
                      type="date"
                      value={filtros.data}
                      onChange={e => setFiltros(f => ({ ...f, data: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-xs text-slate-300 font-mono focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Lista Principal */}
              {filtradas.length === 0 ? (
                <div className="bg-slate-900/20 border border-slate-800 rounded-2xl p-10 text-center">
                  <p className="text-sm text-slate-500 font-bold">Nenhum registro encontrado.</p>
                  <p className="text-xs text-slate-600 mt-1">Refine seus filtros de busca ou cadastre uma nova OS.</p>
                </div>
              ) : (
                filtradas.map(os => (
                  <OSCard key={os.id} os={os} onTap={verDet} onEdit={editOS} onDelete={excluir} />
                ))
              )}
            </div>
          </div>
        )}

        {/* ══ FORMULÁRIO DE CADASTRAR / EDITAR ══ */}
        {view === "form" && (
          <div className="animate-fadeIn">
            <TopBar
              title={editing ? "Editar OS" : "Nova Ordem de Serviço"}
              subtitle={`NÚMERO DA OS #${form.numero}`}
              onBack={() => setView(editing ? "detalhe" : "lista")}
            />

            <div className="px-4 py-5 space-y-5">
              {/* Seletor Visual de Tipo de Serviço */}
              <div>
                <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-3">
                  Tipo de Serviço *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS_OS.map(t => {
                    const active = form.tipo === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => updateForm({ tipo: t.id })}
                        className="flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer"
                        style={{
                          backgroundColor: active ? t.bg : "rgba(15, 23, 42, 0.4)",
                          borderColor: active ? t.color : "rgba(51, 65, 85, 0.3)",
                        }}
                      >
                        <span className="text-xl flex-shrink-0">{t.icon}</span>
                        <span className={`text-[11px] font-extrabold leading-tight ${active ? "text-slate-100" : "text-slate-400"}`}>
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Multi-OS OEM condicional se for Troca de Peças */}
              {form.tipo === "troca_pecas" && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                  <label className="block text-[10px] text-amber-500 font-extrabold uppercase tracking-widest mb-2">
                    Código/Número de OS da OEM (Troca de Peças)
                  </label>
                  <MultiOSInput value={form.numeros_os} onChange={v => updateForm({ numeros_os: v })} />
                  <p className="text-[10px] text-slate-500 mt-2">Dica: Adicione vários códigos da OEM caso o serviço envolva mais de uma requisição.</p>
                </div>
              )}

              {/* Data e Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-2">Data *</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={e => updateForm({ data: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-2">Status</label>
                  <select
                    value={form.status}
                    onChange={e => updateForm({ status: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-2">Cliente / Parceiro *</label>
                <select
                  value={form.cliente}
                  onChange={e => updateForm({ cliente: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Selecione o Cliente / Fabricante...</option>
                  {CLIENTES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Técnico */}
              <div>
                <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-2">Técnico Operador *</label>
                <select
                  value={form.tecnico}
                  onChange={e => updateForm({ tecnico: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Selecione o Técnico Responsável...</option>
                  {TECNICOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Condomínio */}
              <div>
                <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-2">Local / Condomínio</label>
                <input
                  type="text"
                  placeholder="Ex: Condomínio Residencial Plaza"
                  value={form.condominio}
                  onChange={e => updateForm({ condominio: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Equipamento */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                <label className="block text-[10px] text-amber-500 font-extrabold uppercase tracking-widest mb-2">
                  ▣ Identificação do Equipamento *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Elevador Social 01 / Série E-2204"
                  value={form.equipamento}
                  onChange={e => updateForm({ equipamento: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-3 text-sm font-mono text-amber-500 focus:outline-none focus:border-amber-500 font-extrabold"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-2">Descrição dos Serviços</label>
                <textarea
                  placeholder="Descreva as ações preventivas, corretivas ou RIA efetuadas..."
                  value={form.descricao}
                  onChange={e => updateForm({ descricao: e.target.value })}
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              {/* Peças */}
              <div>
                <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-2">Peças / Insumos Utilizados</label>
                <textarea
                  placeholder="Descreva as peças substituídas ou materiais novos..."
                  value={form.pecas}
                  onChange={e => updateForm({ pecas: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                />
              </div>

              {/* Obs */}
              <div>
                <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-2">Observações / Próximos Passos</label>
                <textarea
                  placeholder="Alertas, restrições ou pendências..."
                  value={form.obs}
                  onChange={e => updateForm({ obs: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              {/* Fotos */}
              <div>
                <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-2">Registro Fotográfico</label>
                <PhotoPicker fotos={form.fotos} onChange={upd => setForm(f => ({ ...f, fotos: typeof upd === "function" ? upd(f.fotos) : upd }))} />
              </div>

              {/* Botão Salvar */}
              <button
                type="button"
                onClick={salvar}
                disabled={!ok}
                className={`w-full py-4 rounded-xl text-sm font-black tracking-wider transition-all duration-200 active:scale-95 ${
                  ok
                    ? "bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/10 hover:brightness-110"
                    : "bg-slate-850 text-slate-600 cursor-not-allowed"
                }`}
              >
                {editing ? "💾 SALVAR ATUALIZAÇÕES" : "✅ REGISTRAR ORDEM DE SERVIÇO"}
              </button>
            </div>
          </div>
        )}

        {/* ══ DETALHES DA ORDEM ══ */}
        {view === "detalhe" && det && (() => {
          const os = det;
          const tp = gTipo(os.tipo);
          const st = gSt(os.status);
          
          return (
            <div className="animate-fadeIn">
              <TopBar title={`Ordem #${os.numero}`} subtitle={os.condominio || os.cliente} onBack={() => setView("lista")} />
              
              <div className="px-4 py-5 space-y-4">
                {/* Cabeçalho do Cartão Principal */}
                <div
                  className="relative overflow-hidden rounded-2xl p-5 border flex items-center gap-4 shadow-lg shadow-slate-950/40"
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.4)",
                    borderColor: "rgba(51, 65, 85, 0.3)",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: tp.bg, borderColor: tp.border }}
                  >
                    {tp.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-100 leading-tight mb-2">{tp.label}</h3>
                    <div className="flex items-center gap-2">
                      <Pill label={st.label} color={st.color} bg={st.bg} border={st.border} />
                      <span className="text-[11px] font-mono text-slate-400">{os.data.split("-").reverse().join("/")}</span>
                    </div>
                  </div>
                </div>

                {/* Bloco de Destaque para o Equipamento */}
                <div className="bg-gradient-to-tr from-amber-600/10 to-amber-400/5 border border-amber-500/35 rounded-2xl p-4 flex items-center gap-3">
                  <div className="text-2xl text-amber-500">▣</div>
                  <div>
                    <span className="block text-[8px] text-amber-500/70 font-extrabold uppercase tracking-widest leading-none">Equipamento Identificado</span>
                    <span className="block text-lg font-black font-mono text-amber-400 tracking-wider mt-1">{os.equipamento}</span>
                  </div>
                </div>

                {/* Seções de OS da OEM */}
                {os.tipo === "troca_pecas" && os.numeros_os?.length > 0 && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                    <span className="block text-[9px] text-amber-500 font-extrabold uppercase tracking-wider mb-2.5">OS da OEM Relacionadas</span>
                    <div className="flex flex-wrap gap-2">
                      {os.numeros_os.map((n, i) => (
                        <span key={i} className="text-xs font-mono font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-xl">
                          OS {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Informações detalhadas do serviço */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg">
                  {[
                    { label: "Cliente / OEM", value: os.cliente },
                    { label: "Técnico de Campo", value: os.tecnico },
                    { label: "Condomínio / Local", value: os.condominio || "—" },
                  ].map((item, idx, arr) => (
                    <div key={item.label}>
                      <div className="px-5 py-3.5 flex justify-between items-center gap-4 text-xs">
                        <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">{item.label}</span>
                        <span className="text-slate-100 font-bold text-right">{item.value}</span>
                      </div>
                      {idx < arr.length - 1 && <div className="h-px bg-slate-850" />}
                    </div>
                  ))}
                </div>

                {/* Campos de texto longos */}
                {[
                  { label: "Descrição dos Trabalhos", value: os.descricao },
                  { label: "Peças Instaladas", value: os.pecas, isMono: true },
                  { label: "Observações Gerais", value: os.obs }
                ].filter(x => x.value).map(item => (
                  <div key={item.label} className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4.5">
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mb-2">{item.label}</span>
                    <p className={`text-xs text-slate-300 leading-relaxed ${item.isMono ? "font-mono" : ""}`}>
                      {item.value}
                    </p>
                  </div>
                ))}

                {/* Exibição das Fotos */}
                <PhotoViewer fotos={os.fotos} />

                {/* Painel de Controle Inferior */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => editOS(os)}
                    className="flex-1 py-3.5 bg-amber-500 text-slate-950 font-black rounded-xl text-xs tracking-wider active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Icon.Edit />
                    EDITAR ORDEM
                  </button>
                  <button
                    onClick={() => excluir(os.id)}
                    className="px-4 py-3.5 bg-red-950/20 border border-red-900/30 hover:bg-red-900/20 text-red-400 rounded-xl text-xs active:scale-95 transition-all"
                  >
                    <Icon.Delete />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Navegação Inferior de Visualização */}
        {view !== "form" && (
          <BottomNav view={view} setView={setView} onNova={novaOS} />
        )}

        {/* Modal PDF Condicional */}
        {showPDF && <ModalPDF ordens={ordens} onClose={() => setShowPDF(false)} />}

      </div>
    </div>
  );
}
