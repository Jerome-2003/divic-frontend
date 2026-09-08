import { useState } from "react";
import { KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { LOCATIONS } from "../lib/constants";
import { telUrl, mapUrl } from "../lib/format";
import { ErrorNote, Field, PasswordInput } from "../components/ui";

export default function Login() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) return setError("Enter your username and password.");
    setBusy(true); setError(null);
    try {
      await signIn(username.trim(), password);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="divic">
      <div className="login-wrap">
        <div className="login-art">
          <div>
            <img className="lmark-img" src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="92" height="92" />
            <div className="lname">Divic Exclusive<br />Hotels</div>
            <div className="lrule" />
            <div className="lcopy">
              Front desk, housekeeping, billing and guest records for both Festac
              properties. Sign in with the details your manager issued you.
            </div>
          </div>

          <div>
            {Object.values(LOCATIONS).map((l) => (
              <div className="login-prop" key={l.id}>
                <div className="pname">{l.name}</div>
                <div className="pmeta">
                  <a href={mapUrl(l.address)} target="_blank" rel="noreferrer">{l.address}</a>
                  <br />
                  <a href={telUrl(l.phone)}>{l.phone}</a>
                  <span style={{ color: "#6E675E" }}> · {l.totalRooms} rooms</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="login-form">
          <div className="login-card">
            <h2 style={{ fontSize: "1.6875rem", margin: "0 0 6px" }}>Sign in</h2>
            <p style={{ fontSize: "0.8438rem", color: "var(--slate-soft)", margin: "0 0 22px" }}>
              Your access level is set by the account you use.
            </p>

            <ErrorNote>{error}</ErrorNote>

            <Field label="Username" htmlFor="u">
              <input id="u" value={username} autoComplete="username" autoFocus
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()} />
            </Field>
            <Field label="Password" htmlFor="p">
              <PasswordInput id="p" value={password} autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()} />
            </Field>

            <button className="btn btn-gold" disabled={busy}
              style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
              onClick={submit}>
              <KeyRound size={15} /> {busy ? "Signing in" : "Sign in"}
            </button>

            <p style={{ fontSize: "0.75rem", color: "var(--slate-faint)", marginTop: 18, lineHeight: 1.6 }}>
              Forgotten your password? A manager or the owner can reset it from the
              staff screen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}