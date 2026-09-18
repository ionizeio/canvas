import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, useTheme } from "@ionizeio/canvas";
import { getComponent } from "../core/data/components";
import { COMPONENT_DOCS } from "../core/registry";
import { COMPONENT_PROPS } from "../core/props";
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
  const router = useRouter();

  const comp = slug ? getComponent(slug) : undefined;
  if (!comp) return <Redirect href="/components" />;

  const key = comp.dir ?? comp.slug;
  const entry = COMPONENT_DOCS[key];
  const propGroups = COMPONENT_PROPS[key];
  const examples = entry?.examples ?? [];

  // Map the URL variant to an example index. Index 0 is the default, reached by the bare
  // URL, so a variant segment that resolves to it (the literal "default", or anything that
  // matches no example) is redundant and canonicalizes to the bare path.
  const variantIdx = variant ? examples.findIndex((e) => variantSlug(e.label) === variant) : 0;
  if (variant !== undefined && variantIdx <= 0) {
    return <Redirect href={`/components/${comp.slug}`} />;
  }
  const selected = variantIdx < 0 ? 0 : variantIdx;

  // Selecting an example rewrites the URL so the view is deep-linkable. `replace`, not
  // `push`: switching variants filters the same page rather than opening a new destination,
  // and the default example drops the segment to stay canonical.
  const onSelect = (i: number) => {
    const label = examples[i]?.label;
    const href = i <= 0 || !label ? `/components/${comp.slug}` : `/components/${comp.slug}/${variantSlug(label)}`;
    router.replace(href as never);
  };

  return (
    <Page>
      <DocsHead title={comp.name} />
      {/* Component pages use a larger title (28/700) than the generic page header. */}
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" aria-level={1} style={{ fontFamily: sans("700"), fontSize: 28, letterSpacing: -0.42, color: tokens.foreground }}>{comp.name}</Text>
        <Lead>{stripHtml(comp.description)}</Lead>
      </View>
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
      <PageNav />
    </Page>
  );
}
