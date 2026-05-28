/* global React */
// artifacts.jsx — interactive Radar, Pyramid, Matrix, Horizons
(function(){
const { useState, useRef, useEffect, useMemo } = React;

// ============================================================
// Helpers
// ============================================================
function uid(prefix) {
  return prefix + "_" + Math.random().toString(36).slice(2, 9);
}

function Icon({ name, size = 14 }) {
  // Lucide-style minimal inline icons
  const icons = {
    plus: "M12 5v14M5 12h14",
    x: "M18 6L6 18M6 6l12 12",
    trash: "M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z",
    edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
    chev_r: "M9 18l6-6-6-6",
    chev_l: "M15 18l-6-6 6-6",
    chev_d: "M6 9l6 6 6-6",
    check: "M20 6L9 17l-5-5",
    grip: "M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01",
    sparkle: "M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z",
    print: "M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z",
    play: "M5 3l14 9-14 9V3z",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  };
  const d = icons[name] || icons.plus;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink: 0}}>
      <path d={d} />
    </svg>
  );
}

// ============================================================
// SIGNAL RADAR (interactive)
// ============================================================
function SignalRadar({ sinais, onSelect, selectedId, lang }) {
  // 3 concentric rings (possivel → provavel → presente), 3 sectors by categoria
  const W = 560, H = 560, CX = W/2, CY = H/2;
  const ringRadii = { possivel: 240, provavel: 170, presente: 100 };
  const sectorAngles = {
    Tecnologia: { start: -90, end: 30 },  // top-right
    Mercado:    { start: 30,  end: 150 }, // bottom
    "Gestão & Pessoas": { start: 150, end: 270 } // left
  };
  // Categories normalize
  const normCat = (c) => c === "Gestão" ? "Gestão & Pessoas" : c;

  const placed = useMemo(() => {
    const groups = {};
    sinais.forEach(s => {
      const cat = normCat(s.categoria);
      const key = cat + "|" + s.nivel;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    const result = [];
    Object.entries(groups).forEach(([key, list]) => {
      const [cat, nivel] = key.split("|");
      const sector = sectorAngles[cat];
      const innerR = nivel === "presente" ? 30 : nivel === "provavel" ? 110 : 180;
      const outerR = ringRadii[nivel] || 220;
      list.forEach((s, i) => {
        // spread within sector & ring
        const n = list.length;
        const angleSpan = (sector.end - sector.start) * 0.78;
        const angleStart = sector.start + (sector.end - sector.start - angleSpan) / 2;
        const a = angleStart + (n === 1 ? angleSpan/2 : (angleSpan / (n - 1 || 1)) * i);
        const rad = (a * Math.PI) / 180;
        const r = (innerR + outerR) / 2 + (i % 2 === 0 ? -10 : 10);
        const x = CX + Math.cos(rad) * r;
        const y = CY + Math.sin(rad) * r;
        result.push({ ...s, _x: x, _y: y });
      });
    });
    return result;
  }, [sinais]);

  const fillByCat = (c) => {
    const n = normCat(c);
    if (n === "Tecnologia") return "var(--sld-cat-tech)";
    if (n === "Mercado") return "var(--sld-cat-mkt)";
    return "var(--sld-cat-gp)";
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="radar-svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="radar-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fafaf7" stopOpacity="1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#radar-bg)" />
      {/* sector dividers */}
      {[-90, 30, 150].map(a => {
        const rad = (a * Math.PI)/180;
        return <line key={a} x1={CX} y1={CY} x2={CX + Math.cos(rad)*260} y2={CY + Math.sin(rad)*260}
          stroke="#e5e3dc" strokeWidth="1" />;
      })}
      {/* rings */}
      {[ringRadii.possivel, ringRadii.provavel, ringRadii.presente].map((r, i) => (
        <circle key={r} cx={CX} cy={CY} r={r} fill="none"
          stroke="#e5e3dc" strokeWidth={i === 2 ? 1.5 : 1}
          strokeDasharray={i === 0 ? "2 4" : "none"} />
      ))}
      {/* ring labels */}
      <text x={CX} y={CY - ringRadii.possivel - 6} textAnchor="middle"
        fontSize="10" fill="#8c8c8c" letterSpacing="0.08em"
        style={{textTransform: "uppercase", fontWeight: 500}}>
        {lang === "pt" ? "Possível" : "Possible"}
      </text>
      <text x={CX} y={CY - ringRadii.provavel - 6} textAnchor="middle"
        fontSize="10" fill="#8c8c8c" letterSpacing="0.08em"
        style={{textTransform: "uppercase", fontWeight: 500}}>
        {lang === "pt" ? "Provável" : "Probable"}
      </text>
      <text x={CX} y={CY - ringRadii.presente - 6} textAnchor="middle"
        fontSize="10" fill="#8c8c8c" letterSpacing="0.08em"
        style={{textTransform: "uppercase", fontWeight: 500}}>
        {lang === "pt" ? "Presente" : "Present"}
      </text>
      {/* sector labels */}
      <text x={CX + 195} y={CY - 195} textAnchor="middle" fontSize="11" fontWeight="600"
        fill="var(--sld-cat-tech)" letterSpacing="0.02em">Tecnologia</text>
      <text x={CX} y={CY + 260} textAnchor="middle" fontSize="11" fontWeight="600"
        fill="var(--sld-cat-mkt)">Mercado</text>
      <text x={CX - 200} y={CY - 195} textAnchor="middle" fontSize="11" fontWeight="600"
        fill="var(--sld-cat-gp)">{lang === "pt" ? "Gestão & Pessoas" : "Mgmt & People"}</text>
      {/* bubbles */}
      {placed.map(s => {
        const baseR = 8 + (s.impacto || 1) * 4;
        const opacity = 0.35 + ((s.clareza || 1) * 0.22);
        return (
          <g key={s.id} className={`radar-bubble ${selectedId === s.id ? "selected" : ""}`}
            onClick={() => onSelect && onSelect(s.id)}>
            <circle cx={s._x} cy={s._y} r={baseR} fill={fillByCat(s.categoria)}
              opacity={opacity} stroke={fillByCat(s.categoria)} strokeWidth="1" />
            <text x={s._x} y={s._y + 4} textAnchor="middle" fontSize="11" fontWeight="600"
              fill="white" pointerEvents="none">{s.nome.match(/[A-Z]/g)?.slice(0,2).join("") || "S"}</text>
          </g>
        );
      })}
      {/* center mark */}
      <circle cx={CX} cy={CY} r="3" fill="#262626" />
    </svg>
  );
}

// ============================================================
// LICENSE PYRAMID (interactive)
// ============================================================
function LicensePyramid({ licencas, onAdd, onRemove, lang, showHints }) {
  const t = window.I18N[lang];
  const tiers = [
    { key: "vencer", label: t.vencer, hint: t.vencerHint, items: licencas.vencer || [] },
    { key: "competir", label: t.competir, hint: t.competirHint, items: licencas.competir || [] },
    { key: "operar", label: t.operar, hint: t.operarHint, items: licencas.operar || [] },
  ];
  const [adding, setAdding] = useState(null);
  const [addText, setAddText] = useState("");
  const commit = () => {
    if (addText.trim()) onAdd(adding, addText.trim());
    setAddText(""); setAdding(null);
  };
  return (
    <div className="artifact-wrap" style={{padding: 0}}>
      {tiers.map(tier => (
        <div key={tier.key} className={`pyramid-tier ${tier.key}`}>
          <div className="tier-label">{tier.key === "vencer" ? "↑" : tier.key === "competir" ? "—" : "□"} {tier.label}</div>
          <div className="tier-title">
            {tier.key === "vencer" && (lang === "pt" ? "Diferencial" : "Differential")}
            {tier.key === "competir" && (lang === "pt" ? "Estrutura competitiva" : "Competitive structure")}
            {tier.key === "operar" && (lang === "pt" ? "Fundação" : "Foundation")}
          </div>
          {showHints && <div className="hint" style={{marginBottom: 12}}>{tier.hint}</div>}
          <div style={{display: "flex", flexWrap: "wrap", gap: 6}}>
            {tier.items.map((item, i) => (
              <div key={i} style={{
                background: "white", border: "1px solid var(--neo-border)",
                borderRadius: 4, padding: "6px 10px", fontSize: 13,
                display: "flex", alignItems: "center", gap: 8
              }}>
                <span>{item}</span>
                <button className="btn ghost sm" onClick={() => onRemove(tier.key, i)}
                  style={{padding: 0, width: 18, height: 18}}>
                  <Icon name="x" size={12} />
                </button>
              </div>
            ))}
            {adding === tier.key ? (
              <span style={{display: "inline-flex", gap: 4}}>
                <input className="input" autoFocus value={addText} onChange={e => setAddText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && commit()} onBlur={commit}
                  style={{height: 28, fontSize: 13, width: 240}} />
              </span>
            ) : (
              <button className="btn outline sm" onClick={() => setAdding(tier.key)}>
                <Icon name="plus" size={12} /> {lang === "pt" ? "Adicionar" : "Add"}
              </button>
            )}
          </div>
        </div>
      ))}
      {licencas.expiradas && licencas.expiradas.length > 0 && (
        <div className="pyramid-tier expiradas">
          <div className="tier-label">↓ {t.expiradas}</div>
          {showHints && <div className="hint" style={{marginBottom: 8}}>{t.expiradasHint}</div>}
          <div style={{display: "flex", flexWrap: "wrap", gap: 6}}>
            {licencas.expiradas.map((item, i) => (
              <div key={i} style={{
                background: "white", border: "1px dashed var(--neo-border)",
                borderRadius: 4, padding: "6px 10px", fontSize: 13,
                display: "flex", alignItems: "center", gap: 8,
                color: "var(--neo-fg-3)", textDecoration: "line-through"
              }}>
                <span>{item}</span>
                <button className="btn ghost sm" onClick={() => onRemove("expiradas", i)}
                  style={{padding: 0, width: 18, height: 18}}><Icon name="x" size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{padding: "12px 24px", borderTop: "1px solid var(--neo-border-subtle)", display: "flex", gap: 6, background: "var(--neo-gray-2)"}}>
        <button className="btn ghost sm" onClick={() => setAdding("expiradas")}>
          <Icon name="plus" size={12} /> {lang === "pt" ? "Marcar como expirada" : "Mark as expired"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// AMBIDEXTERITY MATRIX (interactive)
// ============================================================
function AmbidexterityMatrix({ matriz, onAdd, onRemove, lang, showHints }) {
  const t = window.I18N[lang];
  const cells = [
    { key: "remodelar", model: "diferente", problem: "atual", title: t.remodelar, meta: t.remodelarMeta },
    { key: "extrapolar", model: "diferente", problem: "diferente", title: t.extrapolar, meta: t.extrapolarMeta },
    { key: "otimizar",   model: "atual",     problem: "atual",     title: t.otimizar,   meta: t.otimizarMeta },
    { key: "diversificar", model: "atual",   problem: "diferente", title: t.diversificar, meta: t.diversificarMeta },
  ];
  const [adding, setAdding] = useState(null);
  const [addText, setAddText] = useState("");
  const commit = () => {
    if (addText.trim()) onAdd(adding, addText.trim());
    setAddText(""); setAdding(null);
  };
  return (
    <div>
      <div className="matrix-grid">
        <div className="label-corner"></div>
        <div className="label-h">{t.probAtual}</div>
        <div className="label-h">{t.probDiferente}</div>
        <div className="label-v">{t.modDiferente}</div>
        {cells.slice(0, 2).map(c => (
          <div key={c.key} className={`cell ${c.key}`}>
            <div className="cell-header">
              <div className="cell-name">{c.title}</div>
              <div className="cell-axis-meta">{c.meta}</div>
            </div>
            <ul>{(matriz[c.key] || []).map((item, i) => (
              <li key={i}>
                {item}
                <button className="btn ghost sm" onClick={() => onRemove(c.key, i)}
                  style={{padding: 0, width: 16, height: 16, marginLeft: 4}}>
                  <Icon name="x" size={10} />
                </button>
              </li>
            ))}</ul>
            <div className="add-row">
              {adding === c.key ? (
                <input className="input" autoFocus value={addText}
                  onChange={e => setAddText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && commit()} onBlur={commit}
                  placeholder={lang === "pt" ? "Opção estratégica…" : "Strategic option…"}
                  style={{fontSize: 12, height: 28}} />
              ) : (
                <button className="btn ghost sm" onClick={() => setAdding(c.key)}>
                  <Icon name="plus" size={12} /> {lang === "pt" ? "Opção" : "Option"}
                </button>
              )}
            </div>
          </div>
        ))}
        <div className="label-v">{t.modAtual}</div>
        {cells.slice(2, 4).map(c => (
          <div key={c.key} className={`cell ${c.key}`}>
            <div className="cell-header">
              <div className="cell-name">{c.title}</div>
              <div className="cell-axis-meta">{c.meta}</div>
            </div>
            <ul>{(matriz[c.key] || []).map((item, i) => (
              <li key={i}>
                {item}
                <button className="btn ghost sm" onClick={() => onRemove(c.key, i)}
                  style={{padding: 0, width: 16, height: 16, marginLeft: 4}}>
                  <Icon name="x" size={10} />
                </button>
              </li>
            ))}</ul>
            <div className="add-row">
              {adding === c.key ? (
                <input className="input" autoFocus value={addText}
                  onChange={e => setAddText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && commit()} onBlur={commit}
                  placeholder={lang === "pt" ? "Opção estratégica…" : "Strategic option…"}
                  style={{fontSize: 12, height: 28}} />
              ) : (
                <button className="btn ghost sm" onClick={() => setAdding(c.key)}>
                  <Icon name="plus" size={12} /> {lang === "pt" ? "Opção" : "Option"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{display: "flex", justifyContent: "center", marginTop: 8, fontSize: 11, color: "var(--neo-fg-3)", textTransform: "uppercase", letterSpacing: "0.08em"}}>
        ← {t.matrizProblema} →
      </div>
    </div>
  );
}

// ============================================================
// HORIZONS (drag-and-drop initiatives)
// ============================================================
function Horizons({ iniciativas, onUpdate, onAdd, onRemove, lang }) {
  const t = window.I18N[lang];
  const cols = [
    { key: "no",   name: t.hNo,   meta: t.hNoMeta },
    { key: "now",  name: t.hNow,  meta: t.hNowMeta },
    { key: "near", name: t.hNear, meta: t.hNearMeta },
    { key: "next", name: t.hNext, meta: t.hNextMeta },
  ];
  const [dragId, setDragId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [addingTo, setAddingTo] = useState(null);

  const onDragStart = (id) => setDragId(id);
  const onDragOver = (e, col) => { e.preventDefault(); setDragOverCol(col); };
  const onDrop = (e, col) => {
    e.preventDefault();
    if (dragId) {
      const tipo = col === "no" ? "parar" : col === "now" ? "projeto" : col === "near" ? "experimento" : "investigacao";
      onUpdate(dragId, { horizonte: col, tipo });
    }
    setDragId(null); setDragOverCol(null);
  };

  return (
    <div className="horizons">
      {cols.map(col => {
        const items = iniciativas.filter(i => i.horizonte === col.key);
        return (
          <div key={col.key} className={`horizon-col ${dragOverCol === col.key ? "drag-over" : ""}`}
            onDragOver={e => onDragOver(e, col.key)}
            onDrop={e => onDrop(e, col.key)}
            onDragLeave={() => setDragOverCol(null)}>
            <div className="hc-head">
              <div className="hc-name">{col.name}</div>
              <div className="hc-meta">{col.meta}</div>
              <div style={{flex: 1}}></div>
              <button className="btn ghost sm" onClick={() => setAddingTo(col.key)}
                style={{padding: 0, width: 22, height: 22}}>
                <Icon name="plus" size={12} />
              </button>
            </div>
            <div className="hc-body">
              {items.map(it => (
                <div key={it.id} className={`horizon-card ${col.key} ${dragId === it.id ? "dragging" : ""}`}
                  draggable onDragStart={() => onDragStart(it.id)}>
                  {editingId === it.id ? (
                    <EditInitiative item={it} onSave={(patch) => { onUpdate(it.id, patch); setEditingId(null); }}
                      onCancel={() => setEditingId(null)} onDelete={() => { onRemove(it.id); setEditingId(null); }}
                      lang={lang} />
                  ) : (
                    <div onClick={() => setEditingId(it.id)} style={{cursor: "pointer"}}>
                      <div className="hc-title">{it.titulo}</div>
                      {it.descricao && <div style={{fontSize: 11, color: "var(--neo-fg-2)", lineHeight: 1.4}}>{it.descricao.slice(0, 110)}{it.descricao.length > 110 ? "…" : ""}</div>}
                      <div className="hc-meta-row">
                        {it.dono && <span>👤 {it.dono}</span>}
                        {it.metrica && <span>📈 {it.metrica.slice(0, 30)}{it.metrica.length > 30 ? "…" : ""}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {addingTo === col.key && (
                <NewInitiative col={col.key} lang={lang}
                  onSave={(item) => { onAdd({ ...item, horizonte: col.key,
                    tipo: col.key === "no" ? "parar" : col.key === "now" ? "projeto" : col.key === "near" ? "experimento" : "investigacao"
                  }); setAddingTo(null); }}
                  onCancel={() => setAddingTo(null)} />
              )}
              {items.length === 0 && addingTo !== col.key && (
                <div style={{fontSize: 12, color: "var(--neo-fg-3)", fontStyle: "italic", padding: "16px 8px", textAlign: "center"}}>
                  {lang === "pt" ? "Arraste ou adicione" : "Drag or add"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EditInitiative({ item, onSave, onCancel, onDelete, lang }) {
  const [v, setV] = useState({ ...item });
  return (
    <div style={{display: "flex", flexDirection: "column", gap: 6}}>
      <input className="input" value={v.titulo} placeholder={lang === "pt" ? "Título" : "Title"}
        onChange={e => setV({ ...v, titulo: e.target.value })} style={{fontSize: 12, height: 26}} />
      <textarea className="textarea" value={v.descricao || ""} placeholder={lang === "pt" ? "Descrição" : "Description"}
        onChange={e => setV({ ...v, descricao: e.target.value })} rows={2} style={{fontSize: 12}} />
      <input className="input" value={v.dono || ""} placeholder={lang === "pt" ? "Dono" : "Owner"}
        onChange={e => setV({ ...v, dono: e.target.value })} style={{fontSize: 12, height: 26}} />
      <input className="input" value={v.metrica || ""} placeholder={lang === "pt" ? "Métrica" : "Metric"}
        onChange={e => setV({ ...v, metrica: e.target.value })} style={{fontSize: 12, height: 26}} />
      <div style={{display: "flex", gap: 4, justifyContent: "space-between"}}>
        <button className="btn ghost sm" onClick={onDelete}><Icon name="trash" size={12} /></button>
        <div style={{display: "flex", gap: 4}}>
          <button className="btn sm" onClick={onCancel}>{lang === "pt" ? "Cancelar" : "Cancel"}</button>
          <button className="btn primary sm" onClick={() => onSave(v)}>{lang === "pt" ? "Salvar" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function NewInitiative({ col, lang, onSave, onCancel }) {
  const [v, setV] = useState({ titulo: "", descricao: "", dono: "", metrica: "" });
  return (
    <div className={`horizon-card ${col}`} style={{cursor: "default"}}>
      <input className="input" autoFocus value={v.titulo}
        placeholder={lang === "pt" ? "Título da iniciativa…" : "Initiative title…"}
        onChange={e => setV({ ...v, titulo: e.target.value })}
        onKeyDown={e => e.key === "Enter" && v.titulo.trim() && onSave(v)}
        style={{fontSize: 12, height: 26, marginBottom: 4}} />
      <input className="input" value={v.dono}
        placeholder={lang === "pt" ? "Dono" : "Owner"}
        onChange={e => setV({ ...v, dono: e.target.value })}
        style={{fontSize: 11, height: 24, marginBottom: 4}} />
      <input className="input" value={v.metrica}
        placeholder={lang === "pt" ? "Métrica" : "Metric"}
        onChange={e => setV({ ...v, metrica: e.target.value })}
        style={{fontSize: 11, height: 24, marginBottom: 6}} />
      <div style={{display: "flex", gap: 4, justifyContent: "flex-end"}}>
        <button className="btn sm" onClick={onCancel}>×</button>
        <button className="btn primary sm" onClick={() => v.titulo.trim() && onSave(v)}>✓</button>
      </div>
    </div>
  );
}

window.SLDArtifacts = { SignalRadar, LicensePyramid, AmbidexterityMatrix, Horizons, Icon, uid };
})();
