import { useState } from "react";
import { Plus, Trash2, Globe2, MessageCircleQuestion } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { LOCATIONS } from "../lib/constants";
import { prettyDateTime } from "../lib/format";
import { PageHead, Card, Modal, Field, Row, Empty, Loading, ErrorNote, Note, Chip } from "../components/ui";

/* Promos, popups and the answers the website's assistant is allowed to give.
   Everything published here is visible to the public, so the page says so
   plainly rather than assuming a receptionist will infer it. */

const TYPES = [
  { value: "banner", label: "Banner — a strip across the page" },
  { value: "popup", label: "Popup — opens over the page once" },
  { value: "announcement", label: "Announcement — a notice in the page" },
  { value: "section", label: "Section — a block of content" },
];

function stateOf(item) {
  if (item.expired) return { cls: "wc-exp", label: "Expired" };
  if (item.scheduled) return { cls: "wc-sched", label: "Scheduled" };
  if (item.liveNow) return { cls: "wc-live", label: "Live on the site" };
  return { cls: "wc-draft", label: "Draft" };
}

/* A rough render of what a visitor sees. Approximate is fine; publishing blind
   to a public website is not. */
/* A YouTube/Vimeo link needs an <iframe> to embed; a direct file link plays in
   a plain <video> tag. Detected from the URL rather than asking the user to
   say which — one less thing to get wrong when publishing. */
function isEmbedVideo(url) {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url || "");
}
function toEmbedUrl(url) {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/);
  if (yt) return "https://www.youtube.com/embed/" + yt[1];
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return "https://player.vimeo.com/video/" + vm[1];
  return url;
}

function MediaPreview({ mediaType, mediaUrl, caption }) {
  if (!mediaType || mediaType === "none" || !mediaUrl) return null;
  return (
    <div className="wc-media">
      {mediaType === "video" ? (
        isEmbedVideo(mediaUrl)
          ? <iframe src={toEmbedUrl(mediaUrl)} title={caption || "Video"} allowFullScreen />
          : <video src={mediaUrl} controls />
      ) : (
        <img src={mediaUrl} alt={caption || ""} />
      )}
      {caption && <div className="wc-caption">{caption}</div>}
    </div>
  );
}

function Preview({ draft }) {
  const body = (
    <>
      <MediaPreview mediaType={draft.mediaType} mediaUrl={draft.mediaUrl} caption={draft.caption} />
      <h4>{draft.title || "Untitled"}</h4>
      {draft.body && <p>{draft.body}</p>}
      {draft.ctaLabel && <span className="wc-cta">{draft.ctaLabel}</span>}
    </>
  );
  return (
    <div className="wc-preview">
      <div className="wc-preview-label">Roughly how this appears on the public website</div>
      <div className="wc-preview-body">
        {draft.type === "popup"
          ? <div className="wc-popup">{body}</div>
          : <div className="wc-banner">{body}</div>}
      </div>
    </div>
  );
}

