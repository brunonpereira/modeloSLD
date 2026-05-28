/* global React, ReactDOM */
// app.jsx — main entry, top bar, landing screen, mode routing
(function(){
const { useState, useEffect, useMemo } = React;
const { Icon } = window.SLDArtifacts;
const { WizardExperience, WorkspaceExperience, CanvasExperience } = window.SLDExperiences;
const { PlanDocument, SlidesView } = window.SLDPlan;

const STORAGE_KEY = "sld_state_v1";
const PREF_KEY = "sld_prefs_v1";

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

const DEFAULT_PREFS = /*EDITMODE-BEGIN*/{
  "sampleMode": "empty",
  "showHints": true,
  "density": "comfortable"
}/*EDITMODE-END*/;

function App() {
  // language
  const [lang, setLang] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || "{}").lang || "pt"; } catch { return "pt"; }
  });
  // experience mode: 'landing' | 'wizard' | 'workspace' | 'canvas' | 'plan' | 'slides'
  const [mode, setMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || "{}").mode || "landing"; } catch { return "landing"; }
  });
  // tweak prefs (persisted on host via __edit_mode_set_keys)
  const [prefs, setPrefsState] = useState(DEFAULT_PREFS);
  const setPrefs = (patch) => {
    const next = typeof patch === "function" ? patch(prefs) : { ...prefs, ...patch };
    setPrefsState(next);
    try { window.parent.postMessage({ type: "__edit_mode_set_keys", edits: next }, "*"); } catch {}
  };

  // strategy state (persisted in localStorage)
  const [state, setStateRaw] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return prefs.sampleMode === "filled" ? deepClone(window.SAMPLE_FILLED) : deepClone(window.SAMPLE_EMPTY);
  });
  const setState = (next) => {
    setStateRaw(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  // persist lang/mode
  useEffect(() => {
    try {
      const cur = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
      localStorage.setItem(PREF_KEY, JSON.stringify({ ...cur, lang, mode }));
    } catch {}
  }, [lang, mode]);

  // sample switcher
  const loadSample = (which) => {
    if (which === "filled") setState(deepClone(window.SAMPLE_FILLED));
    else setState(deepClone(window.SAMPLE_EMPTY));
  };

  const resetAll = () => {
    if (confirm(window.I18N[lang].confirmReset)) {
      setState(deepClone(window.SAMPLE_EMPTY));
    }
  };

  const t = window.I18N[lang];

  // Slides full-screen view
  if (mode === "slides") {
    return <SlidesView state={state} lang={lang} onExit={() => setMode(state.empresa.nome ? "workspace" : "landing")} />;
  }

  return (
    <div className="sld-app">
      <TopBar lang={lang} setLang={setLang} mode={mode} setMode={setMode}
        empresa={state.empresa.nome} onPresent={() => setMode("slides")}
        onImport={(parsed) => { setState(parsed); if (mode === "landing" || mode === "plan" || mode === "slides") setMode("workspace"); }} />

      {mode === "landing" && (
        <Landing lang={lang} onChoose={(m) => setMode(m)}
          onImport={(parsed) => { setState(parsed); setMode("workspace"); }} />
      )}
      {mode === "wizard" && (
        <main className="sld-main">
          <WizardExperience state={state} setState={setState} lang={lang}
            showHints={prefs.showHints !== false} onViewPlan={() => setMode("plan")} />
        </main>
      )}
      {mode === "workspace" && (
        <WorkspaceExperience state={state} setState={setState} lang={lang}
          showHints={prefs.showHints !== false} onViewPlan={() => setMode("plan")} />
      )}
      {mode === "canvas" && (
        <CanvasExperience state={state} setState={setState} lang={lang}
          showHints={prefs.showHints !== false} onViewPlan={() => setMode("plan")} />
      )}
      {mode === "plan" && (
        <main className="sld-main" style={{padding: "32px 0"}}>
          <div className="no-print" style={{maxWidth: 920, margin: "0 auto", padding: "0 24px 16px", display: "flex", gap: 8}}>
            <button className="btn outline" onClick={() => setMode(state.empresa.nome ? "workspace" : "landing")}>
              <Icon name="chev_l" size={14} /> {t.backToApp}
            </button>
            <div style={{flex: 1}}></div>
            {window.SLDImport && window.SLDImport.exportStateAsJSON && (
              <button className="btn outline" onClick={() => window.SLDImport.exportStateAsJSON(state, lang)}
                title={lang === "pt"
                  ? "Baixar o estado completo do plano como JSON — reimportável aqui sem perdas."
                  : "Download the full plan state as JSON — re-importable here losslessly."}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{marginRight: 4}}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {lang === "pt" ? "Exportar JSON" : "Export JSON"}
              </button>
            )}
            <button className="btn outline" onClick={() => window.print()}>
              <Icon name="print" size={14} /> {t.print}
            </button>
            <button className="btn primary" onClick={() => setMode("slides")}>
              <Icon name="play" size={14} /> {t.presentation}
            </button>
          </div>
          <PlanDocument state={state} lang={lang} />
        </main>
      )}

      <TweaksHost lang={lang} setLang={setLang} prefs={prefs} setPrefs={setPrefs}
        onLoadSample={loadSample} onReset={resetAll} mode={mode} setMode={setMode}
        state={state} setState={setState} />
    </div>
  );
}

