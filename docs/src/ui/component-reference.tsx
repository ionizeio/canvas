import { Suspense, useState } from "react";
import { Platform } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { View, Text, Skeleton, useTheme } from "@ionizeio/canvas";
import { getComponent } from "../core/data/components";
import type { ComponentDoc } from "../core/data/types";
import { useComponentDocs } from "../core/use-component-docs";
import { Page } from "./page";
import { Lead } from "./prose";
import { Playground } from "./playground";
import { PropTables } from "./prop-table";
import { Donts } from "./dont";
import { PageNav } from "./page-nav";
import { stripHtml } from "../lib/html";
import { variantSlug } from "../lib/variant";
import { sans } from "./fonts";
import { DocsHead } from "./docs-head";

// The generic component reference page, shared by the default route
// (components/[slug]/index) and the deep-linked variant route
// (components/[slug]/[variant]). The optional `variant` path segment names one Playground
// example by its slugified label (see variantSlug): /components/checkbox/nestedgroup opens
// the "Nested group" example. An absent segment shows the first (default) example; a
// segment that names the default, or names nothing valid, redirects to the bare component
// URL so each variant has exactly one canonical address.
export function ComponentReference() {
  const { slug, variant } = useLocalSearchParams<{ slug: string; variant?: string }>();
  const { tokens } = useTheme();

  const comp = slug ? getComponent(slug) : undefined;
  if (!comp) return <Redirect href="/components" />;

  return (
    <Page>
      <DocsHead title={comp.name} />
      {/* Component pages use a larger title (28/700) than the generic page header. */}
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" aria-level={1} style={{ fontFamily: sans("700"), fontSize: 28, letterSpacing: -0.42, color: tokens.foreground }}>{comp.name}</Text>
        <Lead>{stripHtml(comp.description)}</Lead>
      </View>
      {/* The docs module is the page's own chunk in the web export. It is on the page
          before the bundle runs, so this never suspends on a page load; a client-side
          navigation to another component fetches that one's chunk, and the stage holds
          a skeleton for the moment it takes. */}
      <Suspense fallback={<Skeleton card large animate accessibilityLabel="Loading the examples" />}>
        <ComponentBody comp={comp} variant={variant} />
      </Suspense>
      <PageNav />
    </Page>
  );
}

function ComponentBody({ comp, variant }: { comp: ComponentDoc; variant?: string }) {
  const { tokens } = useTheme();
  const entry = useComponentDocs(comp.dir ?? comp.slug);
  const propGroups = entry?.props;
  const examples = entry?.examples ?? [];

  // Map the URL variant to an example index. Index 0 is the default, reached by the bare
  // URL, so a variant segment that resolves to it (the literal "default", or anything that
  // matches no example) is redundant and canonicalizes to the bare path.
  const variantIdx = variant ? examples.findIndex((e) => variantSlug(e.label) === variant) : 0;
  // Local state, seeded once from the URL, NOT re-derived from it on every render: this
  // component is shared by the index route (no variant) and the `[variant]` route (one
  // per non-default example), which expo-router treats as distinct screens (no optional
  // catch-all in this version), and it remounts on ANY router.replace to a new resolved
  // path, even between two `[variant]` values on the same file (verified against a
  // running instance, not assumed). That remount is the blink the form-factor switcher
  // (and every other piece of local Playground state, and its glass materials) suffered
  // on every rail click. Selecting a new example now updates this state directly instead
  // of asking the router to navigate, so the component and its children never unmount.
  // Called before the redirect below (Rules of Hooks), and moot when it fires: a
  // <Redirect> mount never reaches the JSX that would read `selected`.
  const [selected, setSelected] = useState(() => (variantIdx < 0 ? 0 : variantIdx));
  if (variant !== undefined && variantIdx <= 0) {
    return <Redirect href={`/components/${comp.slug}`} />;
  }
  // The canonical URL for example `i` (the bare component path for the default, a
  // `/<variant>` deep link otherwise); shared by the address-bar sync below and the
  // DocsHead override, so the two can never disagree.
  const hrefFor = (i: number) => {
    const label = examples[i]?.label;
    return i <= 0 || !label ? `/components/${comp.slug}` : `/components/${comp.slug}/${variantSlug(label)}`;
  };

  // Keeps the address bar deep-linkable without the remount above: a direct history
  // update, not router.replace. `replace`, not `push`, matching the router call this
  // replaces: no new history entry, so back/forward behaves exactly as before. Native
  // has no address bar to sync, so this is web-only.
  const onSelect = (i: number) => {
    setSelected(i);
    if (Platform.OS === "web") {
      window.history.replaceState(window.history.state, "", hrefFor(i));
    }
  };

  return (
    <>
      {/* Overrides the outer DocsHead in ComponentReference (nearer wins) once this
          Suspense boundary resolves, so the canonical tag tracks `selected` through
          every in-page switch instead of only being correct on a cold load. */}
      <DocsHead title={comp.name} path={hrefFor(selected)} />
      {examples.length > 0 ? (
        <Playground examples={examples} stageAlign={comp.stageAlign} singlePreview={comp.singlePreview} selected={selected} onSelect={onSelect} />
      ) : (
        <View style={{ borderRadius: 10, borderWidth: 1, borderColor: tokens.border, padding: 16 }}>
          <Text style={{ fontSize: 13, color: tokens["muted-foreground"] }}>
            No live examples for this component yet.
          </Text>
        </View>
      )}
      {propGroups && propGroups.length > 0 ? <PropTables groups={propGroups} /> : null}
      {entry && entry.donts.length > 0 ? <Donts donts={entry.donts} /> : null}
    </>
  );
}
