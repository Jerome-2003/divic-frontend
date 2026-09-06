import { useState, useEffect } from "react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { LOCATIONS } from "../lib/constants";
import { naira, cap } from "../lib/format";
import { PageHead, Card, Loading, ErrorNote, Note } from "../components/ui";

export default function Rates() {
  const { location, user } = useAuth();
  const editable = ["manager", "owner"].includes(user.role);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const { data, loading, error, reload } = useApi(() => api.rates(location), [location]);
  useEffect(() => { setDraft(null); }, [location]);

  const save = async () => {
    setSaving(true); setSaveError(null);
    try {
      await api.saveRates(location, draft);
      await reload();
      setDraft(null);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const current = data.prices;
  const working = draft || current;

  return (
    <>
      <PageHead title="Rates"
        blurb={"Nightly rates at " + LOCATIONS[location].name + ". Each property keeps its own pricing."}>
        {editable && (draft ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => setDraft(null)} disabled={saving}>Discard</button>
            <button className="btn btn-gold" onClick={save} disabled={saving}>
              {saving ? "Saving" : "Save rates"}
            </button>
          </div>
        ) : (
          <button className="btn" onClick={() => setDraft({ ...current })}>Edit rates</button>
        ))}
      </PageHead>

      <ErrorNote>{saveError}</ErrorNote>

      <Card>
        <table className="tbl">
          <thead>
            <tr><th>Room type</th><th style={{ textAlign: "right" }}>Rate per night</th></tr>
          </thead>
          <tbody>
            {data.typeOrder.map((type) => (
              <tr key={type}>
                <td style={{ fontWeight: 500 }}>{cap(type)}</td>
                <td style={{ textAlign: "right" }}>
                  {draft ? (
                    <input type="number" className="mono"
                      style={{ width: 140, textAlign: "right", display: "inline-block" }}
                      value={working[type]}
                      onChange={(e) => setDraft({ ...working, [type]: Number(e.target.value) })} />
                  ) : (
                    <span className="mono">{naira(current[type])}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div style={{ marginTop: 16 }}>
        <Note>
          {editable
            ? "Changing a rate affects new bookings only. Bookings already taken keep the rate they were quoted."
            : "Rates are set by a manager or the owner. You can see them here but not change them."}
        </Note>
      </div>
    </>
  );
}
