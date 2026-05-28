/* global React, ReactDOM */
// import-plan.jsx — upload a PDF / PPTX / HTML / JSON of a previously
// exported SLD plan, extract the structured data (via the Consultor SLD
// model when the source isn't already JSON) and apply it to state.
(function(){
const { useState, useRef } = React;

// ============================================================
// Lazy loaders for parser libraries (pulled from CDN only when needed)
// ============================================================
async function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload = res; s.onerror = () => rej(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

async function ensurePDFJS() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return window.pdfjsLib;
}

async function ensureJSZip() {
  if (window.JSZip) return window.JSZip;
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
  return window.JSZip;
}

// ============================================================
// Per-format text extraction
// ============================================================
async function extractPDFText(file) {
  const pdfjs = await ensurePDFJS();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Preserve line breaks: pdf.js gives items with transform matrices —
    // a significant Y-position change (> ~3pt) means a new line. Tracking
    // newlines lets every downstream structural extractor see paragraph
    // and title/description boundaries that would otherwise be collapsed.
    let lastY = null;
    let lineBuf = "";
    const lines = [];
    for (const it of content.items) {
      if (!it.str) continue;
      const y = it.transform ? it.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
        if (lineBuf.trim()) lines.push(lineBuf.trim());
        lineBuf = it.str;
      } else if (lineBuf && it.str && !lineBuf.endsWith(" ") && !it.str.startsWith(" ")) {
        lineBuf += it.str;
      } else {
        lineBuf += it.str;
      }
      lastY = y;
    }
    if (lineBuf.trim()) lines.push(lineBuf.trim());
    pages.push(`--- PAGE ${i} ---\n${lines.join("\n")}`);
  }
  return pages.join("\n\n");
}

async function extractPPTXText(file) {
  const JSZip = await ensureJSZip();
  const zip = await JSZip.loadAsync(file);
  const slideNames = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const an = parseInt(a.match(/slide(\d+)/)[1], 10);
      const bn = parseInt(b.match(/slide(\d+)/)[1], 10);
      return an - bn;
    });
  const slides = [];
  for (const n of slideNames) {
    const xml = await zip.file(n).async("string");
    // <a:t> nodes hold the actual run text in DrawingML.
    const re = /<a:t[^>]*>([^<]*)<\/a:t>/g;
    const parts = [];
    let m;
    while ((m = re.exec(xml)) !== null) {
      const decoded = m[1]
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
      if (decoded.trim()) parts.push(decoded);
    }
    slides.push(`--- SLIDE ${slideNames.indexOf(n) + 1} ---\n${parts.join(" \u2022 ")}`);
  }
  return slides.join("\n\n");
}

