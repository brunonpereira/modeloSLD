/* global React */
// plan.jsx — consolidated plan document + slides presentation
(function(){
const { useState: useStatePl, useEffect: useEffectPl } = React;
const { Icon: IconPl, SignalRadar: SignalRadarPl, LicensePyramid: LicensePyramidPl, AmbidexterityMatrix: AmbiMatrixPl, Horizons: HorizonsPl } = window.SLDArtifacts;

// ============================================================
// CONSOLIDATED PLAN DOCUMENT
// ============================================================
function PlanDocument({ state, lang }) {
  const t = window.I18N[lang];
  const e = state.empresa;
  const niveis = { presente: t.nivelPresente, provavel: t.nivelProvavel, possivel: t.nivelPossivel };
  const catLabel = (c) => {
    const x = c === "Gestão" ? "Gestão & Pessoas" : c;
    if (x === "Tecnologia") return t.catTecnologia;
    if (x === "Mercado") return t.catMercado;
    return t.catGestao;
  };

  return (
    <div className="plan-doc">
      {/* Cover */}
      <div className="doc-eyebrow">{lang === "pt" ? "Método SLD · Plano Estratégico" : "SLD Method · Strategic Plan"}</div>
      <h1>{e.nome || t.untitled}</h1>
      <div className="doc-meta">
        {e.setor && <>{e.setor} · </>}
        {e.porte && <>{e.porte} · </>}
        {new Date().toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
      </div>

      {/* Summary */}
      <h2>{t.sumarioExecutivo}</h2>
      {state.tese ? (
        state.tese.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)
      ) : (
        <p style={{color: "var(--neo-fg-3)", fontStyle: "italic"}}>
          {lang === "pt" ? "Tese estratégica ainda não escrita." : "Strategic thesis not yet written."}
        </p>
      )}
      {state.apostas.length > 0 && (
        <>
          <h3>{t.apostas}</h3>
          <div className="apostas">
            {state.apostas.filter(Boolean).map((a, i) => (
              <div key={i} className="aposta-card">
                <div className="num">0{i+1}</div>
                <div>{a}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Context */}
      <h2>{t.contextoEmpresa}</h2>
      {e.problema && <p><strong>{t.fProblema}.</strong> {e.problema}</p>}
      {e.porque_agora && <p><strong>{t.fPorqueAgora}.</strong> {e.porque_agora}</p>}
      {(e.horizonte || e.geografia || e.modelo_receita) && (
        <table>
          <tbody>
            {e.setor && <tr><th style={{width: 200}}>{t.fSetor}</th><td>{e.setor}</td></tr>}
            {e.porte && <tr><th>{t.fPorte}</th><td>{e.porte}</td></tr>}
            {e.tempo && <tr><th>{t.fTempo}</th><td>{e.tempo}</td></tr>}
            {e.geografia && <tr><th>{t.fGeografia}</th><td>{e.geografia}</td></tr>}
            {e.modelo_receita && <tr><th>{t.fModeloReceita}</th><td>{e.modelo_receita}</td></tr>}
            {e.horizonte && <tr><th>{t.fHorizonte}</th><td>{e.horizonte}</td></tr>}
            {e.ativos && <tr><th>{t.fAtivos}</th><td>{e.ativos}</td></tr>}
          </tbody>
        </table>
      )}

      {/* SIGNALS */}
      <h2>S · {t.radarSinais}</h2>
      <div style={{maxWidth: 560, margin: "16px auto"}}>
        <SignalRadarPl sinais={state.sinais} lang={lang} />
      </div>
      {state.zona_atual && <div className="pull">"{state.zona_atual}"</div>}
      {state.sinais.length > 0 && (
        <table>
          <thead>
            <tr><th>{t.sinalName}</th><th style={{width: 120}}>{lang === "pt" ? "Categoria" : "Category"}</th><th style={{width: 90}}>{lang === "pt" ? "Nível" : "Level"}</th><th style={{width: 60}}>I</th><th style={{width: 60}}>C</th></tr>
          </thead>
          <tbody>
            {state.sinais.map(s => (
              <tr key={s.id}>
                <td>
                  <div style={{fontWeight: 600}}>{s.nome}</div>
                  {s.implicacao && <div style={{color: "var(--neo-fg-2)", marginTop: 2, fontSize: 11}}>→ {s.implicacao}</div>}
                </td>
                <td>{catLabel(s.categoria)}</td>
                <td>{niveis[s.nivel]}</td>
                <td>{s.impacto}</td>
                <td>{s.clareza}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* LICENSES */}
      <h2>L · {t.piramideLicencas}</h2>
      <div style={{margin: "16px 0"}}>
        <LicensePyramidPl licencas={state.licencas} onAdd={()=>{}} onRemove={()=>{}} lang={lang} showHints={false} />
      </div>
      {state.licenca_vencer_teste.licenca && (
        <>
          <h3>{t.testeTriplice}</h3>
          <p><strong>{t.fLicencaVencer}:</strong> {state.licenca_vencer_teste.licenca}</p>
          <table>
            <tbody>
              <tr><th style={{width: 200}}>① {t.fRelevante}</th><td>{state.licenca_vencer_teste.relevante}</td></tr>
              <tr><th>② {t.fVerdadeiro}</th><td>{state.licenca_vencer_teste.verdadeiro}</td></tr>
              <tr><th>③ {t.fDiferente}</th><td>{state.licenca_vencer_teste.diferente}</td></tr>
            </tbody>
          </table>
        </>
      )}

      {/* MATRIX */}
      <h2>D · {t.matrizAmbi}</h2>
      <div style={{margin: "16px 0"}}>
        <AmbiMatrixPl matriz={state.matriz} onAdd={()=>{}} onRemove={()=>{}} lang={lang} showHints={false} />
      </div>

      {/* ROADMAP */}
      <h3>{t.roadmap}</h3>
      <div style={{margin: "16px 0"}}>
        <HorizonsPl iniciativas={state.iniciativas} onUpdate={()=>{}} onAdd={()=>{}} onRemove={()=>{}} lang={lang} />
      </div>

      {/* JORNADA */}
      <h2>{t.jornadaSld}</h2>
      <p>
        {lang === "pt"
          ? "O fio que amarra o método: cada sinal pressiona uma licença; cada licença sob pressão dispara um movimento na matriz; cada movimento vira iniciativa em um horizonte com dono e métrica."
          : "The thread that ties the method: each signal pressures a license; each pressured license triggers a matrix move; each move becomes an initiative on a horizon with owner and metric."}
      </p>

      {state.riscos.length > 0 && (
        <>
          <h2>{t.riscosEPress}</h2>
          {state.riscos.filter(Boolean).map((r, i) => (
            <p key={i} style={{paddingLeft: 16, borderLeft: "2px solid var(--neo-warning)", margin: "8px 0"}}>{r}</p>
          ))}
        </>
      )}

      <div style={{marginTop: 64, paddingTop: 16, borderTop: "1px solid var(--sld-rule)", fontSize: 11, color: "var(--neo-fg-3)", fontStyle: "italic", textAlign: "center"}}>
        {lang === "pt"
          ? "\"Não existem vantagens competitivas sustentáveis. Existe a sustentação competitiva de vantagens.\""
          : "\"There are no sustainable competitive advantages. There is only the competitive sustenance of advantages.\""}
        <div style={{marginTop: 4}}>— Piero Franceschi · Método SLD</div>
      </div>

      {/* Machine-readable round-trip payload. Visually almost invisible
          but present in the PDF text layer — lets `Importar plano`
          reconstruct the exact state byte-for-byte without LLM. */}
      <SLDExportPayload state={state} />
    </div>
  );
}

// Base64 (UTF-8 safe) round-trip payload appended to every printed plan
// and to the last slide of the deck. Markers make it trivial for the
// importer to find and decode.
function SLDExportPayload({ state }) {
  let encoded = "";
  try {
    encoded = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  } catch (_) { return null; }
  return (
    <div className="sld-export-payload" aria-hidden="true">
      {"SLDPAYLOADV1"}{encoded}{"SLDPAYLOADEND"}
    </div>
  );
}

// ============================================================
// SLIDES VIEW — Vertical-scroll presentation
//
// A single long page with full-height sections, scrolled naturally on
// desktop or mobile (touch). A fixed nav lets the audience jump to
// any section; a progress bar tracks reading position.
// ============================================================
function SlidesView({ state, lang, onExit }) {
  const t = window.I18N[lang];
  const e = state.empresa;
  const isPt = lang === "pt";

  const [active, setActive] = useStatePl(0);
  const [progress, setProgress] = useStatePl(0);
  const sectionRefs = React.useRef([]);
  const scrollRef = React.useRef(null);

  // Build section descriptors so the nav and the body share a single source.
  const sections = React.useMemo(() => {
    const list = [
      { id: "hero",     label: isPt ? "Capa" : "Cover" },
      { id: "context",  label: isPt ? "Contexto" : "Context" },
    ];
    if (state.tese && state.tese.trim()) list.push({ id: "thesis", label: isPt ? "Tese" : "Thesis" });
    if ((state.apostas || []).some(Boolean)) list.push({ id: "bets", label: isPt ? "Apostas" : "Bets" });
    list.push({ id: "signals",  label: isPt ? "Sinais" : "Signals" });
    list.push({ id: "licenses", label: isPt ? "Licenças" : "Licenses" });
    list.push({ id: "matrix",   label: isPt ? "Matriz" : "Matrix" });
    list.push({ id: "horizons", label: isPt ? "Roadmap" : "Roadmap" });
    list.push({ id: "close",    label: isPt ? "Encerramento" : "Closing" });
    return list;
  }, [state.tese, state.apostas, isPt]);

  // Track scroll position to update progress bar + active section indicator.
  useEffectPl(() => {
    const root = scrollRef.current;
    if (!root) return;
    const onScroll = () => {
      const max = root.scrollHeight - root.clientHeight;
      setProgress(max > 0 ? Math.min(1, root.scrollTop / max) : 0);
      // Determine which section is most in view.
      const center = root.scrollTop + root.clientHeight * 0.35;
      let best = 0, bestDist = Infinity;
      sectionRefs.current.forEach((el, i) => {
        if (!el) return;
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;
        const dist = (center >= top && center <= bottom) ? 0 : Math.min(Math.abs(center - top), Math.abs(center - bottom));
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      setActive(best);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => root.removeEventListener("scroll", onScroll);
  }, [sections.length]);

  useEffectPl(() => {
    const onKey = (ev) => {
      if (ev.key === "Escape") onExit && onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  const scrollToSection = (i) => {
    const el = sectionRefs.current[i];
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ top: el.offsetTop, behavior: "smooth" });
    }
  };

  // Pre-render section bodies, then assign refs in render below.
  const renderSection = (id) => {
    if (id === "hero") return <ScrollHero state={state} lang={lang} />;
    if (id === "context") return <ScrollContext state={state} lang={lang} />;
    if (id === "thesis") return <ScrollThesis state={state} lang={lang} />;
    if (id === "bets") return <ScrollBets state={state} lang={lang} />;
    if (id === "signals") return <ScrollSignals state={state} lang={lang} />;
    if (id === "licenses") return <ScrollLicenses state={state} lang={lang} />;
    if (id === "matrix") return <ScrollMatrix state={state} lang={lang} />;
    if (id === "horizons") return <ScrollHorizons state={state} lang={lang} />;
    if (id === "close") return <ScrollClose state={state} lang={lang} />;
    return null;
  };

  return (
    <div className="sd-deck">
      <header className="sd-nav">
        <div className="sd-nav-brand">
          <span className="sd-nav-mark">SLD</span>
          <span className="sd-nav-title">{e.nome || (isPt ? "Plano Estratégico" : "Strategic Plan")}</span>
        </div>
        <nav className="sd-nav-pills" aria-label={isPt ? "Seções" : "Sections"}>
          {sections.map((s, i) => (
            <button key={s.id} className={i === active ? "active" : ""}
              onClick={() => scrollToSection(i)}>{s.label}</button>
          ))}
        </nav>
        <div className="sd-nav-actions">
          <button className="sd-nav-icon" onClick={() => downloadStandaloneHTML(state, lang)}
            title={isPt ? "Baixar HTML autônomo desta apresentação" : "Download standalone HTML of this presentation"}
            aria-label="download">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          <button className="sd-nav-icon" onClick={onExit} title={isPt ? "Sair" : "Close"} aria-label="close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="sd-progress" style={{ width: (progress * 100).toFixed(2) + "%" }}></div>
      </header>

      <main className="sd-main" ref={scrollRef}>
        {sections.map((s, i) => (
          <section key={s.id} id={`sd-section-${s.id}`} data-screen-label={s.label}
            ref={el => (sectionRefs.current[i] = el)}
            className={`sd-section sd-section-${s.id}`}>
            <div className="sd-section-inner">
              <div className="sd-section-meta">
                <span className="sd-section-index">{String(i + 1).padStart(2, "0")}</span>
                <span className="sd-section-label">{s.label}</span>
              </div>
              {renderSection(s.id)}
            </div>
          </section>
        ))}
        <SLDExportPayload state={state} />
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Per-section bodies
// ─────────────────────────────────────────────────────────────
function ScrollHero({ state, lang }) {
  const t = window.I18N[lang];
  const e = state.empresa;
  const isPt = lang === "pt";
  const dateStr = new Date().toLocaleDateString(isPt ? "pt-BR" : "en-US", { year: "numeric", month: "long" });
  return (
    <div className="sd-hero">
      <div className="sd-eyebrow light">{isPt ? "Plano Estratégico · Método SLD" : "Strategic Plan · SLD Method"}</div>
      <h1 className="sd-hero-title">{e.nome || t.untitled}</h1>
      {(e.setor || e.porte) && (
        <div className="sd-hero-meta">
          {e.setor && <span>{e.setor}</span>}
          {e.porte && <span>· {e.porte}</span>}
        </div>
      )}
      <div className="sd-hero-foot">
        <div className="sd-hero-date">{dateStr}</div>
        <div className="sd-scroll-hint">
          <span>{isPt ? "Role para começar" : "Scroll to begin"}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

function ScrollContext({ state, lang }) {
  const e = state.empresa;
  const isPt = lang === "pt";
  return (
    <>
      <div className="sd-eyebrow">{isPt ? "A empresa · O porquê agora" : "The company · Why now"}</div>
      {e.problema && <h2 className="sd-h2">{e.problema}</h2>}
      <div className="sd-context-grid">
        <div className="sd-context-block">
          <div className="sd-label">{isPt ? "Quem somos" : "Who we are"}</div>
          {e.setor && <div className="sd-context-line big">{e.setor}{e.porte ? ` · ${e.porte}` : ""}</div>}
          {(e.tempo || e.geografia) && (
            <div className="sd-context-line">{[e.tempo, e.geografia].filter(Boolean).join(" · ")}</div>
          )}
          {e.modelo_receita && <div className="sd-context-line muted">{e.modelo_receita}</div>}
          {e.horizonte && <div className="sd-context-line muted small">{e.horizonte}</div>}
        </div>
        <div className="sd-context-block">
          <div className="sd-label">{isPt ? "Por que agora" : "Why now"}</div>
          {e.porque_agora && <div className="sd-context-text">{e.porque_agora}</div>}
        </div>
      </div>
      {e.ativos && (
        <div className="sd-context-aside">
          <div className="sd-label">{isPt ? "O que já se sabe" : "What's already known"}</div>
          <div>{e.ativos}</div>
        </div>
      )}
    </>
  );
}

function ScrollThesis({ state, lang }) {
  const t = window.I18N[lang];
  const paras = state.tese.split(/\n\n+/);
  return (
    <>
      <div className="sd-eyebrow">{t.teseEstrategica}</div>
      <div className="sd-thesis-quote">{paras[0]}</div>
      {paras[1] && <div className="sd-thesis-body">{paras.slice(1).join("\n\n")}</div>}
    </>
  );
}

function ScrollBets({ state, lang }) {
  const t = window.I18N[lang];
  const isPt = lang === "pt";
  const bets = state.apostas.filter(Boolean);
  return (
    <>
      <div className="sd-eyebrow">{t.apostas}</div>
      <h2 className="sd-h2">{isPt ? "As apostas centrais" : "The core bets"}</h2>
      <div className="sd-bets">
        {bets.map((a, i) => (
          <div key={i} className="sd-bet">
            <div className="sd-bet-num">{String(i + 1).padStart(2, "0")}</div>
            <div className="sd-bet-text">{a}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function ScrollSignals({ state, lang }) {
  const t = window.I18N[lang];
  const isPt = lang === "pt";
  const top = state.sinais.filter(s => s.impacto >= 3).slice(0, 5);
  return (
    <>
      <div className="sd-eyebrow">S · {t.radarSinais}</div>
      <h2 className="sd-h2">{isPt ? "O que estamos lendo no ambiente" : "What we're reading"}</h2>
      <div className="sd-signals-grid">
        <div className="sd-signals-radar">
          <SignalRadarPl sinais={state.sinais} lang={lang} />
        </div>
        <div className="sd-signals-side">
          {state.zona_atual && (
            <div className="sd-signals-zone">"{state.zona_atual}"</div>
          )}
          <div className="sd-signals-list">
            {top.map(s => (
              <div key={s.id} className="sd-signal">
                <div className="sd-signal-name">{s.nome}</div>
                {s.implicacao && <div className="sd-signal-impl">→ {s.implicacao}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function ScrollLicenses({ state, lang }) {
  const t = window.I18N[lang];
  const isPt = lang === "pt";
  return (
    <>
      <div className="sd-eyebrow">L · {t.piramideLicencas}</div>
      <h2 className="sd-h2">{isPt ? "Onde criamos valor diferenciado" : "Where we create differentiated value"}</h2>
      <div className="sd-licenses-grid">
        <div className="sd-licenses-pyramid">
          <LicensePyramidPl licencas={state.licencas} onAdd={()=>{}} onRemove={()=>{}} lang={lang} showHints={false} />
        </div>
        {state.licenca_vencer_teste.licenca && (
          <div className="sd-licenses-test">
            <div className="sd-label">{t.testeTriplice}</div>
            <div className="sd-licenses-test-title">{state.licenca_vencer_teste.licenca}</div>
            <div className="sd-licenses-test-body">
              <p><strong>① {t.fRelevante}.</strong> {state.licenca_vencer_teste.relevante}</p>
              <p><strong>② {t.fVerdadeiro}.</strong> {state.licenca_vencer_teste.verdadeiro}</p>
              <p><strong>③ {t.fDiferente}.</strong> {state.licenca_vencer_teste.diferente}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ScrollMatrix({ state, lang }) {
  const t = window.I18N[lang];
  const isPt = lang === "pt";
  return (
    <>
      <div className="sd-eyebrow">D · {t.matrizAmbi}</div>
      <h2 className="sd-h2">{isPt ? "Onde vamos explorar" : "Where we'll explore"}</h2>
      <div className="sd-matrix-wrap">
        <AmbiMatrixPl matriz={state.matriz} onAdd={()=>{}} onRemove={()=>{}} lang={lang} showHints={false} />
      </div>
    </>
  );
}

function ScrollHorizons({ state, lang }) {
  const t = window.I18N[lang];
  const isPt = lang === "pt";
  return (
    <>
      <div className="sd-eyebrow">{t.roadmap}</div>
      <h2 className="sd-h2">{isPt ? "O motor da ambidestria" : "The ambidexterity engine"}</h2>
      <div className="sd-horizons-wrap">
        <HorizonsPl iniciativas={state.iniciativas} onUpdate={()=>{}} onAdd={()=>{}} onRemove={()=>{}} lang={lang} />
      </div>
      {state.riscos && state.riscos.some(Boolean) && (
        <div className="sd-risks">
          <div className="sd-label">{isPt ? "Riscos e pressupostos" : "Risks & assumptions"}</div>
          <ul>
            {state.riscos.filter(Boolean).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </>
  );
}

function ScrollClose({ state, lang }) {
  const isPt = lang === "pt";
  const counts = {
    now:  state.iniciativas.filter(i => i.horizonte === "now").length,
    near: state.iniciativas.filter(i => i.horizonte === "near").length,
    next: state.iniciativas.filter(i => i.horizonte === "next").length,
    no:   state.iniciativas.filter(i => i.horizonte === "no").length,
  };
  return (
    <div className="sd-close">
      <div className="sd-eyebrow light">{isPt ? "Próximos 90 dias" : "Next 90 days"}</div>
      <div className="sd-close-quote">
        {isPt
          ? "\u201CN\u00e3o existem vantagens competitivas sustent\u00e1veis. Existe a sustenta\u00e7\u00e3o competitiva de vantagens.\u201D"
          : "\u201CThere are no sustainable competitive advantages. There is only the competitive sustenance of advantages.\u201D"}
      </div>
      <div className="sd-close-attr">— Piero Franceschi</div>
      <div className="sd-close-counts">
        <div><strong>{counts.now}</strong> <span>{isPt ? "projetos" : "projects"}</span></div>
        <div><strong>{counts.near}</strong> <span>{isPt ? "experimentos" : "experiments"}</span></div>
        <div><strong>{counts.next}</strong> <span>{isPt ? "investigações" : "investigations"}</span></div>
        <div><strong>{counts.no}</strong> <span>{isPt ? "para parar" : "to stop"}</span></div>
      </div>
    </div>
  );
}

// ============================================================
// Download standalone HTML of the presentation
//
// Captures the live-rendered scroll deck DOM + all CSS rules from the
// active stylesheets, wraps them into a self-contained HTML document
// with a small vanilla-JS shim for the active-section / progress bar /
// nav-pill smooth-scroll behavior, then triggers a file download.
// The result is a portable, offline-viewable file that re-prints the
// exact presentation the user is looking at.
// ============================================================
function downloadStandaloneHTML(state, lang) {
  const isPt = lang === "pt";
  // 1. Grab the rendered deck. Clone so we can safely mutate.
  const live = document.querySelector(".sd-deck");
  if (!live) return;
  const deck = live.cloneNode(true);
  // Strip controls that don't make sense in the standalone (close button).
  deck.querySelectorAll("[aria-label='close']").forEach(n => n.remove());
  // Reset inline progress width — the shim recalculates on load.
  const progressEl = deck.querySelector(".sd-progress");
  if (progressEl) progressEl.style.width = "0%";

  // 2. Collect every CSS rule from same-origin stylesheets.
  let cssText = "";
  for (const sheet of document.styleSheets) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const r of rules) cssText += r.cssText + "\n";
    } catch (_) { /* cross-origin — skip */ }
  }

  // 3. Standalone-only overrides: take the deck out of "fixed" overlay mode
  //    and make scrolling happen on document.body so it works as a normal page.
  const standaloneCSS = `
html, body { margin: 0; padding: 0; background: var(--sd-cream, #fcfbf7); }
body { min-height: 100vh; }
.sd-deck { position: static !important; height: auto !important; }
.sd-main { flex: none; overflow: visible; height: auto; }
.sd-nav { position: sticky; top: 0; z-index: 50; }
.sd-section { min-height: calc(100vh - 56px); }
@media (max-width: 768px) { .sd-section { min-height: calc(100vh - 52px); } }
`;

  // 4. Vanilla shim — wires nav-pill clicks, scroll progress + active pill.
  const shim = `
(function () {
  const main = document.documentElement; // window scrolls in standalone
  const pills = document.querySelectorAll('.sd-nav-pills button');
  const sections = document.querySelectorAll('.sd-section');
  const progress = document.querySelector('.sd-progress');
  pills.forEach((btn, i) => btn.addEventListener('click', () => {
    const el = sections[i];
    if (!el) return;
    const navH = document.querySelector('.sd-nav').offsetHeight;
    window.scrollTo({ top: el.offsetTop - navH, behavior: 'smooth' });
  }));
  function update() {
    const top = window.scrollY;
    const max = (main.scrollHeight - window.innerHeight) || 1;
    if (progress) progress.style.width = Math.min(100, (top / max) * 100).toFixed(2) + '%';
    const center = top + window.innerHeight * 0.35;
    let best = 0, bestDist = Infinity;
    sections.forEach((el, i) => {
      const a = el.offsetTop, b = a + el.offsetHeight;
      const d = (center >= a && center <= b) ? 0 : Math.min(Math.abs(center - a), Math.abs(center - b));
      if (d < bestDist) { bestDist = d; best = i; }
    });
    pills.forEach((p, i) => p.classList.toggle('active', i === best));
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
`;

  const empresa = (state.empresa && state.empresa.nome) || (isPt ? "Plano SLD" : "SLD Plan");
  const titleText = `${empresa} — ${isPt ? "Apresentação SLD" : "SLD Presentation"}`;
  const dateStr = new Date().toLocaleDateString(isPt ? "pt-BR" : "en-US", { year: "numeric", month: "long", day: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHTML(titleText)}</title>
<meta name="description" content="${escapeHTML(isPt ? `Apresentação estratégica gerada em ${dateStr}` : `Strategic presentation generated on ${dateStr}`)}">
<style>${cssText}${standaloneCSS}</style>
</head>
<body>
${deck.outerHTML}
<script>${shim}</script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = empresa.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "plano";
  a.href = url;
  a.download = `${slug}_apresentacao.html`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
}

function escapeHTML(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

window.SLDPlan = { PlanDocument, SlidesView };
})();
