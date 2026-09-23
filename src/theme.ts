
export type Theme = "light" | "dark";
export type Surface = "solid" | "glass";
export type Density = "compact" | "regular" | "comfy";

const STORAGE_KEY_THEME = "canvas-theme";
const STORAGE_KEY_SURFACE = "canvas-surface";
const STORAGE_KEY_DENSITY = "canvas-density";

// The theme / surface / density switches live on the web document's root element.
// Guarded so calling any of these helpers never touches DOM globals on native or
// during SSR: off the web the getters return the default and the setters no-op.
function hasDocument(): boolean {
  return typeof document !== "undefined";
}

function store(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch {}
}

function load(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function getTheme(): Theme {
  const saved = load(STORAGE_KEY_THEME);
  if (saved === "light" || saved === "dark") return saved;
  if (!hasDocument()) return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(theme: Theme): void {
  if (hasDocument()) document.documentElement.classList.toggle("dark", theme === "dark");
  store(STORAGE_KEY_THEME, theme);
}

export function toggleTheme(): Theme {
  const next = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

export function getSurface(): Surface {
  const saved = load(STORAGE_KEY_SURFACE);
  if (saved === "solid" || saved === "glass") return saved;
  if (!hasDocument()) return "solid";
  return (document.documentElement.dataset.surface as Surface) ?? "solid";
}

export function setSurface(surface: Surface): void {
  if (hasDocument()) {
    if (surface === "solid") {
      delete document.documentElement.dataset.surface;
    } else {
      document.documentElement.dataset.surface = surface;
    }
  }
  store(STORAGE_KEY_SURFACE, surface);
}

export function getDensity(): Density {
  const saved = load(STORAGE_KEY_DENSITY);
  if (saved === "compact" || saved === "regular" || saved === "comfy") return saved;
  if (!hasDocument()) return "regular";
  return (document.documentElement.dataset.density as Density) ?? "regular";
}

export function setDensity(density: Density): void {
  if (hasDocument()) {
    if (density === "regular") {
      delete document.documentElement.dataset.density;
    } else {
      document.documentElement.dataset.density = density;
    }
  }
  store(STORAGE_KEY_DENSITY, density);
}
