/* global React, ReactDOM */
// ai-auth.jsx — sign-in flow + provider-agnostic complete()
(function(){
const { useState, useEffect } = React;
const AUTH_KEY = "sld_ai_auth_v1";

// ============================================================
// Auth state in localStorage
//   { provider: 'claude' | 'anthropic', apiKey?: string, model?: string, signedInAt: number }
// ============================================================
function loadAuth() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch { return null; }
}
function saveAuth(auth) {
  if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  else localStorage.removeItem(AUTH_KEY);
  // notify other components
  window.dispatchEvent(new CustomEvent("sld_auth_changed"));
}
function useAuth() {
  const [auth, setAuth] = useState(() => loadAuth());
  useEffect(() => {
    const onChange = () => setAuth(loadAuth());
    window.addEventListener("sld_auth_changed", onChange);
    return () => window.removeEventListener("sld_auth_changed", onChange);
  }, []);
  return [auth, (next) => { saveAuth(next); setAuth(next); }];
}

const CLAUDE_AVAILABLE = () => typeof window.claude !== "undefined" && typeof window.claude.complete === "function";

// ============================================================
// complete() — provider-agnostic
// ============================================================
async function complete(prompt, opts = {}) {
  const auth = loadAuth();
  if (!auth) throw new Error("not_signed_in");

  if (auth.provider === "claude") {
    if (!CLAUDE_AVAILABLE()) throw new Error("claude_unavailable");
    return await window.claude.complete(prompt);
  }

  if (auth.provider === "anthropic") {
    if (!auth.apiKey) throw new Error("missing_api_key");
    const model = auth.model || "claude-haiku-4-5";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": auth.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens || 1500,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!res.ok) {
      let detail = "";
      try { const j = await res.json(); detail = j.error?.message || JSON.stringify(j); } catch {}
      throw new Error(`API ${res.status}: ${detail || res.statusText}`);
    }
    const data = await res.json();
    return (data.content || []).map(c => c.text || "").join("");
  }

  throw new Error("unknown_provider");
}