async function extractHTMLText(file) {
  const raw = await file.text();
  const doc = new DOMParser().parseFromString(raw, "text/html");
  // Strip script/style and grab innerText-equivalent.
  doc.querySelectorAll("script, style, noscript").forEach(n => n.remove());
  const text = (doc.body && doc.body.innerText) || (doc.body && doc.body.textContent) || raw;
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

// ============================================================
// State merge — keep empty defaults for missing keys
// ============================================================
function mergeWithEmpty(parsed) {
  const empty = window.SAMPLE_EMPTY;
  const out = JSON.parse(JSON.stringify(empty));
  if (!parsed || typeof parsed !== "object") return out;

  if (parsed.empresa && typeof parsed.empresa === "object") {
    Object.keys(out.empresa).forEach(k => {
      if (typeof parsed.empresa[k] === "string") out.empresa[k] = parsed.empresa[k];
    });
  }
  if (Array.isArray(parsed.sinais)) {
    out.sinais = parsed.sinais.map((s, i) => ({
      id: s.id || `s${i + 1}`,
      nome: String(s.nome || ""),
      categoria: ["Tecnologia", "Mercado", "Gestão & Pessoas", "Gestão"].includes(s.categoria) ? s.categoria : "Mercado",
      nivel: ["presente", "provavel", "possivel"].includes(s.nivel) ? s.nivel : "provavel",
      impacto: [1,2,3].includes(s.impacto) ? s.impacto : 2,
      clareza: [1,2,3].includes(s.clareza) ? s.clareza : 2,
      implicacao: String(s.implicacao || "")
    }));
  }
  if (typeof parsed.zona_atual === "string") out.zona_atual = parsed.zona_atual;
  if (parsed.licencas && typeof parsed.licencas === "object") {
    ["operar", "competir", "vencer", "expiradas"].forEach(k => {
      if (Array.isArray(parsed.licencas[k])) out.licencas[k] = parsed.licencas[k].map(String);
    });
  }
  if (parsed.licenca_vencer_teste && typeof parsed.licenca_vencer_teste === "object") {
    ["licenca", "relevante", "verdadeiro", "diferente"].forEach(k => {
      if (typeof parsed.licenca_vencer_teste[k] === "string") out.licenca_vencer_teste[k] = parsed.licenca_vencer_teste[k];
    });
  }
  if (parsed.matriz && typeof parsed.matriz === "object") {
    ["otimizar", "remodelar", "diversificar", "extrapolar"].forEach(k => {
      if (Array.isArray(parsed.matriz[k])) out.matriz[k] = parsed.matriz[k].map(String);
    });
  }
  if (Array.isArray(parsed.iniciativas)) {
    out.iniciativas = parsed.iniciativas.map((it, i) => ({
      id: it.id || `i${i + 1}`,
      titulo: String(it.titulo || ""),
      horizonte: ["now", "near", "next", "no"].includes(it.horizonte) ? it.horizonte : "now",
      tipo: ["projeto", "experimento", "investigacao", "parar"].includes(it.tipo) ? it.tipo
        : (it.horizonte === "near" ? "experimento" : it.horizonte === "next" ? "investigacao" : it.horizonte === "no" ? "parar" : "projeto"),
      descricao: String(it.descricao || ""),
      dono: String(it.dono || ""),
      metrica: String(it.metrica || "")
    }));
  }
  if (typeof parsed.tese === "string") out.tese = parsed.tese;
  if (Array.isArray(parsed.apostas)) out.apostas = parsed.apostas.filter(x => typeof x === "string");
  if (Array.isArray(parsed.riscos)) out.riscos = parsed.riscos.filter(x => typeof x === "string");
  return out;
}

// ============================================================
// Round-trip payload — perfect lossless import
//
// Plans exported by this app embed a base64 JSON dump of the full
// state in a visually-invisible block at the end of the document.
// When that payload is present, import is byte-for-byte exact — no
// LLM, no parsing risk, no structural inference needed.
// ============================================================
function tryExtractPayload(text) {
  if (!text) return null;
  // The base64 alphabet is A-Z a-z 0-9 + / =. pdf.js sometimes inserts
  // whitespace between glyphs, so we tolerate \s in the match and strip
  // it before decoding.
  const m = text.match(/SLDPAYLOADV1([A-Za-z0-9+/=\s]+?)SLDPAYLOADEND/);
  if (!m) return null;
  try {
    const b64 = m[1].replace(/\s+/g, "");
    if (b64.length < 20) return null; // sanity floor — empty plans shouldn't trigger
    const json = decodeURIComponent(escape(atob(b64)));
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

// ============================================================
// Deterministic signals extractor — parses the regular table layout
// our own plan exports use (NAME → IMPLICATION CATEGORIA NIVEL I C).
// This is the FAST PATH for the signals pass: when it succeeds we
// skip the LLM entirely for that section, which is more reliable
// than asking a model to count rows of a dense table.
// ============================================================
function extractSignalsStructural(text) {
  if (!text) return null;
  const radarMatch = text.match(/Radar de Sinais[\s\S]+?(?=L\s*·|Pir[âa]mide|Licen[çc]as|$)/i);
  if (!radarMatch) return null;
  const radar = radarMatch[0];

  const headerMatch = radar.match(/SINAL\s+CATEGORIA\s+N[ÍI]VEL\s+I\s+C/i);
  if (!headerMatch) return null;
  const tableStart = headerMatch.index + headerMatch[0].length;

  const metaPattern = /(Tecnologia|Mercado|Gest[ãa]o\s*&\s*Pessoas|Gest[ãa]o)\s+(Presente|Prov[áa]vel|Poss[íi]vel)\s+([123])\s+([123])/g;
  metaPattern.lastIndex = tableStart;

  const matches = [];
  let m;
  while ((m = metaPattern.exec(radar)) !== null) {
    matches.push({
      start: m.index, end: m.index + m[0].length,
      cat: m[1].trim(), nivel: m[2], imp: parseInt(m[3], 10), clar: parseInt(m[4], 10)
    });
  }
  if (matches.length === 0) return null;

  const signals = [];
  let prevEnd = tableStart;
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const chunk = radar.slice(prevEnd, match.start).trim();
    const arrowIdx = chunk.indexOf("\u2192"); // →
    let nome, implicacao;
    if (arrowIdx > -1) {
      nome = chunk.slice(0, arrowIdx).trim();
      implicacao = chunk.slice(arrowIdx + 1).trim();
    } else {
      nome = chunk;
      implicacao = "";
    }
    // Strip the redundant inter-character spaces that pdf.js leaves between
    // glyphs (e.g. "( pay - per - trip )"). Collapse spaces around punctuation.
    const tidy = (s) => s
      .replace(/\s+([,.;:%)\]])/g, "$1")
      .replace(/([(\[])\s+/g, "$1")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+-\s+/g, "-")
      .trim();
    if (nome) {
      const catNorm = /Gest[ãa]o/i.test(match.cat) ? "Gestão & Pessoas" : match.cat;
      const nivelNorm = /Presente/i.test(match.nivel) ? "presente"
        : /Prov/i.test(match.nivel) ? "provavel" : "possivel";
      signals.push({
        id: `s${i + 1}`,
        nome: tidy(nome),
        categoria: catNorm,
        nivel: nivelNorm,
        impacto: match.imp,
        clareza: match.clar,
        implicacao: tidy(implicacao)
      });
    }
    prevEnd = match.end;
  }
  return signals.length ? signals : null;
}

function extractZonaFromText(text) {
  if (!text) return "";
  // The zona reading is typically inside quotes in the radar section.
  // E.g. "Negação. Os sinais 1, 4 e 5 já têm evidência clara…"
  const radarMatch = text.match(/Radar de Sinais[\s\S]+?(?=L\s*·|Pir[âa]mide|Licen[çc]as|$)/i);
  const scope = radarMatch ? radarMatch[0] : text;
  const qm = scope.match(/["“”]\s*(Cegueira|Nega[çc][ãa]o|Gest[ãa]o de [Cc]rise)[\s\S]{20,800}?["“”]/);
  if (qm) return qm[0].replace(/^["“”]\s*|\s*["“”]$/g, "").trim();
  return "";
}

// ============================================================
// Tidy helper for text extracted from PDF — pdf.js leaves stray spaces
// around punctuation and inside hyphenated words. Used by every
// structural extractor below.
// ============================================================
function tidyText(s) {
  if (!s) return "";
  return s
    .replace(/\s+([,.;:%)\]])/g, "$1")
    .replace(/([(\[])\s+/g, "$1")
    .replace(/(\w)-\s+(\w)/g, "$1-$2")  // join hyphenated line-wraps (CSRD- ready → CSRD-ready)
    .replace(/\s+-\s+/g, "-")
    .replace(/\s+\/\s+/g, "/")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ============================================================
// Empresa (portrait) — labelled fields in the consolidated plan
// Labels are uppercase (SETOR, PORTE, TEMPO DE MERCADO, GEOGRAFIA,
// MODELO DE RECEITA, HORIZONTE E ESCOPO) so we match case-sensitively
// to avoid colliding with the body word "setor".
// ============================================================
function extractEmpresaStructural(text) {
  if (!text) return null;
  const e = { nome: "", setor: "", porte: "", tempo: "", geografia: "",
              modelo_receita: "", problema: "", porque_agora: "",
              horizonte: "", ativos: "" };

  // Nome: between "Plano Estratégico" and the first metadata line. With line
  // breaks preserved, it's typically on its own line right after the header.
  const nomeMatch = text.match(/Plano\s+Estrat[ée]gico\s*\n+\s*([^\n]+?)(?=\s*\n|$)/i);
  if (nomeMatch) e.nome = tidyText(nomeMatch[1]);

  const problemaMatch = text.match(/O que ela resolve para o cliente\s*[.\s]+([\s\S]+?)(?=\n\s*Por que agora\s*\?|\bSETOR\b)/i);
  if (problemaMatch) e.problema = tidyText(problemaMatch[1]);

  const porqueMatch = text.match(/Por que agora\s*\?\s*[.\s]+([\s\S]+?)(?=\bSETOR\b|\bPORTE\b|\bTEMPO DE MERCADO\b|\bS\s*·\s*Radar)/);
  if (porqueMatch) e.porque_agora = tidyText(porqueMatch[1]);

  // Case-SENSITIVE label regexes — uppercase only.
  const labels = [
    { key: "setor", re: /\bSETOR\b([\s\S]+?)(?=\bPORTE\b|\bTEMPO DE MERCADO\b|\bGEOGRAFIA\b|\bMODELO DE RECEITA\b|\bHORIZONTE E ESCOPO\b|\bO QUE J[ÁA] SE SABE\b|\bS\s*·\s*Radar)/ },
    { key: "porte", re: /\bPORTE\b([\s\S]+?)(?=\bSETOR\b|\bTEMPO DE MERCADO\b|\bGEOGRAFIA\b|\bMODELO DE RECEITA\b|\bHORIZONTE E ESCOPO\b|\bO QUE J[ÁA] SE SABE\b|\bS\s*·\s*Radar)/ },
    { key: "tempo", re: /\bTEMPO DE MERCADO\b([\s\S]+?)(?=\bSETOR\b|\bPORTE\b|\bGEOGRAFIA\b|\bMODELO DE RECEITA\b|\bHORIZONTE E ESCOPO\b|\bO QUE J[ÁA] SE SABE\b|\bS\s*·\s*Radar)/ },
    { key: "geografia", re: /\bGEOGRAFIA\b([\s\S]+?)(?=\bSETOR\b|\bPORTE\b|\bTEMPO DE MERCADO\b|\bMODELO DE RECEITA\b|\bHORIZONTE E ESCOPO\b|\bO QUE J[ÁA] SE SABE\b|\bS\s*·\s*Radar)/ },
    { key: "modelo_receita", re: /\bMODELO DE RECEITA\b([\s\S]+?)(?=\bSETOR\b|\bPORTE\b|\bTEMPO DE MERCADO\b|\bGEOGRAFIA\b|\bHORIZONTE E ESCOPO\b|\bO QUE J[ÁA] SE SABE\b|\bS\s*·\s*Radar)/ },
    { key: "horizonte", re: /\bHORIZONTE E ESCOPO\b([\s\S]+?)(?=\bSETOR\b|\bPORTE\b|\bTEMPO DE MERCADO\b|\bGEOGRAFIA\b|\bMODELO DE RECEITA\b|\bO QUE J[ÁA] SE SABE\b|\bS\s*·\s*Radar)/ },
    { key: "ativos", re: /\bO QUE J[ÁA] SE SABE\b([\s\S]+?)(?=\bSETOR\b|\bPORTE\b|\bTEMPO DE MERCADO\b|\bGEOGRAFIA\b|\bMODELO DE RECEITA\b|\bHORIZONTE E ESCOPO\b|\bS\s*·\s*Radar)/ },
    // English variant (when the plan was exported in EN)
    { key: "ativos", re: /\bWHAT'?S ALREADY KNOWN\b([\s\S]+?)(?=\bSETOR\b|\bPORTE\b|\bTEMPO DE MERCADO\b|\bGEOGRAFIA\b|\bMODELO DE RECEITA\b|\bHORIZONTE E ESCOPO\b|\bS\s*·\s*Radar)/i },
  ];
  for (const l of labels) {
    const m = text.match(l.re);
    if (m && m[1] && !e[l.key]) e[l.key] = tidyText(m[1]);
  }

  const hasAny = Object.values(e).some(v => v && v.trim());
  return hasAny ? e : null;
}

// ============================================================
// Licenças — each tier between its header and "Adicionar".
// CAVEAT: items inside a tier are rendered as inline-flex pills, so
// multiple short items may share a line. We return what we can; the
// LLM pass refines if the structural pass yields too few.
// ============================================================
function extractLicencasStructural(text) {
  if (!text) return null;
  const out = { operar: [], competir: [], vencer: [], expiradas: [] };
  const start = text.search(/L\s*·\s*Pir[âa]mide de Licen[çc]as/i);
  if (start === -1) return null;
  const end = text.search(/D\s*·\s*Matriz/i);
  const section = text.slice(start, end === -1 ? undefined : end);

  const tiers = [
    { key: "vencer",     re: /↑\s*VENCER\s+Diferencial([\s\S]+?)(?=Adicionar|—\s*COMPETIR|$)/ },
    { key: "competir",   re: /—\s*COMPETIR\s+Estrutura competitiva([\s\S]+?)(?=Adicionar|□\s*OPERAR|$)/ },
    { key: "operar",     re: /□\s*OPERAR\s+Funda[çc][ãa]o([\s\S]+?)(?=Adicionar|↓\s*LICEN|$)/ },
    { key: "expiradas",  re: /↓\s*LICEN[ÇC]AS EXPIRADAS([\s\S]+?)(?=---\s*PAGE|$)/ },
  ];
  for (const t of tiers) {
    const m = section.match(t.re);
    if (m) {
      out[t.key] = m[1].split("\n").map(l => tidyText(l))
        .filter(l => l && l !== "Adicionar" && !/^---\s*PAGE/.test(l));
    }
  }
  const total = out.operar.length + out.competir.length + out.vencer.length + out.expiradas.length;
  return total ? out : null;
}

// ============================================================
// Matriz da Ambidestria — each quadrant header sits on its own line,
// items each on their own line, terminated by "Opção" (add button).
// ============================================================
function extractMatrizStructural(text) {
  if (!text) return null;
  const out = { otimizar: [], remodelar: [], diversificar: [], extrapolar: [] };
  const start = text.search(/D\s*·\s*Matriz da Ambidestria/i);
  if (start === -1) return null;
  const end = text.search(/Roadmap\s+Now|S[íi]ntese da Jornada/i);
  const section = text.slice(start, end === -1 ? undefined : end);

  const quads = [
    { key: "remodelar",    re: /Remodelar\s+MODELO DIFERENTE\s*·\s*PROBLEMA ATUAL([\s\S]+?)(?=Opção|Otimizar\s+MODELO|Extrapolar\s+MODELO|Diversificar\s+MODELO|$)/i },
    { key: "extrapolar",   re: /Extrapolar\s+MODELO DIFERENTE\s*·\s*PROBLEMA DIFERENTE([\s\S]+?)(?=Opção|Otimizar\s+MODELO|Remodelar\s+MODELO|Diversificar\s+MODELO|$)/i },
    { key: "otimizar",     re: /Otimizar\s+MODELO ATUAL\s*·\s*PROBLEMA ATUAL([\s\S]+?)(?=Opção|Remodelar\s+MODELO|Extrapolar\s+MODELO|Diversificar\s+MODELO|$)/i },
    { key: "diversificar", re: /Diversificar\s+MODELO ATUAL\s*·\s*PROBLEMA DIFERENTE([\s\S]+?)(?=Opção|Remodelar\s+MODELO|Extrapolar\s+MODELO|Otimizar\s+MODELO|$)/i },
  ];
  for (const q of quads) {
    const m = section.match(q.re);
    if (m) {
      out[q.key] = m[1].split("\n").map(l => tidyText(l))
        .filter(l => l && l !== "Opção" && !/^---\s*PAGE/.test(l));
    }
  }
  const total = out.otimizar.length + out.remodelar.length + out.diversificar.length + out.extrapolar.length;
  return total ? out : null;
}

// ============================================================
// Triple test — ① RELEVANTE · ② VERDADEIRO · ③ DIFERENTE
// ============================================================
function extractTripleTestStructural(text) {
  if (!text) return null;
  const out = { licenca: "", relevante: "", verdadeiro: "", diferente: "" };

  const lc = text.match(/Licen[çc]a candidata\s*:\s*([\s\S]+?)(?=①|RELEVANTE PARA O CLIENTE|$)/i);
  if (lc) out.licenca = tidyText(lc[1]);

  const rel = text.match(/①\s*RELEVANTE PARA O\s*CLIENTE\s*([\s\S]+?)(?=②|VERDADEIRO PARA A EMPRESA|$)/i);
  if (rel) out.relevante = tidyText(rel[1]);

  const ver = text.match(/②\s*VERDADEIRO PARA A\s*EMPRESA\s*([\s\S]+?)(?=③|DIFERENTE DOS CONCORRENTES|$)/i);
  if (ver) out.verdadeiro = tidyText(ver[1]);

  const dif = text.match(/③\s*DIFERENTE DOS\s*CONCORRENTES\s*([\s\S]+?)(?=Marcar como expirada|↑\s*VENCER|—\s*COMPETIR|□\s*OPERAR|↓\s*LICEN|$)/i);
  if (dif) out.diferente = tidyText(dif[1]);

  const hasAny = Object.values(out).some(v => v && v.trim());
  return hasAny ? out : null;
}

// ============================================================
// Iniciativas — each renders as: title (1-3 wrapped lines),
// description (0-3 lines), then a "👤 dono 📈 metric…" marker.
// We walk lines, anchor on 👤 occurrences, and reverse-engineer
// title + description from the preceding lines (filtered to skip
// Síntese/Riscos paragraphs that interleave with No items).
// ============================================================
function extractIniciativasStructural(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const colHeaderLines = {};
  for (let i = 0; i < lines.length; i++) {
    if (/Now\s+H\s*1\s*·\s*PROJETO/.test(lines[i])) colHeaderLines.now = i;
    if (/Near\s+H\s*2\s*·\s*EXPERIMENTO/.test(lines[i])) colHeaderLines.near = i;
    if (/Next\s+H\s*3\s*·\s*INVESTIGA[ÇC][ÃA]O/.test(lines[i])) colHeaderLines.next = i;
    if (/S[íi]ntese da Jornada/.test(lines[i])) colHeaderLines.sintese = i;
  }
  if (colHeaderLines.now === undefined) return null;

  function columnFor(lineIdx) {
    if (colHeaderLines.sintese !== undefined && lineIdx > colHeaderLines.sintese) return { key: "no", tipo: "parar" };
    if (colHeaderLines.next !== undefined && lineIdx > colHeaderLines.next) return { key: "next", tipo: "investigacao" };
    if (colHeaderLines.near !== undefined && lineIdx > colHeaderLines.near) return { key: "near", tipo: "experimento" };
    if (colHeaderLines.now !== undefined && lineIdx > colHeaderLines.now) return { key: "now", tipo: "projeto" };
    return null;
  }

  // Build the list of item markers ((👤…📈…[…]) groups) with their line spans.
  const items = [];
  let i = 0;
  while (i < lines.length) {
    if (!/👤/.test(lines[i])) { i++; continue; }
    const markerStart = i;
    let markerEnd = markerStart;
    let s = lines[i];
    while (markerEnd + 1 < lines.length && !/…/.test(s)) {
      const nextLine = lines[markerEnd + 1];
      if (/👤/.test(nextLine)) break;
      if (/^(?:Now|Near|Next|No)\s+H/.test(nextLine)) break;
      if (/^(?:S[íi]ntese da Jornada|Riscos e pressupostos|Opção|Adicionar|---\s*PAGE)/.test(nextLine)) break;
      markerEnd++;
      s += " " + nextLine;
    }
    items.push({ markerStart, markerEnd, markerText: s });
    i = markerEnd + 1;
  }

  // Stateful filter — drops Síntese / Riscos / Pressuposto / Mitigação lines
  // AND their multi-line continuations (which lack the keyword prefix).
  function filterCandidateLines(candidateLines) {
    const out = [];
    let inFilter = false;
    for (const raw of candidateLines) {
      const l = raw.trim();
      if (!l) { inFilter = false; continue; }
      if (/^(Now|Near|Next|No)\s+H/.test(l)) { inFilter = false; continue; }
      if (/^(S[íi]ntese da Jornada|Riscos e pressupostos|Opção|Adicionar|Roadmap\s+Now|O fio que amarra)/.test(l)) {
        inFilter = !/[.!?]$/.test(l);
        continue;
      }
      if (/^---\s*PAGE/.test(l)) { inFilter = false; continue; }
      if (/^(Risco|Pressuposto|Mitiga[çc][ãa]o)\s*:/i.test(l)) {
        inFilter = !/[.!?]$/.test(l);
        continue;
      }
      if (inFilter) {
        if (/[.!?]$/.test(l)) inFilter = false;
        continue;
      }
      out.push(l);
    }
    return out;
  }

  const all = [];
  let prevItemEnd = -1;
  for (const item of items) {
    const col = columnFor(item.markerStart);
    if (!col) { prevItemEnd = item.markerEnd; continue; }

    const mm = item.markerText.match(/👤\s*([\s\S]+?)\s*📈\s*([\s\S]+)/);
    if (!mm) { prevItemEnd = item.markerEnd; continue; }
    const dono = tidyText(mm[1].replace(/\s+/g, " "));
    const metrica = tidyText(mm[2].replace(/…+\s*$/g, "").replace(/\s+/g, " "));

    // Start from MAX(prev item end + 1, this column's header line + 1)
    // so the first item in a column doesn't reach back into the previous section.
    const colHdrLine = colHeaderLines[col.key];
    let startLine = prevItemEnd + 1;
    if (colHdrLine !== undefined && colHdrLine + 1 > startLine) startLine = colHdrLine + 1;
    const candidateLines = lines.slice(startLine, item.markerStart);
    const filtered = filterCandidateLines(candidateLines);
    if (filtered.length === 0) { prevItemEnd = item.markerEnd; continue; }

    // Bisect into title and description, respecting hyphen wraps & open parens.
    const titleParts = [], descParts = [];
    let inDesc = false;
    let titleLineCount = 0;
    for (const l of filtered) {
      if (inDesc) { descParts.push(l); continue; }
      if (titleParts.length === 0) {
        titleParts.push(l);
        titleLineCount = 1;
        if (/[.!?]$/.test(l)) inDesc = true;
        continue;
      }
      const prev = titleParts[titleParts.length - 1];
      const prevEndsSentence = /[.!?]$/.test(prev);
      const prevEndsHyphen = /-$/.test(prev);
      const prevOpenParens = ((prev.match(/\(/g) || []).length - (prev.match(/\)/g) || []).length) > 0;
      if ((prevEndsHyphen || prevOpenParens) && titleLineCount < 3) {
        if (prevEndsHyphen) {
          titleParts[titleParts.length - 1] = prev.replace(/-$/, "") + "-" + l.replace(/^\s+/, "");
        } else {
          titleParts[titleParts.length - 1] = prev + " " + l;
        }
        titleLineCount++;
        const tNow = titleParts[titleParts.length - 1];
        const stillOpen = ((tNow.match(/\(/g) || []).length - (tNow.match(/\)/g) || []).length) > 0;
        if (/[.!?]$/.test(l) && !stillOpen) inDesc = true;
      } else if (!prevEndsSentence && /^[a-zà-ú]/.test(l) && titleLineCount < 2) {
        titleParts[titleParts.length - 1] += " " + l;
        titleLineCount++;
        if (/[.!?]$/.test(l)) inDesc = true;
      } else {
        inDesc = true;
        descParts.push(l);
      }
    }
    const titulo = tidyText(titleParts.join(" "));
    const descricao = tidyText(descParts.join(" "));
    if (titulo) all.push({ id: `i${all.length + 1}`, titulo, horizonte: col.key, tipo: col.tipo, descricao, dono, metrica });
    prevItemEnd = item.markerEnd;
  }
  return all.length ? all : null;
}

// ============================================================
// Síntese — tese (Sumário executivo), apostas (numbered 01-NN on
// their own lines), riscos ("Risco :" / "Pressuposto :" prefixes).
// ============================================================
function extractSinteseStructural(text) {
  if (!text) return null;
  const out = { tese: "", apostas: [], riscos: [] };

  const tm = text.match(/Sum[áa]rio executivo\s*\n+([\s\S]+?)(?=\n\s*Apostas centrais|\n\s*A empresa e o porqu[êe]|---\s*PAGE\s+2)/i);
  if (tm) {
    out.tese = tidyText(tm[1].replace(/\n+/g, " "));
  }

  const am = text.match(/Apostas centrais\s*\n+([\s\S]+?)(?=\n\s*---\s*PAGE|\n\s*A empresa e o porqu[êe]|\n\s*S\s*·\s*Radar|$)/i);
  if (am) {
    const lns = am[1].split("\n").map(l => l.trim()).filter(Boolean);
    let i2 = 0;
    while (i2 < lns.length) {
      if (/^0[1-9]$/.test(lns[i2])) {
        const parts = [];
        i2++;
        while (i2 < lns.length && !/^0[1-9]$/.test(lns[i2])) {
          parts.push(lns[i2]);
          i2++;
        }
        if (parts.length) out.apostas.push(tidyText(parts.join(" ")));
      } else { i2++; }
    }
  }

  const rm = text.match(/Riscos e pressupostos\s*\n+([\s\S]+?)(?=Sum[áa]rio executivo|"\s*N[ãa]o existem|---\s*PAGE\s+\d+\s*$|$)/i);
  if (rm) {
    const block = rm[1];
    const riscoRe = /\b(Risco|Pressuposto)\s*:\s*([\s\S]+?)(?=\s+(?:Risco|Pressuposto)\s*:|---\s*PAGE|"\s*N[ãa]o existem|$)/g;
    let m;
    while ((m = riscoRe.exec(block)) !== null) {
      const txt = tidyText(`${m[1]}: ${m[2].replace(/\n+/g, " ")}`);
      if (txt) out.riscos.push(txt);
    }
  }

  const hasAny = out.tese || out.apostas.length || out.riscos.length;
  return hasAny ? out : null;
}

// ============================================================
// A single giant extraction often truncates mid-array or hits a
// structural JSON error after the first section, dropping the rest.
// Per-stage passes keep each output small, parseable in isolation,
// and let us merge incrementally.
// ============================================================
const PASS_DEFS = [
  {
    id: "portrait",
    labelPt: "Retrato da empresa",
    labelEn: "Company portrait",
    schema: `{
  "empresa": { "nome":"", "setor":"", "porte":"", "tempo":"", "geografia":"", "modelo_receita":"", "problema":"", "porque_agora":"", "horizonte":"", "ativos":"" }
}`,
    rulesPt: `EXTRAIA apenas o RETRATO da empresa (Etapa 0 · Diagnóstico).
• nome, setor, porte, tempo de mercado, geografia, modelo de receita, problema que resolve, por que agora, horizonte e ativos conhecidos.
• Copie texto integralmente do documento; não resuma. Não invente — se um campo não estiver claramente presente, deixe vazio.`,
    rulesEn: `EXTRACT only the company PORTRAIT (Stage 0 · Diagnostic).
• name, industry, size, years in market, geography, revenue model, problem solved, why now, horizon, known assets.
• Copy text verbatim; don't summarize. Don't invent — leave empty if not clearly present.`,
    merge: (out, r) => {
      if (r.empresa && typeof r.empresa === "object") {
        Object.keys(out.empresa).forEach(k => {
          if (typeof r.empresa[k] === "string") out.empresa[k] = r.empresa[k];
        });
      }
    }
  },
  {
    id: "signals",
    labelPt: "Sinais (radar)",
    labelEn: "Signals (radar)",
    schema: `{
  "sinais": [{ "id":"s1", "nome":"", "categoria":"Tecnologia|Mercado|Gestão & Pessoas", "nivel":"presente|provavel|possivel", "impacto":2, "clareza":2, "implicacao":"" }],
  "zona_atual": ""
}`,
    rulesPt: `EXTRAIA TODOS os sinais do RADAR DE SINAIS — não amostre, não selecione apenas os "melhores", não pare antes do fim. Um radar SLD costuma ter 8-12 sinais; é COMUM um modelo apressado parar em 5-7 e perder os últimos. NÃO FAÇA ISSO.

PROCEDIMENTO OBRIGATÓRIO ANTES DE RESPONDER:
1) Varra o documento INTEIRO procurando por sinais. Eles geralmente aparecem na seção "Radar de Sinais" ou em uma tabela com colunas como CATEGORIA · NÍVEL · I · C.
2) CONTE quantas implicações ("→ ...") há no texto do radar — cada "→" geralmente marca a implicação de um sinal. Esse número é seu alvo MÍNIMO.
3) Liste TODOS, em ordem, do primeiro ao último. Inclusive os do final (que costumam ser "Possível" e parecem menos importantes — mas fazem parte do radar mesmo assim).
4) Antes de fechar o JSON, recheque: o array sinais tem pelo menos tantos itens quanto "→" você encontrou? Se não, volte e adicione os que faltam.

Cada sinal:
• nome — frase específica e nomeável (não genérica)
• categoria — Tecnologia · Mercado · Gestão & Pessoas
• nivel — presente · provavel · possivel
• impacto — 1, 2 ou 3
• clareza — 1, 2 ou 3
• implicacao — o que isso significa para o negócio (copie integralmente após a seta "→")

Também: zona_atual = leitura "Cegueira / Negação / Gestão de crise" se aparecer.`,
    rulesEn: `EXTRACT EVERY signal from the radar — don't sample, don't pick the "best ones", don't stop early. SLD radars typically have 8-12 signals; a rushed model commonly stops at 5-7 and drops the last ones. DON'T DO THAT.

MANDATORY PROCEDURE BEFORE ANSWERING:
1) Scan the ENTIRE document for signals. They usually appear under a "Radar de Sinais" section or in a table with columns like CATEGORY · LEVEL · I · C.
2) COUNT how many "→ ..." implication arrows appear in the radar text — each "→" typically marks one signal's implication. That number is your MINIMUM target.
3) List them ALL, in order, from first to last. Include the trailing "Possible" ones that look less important — they're still part of the radar.
4) Before closing the JSON, re-check: does the sinais array have at least as many items as "→" arrows you found? If not, go back and add the missing ones.

Each signal:
• nome — specific, nameable phrase (not generic)
• categoria — Tecnologia · Mercado · Gestão & Pessoas
• nivel — presente · provavel · possivel
• impacto — 1, 2 or 3
• clareza — 1, 2 or 3
• implicacao — what this means for the business (copy verbatim after the "→" arrow)

Also: zona_atual = "Blindness / Denial / Crisis" reading if present.`,
    merge: (out, r) => {
      if (Array.isArray(r.sinais)) out.sinais = r.sinais;
      if (typeof r.zona_atual === "string") out.zona_atual = r.zona_atual;
    }
  },
  {
    id: "licenses",
    labelPt: "Licenças estratégicas",
    labelEn: "Strategic licenses",
    schema: `{
  "licencas": { "operar":[], "competir":[], "vencer":[], "expiradas":[] },
  "licenca_vencer_teste": { "licenca":"", "relevante":"", "verdadeiro":"", "diferente":"" }
}`,
    rulesPt: `EXTRAIA apenas as licenças estratégicas.
• licencas.vencer: diferenciais que criam valor adicional para o cliente.
• licencas.competir: estrutura competitiva (escala, acesso, qualidade).
• licencas.operar: requisitos mínimos para existir no mercado.
• licencas.expiradas: forças que viraram peso (se houver).
• licenca_vencer_teste: a licença candidata + as três justificativas do teste tríplice (relevante p/ cliente, verdadeiro p/ empresa, diferente dos concorrentes).
Cada item dentro dos arrays é uma string curta. Não invente — se não houver no documento, deixe vazio.`,
    rulesEn: `EXTRACT only the strategic licenses.
• licencas.vencer / competir / operar / expiradas — short strings.
• licenca_vencer_teste: the candidate + the three triple-test justifications.
Don't invent; leave empty if not present.`,
    merge: (out, r) => {
      if (r.licencas && typeof r.licencas === "object") {
        ["operar", "competir", "vencer", "expiradas"].forEach(k => {
          if (Array.isArray(r.licencas[k])) out.licencas[k] = r.licencas[k].map(String);
        });
      }
      if (r.licenca_vencer_teste && typeof r.licenca_vencer_teste === "object") {
        ["licenca", "relevante", "verdadeiro", "diferente"].forEach(k => {
          if (typeof r.licenca_vencer_teste[k] === "string") out.licenca_vencer_teste[k] = r.licenca_vencer_teste[k];
        });
      }
    }
  },
  {
    id: "matrix_initiatives",
    labelPt: "Matriz + iniciativas",
    labelEn: "Matrix + initiatives",
    schema: `{
  "matriz": { "otimizar":[], "remodelar":[], "diversificar":[], "extrapolar":[] },
  "iniciativas": [{ "id":"i1", "titulo":"", "horizonte":"now|near|next|no", "tipo":"projeto|experimento|investigacao|parar", "descricao":"", "dono":"", "metrica":"" }]
}`,
    rulesPt: `EXTRAIA apenas a matriz da ambidestria e as iniciativas nos horizontes.
• matriz.otimizar: modelo atual + problema atual (eficiência).
• matriz.remodelar: modelo diferente + problema atual.
• matriz.diversificar: modelo atual + problema diferente.
• matriz.extrapolar: modelo diferente + problema diferente.
• iniciativas: cada uma com horizonte (now=projeto, near=experimento, next=investigação, no=parar de fazer), título, descrição, dono e métrica.
Os itens "Now/Near/Next/No" geralmente aparecem em cards/colunas separadas no documento.`,
    rulesEn: `EXTRACT only the ambidexterity matrix and horizon initiatives.
• matriz.otimizar / remodelar / diversificar / extrapolar — strings.
• iniciativas: each with horizonte (now/near/next/no), titulo, descricao, dono, metrica.`,
    merge: (out, r) => {
      if (r.matriz && typeof r.matriz === "object") {
        ["otimizar", "remodelar", "diversificar", "extrapolar"].forEach(k => {
          if (Array.isArray(r.matriz[k])) out.matriz[k] = r.matriz[k].map(String);
        });
      }
      if (Array.isArray(r.iniciativas)) out.iniciativas = r.iniciativas;
    }
  },
  {
    id: "synthesis",
    labelPt: "Síntese (tese, apostas, riscos)",
    labelEn: "Synthesis (thesis, bets, risks)",
    schema: `{
  "tese": "",
  "apostas": [],
  "riscos": []
}`,
    rulesPt: `EXTRAIA apenas a síntese executiva.
• tese: a tese estratégica (1-2 parágrafos curtos). Copie integralmente, preservando parágrafos. Escape quebras de linha como \\n dentro da string.
• apostas: array de 3-5 frases curtas e imperativas.
• riscos: array de 3-4 riscos ou pressupostos críticos.`,
    rulesEn: `EXTRACT only the executive synthesis.
• tese: 1-2 short paragraphs, copied verbatim with paragraphs preserved (escape newlines as \\n).
• apostas: 3-5 short imperative sentences.
• riscos: 3-4 critical risks/assumptions.`,
    merge: (out, r) => {
      if (typeof r.tese === "string") out.tese = r.tese;
      if (Array.isArray(r.apostas)) out.apostas = r.apostas.filter(x => typeof x === "string");
      if (Array.isArray(r.riscos)) out.riscos = r.riscos.filter(x => typeof x === "string");
    }
  }
];

function buildPassPrompt(pass, rawText, lang) {
  const isPt = lang === "pt";
  return `${isPt
    ? "Você está recebendo o texto bruto de um documento gerado por este app a partir de um plano estratégico SLD. Sua tarefa é EXTRAIR somente a fatia abaixo."
    : "You are receiving the raw text of a document generated by this app from an SLD strategic plan. Your task is to EXTRACT only the slice below."}

Retorne SOMENTE este objeto JSON, sem markdown, sem comentário, sem texto antes ou depois:

${pass.schema}

${isPt ? pass.rulesPt : pass.rulesEn}

REGRAS DE FORMATAÇÃO DO JSON (CRÍTICAS):
• Aspas duplas (") em todas as chaves e strings — nunca aspas tipográficas (" " ' ').
• Escape aspas duplas internas como \\" e quebras de linha como \\n. Nunca deixe uma quebra de linha crua dentro de uma string.
• Sem vírgula final (trailing comma) antes de } ou ].
• Sem markdown dentro de strings (nada de **, _, listas).
• Cada item de array separado por vírgula. Re-cheque.

=== DOCUMENTO ===
${rawText.slice(0, 60000)}
=== FIM DO DOCUMENTO ===

Retorne APENAS o JSON do schema acima.`;
}

async function multiPassExtract(rawText, lang, onProgress) {
  const out = JSON.parse(JSON.stringify(window.SAMPLE_EMPTY));
  const failures = [];

  // FAST PATH: if the exported document carries our round-trip payload,
  // skip everything and decode it directly. Lossless.
  const payload = tryExtractPayload(rawText);
  if (payload) {
    if (onProgress) onProgress(lang === "pt"
      ? "Plano completo encontrado no documento — importando direto."
      : "Full plan found embedded in the document — importing directly.");
    return { state: mergeWithEmpty(payload), failures: [] };
  }

  // Count structural markers that hint at how many signals SHOULD exist.
  // In our exported plans each sinal's implication is preceded by "→",
  // so the arrow count is a reliable lower bound on the radar size.
  // (Some plans use the arrow elsewhere too — we only use this for the
  // signals-pass retry threshold, not to invent items.)
  const radarSectionMatch = rawText.match(/Radar de Sinais[\s\S]{0,12000}?(?=L\s*·|Pir[âa]mide|Licen[çc]as|D\s*·|Matriz|$)/i);
  const radarText = radarSectionMatch ? radarSectionMatch[0] : rawText;
  const expectedSignals = (radarText.match(/→/g) || []).length;

  for (let i = 0; i < PASS_DEFS.length; i++) {
    const p = PASS_DEFS[i];
    const label = lang === "pt" ? p.labelPt : p.labelEn;
    if (onProgress) onProgress(`${label} (${i + 1}/${PASS_DEFS.length})…`);

    // ─── STRUCTURAL FAST PATHS ───
    // For plans exported by THIS app, every section has a regular
    // layout we can parse deterministically. We try that first per
    // pass; the LLM only runs when structural extraction can't lock
    // onto the section (third-party docs, edited PDFs, etc.).

    if (p.id === "portrait") {
      const empresa = extractEmpresaStructural(rawText);
      if (empresa) { out.empresa = { ...out.empresa, ...empresa }; continue; }
    }

    if (p.id === "signals") {
      const structural = extractSignalsStructural(rawText);
      if (structural && structural.length >= Math.max(3, expectedSignals)) {
        out.sinais = structural;
        const zona = extractZonaFromText(rawText);
        if (zona) out.zona_atual = zona;
        continue;
      }
    }

    if (p.id === "licenses") {
      // Triple test and tier items are both structurally parseable. The
      // pyramid items pass uses an inline-flex pill layout in the print,
      // which means short items may share a single PDF text line — we
      // accept what comes out and let the LLM pass below refine if too few.
      const test = extractTripleTestStructural(rawText);
      if (test) out.licenca_vencer_teste = test;
      const licencas = extractLicencasStructural(rawText);
      if (licencas) {
        ["operar", "competir", "vencer", "expiradas"].forEach(k => {
          if (Array.isArray(licencas[k]) && licencas[k].length) out.licencas[k] = licencas[k];
        });
      }
      // If we got triple test + at least 2 tiers, skip the LLM call.
      const tiersFilled = ["operar", "competir", "vencer", "expiradas"]
        .filter(k => (out.licencas[k] || []).length > 0).length;
      if (test && tiersFilled >= 2) continue;
    }

    if (p.id === "matrix_initiatives") {
      // Matriz quadrants and iniciativas are both structurally parseable.
      const matriz = extractMatrizStructural(rawText);
      if (matriz) {
        ["otimizar", "remodelar", "diversificar", "extrapolar"].forEach(k => {
          if (Array.isArray(matriz[k]) && matriz[k].length) out.matriz[k] = matriz[k];
        });
      }
      const inits = extractIniciativasStructural(rawText);
      if (inits && inits.length) out.iniciativas = inits;
      // If both succeeded, skip the LLM call entirely.
      const quadFilled = ["otimizar", "remodelar", "diversificar", "extrapolar"]
        .filter(k => (out.matriz[k] || []).length > 0).length;
      if (quadFilled >= 2 && (out.iniciativas || []).length > 0) continue;
    }

    if (p.id === "synthesis") {
      const sintese = extractSinteseStructural(rawText);
      if (sintese) {
        if (sintese.tese) out.tese = sintese.tese;
        if (sintese.apostas.length) out.apostas = sintese.apostas;
        if (sintese.riscos.length) out.riscos = sintese.riscos;
        // If we got everything, skip the LLM call entirely.
        if (sintese.tese && sintese.apostas.length && sintese.riscos.length) continue;
      }
    }

    try {
      const prompt = buildPassPrompt(p, rawText, lang);
      const response = await window.SLDAuth.complete(prompt, { maxTokens: 8192 });
      const parsed = await parseModelJSON(response, lang);

      // Merge into out — but only overwrite fields we don't already have.
      // (Structural results from above take precedence.)
      if (p.id === "licenses") {
        if (parsed.licencas && typeof parsed.licencas === "object") {
          ["operar", "competir", "vencer", "expiradas"].forEach(k => {
            if (Array.isArray(parsed.licencas[k]) && (out.licencas[k] || []).length === 0) {
              out.licencas[k] = parsed.licencas[k].map(String);
            }
          });
        }
        if (parsed.licenca_vencer_teste && typeof parsed.licenca_vencer_teste === "object") {
          ["licenca", "relevante", "verdadeiro", "diferente"].forEach(k => {
            if (!out.licenca_vencer_teste[k] && typeof parsed.licenca_vencer_teste[k] === "string") {
              out.licenca_vencer_teste[k] = parsed.licenca_vencer_teste[k];
            }
          });
        }
      } else if (p.id === "matrix_initiatives") {
        if (parsed.matriz && typeof parsed.matriz === "object") {
          ["otimizar", "remodelar", "diversificar", "extrapolar"].forEach(k => {
            if (Array.isArray(parsed.matriz[k]) && (out.matriz[k] || []).length === 0) {
              out.matriz[k] = parsed.matriz[k].map(String);
            }
          });
        }
        if (Array.isArray(parsed.iniciativas) && (out.iniciativas || []).length === 0) {
          out.iniciativas = parsed.iniciativas;
        }
      } else {
        p.merge(out, parsed);
      }

      // Signals-pass retry: if we're well short of the arrow count, ask
      // again with explicit "previously you missed N — find all" framing.
      if (p.id === "signals" && expectedSignals > 0 && (out.sinais || []).length < expectedSignals && (out.sinais || []).length > 0) {
        if (onProgress) onProgress(`${label} (${i + 1}/${PASS_DEFS.length}) — ${lang === "pt" ? "completando lista…" : "completing list…"}`);
        const have = (out.sinais || []).map((s, k) => `${k + 1}. ${s.nome}`).join("\n");
        const retryPrompt = `${buildPassPrompt(p, rawText, lang)}

CHECAGEM: contei ${expectedSignals} setas "→" no radar do documento — então há pelo menos ${expectedSignals} sinais. Sua tentativa anterior retornou apenas ${(out.sinais || []).length} sinais:
${have}

EXTRAIA TUDO de novo, agora COM TODOS os ${expectedSignals} sinais (ou mais, se houver). NÃO REPITA o erro anterior. Retorne o JSON completo do schema.`;
        try {
          const retryResp = await window.SLDAuth.complete(retryPrompt, { maxTokens: 8192 });
          const retryParsed = await parseModelJSON(retryResp, lang);
          if (Array.isArray(retryParsed.sinais) && retryParsed.sinais.length > (out.sinais || []).length) {
            p.merge(out, retryParsed);
          }
        } catch (_) { /* keep first-pass result if retry fails */ }
      }
    } catch (e) {
      failures.push({ pass: p.id, label, error: e.message || String(e) });
    }
  }
  return { state: out, failures };
}

async function ensureJSONRepair() {
  if (window.jsonrepair) return window.jsonrepair;
  // UMD build exposes `JSONRepair.jsonrepair`.
  await loadScript("https://cdn.jsdelivr.net/npm/jsonrepair@3.8.0/lib/umd/jsonrepair.js");
  const lib = window.JSONRepair || window.jsonrepair;
  // Normalise the export shape.
  if (lib && typeof lib.jsonrepair === "function") return (window.jsonrepair = lib.jsonrepair);
  if (typeof lib === "function") return (window.jsonrepair = lib);
  throw new Error("jsonrepair failed to load");
}

function basicRepair(s) {
  return s
    // Smart quotes → straight
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    // Non-breaking spaces → regular
    .replace(/\u00A0/g, " ")
    // Trailing commas before } or ]
    .replace(/,(\s*[}\]])/g, "$1");
}

function extractJSONCandidate(raw) {
  const stripped = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  // Greedy match: from the first "{" to the LAST "}" in the response.
  const first = stripped.indexOf("{");
  const last = stripped.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("No JSON object found in response.");
  }
  return stripped.slice(first, last + 1);
}

async function parseModelJSON(raw, lang) {
  const candidate = extractJSONCandidate(raw);

  // Attempt 1: direct
  try { return JSON.parse(candidate); } catch (_) {}

  // Attempt 2: cheap repairs (smart quotes, trailing commas)
  try { return JSON.parse(basicRepair(candidate)); } catch (_) {}

  // Attempt 3: full repair via the jsonrepair library
  try {
    const repair = await ensureJSONRepair();
    return JSON.parse(repair(basicRepair(candidate)));
  } catch (libErr) {
    // Attempt 4: ask the model to fix its own output
    try {
      const fixPrompt = (lang === "pt"
        ? "O JSON abaixo está inválido (JSON.parse falhou). Conserte os erros de sintaxe (vírgulas faltando, aspas não escapadas, etc.) mantendo o conteúdo o mais fiel possível. Retorne SOMENTE o JSON corrigido — sem markdown, sem comentário, sem texto antes ou depois.\n\n"
        : "The JSON below is invalid (JSON.parse failed). Fix the syntax errors (missing commas, unescaped quotes, etc.) while keeping the content as faithful as possible. Return ONLY the corrected JSON — no markdown, no comment, no text before or after.\n\n")
        + candidate.slice(0, 50000);
      const fixed = await window.SLDAuth.complete(fixPrompt, { maxTokens: 8192 });
      const fixedCandidate = extractJSONCandidate(fixed);
      try { return JSON.parse(fixedCandidate); } catch (_) {}
      try { return JSON.parse(basicRepair(fixedCandidate)); } catch (_) {}
      const repair = await ensureJSONRepair();
      return JSON.parse(repair(basicRepair(fixedCandidate)));
    } catch (e) {
      // Surface a tight, useful error including position if available.
      const m = (libErr && libErr.message) || "";
      throw new Error((lang === "pt"
        ? "Não consegui interpretar a resposta do modelo como JSON. "
        : "Couldn't parse the model's response as JSON. ") + m);
    }
  }
}

// ============================================================
// Counts for the review step
// ============================================================
function summarize(state) {
  const e = state.empresa || {};
  const filled = (obj) => Object.values(obj).filter(v => typeof v === "string" && v.trim()).length;
  return {
    nome: e.nome || "",
    empresaFields: filled(e),
    empresaTotal: Object.keys(e).length,
    sinais: (state.sinais || []).length,
    licencasOperar: (state.licencas?.operar || []).length,
    licencasCompetir: (state.licencas?.competir || []).length,
    licencasVencer: (state.licencas?.vencer || []).length,
    licencasExpiradas: (state.licencas?.expiradas || []).length,
    matrizCount: ["otimizar","remodelar","diversificar","extrapolar"]
      .reduce((acc, k) => acc + ((state.matriz && state.matriz[k]) || []).length, 0),
    iniciativasNow: (state.iniciativas || []).filter(i => i.horizonte === "now").length,
    iniciativasNear: (state.iniciativas || []).filter(i => i.horizonte === "near").length,
    iniciativasNext: (state.iniciativas || []).filter(i => i.horizonte === "next").length,
    iniciativasNo: (state.iniciativas || []).filter(i => i.horizonte === "no").length,
    tese: !!(state.tese && state.tese.trim()),
    apostas: (state.apostas || []).filter(x => x && x.trim()).length,
    riscos: (state.riscos || []).filter(x => x && x.trim()).length,
  };
}

// ============================================================
// MODAL UI
// ============================================================
function ImportPlanModal({ open, onClose, lang, onImport }) {
  const isPt = lang === "pt";
  const [step, setStep] = useState("pick"); // pick | parsing | extracting | review | error
  const [fileName, setFileName] = useState("");
  const [fileKind, setFileKind] = useState("");
  const [parsedState, setParsedState] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [auth] = window.SLDAuth.useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const inputRef = useRef(null);

  if (!open) return null;

  const reset = () => {
    setStep("pick"); setFileName(""); setFileKind("");
    setParsedState(null); setError(""); setProgress("");
  };

  const close = () => { reset(); onClose(); };

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setError("");
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    setFileKind(ext.toUpperCase());

    try {
      // JSON: direct round-trip, no AI needed.
      if (ext === "json") {
        setStep("parsing");
        setProgress(isPt ? "Lendo JSON…" : "Reading JSON…");
        const raw = await file.text();
        const parsed = JSON.parse(raw);
        setParsedState(mergeWithEmpty(parsed));
        setStep("review");
        return;
      }

      // For everything else we need the AI consultor.
      if (!auth) { setSignInOpen(true); return; }

      setStep("parsing");
      let text = "";
      if (ext === "pdf") {
        setProgress(isPt ? "Lendo PDF (pode levar alguns segundos)…" : "Reading PDF (may take a few seconds)…");
        text = await extractPDFText(file);
      } else if (ext === "pptx") {
        setProgress(isPt ? "Lendo apresentação…" : "Reading presentation…");
        text = await extractPPTXText(file);
      } else if (ext === "html" || ext === "htm") {
        setProgress(isPt ? "Lendo HTML…" : "Reading HTML…");
        text = await extractHTMLText(file);
      } else if (ext === "txt" || ext === "md") {
        text = (await file.text()).trim();
      } else {
        throw new Error(isPt
          ? `Formato .${ext} não suportado. Use PDF, PPTX, HTML ou JSON.`
          : `Format .${ext} not supported. Use PDF, PPTX, HTML or JSON.`);
      }
      if (!text || text.length < 40) {
        throw new Error(isPt
          ? "Não consegui extrair texto desse arquivo (vazio ou ilegível)."
          : "Couldn't extract text from this file (empty or unreadable).");
      }

      setStep("extracting");
      // Multi-pass: one focused extraction per SLD stage. Each pass parses
      // independently — a hiccup in one section doesn't drop the others.
      const { state: extracted, failures } = await multiPassExtract(text, lang, (label) => {
        setProgress(isPt
          ? `O Consultor SLD está lendo: ${label}`
          : `The SLD Consultant is reading: ${label}`);
      });
      setParsedState(mergeWithEmpty(extracted));
      if (failures.length === PASS_DEFS.length) {
        // All passes failed — surface the first error.
        throw new Error(failures[0].error);
      }
      // Partial failures are surfaced quietly: the user will see empty counts
      // for those sections in the review panel and can re-run import or fill
      // them in by hand.
      setStep("review");
    } catch (e) {
      setError(e.message || String(e));
      setStep("error");
    }
  };

  const onPick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) handleFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const apply = () => {
    if (!parsedState) return;
    onImport(parsedState);
    close();
  };

  const SignInModal = window.SLDAuth.SignInModal;

  const summary = parsedState ? summarize(parsedState) : null;

  const modalUi = (
    <div className="sld-modal-backdrop" onClick={close}>
      <div className="sld-modal" onClick={e => e.stopPropagation()} style={{maxWidth: 560}}>
        <div className="sld-modal-head">
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontFamily: "var(--sld-display)", fontSize: 24, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--sld-ink)"}}>
              {isPt ? "Importar plano" : "Import plan"}
            </div>
            <div style={{fontSize: 13, color: "var(--neo-fg-2)", marginTop: 4, lineHeight: 1.5}}>
              {isPt
                ? "Carregue um PDF, apresentação (.pptx), HTML ou JSON gerado por este app. O Consultor SLD lê o documento e preenche todos os formulários do plano."
                : "Upload a PDF, presentation (.pptx), HTML or JSON exported from this app. The SLD Consultant reads the document and fills every form in the plan."}
            </div>
          </div>
          <button className="btn ghost sm" onClick={close}
            style={{padding: 0, width: 28, height: 28, flexShrink: 0}}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="sld-modal-body">
          {step === "pick" && (
            <div>
              <div className="import-drop"
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("over"); }}
                onDragLeave={e => e.currentTarget.classList.remove("over")}
                onDrop={(e) => { e.currentTarget.classList.remove("over"); onDrop(e); }}
                onClick={() => inputRef.current && inputRef.current.click()}>
                <div className="import-drop-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div className="import-drop-title">
                  {isPt ? "Arraste o arquivo aqui ou clique para escolher" : "Drop the file here or click to choose"}
                </div>
                <div className="import-drop-formats">PDF · PPTX · HTML · JSON</div>
                <input ref={inputRef} type="file"
                  accept=".pdf,.pptx,.html,.htm,.json,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/html,application/json"
                  style={{display: "none"}}
                  onChange={onPick} />
              </div>

              {!auth && (
                <div style={{
                  marginTop: 14, padding: "10px 12px",
                  background: "var(--neo-warn-bg, #fff8e6)",
                  border: "1px solid var(--neo-warn-border, #f0d08a)",
                  borderRadius: 4, fontSize: 12, color: "var(--neo-fg-2)",
                  display: "flex", alignItems: "flex-start", gap: 8
                }}>
                  <span>🔒</span>
                  <div style={{flex: 1}}>
                    {isPt
                      ? "PDFs, apresentações e HTML precisam do Consultor SLD para serem interpretados. JSON funciona sem login."
                      : "PDFs, presentations and HTML need the SLD Consultant to be interpreted. JSON works without login."}
                    <div style={{marginTop: 8}}>
                      <button className="btn outline sm" onClick={() => setSignInOpen(true)}>
                        {isPt ? "Conectar consultor" : "Connect consultant"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {(step === "parsing" || step === "extracting") && (
            <div style={{padding: "32px 16px", textAlign: "center"}}>
              <div style={{fontSize: 12, color: "var(--neo-fg-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8}}>
                {fileKind} · {fileName}
              </div>
              <div style={{display: "inline-flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--neo-fg-1)"}}>
                <span className="spinner"></span>
                <span>{progress}</span>
              </div>
              {step === "extracting" && (
                <div style={{fontSize: 11, color: "var(--neo-fg-3)", marginTop: 12, fontStyle: "italic", maxWidth: 380, margin: "12px auto 0"}}>
                  {isPt
                    ? "O modelo lê o documento em 5 passos focados (retrato, sinais, licenças, matriz + iniciativas, síntese). Isso pode levar de 30 a 90 segundos."
                    : "The model reads the document in 5 focused passes (portrait, signals, licenses, matrix + initiatives, synthesis). This may take 30–90 seconds."}
                </div>
              )}
            </div>
          )}

          {step === "review" && summary && (
            <div>
              <div style={{fontSize: 13, color: "var(--neo-fg-2)", marginBottom: 12}}>
                {isPt
                  ? <>Confira o que o consultor identificou em <strong>{fileName}</strong>. Aplicar substitui o plano atual — você pode editar tudo depois.</>
                  : <>Review what the consultant identified in <strong>{fileName}</strong>. Applying replaces the current plan — you can edit everything afterwards.</>}
              </div>

              <div className="import-summary">
                <div className="is-row">
                  <div className="is-label">{isPt ? "Empresa" : "Company"}</div>
                  <div className="is-val"><strong>{summary.nome || (isPt ? "(sem nome)" : "(no name)")}</strong>
                    <span className="is-count">{summary.empresaFields}/{summary.empresaTotal} {isPt ? "campos" : "fields"}</span>
                  </div>
                </div>
                <div className="is-row">
                  <div className="is-label">{isPt ? "Sinais" : "Signals"}</div>
                  <div className="is-val">{summary.sinais} {isPt ? "sinais" : "signals"}</div>
                </div>
                <div className="is-row">
                  <div className="is-label">{isPt ? "Licenças" : "Licenses"}</div>
                  <div className="is-val">
                    {summary.licencasVencer} <em>vencer</em> · {summary.licencasCompetir} <em>competir</em> · {summary.licencasOperar} <em>operar</em> · {summary.licencasExpiradas} <em>expir.</em>
                  </div>
                </div>
                <div className="is-row">
                  <div className="is-label">{isPt ? "Matriz" : "Matrix"}</div>
                  <div className="is-val">{summary.matrizCount} {isPt ? "movimentos" : "moves"}</div>
                </div>
                <div className="is-row">
                  <div className="is-label">{isPt ? "Iniciativas" : "Initiatives"}</div>
                  <div className="is-val">
                    {summary.iniciativasNow} <em>now</em> · {summary.iniciativasNear} <em>near</em> · {summary.iniciativasNext} <em>next</em> · {summary.iniciativasNo} <em>no</em>
                  </div>
                </div>
                <div className="is-row">
                  <div className="is-label">{isPt ? "Síntese" : "Synthesis"}</div>
                  <div className="is-val">
                    {summary.tese ? (isPt ? "tese ✓" : "thesis ✓") : (isPt ? "sem tese" : "no thesis")} ·{" "}
                    {summary.apostas} {isPt ? "apostas" : "bets"} · {summary.riscos} {isPt ? "riscos" : "risks"}
                  </div>
                </div>
              </div>

              <div style={{display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20}}>
                <button className="btn" onClick={reset}>{isPt ? "Outro arquivo" : "Another file"}</button>
                <button className="btn primary" onClick={apply}>
                  {isPt ? "Aplicar ao plano" : "Apply to plan"}
                </button>
              </div>
            </div>
          )}

          {step === "error" && (
            <div>
              <div style={{
                padding: "12px 14px",
                background: "var(--neo-danger-bg)",
                border: "1px solid var(--neo-danger-border)",
                borderRadius: 4, color: "var(--neo-danger)",
                fontSize: 13, lineHeight: 1.5
              }}>
                <div style={{fontWeight: 600, marginBottom: 4}}>
                  {isPt ? "Não consegui processar esse arquivo." : "I couldn't process this file."}
                </div>
                <div style={{fontFamily: "ui-monospace, monospace", fontSize: 11}}>{error}</div>
              </div>
              <div style={{display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16}}>
                <button className="btn primary" onClick={reset}>{isPt ? "Tentar outro arquivo" : "Try another file"}</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} lang={lang} />
    </div>
  );

  return ReactDOM.createPortal(modalUi, document.body);
}

// ============================================================
// Companion: JSON export — exposed so callers can offer a clean
// round-trip (perfect import without AI).
// ============================================================
function exportStateAsJSON(state, lang) {
  const empresa = state.empresa || {};
  const slug = (empresa.nome || "plano").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "plano";
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${slug}_sld.json`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}

// ============================================================
// Button — small unified import trigger
// ============================================================
function ImportButton({ lang, onImport, variant = "outline" }) {
  const [open, setOpen] = useState(false);
  const isPt = lang === "pt";
  const cls = variant === "primary" ? "btn primary" : variant === "ghost" ? "btn ghost sm" : "btn outline";
  return (
    <>
      <button className={cls} onClick={() => setOpen(true)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{marginRight: 4}}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        {isPt ? "Importar" : "Import"}
      </button>
      <ImportPlanModal open={open} onClose={() => setOpen(false)} lang={lang} onImport={onImport} />
    </>
  );
}

window.SLDImport = { ImportPlanModal, ImportButton, exportStateAsJSON, mergeWithEmpty };
})();
