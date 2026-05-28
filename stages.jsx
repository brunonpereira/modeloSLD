/* global React */
// stages.jsx — the actual content pages for each SLD stage
(function(){
const { useState: useStateSt, useMemo: useMemoSt } = React;
const { Icon: IconSt, SignalRadar, LicensePyramid, AmbidexterityMatrix, Horizons } = window.SLDArtifacts;
const { SignalEditor, AIAssistant } = window.SLDEditors;

// ============================================================
// STAGE 0 — DIAGNÓSTICO
// ============================================================
function StageDiagnostico({ state, setState, lang, showHints, withAI }) {
  const t = window.I18N[lang];
  const e = state.empresa;
  const setE = (patch) => setState({ ...state, empresa: { ...state.empresa, ...patch } });

  const layout = withAI ? "split" : "full";
  const formGrid = (
    <div className="card">
      <div className="card-body" style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16}}>
        <div>
          <label className="label">{t.fEmpresa}</label>
          <input className="input" value={e.nome} onChange={ev => setE({ nome: ev.target.value })} />
        </div>
        <div>
          <label className="label">{t.fSetor}</label>
          <input className="input" value={e.setor} onChange={ev => setE({ setor: ev.target.value })} />
        </div>
        <div>
          <label className="label">{t.fPorte}</label>
          <input className="input" value={e.porte} onChange={ev => setE({ porte: ev.target.value })} />
        </div>
        <div>
          <label className="label">{t.fTempo}</label>
          <input className="input" value={e.tempo} onChange={ev => setE({ tempo: ev.target.value })} />
        </div>
        <div>
          <label className="label">{t.fGeografia}</label>
          <input className="input" value={e.geografia} onChange={ev => setE({ geografia: ev.target.value })} />
        </div>
        <div>
          <label className="label">{t.fModeloReceita}</label>
          <input className="input" value={e.modelo_receita} onChange={ev => setE({ modelo_receita: ev.target.value })} />
        </div>
        <div style={{gridColumn: "1 / -1"}}>
          <label className="label">{t.fProblema}</label>
          <textarea className="textarea" rows={2} value={e.problema} onChange={ev => setE({ problema: ev.target.value })} />
          {showHints && <div className="hint">{t.fProblemaHint}</div>}
        </div>
        <div style={{gridColumn: "1 / -1"}}>
          <label className="label">{t.fPorqueAgora}</label>
          <textarea className="textarea" rows={3} value={e.porque_agora} onChange={ev => setE({ porque_agora: ev.target.value })} />
          {showHints && <div className="hint">{t.fPorqueAgoraHint}</div>}
        </div>
        <div style={{gridColumn: "1 / -1"}}>
          <label className="label">{t.fHorizonte}</label>
          <input className="input" value={e.horizonte} onChange={ev => setE({ horizonte: ev.target.value })} />
          {showHints && <div className="hint">{t.fHorizonteHint}</div>}
        </div>
        <div style={{gridColumn: "1 / -1"}}>
          <label className="label">{t.fAtivos}</label>
          <textarea className="textarea" rows={3} value={e.ativos} onChange={ev => setE({ ativos: ev.target.value })} />
          {showHints && <div className="hint">{t.fAtivosHint}</div>}
        </div>
      </div>
    </div>
  );
  if (!withAI) return formGrid;
  return (
    <div style={{display: "grid", gridTemplateColumns: "1fr 360px", gap: 24}}>
      {formGrid}
      <AIAssistant stage="diagnostico" state={state} lang={lang} />
    </div>
  );
}