// ============================================================
// Sign-in modal
// ============================================================
function SignInModal({ open, onClose, lang }) {
  const t = window.I18N[lang];
  const [auth, setAuth] = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("claude-haiku-4-5");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  if (!open) return null;

  const claudeAvail = CLAUDE_AVAILABLE();

  const signInWithClaude = () => {
    if (!claudeAvail) { setError(t.aiOptUnavailableDesc); return; }
    setAuth({ provider: "claude", signedInAt: Date.now() });
    onClose();
  };

  const signInWithKey = async () => {
    setError("");
    if (!apiKey.trim().startsWith("sk-ant-")) {
      setError(lang === "pt" ? "Chave inválida — deve começar com sk-ant-." : "Invalid key — must start with sk-ant-.");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({ model, max_tokens: 8, messages: [{ role: "user", content: "ok" }] })
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const j = await res.json(); msg = j.error?.message || msg; } catch {}
        setError(msg); setVerifying(false); return;
      }
      setAuth({ provider: "anthropic", apiKey: apiKey.trim(), model, signedInAt: Date.now() });
      onClose();
    } catch (e) {
      setError(e.message || String(e));
    }
    setVerifying(false);
  };

  const modalUi = (
    <div className="sld-modal-backdrop" onClick={onClose}>
      <div className="sld-modal" onClick={e => e.stopPropagation()}>
        <div className="sld-modal-head">
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontFamily: "var(--sld-display)", fontSize: 24, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--sld-ink)"}}>{t.aiSignInTitle}</div>
            <div style={{fontSize: 13, color: "var(--neo-fg-2)", marginTop: 4, lineHeight: 1.5}}>{t.aiSignInLede}</div>
          </div>
          <button className="btn ghost sm" onClick={onClose} style={{padding: 0, width: 28, height: 28, flexShrink: 0}} aria-label="close">
            <SmallX />
          </button>
        </div>

        <div className="sld-modal-body">
          {/* Option A — Claude account */}
          <div className={`auth-opt ${claudeAvail ? "" : "disabled"}`}>
            <div className="auth-opt-num">A</div>
            <div style={{flex: 1, minWidth: 0}}>
              <div className="auth-opt-title">{t.aiOptClaude}</div>
              <div className="auth-opt-desc">{claudeAvail ? t.aiOptClaudeDesc : t.aiOptUnavailableDesc}</div>
              <button className="btn primary" disabled={!claudeAvail} onClick={signInWithClaude} style={{marginTop: 8}}>
                {t.aiOptClaudeCta}
              </button>
              {!claudeAvail && (
                <div style={{fontSize: 11, color: "var(--neo-fg-3)", marginTop: 6, fontStyle: "italic"}}>
                  {t.aiOptUnavailable}
                </div>
              )}
            </div>
          </div>

          <div style={{display: "flex", alignItems: "center", gap: 12, margin: "20px 0", color: "var(--neo-fg-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em"}}>
            <div style={{flex: 1, borderTop: "1px solid var(--neo-border-subtle)"}}></div>
            <span>{lang === "pt" ? "ou" : "or"}</span>
            <div style={{flex: 1, borderTop: "1px solid var(--neo-border-subtle)"}}></div>
          </div>

          {/* Option B — API key */}
          <div className="auth-opt">
            <div className="auth-opt-num">B</div>
            <div style={{flex: 1, minWidth: 0}}>
              <div className="auth-opt-title">{t.aiOptApi}</div>
              <div className="auth-opt-desc">{t.aiOptApiDesc}</div>
              <div style={{display: "grid", gap: 8, marginTop: 12}}>
                <input
                  className="input"
                  type="password"
                  placeholder={t.aiOptApiPlaceholder}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  autoComplete="off"
                  spellCheck="false"
                  style={{fontFamily: "ui-monospace, monospace", fontSize: 12}}
                />
                <div style={{display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end"}}>
                  <div>
                    <label className="label" style={{marginBottom: 4}}>{t.aiOptApiModel}</label>
                    <select className="select" value={model} onChange={e => setModel(e.target.value)}>
                      <option value="claude-haiku-4-5">claude-haiku-4-5 — {lang === "pt" ? "rápido, econômico" : "fast, cheap"}</option>
                      <option value="claude-sonnet-4-5">claude-sonnet-4-5 — {lang === "pt" ? "padrão" : "default"}</option>
                      <option value="claude-opus-4-5">claude-opus-4-5 — {lang === "pt" ? "máxima qualidade" : "max quality"}</option>
                    </select>
                  </div>
                  <button className="btn primary" disabled={verifying || !apiKey.trim()} onClick={signInWithKey}>
                    {verifying ? (lang === "pt" ? "Verificando…" : "Verifying…") : t.aiOptApiCta}
                  </button>
                </div>
                {error && (
                  <div style={{fontSize: 12, color: "var(--neo-danger)", padding: "8px 12px", background: "var(--neo-danger-bg)", border: "1px solid var(--neo-danger-border)", borderRadius: 4}}>
                    {error}
                  </div>
                )}
                <div style={{fontSize: 11, color: "var(--neo-fg-3)", lineHeight: 1.5, marginTop: 4}}>
                  🔒 {t.aiPrivacyNote}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  // Portal to body so the modal escapes any `transform`/`contain` ancestor
  return ReactDOM.createPortal(modalUi, document.body);
}

function SmallX() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>;
}

// ============================================================
// Auth status badge / sign-out
// ============================================================
function AuthBadge({ lang, onSignIn }) {
  const t = window.I18N[lang];
  const [auth, setAuth] = useAuth();
  if (!auth) {
    return (
      <button className="btn outline sm" onClick={onSignIn} style={{fontSize: 11, height: 22}}>
        {t.aiSignedOut}
      </button>
    );
  }
  const label = auth.provider === "claude"
    ? (lang === "pt" ? "Claude.ai" : "Claude.ai")
    : `Anthropic API · ${auth.model || "claude-haiku-4-5"}`;
  return (
    <div style={{display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--neo-fg-2)"}}>
      <span style={{width: 6, height: 6, borderRadius: "50%", background: "var(--neo-success)", boxShadow: "0 0 0 3px rgba(20,200,110,0.18)"}}></span>
      <span>{label}</span>
      <button className="btn ghost sm" onClick={() => setAuth(null)}
        style={{padding: "0 6px", height: 20, fontSize: 10, color: "var(--neo-fg-3)"}}>
        {t.aiSignOut}
      </button>
    </div>
  );
}

window.SLDAuth = { complete, useAuth, loadAuth, saveAuth, SignInModal, AuthBadge, CLAUDE_AVAILABLE };
})();
