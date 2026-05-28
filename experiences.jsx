/* global React */
// experiences.jsx — Wizard / Workspace / Canvas shells
(function(){
const { useState: useStateEx, useEffect: useEffectEx, useRef: useRefEx } = React;
const { Icon: IconEx } = window.SLDArtifacts;
const { StageDiagnostico, StageSinais, StageLicencas, StageDimensoes, StageSintese } = window.SLDStages;
const { PlanDocument, SlidesView } = window.SLDPlan;

const STAGE_DEFS = (lang) => {
  const t = window.I18N[lang];
  return [
    { key: "diagnostico", label: t.stepDiagnostico, eyebrow: t.diagnosticoEyebrow, title: t.diagnosticoTitle, intro: t.diagnosticoIntro, Component: StageDiagnostico, icon: "list" },
    { key: "sinais",      label: t.stepSinais,      eyebrow: t.sinaisEyebrow,      title: t.sinaisTitle,      intro: t.sinaisIntro,      Component: StageSinais,      icon: "sparkle" },
    { key: "licencas",    label: t.stepLicencas,    eyebrow: t.licencasEyebrow,    title: t.licencasTitle,    intro: t.licencasIntro,    Component: StageLicencas,    icon: "layers" },
    { key: "dimensoes",   label: t.stepDimensoes,   eyebrow: t.dimensoesEyebrow,   title: t.dimensoesTitle,   intro: t.dimensoesIntro,   Component: StageDimensoes,   icon: "grid" },
    { key: "sintese",     label: t.stepSintese,     eyebrow: t.sinteseEyebrow,     title: t.sinteseTitle,     intro: t.sinteseIntro,     Component: StageSintese,     icon: "edit" },
  ];
};

function stageDoneFor(key, state) {
  switch (key) {
    case "diagnostico": return !!(state.empresa.nome && state.empresa.problema && state.empresa.porque_agora);
    case "sinais": return state.sinais.length >= 4;
    case "licencas": return (state.licencas.operar.length + state.licencas.competir.length + state.licencas.vencer.length) >= 3;
    case "dimensoes": return state.iniciativas.length >= 3;
    case "sintese": return !!(state.tese && state.apostas.filter(Boolean).length >= 2);
    default: return false;
  }
}

// ============================================================
// WIZARD
// ============================================================
function WizardExperience({ state, setState, lang, showHints, onViewPlan }) {
  const t = window.I18N[lang];
  const stages = STAGE_DEFS(lang);
  const [step, setStep] = useStateEx(0);
  const stage = stages[step];
  const Comp = stage.Component;
  const isLast = step === stages.length - 1;

  return (
    <div className="page-pad">
      <div className="wizard-stepper">
        {stages.map((s, i) => {
          const done = stageDoneFor(s.key, state);
          return (
            <div key={s.key} className={`step ${i === step ? "active" : ""} ${done ? "done" : ""}`}
              onClick={() => setStep(i)}>
              <div className="step-counter">0{i+1}</div>
              <div className="step-label">{s.eyebrow}</div>
              <div className="step-title">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="page-header">
        <div>
          <div className="eyebrow">{stage.eyebrow}</div>
          <h1>{stage.title}</h1>
          <p className="intro">{stage.intro}</p>
        </div>
      </div>

      <Comp state={state} setState={setState} lang={lang} showHints={showHints} withAI={true} />

      <div style={{display: "flex", justifyContent: "space-between", marginTop: 40}}>
        <button className="btn outline lg" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          <IconEx name="chev_l" size={14} /> {t.back}
        </button>
        {isLast ? (
          <button className="btn primary lg" onClick={onViewPlan}>
            {t.viewPlan} <IconEx name="chev_r" size={14} />
          </button>
        ) : (
          <button className="btn primary lg" onClick={() => setStep(step + 1)}>
            {t.next}: {stages[step + 1].label} <IconEx name="chev_r" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// WORKSPACE
// ============================================================
function WorkspaceExperience({ state, setState, lang, showHints, onViewPlan }) {
  const t = window.I18N[lang];
  const stages = STAGE_DEFS(lang);
  const [active, setActive] = useStateEx("diagnostico");
  const [drawerOpen, setDrawerOpen] = useStateEx(false);
  const stage = stages.find(s => s.key === active);
  const Comp = stage.Component;

  // signal count badge etc
  const counts = {
    diagnostico: state.empresa.nome ? "✓" : "",
    sinais: state.sinais.length || "",
    licencas: (state.licencas.operar.length + state.licencas.competir.length + state.licencas.vencer.length) || "",
    dimensoes: state.iniciativas.length || "",
    sintese: state.apostas.filter(Boolean).length || ""
  };

  return (
    <div style={{display: "flex", flex: 1, overflow: "hidden", position: "relative"}}>
      <div className={`sld-sider-backdrop ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)}></div>
      <aside className={`sld-sider ${drawerOpen ? "open" : ""}`}>
        <div style={{padding: "20px 20px 8px", color: "white"}}>
          <div style={{fontFamily: "var(--sld-display)", fontSize: 18, lineHeight: 1.2, letterSpacing: "-0.01em"}}>
            {state.empresa.nome || t.untitled}
          </div>
          <div style={{fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2}}>
            {state.empresa.setor || (lang === "pt" ? "Sem setor" : "No industry")}
          </div>
        </div>
        <div className="section-label">{lang === "pt" ? "Pilares do Método" : "Method pillars"}</div>
        {stages.map((s, i) => (
          <div key={s.key} className={`nav-item ${active === s.key ? "active" : ""} ${stageDoneFor(s.key, state) ? "done" : ""}`}
            onClick={() => { setActive(s.key); setDrawerOpen(false); }}>
            <div className="num">{stageDoneFor(s.key, state) ? "✓" : i+1}</div>
            <div style={{flex: 1}}>
              <div>{s.label}</div>
              <div style={{fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.3}}>{s.eyebrow}</div>
            </div>
            {counts[s.key] && <div style={{fontSize: 11, background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: 10}}>{counts[s.key]}</div>}
          </div>
        ))}
        <div style={{marginTop: "auto", padding: 20, borderTop: "1px solid rgba(255,255,255,0.08)"}}>
          <button className="btn primary lg" style={{width: "100%"}} onClick={onViewPlan}>
            <IconEx name="print" size={14} /> {t.viewPlan}
          </button>
        </div>
      </aside>
      <main className="sld-main">
        <div className="page-pad">
          <button className="sld-sider-toggle" onClick={() => setDrawerOpen(true)} style={{marginBottom: 16}}>
            <IconEx name="list" size={14} /> {state.empresa.nome || t.appName}
          </button>
          <div className="page-header">
            <div>
              <div className="eyebrow">{stage.eyebrow}</div>
              <h1>{stage.title}</h1>
              <p className="intro">{stage.intro}</p>
            </div>
          </div>
          <Comp state={state} setState={setState} lang={lang} showHints={showHints} withAI={true} />
        </div>
      </main>
    </div>
  );
}

// ============================================================
// CANVAS (single scroll)
// ============================================================
function CanvasExperience({ state, setState, lang, showHints, onViewPlan }) {
  const t = window.I18N[lang];
  const stages = STAGE_DEFS(lang);

  // anchor scrolling
  const scrollTo = (key) => {
    const el = document.getElementById(`section-${key}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{overflow: "auto", flex: 1}}>
      <div className="canvas-anchors">
        {stages.map((s, i) => (
          <a key={s.key} href={`#section-${s.key}`} onClick={(e) => { e.preventDefault(); scrollTo(s.key); }}>
            <span className="num">{i + 1}</span>
            <span>{s.label}</span>
          </a>
        ))}
        <div style={{flex: 1}}></div>
        <button className="btn primary sm" onClick={onViewPlan}>
          <IconEx name="print" size={12} /> {t.viewPlan}
        </button>
      </div>
      {stages.map((s, i) => {
        const Comp = s.Component;
        return (
          <section key={s.key} id={`section-${s.key}`} className="canvas-section">
            <div style={{display: "grid", gridTemplateColumns: "180px 1fr", gap: 32, marginBottom: 24}}>
              <div style={{paddingTop: 4}}>
                <div style={{fontFamily: "var(--sld-display)", fontSize: 56, color: "var(--neo-border-strong)", lineHeight: 0.9, fontWeight: 500}}>
                  0{i+1}
                </div>
              </div>
              <div>
                <div className="section-eyebrow">{s.eyebrow}</div>
                <h2>{s.title}</h2>
                <div className="section-intro">{s.intro}</div>
              </div>
            </div>
            <div style={{marginLeft: 212}}>
              <Comp state={state} setState={setState} lang={lang} showHints={showHints} withAI={false} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

window.SLDExperiences = { WizardExperience, WorkspaceExperience, CanvasExperience };
})();
