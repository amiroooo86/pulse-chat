import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
export const COLOR_THEMES = [{
  id: "default",
  name: "Ocean",
  colors: ["#00a6fb", "#003554", "#edf2fb"]
}, {
  id: "pink",
  name: "Pink",
  colors: ["#fb6f92", "#ff8fab", "#ffb3c6", "#ffc2d1", "#ffe5ec"]
}, {
  id: "gray",
  name: "Gray",
  colors: ["#212529", "#343a40", "#495057", "#6c757d", "#adb5bd", "#e9ecef"]
}, {
  id: "violet",
  name: "Violet",
  colors: ["#e0aaff", "#c77dff", "#9d4edd", "#7b2cbf", "#5a189a", "#3c096c"]
}];
export default function ThemePicker({
  colorTheme,
  setColorTheme
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = event => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return <div className="theme-picker" ref={ref}>
      <button className="icon-btn theme-picker-trigger" onClick={() => setOpen(value => !value)} aria-label="Choose color theme" title="Color themes">
        <Palette size={18} />
      </button>
      {open && <div className="theme-picker-menu" role="menu">
          <div className="theme-picker-heading">
            <div><b>Color theme</b><span>Choose your Pulse style</span></div>
          </div>
          <div className="theme-options">
            {COLOR_THEMES.map(item => <button key={item.id} className={`theme-option ${colorTheme === item.id ? "active" : ""}`} onClick={() => {
          setColorTheme(item.id);
          setOpen(false);
        }} role="menuitem">
                <span className="theme-swatches" aria-hidden="true">
                  {item.colors.map(color => <i key={color} style={{
              background: color
            }} />)}
                </span>
                <span className="theme-option-copy"><b>{item.name}</b><small>{item.colors.length} palette colors</small></span>
                {colorTheme === item.id && <Check size={16} />}
              </button>)}
          </div>
        </div>}
    </div>;
}