// ============================================================
// Top Bar
// ============================================================
function TopBar({ lang, setLang, mode, setMode, empresa, onPresent, onImport }) {
  const t = window.I18N[lang];
  const ImportButton = window.SLDImport && window.SLDImport.ImportButton;
  return (
    <header className="sld-topbar" data-screen-label="App Topbar">
      <div className="brand" onClick={() => setMode("landing")} style={{cursor: "pointer"}}>
        <div className="brand-mark">SLD</div>
        <div>
          <div className="brand-name">{t.appName}</div>
        </div>
      </div>
      <div className="spacer"></div>
      {mode !== "landing" && (
        <>
          <div className="sld-mode-switch">
            <button className={mode === "wizard" ? "active" : ""} onClick={() => setMode("wizard")} title={t.modeWizardName}>
              <Icon name="list" size={12} /> Wizard
            </button>
            <button className={mode === "workspace" ? "active" : ""} onClick={() => setMode("workspace")} title={t.modeWorkspaceName}>
              <Icon name="grid" size={12} /> Workspace
            </button>
            <button className={mode === "canvas" ? "active" : ""} onClick={() => setMode("canvas")} title={t.modeCanvasName}>
              <Icon name="layers" size={12} /> Canvas
            </button>
          </div>
          {ImportButton && onImport && (
            <ImportButton lang={lang} onImport={onImport} variant="outline" />
          )}
          <button className="btn" onClick={() => setMode("plan")}>
            <Icon name="print" size={12} /> {t.viewPlan}
          </button>
        </>
      )}
      <div className="sld-lang">
        <button className={lang === "pt" ? "active" : ""} onClick={() => setLang("pt")}>PT</button>
        <span style={{color: "var(--neo-border)"}}>/</span>
        <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
      </div>
    </header>
  );
}

// ============================================================
// Landing Screen
// ============================================================
function Landing({ lang, onChoose, onImport }) {
  const t = window.I18N[lang];
  const ImportButton = window.SLDImport && window.SLDImport.ImportButton;
  return (
    <main className="sld-main">
      <div className="landing" data-screen-label="00 Landing">
        <div className="landing-inner">
          <div className="eyebrow">{t.appSub}</div>
          <h1 dangerouslySetInnerHTML={{ __html: t.landingTitle }} />
          <p className="lede">{t.landingLede}</p>

          <div className="choose-label">{t.chooseExperience}</div>
          <div className="modes">
            <button className="mode-card" onClick={() => onChoose("wizard")}>
              <div className="mc-icon"><Icon name="list" size={20} /></div>
              <h3>{t.modeWizardName}</h3>
              <p>{t.modeWizardDesc}</p>
              <div className="mc-meta">{t.modeWizardMeta}</div>
            </button>
            <button className="mode-card" onClick={() => onChoose("workspace")}>
              <div className="mc-icon"><Icon name="grid" size={20} /></div>
              <h3>{t.modeWorkspaceName}</h3>
              <p>{t.modeWorkspaceDesc}</p>
              <div className="mc-meta">{t.modeWorkspaceMeta}</div>
            </button>
            <button className="mode-card" onClick={() => onChoose("canvas")}>
              <div className="mc-icon"><Icon name="layers" size={20} /></div>
              <h3>{t.modeCanvasName}</h3>
              <p>{t.modeCanvasDesc}</p>
              <div className="mc-meta">{t.modeCanvasMeta}</div>
            </button>
          </div>

          {ImportButton && (
            <div className="landing-import">
              <div className="landing-import-divider">
                <span>{lang === "pt" ? "ou" : "or"}</span>
              </div>
              <div className="landing-import-row">
                <div>
                  <div className="landing-import-title">
                    {lang === "pt"
                      ? "Continuar de um plano existente"
                      : "Continue from an existing plan"}
                  </div>
                  <div className="landing-import-desc">
                    {lang === "pt"
                      ? "Carregue um PDF, apresentação (.pptx), HTML ou JSON exportado deste app — o Consultor SLD lê o documento e preenche todos os campos."
                      : "Upload a PDF, presentation (.pptx), HTML or JSON exported from this app — the SLD Consultant reads it and fills every field."}
                  </div>
                </div>
                <ImportButton lang={lang} onImport={onImport} variant="primary" />
              </div>
            </div>
          )}

          <PillarOverview lang={lang} />
        </div>
      </div>
    </main>
  );
}