// ============================================================
// STAGE 1 — SINAIS
// ============================================================
function StageSinais({ state, setState, lang, showHints, withAI }) {
  const t = window.I18N[lang];
  const [selectedId, setSelectedId] = useStateSt(null);

  const addSignal = (s) => {
    setState({ ...state, sinais: [...state.sinais, { ...s, id: "s_" + Math.random().toString(36).slice(2,8) }] });
  };
  const updateSignal = (id, patch) => {
    setState({ ...state, sinais: state.sinais.map(s => s.id === id ? { ...s, ...patch } : s) });
  };
  const removeSignal = (id) => {
    setState({ ...state, sinais: state.sinais.filter(s => s.id !== id) });
  };

  const body = (
    <>
      <div className="card" style={{marginBottom: 20}}>
        <div className="card-header">
          <h3>{lang === "pt" ? "Radar — visualização" : "Radar — visualization"}</h3>
          <div className="sub">
            {lang === "pt" ? "tamanho = impacto · opacidade = clareza · setor = categoria · anel = nível"
              : "size = impact · opacity = clarity · sector = category · ring = level"}
          </div>
        </div>
        <div className="card-body" style={{padding: 0, display: "grid", gridTemplateColumns: "1.1fr 1fr"}}>
          <div style={{padding: 16, borderRight: "1px solid var(--neo-border-subtle)"}}>
            <SignalRadar sinais={state.sinais} onSelect={setSelectedId} selectedId={selectedId} lang={lang} />
          </div>
          <div style={{padding: 20}}>
            <h4 style={{margin: "0 0 8px", fontSize: 14}}>{t.zonaAtualLabel}</h4>
            {showHints && <div className="hint" style={{marginBottom: 8}}>{t.zonaAtualHint}</div>}
            <textarea className="textarea" rows={4} value={state.zona_atual}
              onChange={e => setState({ ...state, zona_atual: e.target.value })}
              placeholder={lang === "pt" ? "Cegueira / Negação / Gestão de crise — descreva onde a empresa está." : "Blindness / Denial / Crisis — describe where the company is."} />
            <div style={{marginTop: 24, padding: 16, background: "var(--neo-gray-2)", borderRadius: 4, fontSize: 12, color: "var(--neo-fg-2)", lineHeight: 1.6}}>
              <strong style={{color: "var(--sld-ink)"}}>{lang === "pt" ? "As três zonas" : "The three zones"}:</strong><br/>
              <span style={{color: "var(--neo-fg-3)"}}>• <strong>{lang === "pt" ? "Cegueira" : "Blindness"}</strong> — {lang === "pt" ? "o sinal existe mas não é percebido." : "the signal exists but isn't perceived."}</span><br/>
              <span style={{color: "var(--neo-danger)"}}>• <strong>{lang === "pt" ? "Negação" : "Denial"}</strong> — {lang === "pt" ? "evidência cresce; janela de criação de valor aberta." : "evidence grows; value-creation window open."}</span><br/>
              <span style={{color: "var(--neo-fg-3)"}}>• <strong>{lang === "pt" ? "Gestão de crise" : "Crisis"}</strong> — {lang === "pt" ? "evidência inegável, mas tarde demais." : "undeniable evidence, too late."}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <h3>{lang === "pt" ? "Sinais mapeados" : "Mapped signals"}</h3>
          <div className="sub">{state.sinais.length} {lang === "pt" ? "sinais · ideal 8-12" : "signals · ideal 8-12"}</div>
        </div>
        <div className="card-body">
          <SignalEditor sinais={state.sinais} onAdd={addSignal} onUpdate={updateSignal} onRemove={removeSignal}
            selectedId={selectedId} onSelect={setSelectedId} lang={lang} showHints={showHints} />
        </div>
      </div>
    </>
  );
  if (!withAI) return body;
  return (
    <div style={{display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "flex-start"}}>
      <div>{body}</div>
      <div style={{position: "sticky", top: 24}}><AIAssistant stage="sinais" state={state} lang={lang} /></div>
    </div>
  );
}

