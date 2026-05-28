/* global React */
// editors.jsx — Signal list editor + AI Assistant + simple form helpers
(function(){
const { useState: useStateEd, useEffect: useEffectEd, useRef: useRefEd } = React;
const { Icon: IconEd, uid: uidEd } = window.SLDArtifacts;

// ============================================================
// SIGNAL EDITOR — list + inline edit, paired with the radar
// ============================================================
function SignalEditor({ sinais, onAdd, onUpdate, onRemove, selectedId, onSelect, lang, showHints }) {
  const t = window.I18N[lang];
  const [editingId, setEditingId] = useStateEd(null);
  const [adding, setAdding] = useStateEd(false);

  const cats = [
    { k: "Tecnologia", label: t.catTecnologia, cls: "tech" },
    { k: "Mercado", label: t.catMercado, cls: "mkt" },
    { k: "Gestão & Pessoas", label: t.catGestao, cls: "gp" }
  ];
  const niveis = [
    { k: "presente", label: t.nivelPresente },
    { k: "provavel", label: t.nivelProvavel },
    { k: "possivel", label: t.nivelPossivel }
  ];
  const catCls = (c) => {
    const x = c === "Gestão" ? "Gestão & Pessoas" : c;
    return cats.find(C => C.k === x)?.cls || "tech";
  };
  const catLabel = (c) => {
    const x = c === "Gestão" ? "Gestão & Pessoas" : c;
    return cats.find(C => C.k === x)?.label || c;
  };
  const nivelLabel = (n) => niveis.find(N => N.k === n)?.label || n;

  return (
    <div>
      <div className="signal-list">
        {sinais.length === 0 && <div className="empty">{t.emptySignals}</div>}
        {sinais.map(s => {
          if (editingId === s.id) {
            return <SignalForm key={s.id} initial={s} cats={cats} niveis={niveis} t={t} showHints={showHints}
              onSave={(v) => { onUpdate(s.id, v); setEditingId(null); }}
              onCancel={() => setEditingId(null)}
              onDelete={() => { onRemove(s.id); setEditingId(null); }} />;
          }
          return (
            <div key={s.id} className={`signal-row ${selectedId === s.id ? "selected" : ""}`}
              onClick={() => { onSelect(s.id); setEditingId(s.id); }}>
              <div>
                <div className="sig-name">{s.nome}</div>
                {s.implicacao && <div className="sig-implicacao">{s.implicacao}</div>}
              </div>
              <span className={`tag ${catCls(s.categoria)}`}>{catLabel(s.categoria)}</span>
              <span className={`tag ${s.nivel}`}>{nivelLabel(s.nivel)}</span>
              <div title={t.impacto} className="sig-meta">
                <div style={{fontSize: 10, color: "var(--neo-fg-3)", marginBottom: 2}}>{t.impacto}</div>
                <div className="dots">{[1,2,3].map(i => <div key={i} className={`dot ${i <= (s.impacto || 0) ? "on" : ""}`}></div>)}</div>
              </div>
              <div title={t.clareza} className="sig-meta">
                <div style={{fontSize: 10, color: "var(--neo-fg-3)", marginBottom: 2}}>{t.clareza}</div>
                <div className="dots">{[1,2,3].map(i => <div key={i} className={`dot ${i <= (s.clareza || 0) ? "on" : ""}`}></div>)}</div>
              </div>
              <button className="btn ghost sm" style={{padding: 0, width: 24}}
                onClick={(e) => { e.stopPropagation(); onRemove(s.id); }}>
                <IconEd name="trash" size={12} />
              </button>
            </div>
          );
        })}
      </div>
      {adding ? (
        <div style={{marginTop: 8}}>
          <SignalForm initial={{ nome: "", categoria: "Tecnologia", nivel: "provavel", impacto: 2, clareza: 2, implicacao: "" }}
            cats={cats} niveis={niveis} t={t} showHints={showHints}
            onSave={(v) => { onAdd(v); setAdding(false); }}
            onCancel={() => setAdding(false)} />
        </div>
      ) : (
        <button className="btn outline" style={{marginTop: 12}} onClick={() => setAdding(true)}>
          <IconEd name="plus" size={14} /> {t.addSignal}
        </button>
      )}
    </div>
  );
}

function SignalForm({ initial, cats, niveis, t, onSave, onCancel, onDelete, showHints }) {
  const [v, setV] = useStateEd(initial);
  return (
    <div className="card" style={{padding: 16, marginBottom: 8, borderColor: "var(--neo-primary)"}}>
      <div style={{display: "grid", gridTemplateColumns: "1fr", gap: 12}}>
        <div>
          <label className="label">{t.sinalName}</label>
          <input className="input" autoFocus value={v.nome} onChange={e => setV({ ...v, nome: e.target.value })}
            placeholder={t.sinalName} />
          {showHints && <div className="hint">{t.sinalNameHint}</div>}
        </div>
        <div>
          <label className="label">{t.implicacao}</label>
          <textarea className="textarea" value={v.implicacao} rows={2}
            onChange={e => setV({ ...v, implicacao: e.target.value })}
            placeholder={t.implicacao} />
        </div>
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12}}>
          <div>
            <label className="label">{t.catTecnologia.replace(/.+/, "Categoria")}</label>
            <select className="select" value={v.categoria} onChange={e => setV({ ...v, categoria: e.target.value })}>
              {cats.map(c => <option key={c.k} value={c.k}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Nível</label>
            <select className="select" value={v.nivel} onChange={e => setV({ ...v, nivel: e.target.value })}>
              {niveis.map(n => <option key={n.k} value={n.k}>{n.label}</option>)}
            </select>
            {showHints && <div className="hint">{t.nivelHint}</div>}
          </div>
          <div>
            <label className="label">{t.impacto} (1-3)</label>
            <select className="select" value={v.impacto} onChange={e => setV({ ...v, impacto: parseInt(e.target.value) })}>
              {[1,2,3].map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t.clareza} (1-3)</label>
            <select className="select" value={v.clareza} onChange={e => setV({ ...v, clareza: parseInt(e.target.value) })}>
              {[1,2,3].map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>
        <div style={{display: "flex", gap: 8, justifyContent: "space-between"}}>
          <div>
            {onDelete && <button className="btn ghost sm" onClick={onDelete}>
              <IconEd name="trash" size={12} /> {t.delete}
            </button>}
          </div>
          <div style={{display: "flex", gap: 8}}>
            <button className="btn" onClick={onCancel}>{t.cancel}</button>
            <button className="btn primary" onClick={() => v.nome.trim() && onSave(v)}>{t.save}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AI ASSISTANT — exclusively trained on the SLD skill
// ============================================================

// SLD_SKILL_KNOWLEDGE: condensed, authoritative summary of the SLD method
// (StartSe). Injected as a system preamble on EVERY consultor call so the
// model reasons strictly inside the SLD framework — not generic strategy.
// Source of truth: sld-skill/SKILL.md + references/{method,radar-de-sinais,
// licencas,dimensoes}.md. Keep in sync if those files change.
const SLD_SKILL_KNOWLEDGE = {
  pt: `=== MÉTODO SLD · StartSe — base obrigatória do consultor ===

TESE. Não existem vantagens competitivas sustentáveis; existe a sustentação
competitiva de vantagens. A perpetuidade depende de se reinventar em ciclos
curtos. Disrupção é gradual e, então, repentina. Resposta: AMBIDESTRIA —
otimizar (exploit) e desbravar (explore) ao mesmo tempo.

3 PILARES (e 3 competências do líder), ancorados em OBSESSÃO PELO CLIENTE:
• S — SINAIS (saber): Radar de Sinais.
• L — LICENÇAS (decidir): Licenças Estratégicas.
• D — DIMENSÕES (fazer): Matriz da Ambidestria + Horizontes.
Pilar-base: Repertório (aprender, desaprender, reaprender).
A Jornada SLD: sinal → pressão sobre licença → movimento na matriz →
iniciativa no horizonte.

ETAPA 0 — DIAGNÓSTICO (gate obrigatório). Sem retrato mínimo (quem é, o que
resolve, por que agora, horizonte, ativos conhecidos), o output é genérico.
Aponte lacunas em vez de inventar fatos.

ETAPA 1 — RADAR DE SINAIS. Percepção ativa. Fontes: PESTEL + ESG +
comportamento + concorrentes. Consolidar em 3 categorias: Tecnologia ·
Mercado · Gestão & Pessoas. Pergunta-mestre: "E se…?" Qualifique cada sinal
com: nível (PRESENTE→projeto / PROVÁVEL→experimento / POSSÍVEL→investigação),
categoria, impacto 1-3, clareza 1-3, e — campo mais importante — IMPLICAÇÃO
("o que isso significa para nós"). Três zonas: Cegueira → Negação (janela de
criação de valor) → Gestão de Crise. Objetivo: agir na janela. 6 atitudes
do observador: reconhecer, definir, não ficar parado, não desperdiçar crise,
ficar a favor do vento, ser observador (rotina).

ETAPA 2 — LICENÇAS ESTRATÉGICAS (Piero Franceschi). Toda vantagem é
temporária — uma licença que se revalida ou expira. Miopia da SWOT: força
estática em ambiente dinâmico vira peso. 3 níveis:
• VENCER — diferencial competitivo (cria valor adicional).
• COMPETIR — estrutura competitiva (escala, acesso, qualidade).
• OPERAR — fundação (requisitos mínimos para existir).
Mais: LICENÇAS EXPIRADAS (forças que viraram peso). Alerta: inovação para a
empresa não é necessariamente licença para vencer — pode só elevar
operar/competir.
TESTE TRÍPLICE da Licença para Vencer (todas as três):
1) Relevante para o cliente (resolve problema, percebe ganho, pagaria mais).
2) Verdadeiro para a empresa (visão/propósito, capabilities, credibilidade).
3) Diferente dos concorrentes (com barreira de réplica).
Confirmação: por causa dela, clientes pagam mais, são leais, recomendam?
DESCOMODITIZAR = criar licença para vencer normalizando um impossível ou
subvertendo um normal. Conecte aqui os sinais da Etapa 1 — quais licenças
estão sob pressão?

ETAPA 3 — DIMENSÕES DA AMBIDESTRIA. Motor: ciclo OTIMIZAR financia ciclo
DESBRAVAR; apostas que provam tração são incorporadas ao core. "O dinheiro
segue o rastro da confiança."
MATRIZ (modelo × problema):
• Modelo ATUAL × Problema ATUAL = OTIMIZAR (eficiência).
• Modelo DIFERENTE × Problema ATUAL = REMODELAR.
• Modelo ATUAL × Problema DIFERENTE = DIVERSIFICAR.
• Modelo DIFERENTE × Problema DIFERENTE = EXTRAPOLAR.
Limite: vá até onde vai o propósito/core.
HORIZONTES:
• NO (H-1, Ontem) — parar de fazer. CORAGEM DE DESISTIR. Toda boa estratégia
  abre mão de algo — exija pelo menos um item aqui.
• NOW (H1, Hoje) — projetos claros, defender o core, eficiência.
• NEAR (H2, Amanhã) — experimentos, hipóteses, métricas, Stop/Pivot/Preserve.
• NEXT (H3, Depois) — investigações, alta variância, descobertas.

ETAPA 4 — SÍNTESE. Tese estratégica (1-2 parágrafos), 3-5 APOSTAS (frases
imperativas), riscos/pressupostos. Amarre de volta ao cliente.

POSTURA OBRIGATÓRIA do Consultor SLD:
• Diagnóstico antes de prescrição.
• Desafie premissas (não complacência). Aponte quando confundirem melhoria
  operacional com licença para vencer.
• Trade-offs explícitos (prós e contras), não decretos.
• Incerteza explícita — sinais possíveis são apostas.
• Específico vence genérico. Force nomeabilidade.
• Poucos e certos: 8-12 sinais > 40 bullets.
• Conecte as etapas (a Jornada SLD deve ficar visível).
• Coragem de parar.

USE EXCLUSIVAMENTE este método. Não importe frameworks externos (BCG, Porter,
SWOT clássica, OKR, Lean, jobs-to-be-done, etc.) salvo se o usuário pedir
explicitamente — e mesmo assim, traduza de volta para a linguagem SLD
(sinais · licenças · matriz · horizontes · otimizar/desbravar · zonas ·
janela de criação de valor · descomoditizar). Não invente novos níveis,
quadrantes ou horizontes. Use os termos do método na resposta.`,

  en: `=== SLD METHOD · StartSe — consultant's mandatory base ===

THESIS. There are no sustainable competitive advantages — only the sustained
competitive advantage of building them in shorter cycles. Disruption is
gradual, then sudden. Answer: AMBIDEXTERITY — exploit (optimize) and explore
(venture) at the same time.

3 PILLARS (and the 3 leader competencies), anchored on CUSTOMER OBSESSION:
• S — SIGNALS (know): Signals Radar.
• L — LICENSES (decide): Strategic Licenses.
• D — DIMENSIONS (do): Ambidexterity Matrix + Horizons.
Foundation pillar: Repertoire (learn, unlearn, relearn).
The SLD Journey: signal → pressure on a license → move on the matrix →
initiative in a horizon.

STAGE 0 — DIAGNOSTIC (mandatory gate). Without a minimal portrait (who,
what they solve, why now, horizon, known assets), the output is generic.
Surface gaps; don't invent facts.

STAGE 1 — SIGNALS RADAR. Active perception. Sources: PESTEL + ESG +
customer behavior + competitors. Consolidate in 3 categories: Technology ·
Market · Management & People. Master question: "What if…?" Qualify each
signal with: level (PRESENT→project / PROBABLE→experiment / POSSIBLE→
investigation), category, impact 1-3, clarity 1-3, and — most important
field — IMPLICATION ("what this means for us"). Three zones: Blindness →
Denial (value-creation window) → Crisis Management. Goal: act in the
window. 6 observer attitudes: recognize, define, don't stand still, don't
waste a crisis, go with the wind, be an observer (routine).

STAGE 2 — STRATEGIC LICENSES (Piero Franceschi). Every advantage is
temporary — a license that must be revalidated or expires. SWOT myopia:
static strength in a dynamic environment becomes dead weight. 3 levels:
• WIN — competitive differentiator (creates extra value).
• COMPETE — competitive structure (scale, access, quality).
• OPERATE — foundation (minimum to exist in the market).
Plus: EXPIRED LICENSES (strengths that became weight). Watch: an innovation
for the firm is not necessarily a win-license — it may only raise
operate/compete.
TRIPLE TEST for a Win-License (all three required):
1) Relevant to the customer (solves a problem, perceived gain, would pay more).
2) True for the company (vision/purpose, capabilities, credibility).
3) Different from competitors (with replication barrier).
Confirmation: because of it, do customers pay more, stay loyal, recommend?
DECOMMODITIZE = create a win-license by normalizing an impossible or
subverting a normal. Connect Stage 1 signals here — which licenses are
under pressure?

STAGE 3 — AMBIDEXTERITY DIMENSIONS. Engine: OPTIMIZE cycle funds EXPLORE
cycle; bets that prove traction are absorbed into the core. "Money follows
the trail of confidence."
MATRIX (model × problem):
• Same model × Same problem = OPTIMIZE (efficiency).
• Different model × Same problem = REMODEL.
• Same model × Different problem = DIVERSIFY.
• Different model × Different problem = EXTRAPOLATE.
Limit: go as far as the purpose/core goes.
HORIZONS:
• NO (H-1, Yesterday) — stop doing. COURAGE TO QUIT. Every good adaptive
  strategy gives something up — require at least one item here.
• NOW (H1, Today) — clear projects, defend core, efficiency.
• NEAR (H2, Tomorrow) — experiments, hypotheses, metrics, Stop/Pivot/Preserve.
• NEXT (H3, Later) — investigations, high variance, discoveries.

STAGE 4 — SYNTHESIS. Strategic thesis (1-2 short paragraphs), 3-5 CORE BETS
(imperative sentences), risks/assumptions. Tie back to the customer.

MANDATORY STANCE of the SLD Consultant:
• Diagnostic before prescription.
• Challenge assumptions (no complacency). Flag when an operational
  improvement is being mistaken for a win-license.
• Explicit trade-offs (pros and cons), not decrees.
• Explicit uncertainty — possible signals are bets.
• Specific beats generic. Force nameability.
• Few and right: 8-12 well-qualified signals > 40 bullets.
• Connect the stages (the SLD Journey should be visible).
• Courage to stop.

USE THIS METHOD EXCLUSIVELY. Do not import external frameworks (BCG, Porter,
classic SWOT, OKR, Lean, jobs-to-be-done, etc.) unless the user explicitly
asks — and even then, translate back into SLD language (signals · licenses ·
matrix · horizons · optimize/explore · zones · value-creation window ·
decommoditize). Do not invent new levels, quadrants or horizons. Use the
method's terminology in the response.`
};

const AI_PROMPTS = {
  pt: {
    diagnosticoQuestions: `Você é um consultor sênior do Método SLD (StartSe). Diante deste retrato da empresa, identifique 3-5 LACUNAS críticas no diagnóstico que precisam ser fechadas antes de avançar para o radar de sinais. Seja específico — aponte qual fato está faltando e por que importa para a estratégia. Não preencha lacunas; aponte-as como perguntas para o usuário responder. Máximo 200 palavras. Use bullets curtos.`,
    sinaisSuggest: `Você é um consultor sênior do Método SLD. Com base no contexto da empresa, sugira 5-7 SINAIS estratégicos específicos que merecem entrar no radar. Cada sinal deve ser: (a) específico e nomeável (não "IA vai impactar tudo"); (b) classificado em Tecnologia/Mercado/Gestão; (c) com nível Presente/Provável/Possível; (d) com implicação concreta para o negócio. Use formato: **Nome do sinal** [Categoria · Nível] — Implicação. Máximo 350 palavras.`,
    sinaisCritique: `Você é um consultor sênior do Método SLD aplicando rigor honesto. Analise os sinais já mapeados e identifique problemas: (1) sinais genéricos que precisam de mais especificidade; (2) sinais sem implicação concreta para o negócio; (3) categorias subrepresentadas; (4) sinais óbvios que estão faltando dado o contexto. Seja direto. Use bullets curtos. Máximo 250 palavras.`,
    licencasSuggest: `Você é um consultor sênior do Método SLD. Sugira como classificar os ativos/competências desta empresa nos níveis Operar/Competir/Vencer, e que licenças podem estar EXPIRADAS pelos sinais mapeados. Submeta a candidata a "licença para vencer" ao teste tríplice (relevante para o cliente · verdadeiro para a empresa · diferente dos concorrentes). Seja direto. Aponte se confundem melhoria operacional com licença para vencer. Máximo 350 palavras.`,
    licencasCritique: `Você é um consultor sênior do Método SLD. Analise as licenças classificadas. Aponte: (1) licenças no nível errado (ex: tratam um "competir" como "vencer"); (2) candidatas a vencer que não passam no teste tríplice; (3) licenças que viraram peso e não estão marcadas como expiradas; (4) conexões com os sinais que não foram feitas. Rigor honesto. Máximo 250 palavras.`,
    dimensoesSuggest: `Você é um consultor sênior do Método SLD. Com base nos sinais e licenças, sugira 4-6 iniciativas estratégicas distribuídas pela matriz da ambidestria (Otimizar/Remodelar/Diversificar/Extrapolar) e pelos horizontes (Now/Near/Next/No). Inclua pelo menos UM item para "No" (parar de fazer). Para cada: título · horizonte · dono sugerido · métrica/marco. Formato bullet. Máximo 350 palavras.`,
    sumarioGenerate: `Você é um consultor sênior do Método SLD. A partir de todo o trabalho feito (contexto, sinais, licenças, matriz, iniciativas), escreva: (1) UMA tese estratégica em 2 parágrafos curtos (por que essa empresa, por que agora, para onde); (2) 3-5 APOSTAS centrais que materializam a tese, cada uma em uma frase imperativa; (3) 3-4 RISCOS/PRESSUPOSTOS críticos. Formato JSON: {"tese":"...","apostas":["...","..."],"riscos":["...","..."]}.`
  },
  en: {
    diagnosticoQuestions: `You are a senior SLD Method consultant (StartSe). Given this company portrait, identify 3-5 CRITICAL GAPS in the diagnostic that must be closed before moving to the signals radar. Be specific — point out what's missing and why it matters for strategy. Don't fill the gaps; pose them as questions. Max 200 words. Short bullets.`,
    sinaisSuggest: `You are a senior SLD Method consultant. Based on the company context, suggest 5-7 SPECIFIC strategic signals worth adding to the radar. Each signal should be: (a) specific and nameable; (b) classified Technology/Market/Mgmt; (c) leveled Present/Probable/Possible; (d) with concrete business implication. Format: **Signal name** [Category · Level] — Implication. Max 350 words.`,
    sinaisCritique: `You are a senior SLD Method consultant applying honest rigor. Analyze the signals already mapped and identify problems: (1) generic signals needing more specificity; (2) signals without concrete business implication; (3) underrepresented categories; (4) obvious signals missing given the context. Be direct. Short bullets. Max 250 words.`,
    licencasSuggest: `You are a senior SLD Method consultant. Suggest how to classify this company's assets/competencies across Operate/Compete/Win levels, and which licenses may be EXPIRED given the mapped signals. Submit the "win license" candidate to the triple test (relevant to customer · true for the company · different from competitors). Be direct. Flag when an operational improvement is being mistaken for a win license. Max 350 words.`,
    licencasCritique: `You are a senior SLD Method consultant. Analyze the classified licenses. Point out: (1) licenses at the wrong level; (2) win candidates that fail the triple test; (3) licenses that became dead weight and aren't marked as expired; (4) missing connections to signals. Honest rigor. Max 250 words.`,
    dimensoesSuggest: `You are a senior SLD Method consultant. Based on signals and licenses, suggest 4-6 strategic initiatives across the ambidexterity matrix (Optimize/Remodel/Diversify/Extrapolate) and horizons (Now/Near/Next/No). Include at least ONE item for "No" (stop doing). For each: title · horizon · suggested owner · metric/milestone. Bullet format. Max 350 words.`,
    sumarioGenerate: `You are a senior SLD Method consultant. From the entire body of work (context, signals, licenses, matrix, initiatives), write: (1) ONE strategic thesis in 2 short paragraphs (why this company, why now, where to); (2) 3-5 CORE BETS that materialize the thesis, each in an imperative sentence; (3) 3-4 critical RISKS/ASSUMPTIONS. JSON format: {"tese":"...","apostas":["...","..."],"riscos":["...","..."]}.`
  }
};

function buildContext(state, lang) {
  // Full cross-stage context. The consultor SEES EVERYTHING the user has
  // filled — previous AND forward stages — on every call. This lets
  // "Sugerir"/"Criticar" reason across the whole Jornada SLD instead of
  // looking only at the current page.
  const isPt = lang === "pt";
  const L = isPt ? {
    portrait: "RETRATO DA EMPRESA",
    empty: "(em branco)",
    signals: "SINAIS MAPEADOS",
    zone: "Zona atual",
    licenses: "LICENÇAS ESTRATÉGICAS",
    operate: "Operar", compete: "Competir", win: "Vencer", expired: "Expiradas",
    tripleTest: "Teste tríplice da licença para vencer",
    matrix: "MATRIZ DA AMBIDESTRIA",
    optimize: "Otimizar", remodel: "Remodelar", diversify: "Diversificar", extrapolate: "Extrapolar",
    initiatives: "INICIATIVAS NOS HORIZONTES",
    synthesis: "SÍNTESE",
    thesis: "Tese", bets: "Apostas", risks: "Riscos/Pressupostos",
    fName: "Nome", fSector: "Setor", fSize: "Porte", fTime: "Tempo de mercado",
    fGeo: "Geografia", fRev: "Modelo de receita", fProblem: "Resolve para o cliente",
    fWhyNow: "Por que agora", fHorizon: "Horizonte e escopo", fAssets: "Ativos conhecidos",
    fLicense: "Licença", fRel: "Relevante para o cliente", fTrue: "Verdadeiro para a empresa", fDiff: "Diferente dos concorrentes",
    fNo: "Parar de fazer (No)", fNow: "Now (projetos)", fNear: "Near (experimentos)", fNext: "Next (investigações)",
    none: "—"
  } : {
    portrait: "COMPANY PORTRAIT",
    empty: "(blank)",
    signals: "MAPPED SIGNALS",
    zone: "Current zone",
    licenses: "STRATEGIC LICENSES",
    operate: "Operate", compete: "Compete", win: "Win", expired: "Expired",
    tripleTest: "Win-license triple test",
    matrix: "AMBIDEXTERITY MATRIX",
    optimize: "Optimize", remodel: "Remodel", diversify: "Diversify", extrapolate: "Extrapolate",
    initiatives: "INITIATIVES BY HORIZON",
    synthesis: "SYNTHESIS",
    thesis: "Thesis", bets: "Core bets", risks: "Risks/Assumptions",
    fName: "Name", fSector: "Industry", fSize: "Size", fTime: "Years in market",
    fGeo: "Geography", fRev: "Revenue model", fProblem: "Solves for the customer",
    fWhyNow: "Why now", fHorizon: "Horizon and scope", fAssets: "Known assets",
    fLicense: "License", fRel: "Relevant to customer", fTrue: "True for the company", fDiff: "Different from competitors",
    fNo: "Stop doing (No)", fNow: "Now (projects)", fNear: "Near (experiments)", fNext: "Next (investigations)",
    none: "—"
  };

  const out = [];
  const e = state.empresa || {};
  const fieldRow = (label, val) => `  ${label}: ${val && String(val).trim() ? val : L.empty}`;

  // --- Stage 0: portrait ---
  out.push(`[${L.portrait}]`);
  out.push(fieldRow(L.fName, e.nome));
  out.push(fieldRow(L.fSector, e.setor));
  out.push(fieldRow(L.fSize, e.porte));
  if (e.tempo) out.push(fieldRow(L.fTime, e.tempo));
  if (e.geografia) out.push(fieldRow(L.fGeo, e.geografia));
  if (e.modelo_receita) out.push(fieldRow(L.fRev, e.modelo_receita));
  out.push(fieldRow(L.fProblem, e.problema));
  out.push(fieldRow(L.fWhyNow, e.porque_agora));
  if (e.horizonte) out.push(fieldRow(L.fHorizon, e.horizonte));
  if (e.ativos) out.push(fieldRow(L.fAssets, e.ativos));

  // --- Stage 1: signals ---
  const sinais = state.sinais || [];
  out.push(`\n[${L.signals}] (${sinais.length})`);
  if (sinais.length === 0) {
    out.push(`  ${L.empty}`);
  } else {
    sinais.forEach((s, i) => {
      out.push(`  ${i + 1}. ${s.nome || "?"} [${s.categoria || "?"} · ${s.nivel || "?"} · impacto ${s.impacto || "?"}/3 · clareza ${s.clareza || "?"}/3]`);
      if (s.implicacao) out.push(`     → ${s.implicacao}`);
    });
  }
  if (state.zona_atual && state.zona_atual.trim()) {
    out.push(`  ${L.zone}: ${state.zona_atual}`);
  }

  // --- Stage 2: licenses ---
  const lc = state.licencas || { operar: [], competir: [], vencer: [], expiradas: [] };
  out.push(`\n[${L.licenses}]`);
  out.push(`  ${L.win}: ${(lc.vencer || []).join(" · ") || L.none}`);
  out.push(`  ${L.compete}: ${(lc.competir || []).join(" · ") || L.none}`);
  out.push(`  ${L.operate}: ${(lc.operar || []).join(" · ") || L.none}`);
  out.push(`  ${L.expired}: ${(lc.expiradas || []).join(" · ") || L.none}`);
  const tt = state.licenca_vencer_teste || {};
  if (tt.licenca || tt.relevante || tt.verdadeiro || tt.diferente) {
    out.push(`  ${L.tripleTest}:`);
    if (tt.licenca) out.push(`    • ${L.fLicense}: ${tt.licenca}`);
    if (tt.relevante) out.push(`    • ${L.fRel}: ${tt.relevante}`);
    if (tt.verdadeiro) out.push(`    • ${L.fTrue}: ${tt.verdadeiro}`);
    if (tt.diferente) out.push(`    • ${L.fDiff}: ${tt.diferente}`);
  }

  // --- Stage 3: matrix + initiatives ---
  const m = state.matriz || { otimizar: [], remodelar: [], diversificar: [], extrapolar: [] };
  out.push(`\n[${L.matrix}]`);
  out.push(`  ${L.optimize}: ${(m.otimizar || []).join(" · ") || L.none}`);
  out.push(`  ${L.remodel}: ${(m.remodelar || []).join(" · ") || L.none}`);
  out.push(`  ${L.diversify}: ${(m.diversificar || []).join(" · ") || L.none}`);
  out.push(`  ${L.extrapolate}: ${(m.extrapolar || []).join(" · ") || L.none}`);

  const inits = state.iniciativas || [];
  out.push(`\n[${L.initiatives}] (${inits.length})`);
  if (inits.length === 0) {
    out.push(`  ${L.empty}`);
  } else {
    const buckets = { no: [], now: [], near: [], next: [] };
    inits.forEach(i => { (buckets[i.horizonte] || buckets.now).push(i); });
    const renderBucket = (label, arr) => {
      if (arr.length === 0) return;
      out.push(`  ${label}:`);
      arr.forEach(i => {
        let line = `    • ${i.titulo || "?"}`;
        const meta = [];
        if (i.dono) meta.push(`dono: ${i.dono}`);
        if (i.metrica) meta.push(`métrica: ${i.metrica}`);
        if (meta.length) line += ` (${meta.join(" · ")})`;
        out.push(line);
        if (i.descricao) out.push(`      ${i.descricao}`);
      });
    };
    renderBucket(L.fNow, buckets.now);
    renderBucket(L.fNear, buckets.near);
    renderBucket(L.fNext, buckets.next);
    renderBucket(L.fNo, buckets.no);
  }

  // --- Stage 4: synthesis ---
  const hasSynthesis = (state.tese && state.tese.trim()) ||
                       (state.apostas && state.apostas.some(a => a && a.trim())) ||
                       (state.riscos && state.riscos.some(r => r && r.trim()));
  if (hasSynthesis) {
    out.push(`\n[${L.synthesis}]`);
    if (state.tese && state.tese.trim()) {
      out.push(`  ${L.thesis}: ${state.tese}`);
    }
    if (state.apostas && state.apostas.length) {
      const filled = state.apostas.filter(a => a && a.trim());
      if (filled.length) {
        out.push(`  ${L.bets}:`);
        filled.forEach(a => out.push(`    • ${a}`));
      }
    }
    if (state.riscos && state.riscos.length) {
      const filled = state.riscos.filter(r => r && r.trim());
      if (filled.length) {
        out.push(`  ${L.risks}:`);
        filled.forEach(r => out.push(`    • ${r}`));
      }
    }
  }

  return out.join("\n");
}

function AIAssistant({ stage, state, lang, onApplySummary }) {
  const t = window.I18N[lang];
  const SignInModal = window.SLDAuth.SignInModal;
  const AuthBadge = window.SLDAuth.AuthBadge;
  const [output, setOutput] = useStateEd("");
  const [loading, setLoading] = useStateEd(false);
  const [errorMsg, setErrorMsg] = useStateEd("");
  const [auth, setAuth] = window.SLDAuth.useAuth();
  const [signInOpen, setSignInOpen] = useStateEd(false);

  const run = async (action) => {
    setLoading(true); setErrorMsg(""); setOutput("");
    const ctx = buildContext(state, lang);
    let instruction = "";
    const prompts = AI_PROMPTS[lang];

    if (stage === "diagnostico" && action === "questions") instruction = prompts.diagnosticoQuestions;
    else if (stage === "sinais" && action === "suggest") instruction = prompts.sinaisSuggest;
    else if (stage === "sinais" && action === "critique") instruction = prompts.sinaisCritique;
    else if (stage === "licencas" && action === "suggest") instruction = prompts.licencasSuggest;
    else if (stage === "licencas" && action === "critique") instruction = prompts.licencasCritique;
    else if (stage === "dimensoes" && action === "suggest") instruction = prompts.dimensoesSuggest;
    else if (stage === "sintese" && action === "summary") instruction = prompts.sumarioGenerate;

    if (!instruction) { setLoading(false); return; }

    // Single, uniform prompt structure: the consultor ALWAYS sees the full
    // cross-stage state (previous and forward), then the stage-specific
    // instruction. This keeps Sugerir/Criticar reasoning about the whole
    // Jornada SLD instead of just the current page.
    const stageFocus = lang === "pt"
      ? `Foco desta requisição: etapa "${stage}" · ação "${action}". Use TUDO no contexto cross-stage acima ao raciocinar — sinais já mapeados, licenças já classificadas, matriz e iniciativas — mesmo quando a ação é de uma etapa anterior. Se uma etapa posterior já tem conteúdo, valide a coerência com ela.`
      : `Focus of this request: stage "${stage}" · action "${action}". Use EVERYTHING in the cross-stage context above when reasoning — mapped signals, classified licenses, matrix and initiatives — even when the action belongs to an earlier stage. If a later stage already has content, validate coherence with it.`;

    const prompt = `=== CONTEXTO CROSS-STAGE (estado completo do plano) ===\n${ctx}\n\n${stageFocus}\n\n=== INSTRUÇÃO ===\n${instruction}`;

    if (!auth) {
      setSignInOpen(true);
      setLoading(false);
      return;
    }

    // Prepend the SLD skill knowledge as a system preamble. The consultor
    // reasons EXCLUSIVELY inside the SLD method — no generic strategy advice.
    const groundedPrompt = `${SLD_SKILL_KNOWLEDGE[lang]}\n\n=== TAREFA ===\n${prompt}`;

    try {
      const result = await window.SLDAuth.complete(groundedPrompt, { maxTokens: 1500 });
      setOutput(result);
      // Try to parse JSON for sumario
      if (stage === "sintese" && action === "summary" && onApplySummary) {
        try {
          // Extract JSON block from response
          const jsonMatch = result.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            onApplySummary(parsed);
          }
        } catch (_) { /* leave as text */ }
      }
    } catch (err) {
      setErrorMsg((lang === "pt" ? "Erro ao consultar IA: " : "AI error: ") + (err.message || err));
    }
    setLoading(false);
  };

  const actions = {
    diagnostico: [{ key: "questions", label: t.aiQuestions }],
    sinais: [{ key: "suggest", label: t.aiSuggest }, { key: "critique", label: t.aiCritique }],
    licencas: [{ key: "suggest", label: t.aiSuggest }, { key: "critique", label: t.aiCritique }],
    dimensoes: [{ key: "suggest", label: t.aiSuggest }],
    sintese: [{ key: "summary", label: t.aiSummary }],
  };

  return (
    <div className="ai-pane">
      <div className="ai-head">
        <div className="ai-mark">AI</div>
        <div style={{flex: 1, minWidth: 0}}>
          <div className="ai-title">{lang === "pt" ? "Consultor SLD" : "SLD Consultant"}</div>
          <div className="ai-skill-tag" title={lang === "pt"
            ? "Este consultor responde exclusivamente com base no Método SLD da StartSe (Sinais · Licenças · Dimensões). Não usa frameworks externos."
            : "This consultant answers exclusively from the StartSe SLD Method (Signals · Licenses · Dimensions). No external frameworks."}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l2.39 6.95L22 9.27l-5.5 4.73L18.18 22 12 18.27 5.82 22 7.5 14 2 9.27l7.61-.32z"/></svg>
            <span>{lang === "pt" ? "Treinado no Método SLD · StartSe" : "Trained on the SLD Method · StartSe"}</span>
          </div>
          <AuthBadge lang={lang} onSignIn={() => setSignInOpen(true)} />
        </div>
      </div>
      {!auth ? (
        <div className="ai-body" style={{flex: 1, minHeight: 200}}>
          <div style={{textAlign: "center", padding: "32px 16px"}}>
            <div style={{fontSize: 32, marginBottom: 8, opacity: 0.6}}>🔒</div>
            <div style={{fontSize: 13, color: "var(--neo-fg-2)", marginBottom: 16, lineHeight: 1.5}}>
              {t.aiNeedAuth}
            </div>
            <button className="btn primary" onClick={() => setSignInOpen(true)}>
              <IconEd name="sparkle" size={12} /> {t.aiNeedAuthCta}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="ai-actions">
            {(actions[stage] || []).map(a => (
              <button key={a.key} className="btn outline sm" onClick={() => run(a.key)} disabled={loading}>
                <IconEd name="sparkle" size={12} /> {a.label}
              </button>
            ))}
          </div>
          <div className="ai-body" style={{flex: 1, minHeight: 200, maxHeight: 480, overflow: "auto"}}>
            {loading && <div style={{display: "flex", alignItems: "center", gap: 8, color: "var(--neo-fg-3)"}}>
              <span className="spinner"></span> {t.aiThinking}
            </div>}
            {errorMsg && <div style={{color: "var(--neo-danger)", fontSize: 12}}>{errorMsg}</div>}
            {!loading && !output && !errorMsg && <div className="placeholder">{t.aiPlaceholder}</div>}
            {output && <div className="ai-output" dangerouslySetInnerHTML={{__html: formatAIOutput(output)}} />}
          </div>
        </>
      )}
      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} lang={lang} />
    </div>
  );
}

function formatAIOutput(text) {
  // simple markdown-ish to html
  let out = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^(\d+)\.\s/gm, "$1. ")
    .replace(/^[\-\*]\s(.+)$/gm, "• $1")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");
  return "<p>" + out + "</p>";
}

window.SLDEditors = { SignalEditor, AIAssistant, SignalForm };
})();