function PillarOverview({ lang }) {
  const pillars = lang === "pt" ? [
    { l: "S", name: "Sinais", sub: "Saber das coisas", desc: "Radar dos sinais que podem impactar o negócio. Presente, Provável, Possível." },
    { l: "L", name: "Licenças", sub: "Decidir com clareza", desc: "Operar, Competir, Vencer. Toda vantagem é temporária — revalidar ou expira." },
    { l: "D", name: "Dimensões", sub: "Fazer acontecer", desc: "Matriz da ambidestria · Now, Near, Next, No. Otimizar e desbravar ao mesmo tempo." }
  ] : [
    { l: "S", name: "Signals", sub: "Knowing things", desc: "Radar of signals that may impact the business. Present, Probable, Possible." },
    { l: "L", name: "Licenses", sub: "Deciding with clarity", desc: "Operate, Compete, Win. Every advantage is temporary — revalidate or expire." },
    { l: "D", name: "Dimensions", sub: "Making it happen", desc: "Ambidexterity matrix · Now, Near, Next, No. Optimize and explore at the same time." }
  ];
  return (
    <div style={{marginTop: 32, paddingTop: 32, borderTop: "1px solid var(--neo-border)"}}>
      <div className="choose-label">{lang === "pt" ? "O método em três pilares" : "The method in three pillars"}</div>
      <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginTop: 16}}>
        {pillars.map((p, i) => (
          <div key={p.l} style={{display: "flex", gap: 16}}>
            <div style={{
              fontFamily: "var(--sld-display)", fontSize: 64, color: "var(--neo-blue-7)",
              lineHeight: 0.85, fontWeight: 500, fontStyle: "italic"
            }}>{p.l}</div>
            <div style={{paddingTop: 4}}>
              <div style={{fontSize: 16, fontWeight: 600, color: "var(--sld-ink)"}}>{p.name}</div>
              <div style={{fontSize: 12, color: "var(--neo-fg-3)", fontStyle: "italic", marginBottom: 6}}>{p.sub}</div>
              <div style={{fontSize: 13, color: "var(--neo-fg-2)", lineHeight: 1.5}}>{p.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Tweaks
// ============================================================
function TweaksHost({ lang, setLang, prefs, setPrefs, onLoadSample, onReset, mode, setMode, state, setState }) {
  const [open, setOpen] = useState(false);
  const t = window.I18N[lang];
  const ImportButton = window.SLDImport && window.SLDImport.ImportButton;
  const exportJSON = window.SLDImport && window.SLDImport.exportStateAsJSON;

  useEffect(() => {
    const onMsg = (e) => {
      if (!e.data || !e.data.type) return;
      if (e.data.type === "__activate_edit_mode") setOpen(true);
      if (e.data.type === "__deactivate_edit_mode") setOpen(false);
    };
    window.addEventListener("message", onMsg);
    try { window.parent.postMessage({ type: "__edit_mode_available" }, "*"); } catch {}
    return () => window.removeEventListener("message", onMsg);
  }, []);

  if (!open) return null;

  return (
    <div className="tweaks-host" style={{
      position: "fixed", right: 24, bottom: 24, width: 320,
      background: "white", border: "1px solid var(--neo-border)",
      borderRadius: 6, boxShadow: "var(--neo-shadow-3)", zIndex: 100,
      overflow: "hidden"
    }}>
      <div style={{padding: "12px 16px", borderBottom: "1px solid var(--neo-border-subtle)", display: "flex", alignItems: "center"}}>
        <div style={{fontWeight: 600, fontSize: 14, flex: 1}}>Tweaks</div>
        <button className="btn ghost sm" style={{padding: 0, width: 24, height: 24}} onClick={() => {
          setOpen(false);
          try { window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*"); } catch {}
        }}><Icon name="x" size={12} /></button>
      </div>
      <div style={{padding: 16, display: "flex", flexDirection: "column", gap: 16, maxHeight: 600, overflowY: "auto"}}>
        <TweakRow label={t.tweakLang}>
          <div style={{display: "flex", gap: 4}}>
            <button className={`btn sm ${lang === "pt" ? "primary" : "outline"}`} onClick={() => setLang("pt")}>PT</button>
            <button className={`btn sm ${lang === "en" ? "primary" : "outline"}`} onClick={() => setLang("en")}>EN</button>
          </div>
        </TweakRow>
        <TweakRow label={lang === "pt" ? "Experiência" : "Experience"}>
          <select className="select" value={mode === "plan" || mode === "slides" || mode === "landing" ? "" : mode}
            onChange={e => setMode(e.target.value || "landing")} style={{height: 28, fontSize: 12}}>
            <option value="">{lang === "pt" ? "(escolher)" : "(choose)"}</option>
            <option value="wizard">Wizard</option>
            <option value="workspace">Workspace</option>
            <option value="canvas">Canvas</option>
          </select>
        </TweakRow>
        <TweakRow label={t.tweakSample}>
          <div style={{display: "flex", gap: 4}}>
            <button className="btn sm outline" onClick={() => { onLoadSample("empty"); setPrefs({ sampleMode: "empty" }); }}>
              {t.tweakSampleEmpty}
            </button>
            <button className="btn sm primary" onClick={() => { onLoadSample("filled"); setPrefs({ sampleMode: "filled" }); }}>
              {t.tweakSampleFilled}
            </button>
          </div>
        </TweakRow>
        {(ImportButton || exportJSON) && (
          <TweakRow label={lang === "pt" ? "Dados do plano" : "Plan data"}>
            <div style={{display: "flex", flexDirection: "column", gap: 6}}>
              {ImportButton && (
                <ImportButton lang={lang} variant="outline"
                  onImport={(parsed) => { setState(parsed); if (mode === "landing" || mode === "plan" || mode === "slides") setMode("workspace"); }} />
              )}
              {exportJSON && (
                <button className="btn outline sm" onClick={() => exportJSON(state, lang)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 4}} aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {lang === "pt" ? "Exportar JSON" : "Export JSON"}
                </button>
              )}
            </div>
          </TweakRow>
        )}
        <TweakRow label={t.tweakShowHints}>
          <label style={{display: "flex", alignItems: "center", gap: 6, fontSize: 13}}>
            <input type="checkbox" checked={prefs.showHints !== false}
              onChange={e => setPrefs({ showHints: e.target.checked })} />
            {prefs.showHints !== false ? (lang === "pt" ? "Visível" : "Visible") : (lang === "pt" ? "Oculto" : "Hidden")}
          </label>
        </TweakRow>
        <div style={{paddingTop: 12, borderTop: "1px solid var(--neo-border-subtle)"}}>
          <button className="btn outline sm" style={{width: "100%", color: "var(--neo-danger)", borderColor: "var(--neo-danger-border)"}}
            onClick={onReset}>
            <Icon name="trash" size={12} /> {t.tweakReset}
          </button>
        </div>
        <div style={{fontSize: 11, color: "var(--neo-fg-3)", lineHeight: 1.5, paddingTop: 8, borderTop: "1px solid var(--neo-border-subtle)"}}>
          {lang === "pt"
            ? "Os dados ficam salvos no seu navegador. Atalho: ⌘P / Ctrl+P para imprimir o plano."
            : "Data is saved in your browser. Shortcut: ⌘P / Ctrl+P to print the plan."}
        </div>
      </div>
    </div>
  );
}

function TweakRow({ label, children }) {
  return (
    <div>
      <div style={{fontSize: 11, color: "var(--neo-fg-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500, marginBottom: 6}}>{label}</div>
      {children}
    </div>
  );
}

// Boot
const rootEl = document.getElementById("root");
ReactDOM.createRoot(rootEl).render(<App />);
})();
