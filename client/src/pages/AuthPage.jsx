import { useState } from "react";
import { LockKeyhole, UserRound, ArrowRight, MessageCircle, Moon, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemePicker from "../components/ThemePicker";
export default function AuthPage({
  mode,
  setMode,
  theme,
  setTheme,
  colorTheme,
  setColorTheme
}) {
  const {
    login,
    register
  } = useAuth();
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirm: ""
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async event => {
    event.preventDefault();
    setError("");
    if (mode === "register" && form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") await login(form);else await register(form);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };
  return <main className="auth">
      <div className="auth-theme-controls">
        <ThemePicker colorTheme={colorTheme} setColorTheme={setColorTheme} />
        <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme" title={theme === "dark" ? "Light mode" : "Dark mode"}>
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <section className="auth-card">
        <div className="brand">
          <div className="brand-mark"><MessageCircle /></div>
          <div>
            <strong>Pulse Chat</strong>
            <span>Private conversations, beautifully simple.</span>
          </div>
        </div>

        <div className="auth-title">
          <h1>{mode === "login" ? "Welcome back!" : "Create your account"}</h1>
          <p>{mode === "login" ? "Sign in to continue chatting." : "Join the conversation with a simple username."}</p>
        </div>

        <form onSubmit={submit}>
          <label>
            <span>Username</span>
            <div className="input">
              <UserRound />
              <input autoComplete="username" value={form.username} onChange={e => setForm({
              ...form,
              username: e.target.value
            })} placeholder="username" required />
            </div>
          </label>

          <label>
            <span>Password</span>
            <div className="input">
              <LockKeyhole />
              <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={e => setForm({
              ...form,
              password: e.target.value
            })} placeholder="••••••••" required />
            </div>
          </label>

          {mode === "register" && <label>
              <span>Confirm password</span>
              <div className="input">
                <LockKeyhole />
                <input type="password" value={form.confirm} onChange={e => setForm({
              ...form,
              confirm: e.target.value
            })} placeholder="••••••••" required />
              </div>
            </label>}

          {error && <div className="error">{error}</div>}

          <button className="primary" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            <ArrowRight size={18} />
          </button>
        </form>

        <button className="switch" onClick={() => {
        setError("");
        setMode(mode === "login" ? "register" : "login");
      }}>
          {mode === "login" ? "Don't have an account? Create one" : "Already have an account? Sign in"}
        </button>
      </section>
    </main>;
}
