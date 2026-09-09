import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Loader2, RotateCcw } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

/**
 * The assistant.
 *
 * The prepared questions are the whole point. Each chip maps to a server-side
 * aggregation that runs first, so Gemini receives a small pre-computed summary
 * instead of raw bookings and payments. That keeps answers fast and cheap, and
 * means the model interprets figures rather than calculating them — which is
 * where models get things wrong.
 *
 * Free text still works, but it is the fallback, not the front door.
 */
export default function AskDivic() {
  const { location, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open || prompts.length) return;
    api.aiPrompts().then(setPrompts).catch(() => setPrompts([]));
  }, [open, prompts.length]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  const send = async ({ promptId, label, text }) => {
    setError(null);
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: label || text }]);
    try {
      const res = await api.aiAsk({
        promptId,
        question: promptId ? undefined : text,
        location,
        history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
      });
      setMessages((m) => [...m, { role: "assistant", text: res.answer, context: res.context, contextUsed: res.contextUsed }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitTyped = () => {
    const t = question.trim();
    if (!t || busy) return;
    setQuestion("");
    send({ text: t });
  };

  const groups = prompts.reduce((acc, p) => {
    (acc[p.group] = acc[p.group] || []).push(p);
    return acc;
  }, {});

  if (!open) {
    return (
      <button className="ask-fab" onClick={() => setOpen(true)}>
        <span className="dot" /> Ask about your hotel
      </button>
    );
  }

  return (
    <div className="ask-panel">
      <div className="ask-head">
        <Sparkles size={17} style={{ color: "var(--gold)", marginTop: 3 }} />
        <div style={{ flex: 1 }}>
          <h3>Ask DIVIC</h3>
          <p>Answers come from your own records only.</p>
        </div>
        {messages.length > 0 && (
          <button className="btn btn-sm btn-quiet" onClick={() => setMessages([])} aria-label="Start over">
            <RotateCcw size={14} />
          </button>
        )}
        <button className="btn btn-sm btn-quiet" onClick={() => setOpen(false)} aria-label="Close">
          <X size={15} />
        </button>
      </div>

      <div className="ask-scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <>
            {Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <div className="ask-group">{group}</div>
                <div className="ask-chips">
                  {items.map((p) => (
                    <button key={p.id} className="ask-chip"
                      onClick={() => send({ promptId: p.id, label: p.label })}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {prompts.length === 0 && (
              <p style={{ fontSize: "0.8125rem", color: "var(--slate-soft)" }}>
                Type a question below, or check that the assistant is switched on in the server settings.
              </p>
            )}
          </>
        )}

        {messages.map((m, i) => (
          <div key={i} className={"ask-msg " + m.role}>
            <div className="role">{m.role === "user" ? user.name.split(" ")[0] : "Assistant"}</div>
            <div className="text">{m.text}</div>
            {m.context && (
              <details className="ask-source">
                <summary>See the figures this used</summary>
                <pre>{JSON.stringify(m.context, null, 2)}</pre>
              </details>
            )}
          </div>
        ))}

        {busy && (
          <div className="ask-msg">
            <div className="role">Assistant</div>
            <div className="text" style={{ color: "var(--slate-faint)" }}>
              <Loader2 size={14} className="spin" style={{ verticalAlign: "-2px" }} /> Reading your records
            </div>
          </div>
        )}

        {error && <div className="err" style={{ marginTop: 8 }}>{error}</div>}

        {messages.length > 0 && !busy && (
          <div className="ask-chips" style={{ marginTop: 12 }}>
            {prompts.slice(0, 4).map((p) => (
              <button key={p.id} className="ask-chip"
                onClick={() => send({ promptId: p.id, label: p.label })}>
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ask-foot">
        <textarea
          placeholder="Or type your own question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitTyped(); }
          }}
        />
        <button className="btn btn-gold" onClick={submitTyped} disabled={busy || !question.trim()}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
