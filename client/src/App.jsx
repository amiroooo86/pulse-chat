import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
function SplashScreen() {
  return <main className="splash" aria-label="Pulse Chat loading">
      <div className="splash-logo-wrap">
        <div className="splash-logo-ring" aria-hidden="true">
          <div className="splash-logo"><Zap size={34} fill="currentColor" /></div>
        </div>
        <div className="splash-title">Pulse Chat</div>
        <div className="splash-subtitle">Loading your conversations…</div>
      </div>
    </main>;
}
export default function App() {
  const {
    user,
    loading
  } = useAuth();
  const [mode, setMode] = useState("login");
  const [theme, setTheme] = useState(() => localStorage.getItem("pulse_theme") || "light");
  const [colorTheme, setColorTheme] = useState(() => localStorage.getItem("pulse_color_theme") || "default");
  const [showSplash, setShowSplash] = useState(true);
  const previousUser = useRef(user);
  const firstPaint = useRef(true);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("pulse_theme", theme);
  }, [theme]);
  const hydratedThemeUser = useRef(null);
  useEffect(() => {
    document.documentElement.dataset.colorTheme = colorTheme;
    localStorage.setItem("pulse_color_theme", colorTheme);
    const username = user?.username?.toLowerCase();
    if (username && hydratedThemeUser.current === username) {
      localStorage.setItem(`pulse_color_theme:${username}`, colorTheme);
    }
  }, [colorTheme, user?.username]);

  // Keep the palette per account. A first-time account starts on Ocean,
  // while a returning account gets the palette it last used.
  useEffect(() => {
    if (!user?.username) {
      hydratedThemeUser.current = null;
      return;
    }
    const username = user.username.toLowerCase();
    const saved = localStorage.getItem(`pulse_color_theme:${username}`);
    hydratedThemeUser.current = username;
    setColorTheme(saved || "default");
  }, [user?.username]);
  useEffect(() => {
    if (loading) return undefined;
    const justLoggedIn = !firstPaint.current && !previousUser.current && !!user;
    const shouldShow = firstPaint.current || justLoggedIn;
    previousUser.current = user;
    firstPaint.current = false;
    if (!shouldShow) return undefined;
    setShowSplash(true);
    const timer = window.setTimeout(() => setShowSplash(false), 2200);
    return () => window.clearTimeout(timer);
  }, [loading, user]);
  if (loading || showSplash) return <SplashScreen />;
  return user ? <ChatPage theme={theme} setTheme={setTheme} colorTheme={colorTheme} setColorTheme={setColorTheme} /> : <AuthPage mode={mode} setMode={setMode} theme={theme} setTheme={setTheme} colorTheme={colorTheme} setColorTheme={setColorTheme} />;
}