function ContentForm({ editing, onClose, onSaved }) {
  const [d, setD] = useState(editing || {
    key: "", type: "banner", location: "both", title: "", body: "",
    mediaType: "none", mediaUrl: "", caption: "",
    ctaLabel: "", ctaHref: "", active: false, priority: 0,
    startsAt: "", endsAt: "",
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setD({ ...d, [k]: v });
  const dateValue = (v) => (v ? String(v).slice(0, 10) : "");

  const submit = async () => {
    if (!d.key.trim()) return setError("Give this a short key, like promo-december.");
    if (!d.title.trim()) return setError("A title is required.");
    setSaving(true); setError(null);
    const payload = {
      ...d,
      startsAt: d.startsAt || null,
      endsAt: d.endsAt || null,
      priority: Number(d.priority) || 0,
    };
    try {
      if (editing) await api.updateContent(editing._id, payload);
      else await api.createContent(payload);
      onSaved(); onClose();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <Modal
      wide
      title={editing ? "Edit website content" : "New website content"}
      blurb="This appears on the public hotel website, where anyone can see it."
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-gold" onClick={submit} disabled={saving}>
          {saving ? "Saving" : d.active ? "Save and publish" : "Save as draft"}
        </button>
      </>}
    >
      <ErrorNote>{error}</ErrorNote>

      <div className="wc-grid">
        <div>
          <Row>
            <Field label="Key" htmlFor="wk">
              <input id="wk" value={d.key} disabled={!!editing}
                placeholder="promo-december"
                onChange={(e) => set("key", e.target.value.trim())} />
            </Field>
            <Field label="Type" htmlFor="wt">
              <select id="wt" value={d.type} onChange={(e) => set("type", e.target.value)}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
          </Row>

          <Field label="Title" htmlFor="wti">
            <input id="wti" value={d.title} maxLength={120} onChange={(e) => set("title", e.target.value)} />
          </Field>

          <Field label="Body" htmlFor="wb">
            <textarea id="wb" rows={4} maxLength={800} value={d.body}
              onChange={(e) => set("body", e.target.value)} />
          </Field>

          <Row>
            <Field label="Media" htmlFor="wmt">
              <select id="wmt" value={d.mediaType} onChange={(e) => set("mediaType", e.target.value)}>
                <option value="none">None</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </Field>
            {d.mediaType !== "none" && (
              <Field label={d.mediaType === "video" ? "Video URL" : "Image URL"} htmlFor="wmu">
                <input id="wmu" value={d.mediaUrl}
                  placeholder={d.mediaType === "video" ? "https://youtube.com/watch?v=…" : "https://…"}
                  onChange={(e) => set("mediaUrl", e.target.value)} />
              </Field>
            )}
          </Row>
          {d.mediaType !== "none" && (
            <Field label="Caption" htmlFor="wmc">
              <input id="wmc" value={d.caption} maxLength={200}
                placeholder="Optional" onChange={(e) => set("caption", e.target.value)} />
            </Field>
          )}

          <Row>
            <Field label="Button label" htmlFor="wcl">
              <input id="wcl" value={d.ctaLabel} maxLength={40}
                placeholder="Book now" onChange={(e) => set("ctaLabel", e.target.value)} />
            </Field>
            <Field label="Button link" htmlFor="wch">
              <input id="wch" value={d.ctaHref}
                placeholder="/book" onChange={(e) => set("ctaHref", e.target.value)} />
            </Field>
          </Row>

          <Row>
            <Field label="Which property" htmlFor="wl">
              <select id="wl" value={d.location} onChange={(e) => set("location", e.target.value)}>
                <option value="both">Both properties</option>
                <option value="exclusive">{LOCATIONS.exclusive.name} only</option>
                <option value="urban">{LOCATIONS.urban.name} only</option>
              </select>
            </Field>
            <Field label="Priority" htmlFor="wp">
              <input id="wp" type="number" value={d.priority} onChange={(e) => set("priority", e.target.value)} />
            </Field>
          </Row>

          <Row>
            <Field label="Starts (optional)" htmlFor="ws">
              <input id="ws" type="date" value={dateValue(d.startsAt)} onChange={(e) => set("startsAt", e.target.value)} />
            </Field>
            <Field label="Ends (optional)" htmlFor="we">
              <input id="we" type="date" value={dateValue(d.endsAt)} onChange={(e) => set("endsAt", e.target.value)} />
            </Field>
          </Row>

          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: "0.8438rem", cursor: "pointer" }}>
            <input type="checkbox" checked={!!d.active} style={{ width: 16, marginTop: 2 }}
              onChange={(e) => set("active", e.target.checked)} />
            <span>
              Publish this
              <span style={{ display: "block", fontSize: "0.75rem", color: "var(--slate-faint)" }}>
                Leave it off to save a draft. Dates above still control when it shows.
              </span>
            </span>
          </label>
        </div>

        <div>
          <Preview draft={d} />
          <div style={{ marginTop: 12 }}>
            <Note>
              Text only — no formatting or HTML. Links must be a path on the site
              like /book, or a full https:// address.
            </Note>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function FaqForm({ editing, onClose, onSaved }) {
  const [d, setD] = useState(editing || {
    question: "", answer: "", category: "General", location: "both", active: true, order: 0,
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setD({ ...d, [k]: v });

  const submit = async () => {
    if (!d.question.trim() || !d.answer.trim()) {
      return setError("Both the question and the answer are needed.");
    }
    setSaving(true); setError(null);
    try {
      if (editing) await api.updateFaq(editing._id, { ...d, order: Number(d.order) || 0 });
      else await api.createFaq({ ...d, order: Number(d.order) || 0 });
      onSaved(); onClose();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <Modal
      title={editing ? "Edit answer" : "New answer"}
      blurb="Used by the assistant on the public website."
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-gold" onClick={submit} disabled={saving}>
          {saving ? "Saving" : "Save answer"}
        </button>
      </>}
    >
      <ErrorNote>{error}</ErrorNote>

      <Field label="Question" htmlFor="fq">
        <input id="fq" value={d.question} maxLength={200} onChange={(e) => set("question", e.target.value)} />
      </Field>
      <Field label="Answer" htmlFor="fa">
        <textarea id="fa" rows={5} maxLength={1200} value={d.answer} onChange={(e) => set("answer", e.target.value)} />
      </Field>
      <Row>
        <Field label="Category" htmlFor="fc">
          <input id="fc" value={d.category} onChange={(e) => set("category", e.target.value)} />
        </Field>
        <Field label="Which property" htmlFor="fl">
          <select id="fl" value={d.location} onChange={(e) => set("location", e.target.value)}>
            <option value="both">Both properties</option>
            <option value="exclusive">{LOCATIONS.exclusive.name} only</option>
            <option value="urban">{LOCATIONS.urban.name} only</option>
          </select>
        </Field>
      </Row>
      <Row>
        <Field label="Order" htmlFor="fo">
          <input id="fo" type="number" value={d.order} onChange={(e) => set("order", e.target.value)} />
        </Field>
        <Field label="Shown on the site" htmlFor="fac">
          <select id="fac" value={d.active ? "yes" : "no"} onChange={(e) => set("active", e.target.value === "yes")}>
            <option value="yes">Yes</option>
            <option value="no">No, hide it</option>
          </select>
        </Field>
      </Row>

      <Note>
        Write the answer as you would say it to a guest on the phone. The website
        assistant answers from these words — a vague answer here becomes a vague
        answer to a real guest at midnight.
      </Note>
    </Modal>
  );
}

export default function Website() {
  const [tab, setTab] = useState("content");
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState(null);

  const content = useApi(() => api.siteContent(), []);
  const faq = useApi(() => api.faqEntries(), []);

  const removeContent = async (item) => {
    const live = item.liveNow;
    const ok = window.confirm(
      live
        ? "Delete \"" + item.title + "\"?\n\nThis is live on the public website and will disappear from it straight away."
        : "Delete \"" + item.title + "\"?"
    );
    if (!ok) return;
    setActionError(null);
    try { await api.deleteContent(item._id); content.reload(); }
    catch (e) { setActionError(e.message); }
  };

  const removeFaq = async (item) => {
    if (!window.confirm("Delete the answer to \"" + item.question + "\"?")) return;
    setActionError(null);
    try { await api.deleteFaq(item._id); faq.reload(); }
    catch (e) { setActionError(e.message); }
  };

  const togglePublish = async (item) => {
    setActionError(null);
    try { await api.updateContent(item._id, { active: !item.active }); content.reload(); }
    catch (e) { setActionError(e.message); }
  };

  return (
    <>
      <PageHead
        title="Website"
        blurb="Promos, popups and the answers the website assistant gives. Everything here is public."
      >
        <button className="btn btn-gold" onClick={() => setAdding(true)}>
          <Plus size={15} /> {tab === "content" ? "New content" : "New answer"}
        </button>
      </PageHead>

      <div className="tabs">
        <button className={tab === "content" ? "on" : ""} onClick={() => setTab("content")}>
          <Globe2 size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          Promos and popups
        </button>
        <button className={tab === "faq" ? "on" : ""} onClick={() => setTab("faq")}>
          <MessageCircleQuestion size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          FAQ answers
        </button>
      </div>

      <ErrorNote>{actionError || content.error || faq.error}</ErrorNote>

      {tab === "content" ? (
        <Card>
          {content.loading ? <Loading /> : !content.data?.length ? (
            <Empty
              heading="Nothing published yet"
              text="Add a promo, a popup or an announcement and it appears on the public website."
              action={<button className="btn btn-gold" onClick={() => setAdding(true)}><Plus size={15} /> New content</button>}
            />
          ) : (
            <table className="tbl">
              <thead>
                <tr><th>Title</th><th>Type</th><th>Property</th><th>Window</th>
                    <th>State</th><th style={{ textAlign: "right" }}>Action</th></tr>
              </thead>
              <tbody>
                {content.data.map((item) => {
                  const st = stateOf(item);
                  return (
                    <tr key={item._id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{item.title}</div>
                        <div className="mono" style={{ fontSize: "0.7188rem", color: "var(--slate-faint)" }}>{item.key}</div>
                      </td>
                      <td style={{ fontSize: "0.7812rem" }}>{item.type}</td>
                      <td style={{ fontSize: "0.7812rem" }}>
                        {item.location === "both" ? "Both" : LOCATIONS[item.location].name}
                      </td>
                      <td style={{ fontSize: "0.75rem", color: "var(--slate-soft)" }}>
                        {item.startsAt || item.endsAt
                          ? (item.startsAt ? String(item.startsAt).slice(0, 10) : "now") + " → " +
                            (item.endsAt ? String(item.endsAt).slice(0, 10) : "no end")
                          : "Always"}
                      </td>
                      <td><span className={"wc-state " + st.cls}>{st.label}</span></td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button className="btn btn-sm btn-quiet" onClick={() => togglePublish(item)}>
                          {item.active ? "Unpublish" : "Publish"}
                        </button>
                        <button className="btn btn-sm btn-quiet" onClick={() => setEditing(item)}>Edit</button>
                        <button className="btn btn-sm btn-quiet" onClick={() => removeContent(item)} aria-label="Delete">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      ) : (
        <Card>
          {faq.loading ? <Loading /> : !faq.data?.length ? (
            <Empty heading="No answers yet" text="These are what the website assistant uses to answer visitors." />
          ) : (
            <table className="tbl">
              <thead>
                <tr><th>Question</th><th>Category</th><th>Property</th>
                    <th>Shown</th><th style={{ textAlign: "right" }}>Action</th></tr>
              </thead>
              <tbody>
                {faq.data.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{item.question}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--slate-faint)", maxWidth: 460 }}>
                        {item.answer.length > 110 ? item.answer.slice(0, 110) + "…" : item.answer}
                      </div>
                    </td>
                    <td style={{ fontSize: "0.7812rem" }}>{item.category}</td>
                    <td style={{ fontSize: "0.7812rem" }}>
                      {item.location === "both" ? "Both" : LOCATIONS[item.location].name}
                    </td>
                    <td>
                      <Chip tone={item.active ? "st-available" : "st-maintenance"}>
                        {item.active ? "Yes" : "Hidden"}
                      </Chip>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="btn btn-sm btn-quiet" onClick={() => setEditing(item)}>Edit</button>
                      <button className="btn btn-sm btn-quiet" onClick={() => removeFaq(item)} aria-label="Delete">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {(adding || editing) && (tab === "content" ? (
        <ContentForm
          editing={editing && editing.key ? editing : null}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={content.reload}
        />
      ) : (
        <FaqForm
          editing={editing && editing.question ? editing : null}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={faq.reload}
        />
      ))}
    </>
  );
}