// ============================================================
// STAGE 2 — LICENÇAS
// ============================================================
function StageLicencas({ state, setState, lang, showHints, withAI }) {
  const t = window.I18N[lang];
  const addLicenca = (tier, item) => {
    setState({ ...state, licencas: { ...state.licencas, [tier]: [...(state.licencas[tier] || []), item] } });
  };
  const removeLicenca = (tier, idx) => {
    setState({ ...state, licencas: { ...state.licencas, [tier]: state.licencas[tier].filter((_, i) => i !== idx) } });
  };
  const setTeste = (patch) => setState({ ...state, licenca_vencer_teste: { ...state.licenca_vencer_teste, ...patch } });

  const body = (
    <>
      <div className="card" style={{marginBottom: 20}}>
        <div className="card-header">
          <h3>{lang === "pt" ? "Pirâmide de licenças" : "License pyramid"}</h3>
          <div className="sub">{lang === "pt" ? "Vencer → Competir → Operar · linha do orgulho separa escolha de obrigação" : "Win → Compete → Operate · pride line separates choice from obligation"}</div>
        </div>
        <LicensePyramid licencas={state.licencas} onAdd={addLicenca} onRemove={removeLicenca} lang={lang} showHints={showHints} />
      </div>
      <div className="card">
        <div className="card-header">
          <h3>{t.testeTriplice}</h3>
          <div className="sub">{lang === "pt" ? "Falhar em qualquer uma desqualifica a candidata" : "Failing any disqualifies the candidate"}</div>
        </div>
        <div className="card-body" style={{display: "grid", gap: 16}}>
          <div>
            <label className="label">{t.fLicencaVencer}</label>
            <input className="input" value={state.licenca_vencer_teste.licenca} onChange={e => setTeste({ licenca: e.target.value })} />
          </div>
          <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16}}>
            <div>
              <label className="label" style={{color: "var(--neo-blue-7)"}}>① {t.fRelevante}</label>
              <textarea className="textarea" rows={4} value={state.licenca_vencer_teste.relevante} onChange={e => setTeste({ relevante: e.target.value })} />
              {showHints && <div className="hint">{t.fRelevanteHint}</div>}
            </div>
            <div>
              <label className="label" style={{color: "var(--neo-blue-7)"}}>② {t.fVerdadeiro}</label>
              <textarea className="textarea" rows={4} value={state.licenca_vencer_teste.verdadeiro} onChange={e => setTeste({ verdadeiro: e.target.value })} />
              {showHints && <div className="hint">{t.fVerdadeiroHint}</div>}
            </div>
            <div>
              <label className="label" style={{color: "var(--neo-blue-7)"}}>③ {t.fDiferente}</label>
              <textarea className="textarea" rows={4} value={state.licenca_vencer_teste.diferente} onChange={e => setTeste({ diferente: e.target.value })} />
              {showHints && <div className="hint">{t.fDiferenteHint}</div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
  if (!withAI) return body;
  return (
    <div style={{display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "flex-start"}}>
      <div>{body}</div>
      <div style={{position: "sticky", top: 24}}><AIAssistant stage="licencas" state={state} lang={lang} /></div>
    </div>
  );
}

// ============================================================
// STAGE 3 — DIMENSÕES
// ============================================================
function StageDimensoes({ state, setState, lang, showHints, withAI }) {
  const t = window.I18N[lang];
  const addOpt = (q, item) => {
    setState({ ...state, matriz: { ...state.matriz, [q]: [...(state.matriz[q] || []), item] } });
  };
  const removeOpt = (q, idx) => {
    setState({ ...state, matriz: { ...state.matriz, [q]: state.matriz[q].filter((_, i) => i !== idx) } });
  };
  const addInit = (init) => {
    setState({ ...state, iniciativas: [...state.iniciativas, { ...init, id: "i_" + Math.random().toString(36).slice(2,8) }] });
  };
  const updateInit = (id, patch) => {
    setState({ ...state, iniciativas: state.iniciativas.map(i => i.id === id ? { ...i, ...patch } : i) });
  };
  const removeInit = (id) => {
    setState({ ...state, iniciativas: state.iniciativas.filter(i => i.id !== id) });
  };

  const body = (
    <>
      <div className="card" style={{marginBottom: 20}}>
        <div className="card-header">
          <h3>{lang === "pt" ? "Matriz da ambidestria" : "Ambidexterity matrix"}</h3>
          <div className="sub">{lang === "pt" ? "Onde explorar · vá até onde vai o propósito" : "Where to explore · go where purpose goes"}</div>
        </div>
        <div className="card-body">
          <AmbidexterityMatrix matriz={state.matriz} onAdd={addOpt} onRemove={removeOpt} lang={lang} showHints={showHints} />
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <h3>{lang === "pt" ? "Horizontes — roadmap de iniciativas" : "Horizons — initiative roadmap"}</h3>
          <div className="sub">{lang === "pt" ? "Arraste entre colunas · No / Now / Near / Next" : "Drag between columns · No / Now / Near / Next"}</div>
        </div>
        <div className="card-body">
          <Horizons iniciativas={state.iniciativas} onUpdate={updateInit} onAdd={addInit} onRemove={removeInit} lang={lang} />
        </div>
      </div>
    </>
  );
  if (!withAI) return body;
  return (
    <div style={{display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "flex-start"}}>
      <div>{body}</div>
      <div style={{position: "sticky", top: 24}}><AIAssistant stage="dimensoes" state={state} lang={lang} /></div>
    </div>
  );
}

