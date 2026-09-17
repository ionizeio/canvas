/** Explicit appearance choices carried by an external docs link. */
export interface ThemeLinkOverrides {
  scheme?: "light" | "dark";
  surface?: "solid" | "glass";
}

type SearchValue = string | string[] | undefined;

export function themeFromParams(params: { scheme?: SearchValue; surface?: SearchValue }): ThemeLinkOverrides {
  const first = (value: SearchValue) => Array.isArray(value) ? value[0] : value;
  const scheme = first(params.scheme);
  const surface = first(params.surface);
  return {
    ...(scheme === "light" || scheme === "dark" ? { scheme } : {}),
    ...(surface === "solid" || surface === "glass" ? { surface } : {}),
  };
}

/** Missing or invalid axes leave the current in-app choice alone. */
export function themeFromURL(url: string | null): ThemeLinkOverrides {
  if (!url) return {};
  try {
    const params = new URL(url).searchParams;
    return themeFromParams({ scheme: params.get("scheme") ?? undefined, surface: params.get("surface") ?? undefined });
  } catch {
    return {};
  }
}

export interface ThemeLinkSource {
  getLinkingURL(): string | null;
  addEventListener(type: "url", listener: (event: { url: string }) => void): { remove(): void };
}

/**
 * Observe external links, never ordinary router navigation. Subscribe before
 * re-reading the native cache to include an intent arriving during mount.
 * Reopening the same URL is still an explicit request to apply its choices.
 */
export function subscribeThemeLinks(
  source: ThemeLinkSource,
  initialURL: string | null,
  apply: (overrides: ThemeLinkOverrides) => void,
): () => void {
  const receive = (url: string | null) => {
    const overrides = themeFromURL(url);
    if (overrides.scheme || overrides.surface) apply(overrides);
  };
  const subscription = source.addEventListener("url", ({ url }) => receive(url));
  const currentURL = source.getLinkingURL();
  if (currentURL !== initialURL) receive(currentURL);
  return () => subscription.remove();
}