// ============================================================
// STAGE 4 — SÍNTESE
// ============================================================
function StageSintese({ state, setState, lang, showHints, withAI }) {
  const t = window.I18N[lang];

  const applySummary = (parsed) => {
    setState({
      ...state,
      tese: parsed.tese || state.tese,
      apostas: parsed.apostas || state.apostas,
      riscos: parsed.riscos || state.riscos
    });
  };

  const setApostas = (i, v) => {
    const ap = [...state.apostas]; ap[i] = v;
    setState({ ...state, apostas: ap });
  };
  const setRiscos = (i, v) => {
    const rs = [...state.riscos]; rs[i] = v;
    setState({ ...state, riscos: rs });
  };

  const body = (
    <>
      <div className="card" style={{marginBottom: 20}}>
        <div className="card-header">
          <h3>{t.teseEstrategica}</h3>
          <div className="sub">{t.teseHint}</div>
        </div>
        <div className="card-body">
          <textarea className="textarea" rows={8} value={state.tese}
            onChange={e => setState({ ...state, tese: e.target.value })}
            placeholder={lang === "pt" ? "Por que essa empresa, por que agora, para onde…" : "Why this company, why now, where to…"} />
        </div>
      </div>
      <div className="card" style={{marginBottom: 20}}>
        <div className="card-header">
          <h3>{t.apostas}</h3>
          <div className="sub">{t.apostasHint}</div>
        </div>
        <div className="card-body">
          {state.apostas.map((a, i) => (
            <div key={i} style={{display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start"}}>
              <span style={{fontFamily: "var(--sld-display)", fontSize: 20, color: "var(--neo-blue-7)", width: 24, lineHeight: 1.6}}>{i+1}.</span>
              <textarea className="textarea" rows={2} value={a} onChange={e => setApostas(i, e.target.value)} />
              <button className="btn ghost sm" style={{padding: 0, width: 24, height: 24}}
                onClick={() => setState({ ...state, apostas: state.apostas.filter((_, j) => j !== i) })}>
                <IconSt name="x" size={12} />
              </button>
            </div>
          ))}
          {state.apostas.length < 5 && (
            <button className="btn outline" onClick={() => setState({ ...state, apostas: [...state.apostas, ""] })}>
              <IconSt name="plus" size={12} /> {lang === "pt" ? "Adicionar aposta" : "Add bet"}
            </button>
          )}
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <h3>{t.riscos}</h3>
          <div className="sub">{t.riscosHint}</div>
        </div>
        <div className="card-body">
          {state.riscos.map((r, i) => (
            <div key={i} style={{display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start"}}>
              <span style={{color: "var(--neo-warning)", lineHeight: 1.6, fontSize: 16}}>⚠</span>
              <textarea className="textarea" rows={2} value={r} onChange={e => setRiscos(i, e.target.value)} />
              <button className="btn ghost sm" style={{padding: 0, width: 24, height: 24}}
                onClick={() => setState({ ...state, riscos: state.riscos.filter((_, j) => j !== i) })}>
                <IconSt name="x" size={12} />
              </button>
            </div>
          ))}
          <button className="btn outline" onClick={() => setState({ ...state, riscos: [...state.riscos, ""] })}>
            <IconSt name="plus" size={12} /> {lang === "pt" ? "Adicionar risco" : "Add risk"}
          </button>
        </div>
      </div>
    </>
  );
  if (!withAI) return body;
  return (
    <div style={{display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "flex-start"}}>
      <div>{body}</div>
      <div style={{position: "sticky", top: 24}}>
        <AIAssistant stage="sintese" state={state} lang={lang} onApplySummary={applySummary} />
      </div>
    </div>
  );
}

window.SLDStages = { StageDiagnostico, StageSinais, StageLicencas, StageDimensoes, StageSintese };
})();
