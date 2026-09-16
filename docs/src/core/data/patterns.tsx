import { Row, Column, Card, Typography, Input, Button, CodeBlock } from "@nannier-com/canvas";
import type { PatternDoc } from "./types";

const PATTERNS: PatternDoc[] = [
  // ── Accessibility ───────────────────────────────────────
  {
    slug: "accessibility",
    name: "Accessibility",
    description: "Focus rings, keyboard navigation, ARIA attributes, and color contrast. The baseline a11y requirements every Canvas surface must meet.",
    sections: [
      {
        title: "Focus ring",
        description: "Every interactive element gets a visible focus indicator on :focus-visible. Canvas uses a 2px ring offset with the --ring token color.",
        anatomy: "Ring appears on keyboard focus only (not mouse click). Uses box-shadow, not outline, so it respects border-radius.",
        html: `<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
  <button class="btn btn-primary" style="box-shadow:0 0 0 2px var(--background),0 0 0 4px var(--ring)">Focused button</button>
  <input class="input" value="Focused input" style="max-width:200px;box-shadow:0 0 0 2px var(--background),0 0 0 4px var(--ring)">
  <a href="#" style="padding:4px 8px;border-radius:var(--radius-md,8px);box-shadow:0 0 0 2px var(--background),0 0 0 4px var(--ring);text-decoration:none;color:var(--primary);font-size:13px">Focused link</a>
</div>`,
      },
      {
        title: "Keyboard shortcuts",
        description: "Standard keyboard patterns used across Canvas components.",
        html: `<div style="display:flex;flex-direction:column;gap:0;font-size:13px">
  <div style="display:flex;padding:10px 0;border-bottom:1px solid var(--border)"><span style="width:200px;color:var(--muted-foreground)">Open command palette</span><span style="display:flex;gap:4px"><kbd class="kbd">&#8984;</kbd><kbd class="kbd">K</kbd></span></div>
  <div style="display:flex;padding:10px 0;border-bottom:1px solid var(--border)"><span style="width:200px;color:var(--muted-foreground)">Close dialog / drawer</span><span><kbd class="kbd">Esc</kbd></span></div>
  <div style="display:flex;padding:10px 0;border-bottom:1px solid var(--border)"><span style="width:200px;color:var(--muted-foreground)">Navigate list items</span><span style="display:flex;gap:4px"><kbd class="kbd">&uarr;</kbd><kbd class="kbd">&darr;</kbd></span></div>
  <div style="display:flex;padding:10px 0;border-bottom:1px solid var(--border)"><span style="width:200px;color:var(--muted-foreground)">Select / activate</span><span><kbd class="kbd">Enter</kbd></span></div>
  <div style="display:flex;padding:10px 0"><span style="width:200px;color:var(--muted-foreground)">Move focus forward</span><span><kbd class="kbd">Tab</kbd></span></div>
</div>`,
      },
      {
        title: "ARIA essentials",
        description: "Minimum ARIA attributes required on common Canvas patterns.",
        html: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">
  <div class="section-card" style="padding:16px">
    <div style="font-size:13px;font-weight:600;margin-bottom:8px">Dialog</div>
    <code style="font-size:11.5px;display:block;padding:8px;background:color-mix(in oklch, var(--muted) 30%, transparent);border-radius:var(--radius-sm,4px);line-height:1.6">role="dialog"<br>aria-modal="true"<br>aria-labelledby="title-id"</code>
  </div>
  <div class="section-card" style="padding:16px">
    <div style="font-size:13px;font-weight:600;margin-bottom:8px">Tabs</div>
    <code style="font-size:11.5px;display:block;padding:8px;background:color-mix(in oklch, var(--muted) 30%, transparent);border-radius:var(--radius-sm,4px);line-height:1.6">role="tablist"<br>role="tab" + aria-selected<br>role="tabpanel"</code>
  </div>
  <div class="section-card" style="padding:16px">
    <div style="font-size:13px;font-weight:600;margin-bottom:8px">Alert</div>
    <code style="font-size:11.5px;display:block;padding:8px;background:color-mix(in oklch, var(--muted) 30%, transparent);border-radius:var(--radius-sm,4px);line-height:1.6">role="alert"<br>aria-live="assertive"</code>
  </div>
  <div class="section-card" style="padding:16px">
    <div style="font-size:13px;font-weight:600;margin-bottom:8px">Toggle</div>
    <code style="font-size:11.5px;display:block;padding:8px;background:color-mix(in oklch, var(--muted) 30%, transparent);border-radius:var(--radius-sm,4px);line-height:1.6">role="switch"<br>aria-checked="true|false"</code>
  </div>
</div>`,
      },
      {
        title: "Cross-platform support",
        description: "Canvas components announce their role and state to assistive tech identically on iOS, Android, and the web. react-native-web does not forward accessibilityState or accessibilityValue to the DOM, so each component also carries the matching aria-* attribute (React Native maps it back to the native state). You get VoiceOver, TalkBack, and web screen-reader support from one codebase.",
        html: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">
  <div class="section-card" style="padding:16px">
    <div style="font-size:13px;font-weight:600;margin-bottom:8px">Disclosure</div>
    <div style="font-size:12px;color:var(--muted-foreground);margin-bottom:8px">Accordion, Collapsible, Dropdown, Select, Autocomplete</div>
    <code style="font-size:11.5px;display:block;padding:8px;background:color-mix(in oklch, var(--muted) 30%, transparent);border-radius:var(--radius-sm,4px);line-height:1.6">aria-expanded="true|false"<br>+ accessibilityState</code>
  </div>
  <div class="section-card" style="padding:16px">
    <div style="font-size:13px;font-weight:600;margin-bottom:8px">Selection</div>
    <div style="font-size:12px;color:var(--muted-foreground);margin-bottom:8px">Tabs, TabBar, Listbox, Select &amp; Command options, Pagination, Calendar</div>
    <code style="font-size:11.5px;display:block;padding:8px;background:color-mix(in oklch, var(--muted) 30%, transparent);border-radius:var(--radius-sm,4px);line-height:1.6">role="option" / "tab"<br>aria-selected="true|false"</code>
  </div>
  <div class="section-card" style="padding:16px">
    <div style="font-size:13px;font-weight:600;margin-bottom:8px">Checkable</div>
    <div style="font-size:12px;color:var(--muted-foreground);margin-bottom:8px">Checkbox, Switch, Radio</div>
    <code style="font-size:11.5px;display:block;padding:8px;background:color-mix(in oklch, var(--muted) 30%, transparent);border-radius:var(--radius-sm,4px);line-height:1.6">aria-checked="true|false|mixed"</code>
  </div>
  <div class="section-card" style="padding:16px">
    <div style="font-size:13px;font-weight:600;margin-bottom:8px">Value</div>
    <div style="font-size:12px;color:var(--muted-foreground);margin-bottom:8px">Slider, Progress, Stepper</div>
    <code style="font-size:11.5px;display:block;padding:8px;background:color-mix(in oklch, var(--muted) 30%, transparent);border-radius:var(--radius-sm,4px);line-height:1.6">aria-valuemin / valuemax<br>aria-valuenow</code>
  </div>
</div>`,
      },
      {
        title: "Color contrast",
        description: "Canvas tokens are designed for WCAG AA contrast (4.5:1 for normal text, 3:1 for large text). Verify contrast when customizing theme colors.",
        html: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
  <div class="section-card" style="padding:16px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="width:24px;height:24px;border-radius:4px;background:var(--foreground)"></span>
      <span style="width:24px;height:24px;border-radius:4px;background:var(--background);border:1px solid var(--border)"></span>
    </div>
    <div style="font-size:12px;font-weight:500">foreground / background</div>
    <div style="font-size:11px;color:hsl(142 71% 45%);font-weight:600;margin-top:2px">&#10003; AA pass</div>
  </div>
  <div class="section-card" style="padding:16px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="width:24px;height:24px;border-radius:4px;background:var(--muted-foreground)"></span>
      <span style="width:24px;height:24px;border-radius:4px;background:var(--background);border:1px solid var(--border)"></span>
    </div>
    <div style="font-size:12px;font-weight:500">muted-foreground / background</div>
    <div style="font-size:11px;color:hsl(142 71% 45%);font-weight:600;margin-top:2px">&#10003; AA pass</div>
  </div>
  <div class="section-card" style="padding:16px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="width:24px;height:24px;border-radius:4px;background:var(--primary)"></span>
      <span style="width:24px;height:24px;border-radius:4px;background:white;border:1px solid var(--border)"></span>
    </div>
    <div style="font-size:12px;font-weight:500">primary / white</div>
    <div style="font-size:11px;color:hsl(142 71% 45%);font-weight:600;margin-top:2px">&#10003; AA pass</div>
  </div>
</div>`,
      },
    ],
  },

  // ── Density ─────────────────────────────────────────────
  {
    slug: "density",
    name: "Density",
    description: "Density is a per-component axis of semantic boolean props: compact tightens a component's spacing, comfortable relaxes it, and omitting both gives the regular default. There is no app-wide density switch.",
    sections: [
      {
        title: "How it works",
        description: "Pass compact for tight spacing, comfortable for generous spacing, or neither for the regular default. Each component resolves its own padding and gaps from the prop; no document attribute or stylesheet changes density globally.",
        render: () => (
          <Row relaxed wrap>
            {[
              { label: "Compact", code: "compact", blurb: "Tight spacing for dense data views (tables, admin panels)" },
              { label: "Regular", code: "default", blurb: "Balanced spacing for most interfaces", selected: true },
              { label: "Comfortable", code: "comfortable", blurb: "Generous spacing for reading-heavy or touch-friendly layouts" },
            ].map((d) => (
              <Card key={d.label} grow selected={d.selected}>
                <Column alignCenter tight>
                  <Typography semibold>{d.label}</Typography>
                  <Typography mono tiny muted>{d.code}</Typography>
                  <Typography small muted>{d.blurb}</Typography>
                </Column>
              </Card>
            ))}
          </Row>
        ),
      },
      {
        title: "Live demo",
        description: "The same search toolbar rendered at each density level.",
        render: () => (
          <Column relaxed>
            {[
              { label: "Compact", density: "compact" as const, size: "small" as const },
              { label: "Regular (default)", density: "regular" as const, size: undefined },
              { label: "Comfortable", density: "comfortable" as const, size: "large" as const },
            ].map((d) => (
              <Column key={d.label} tight>
                <Typography tiny semibold muted>{d.label}</Typography>
                <Card compact={d.density === "compact"} comfortable={d.density === "comfortable"}>
                  <Row alignCenter between>
                    <Row alignCenter snug>
                      <Input
                        placeholder="Search..."
                        small={d.size === "small"}
                        large={d.size === "large"}
                      />
                      <Button
                        outline
                        small={d.size === "small"}
                        large={d.size === "large"}
                      >
                        Filter
                      </Button>
                    </Row>
                    <Typography small muted>24 results</Typography>
                  </Row>
                </Card>
              </Column>
            ))}
          </Column>
        ),
      },
      {
        title: "Extending",
        anatomy: "Give your own components the same axis: accept compact and comfortable booleans and resolve the spacing from them, the way the built-ins do. To remember a user's choice on the web, setDensity persists it and getDensity reads it back; the app then applies it by passing the matching booleans down, because no stylesheet reads the stored preference.",
        render: () => (
          <CodeBlock
            language="tsx"
            code={`// The density axis is resolved inside the component, from its booleans.
function MyRow({ compact, comfortable, children }: MyRowProps) {
  const paddingVertical = compact ? 8 : comfortable ? 16 : 12;
  return <View style={{ paddingVertical }}>{children}</View>;
}

// Persisting a preference: setDensity stores it; the APP applies it via props.
setDensity("compact");
const density = getDensity(); // "compact" | "regular" | "comfy"
<MyRow compact={density === "compact"} comfortable={density === "comfy"}>...</MyRow>;`}
          />
        ),
      },
    ],
  },

  // ── Form Validation ─────────────────────────────────────
  {
    slug: "form-validation",
    name: "Form Validation",
    description: "Touch-on-blur validation pattern with visual states (default, focused, error, success, disabled) and inline error messages.",
    sections: [
      {
        title: "States",
        description: "Each state has a distinct visual treatment. Error and success states include helper text below the field.",
        html: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
  <div>
    <label class="label">Default</label>
    <input class="input" placeholder="Enter value">
  </div>
  <div>
    <label class="label">Focused</label>
    <input class="input" placeholder="Enter value" style="border-color:var(--ring);box-shadow:0 0 0 2px color-mix(in oklch, var(--ring) 20%, transparent)">
  </div>
  <div>
    <label class="label">Error</label>
    <input class="input input-error" value="bad-email">
    <p class="field-helper field-error" style="margin-top:4px">Please enter a valid email address</p>
  </div>
  <div>
    <label class="label">Success</label>
    <input class="input" value="valid@email.com" style="border-color:hsl(142 71% 45%)">
    <p class="field-helper" style="margin-top:4px;color:hsl(142 71% 45%)">Email verified</p>
  </div>
  <div>
    <label class="label">Disabled</label>
    <input class="input" value="locked" disabled>
  </div>
</div>`,
      },
      {
        title: "Validation lifecycle",
        description: "Touch-on-blur: validate when the field loses focus (not on every keystroke). Show errors inline. Clear errors as the user corrects them.",
        anatomy: "1. User focuses field. 2. User types and leaves (blur). 3. If invalid, show error state + message. 4. On next keystroke, re-validate live until valid. 5. Show success briefly, then return to default.",
        html: `<div style="display:flex;gap:12px;flex-wrap:wrap">
  <div class="section-card" style="padding:16px;flex:1;min-width:180px;text-align:center">
    <div style="width:32px;height:32px;border-radius:50%;background:var(--muted);display:inline-flex;align-items:center;justify-content:center;margin-bottom:8px;font-size:14px;font-weight:600">1</div>
    <div style="font-size:12px;font-weight:500">Focus</div>
    <div style="font-size:11px;color:var(--muted-foreground);margin-top:2px">Ring appears</div>
  </div>
  <div class="section-card" style="padding:16px;flex:1;min-width:180px;text-align:center">
    <div style="width:32px;height:32px;border-radius:50%;background:var(--muted);display:inline-flex;align-items:center;justify-content:center;margin-bottom:8px;font-size:14px;font-weight:600">2</div>
    <div style="font-size:12px;font-weight:500">Blur</div>
    <div style="font-size:11px;color:var(--muted-foreground);margin-top:2px">Validate on leave</div>
  </div>
  <div class="section-card" style="padding:16px;flex:1;min-width:180px;text-align:center">
    <div style="width:32px;height:32px;border-radius:50%;background:color-mix(in oklch, var(--destructive) 15%, transparent);color:var(--destructive);display:inline-flex;align-items:center;justify-content:center;margin-bottom:8px;font-size:14px;font-weight:600">3</div>
    <div style="font-size:12px;font-weight:500">Error</div>
    <div style="font-size:11px;color:var(--muted-foreground);margin-top:2px">Show inline message</div>
  </div>
  <div class="section-card" style="padding:16px;flex:1;min-width:180px;text-align:center">
    <div style="width:32px;height:32px;border-radius:50%;background:hsl(142 71% 45%/0.15);color:hsl(142 71% 45%);display:inline-flex;align-items:center;justify-content:center;margin-bottom:8px;font-size:14px;font-weight:600">4</div>
    <div style="font-size:12px;font-weight:500">Corrected</div>
    <div style="font-size:11px;color:var(--muted-foreground);margin-top:2px">Clear error live</div>
  </div>
</div>`,
      },
      {
        title: "Example form",
        description: "A sign-in form demonstrating error states with inline helper text.",
        html: `<div style="max-width:380px">
  <div class="card">
    <div class="card-header">
      <h3 style="margin:0 0 4px;font-size:18px;font-weight:600">Sign in</h3>
      <p style="margin:0;font-size:13px;color:var(--muted-foreground)">Enter your credentials</p>
    </div>
    <div class="card-content" style="display:flex;flex-direction:column;gap:14px">
      <div>
        <label class="label">Email</label>
        <input class="input input-error" value="rachel@">
        <p class="field-helper field-error" style="margin-top:4px">Please enter a valid email address</p>
      </div>
      <div>
        <label class="label">Password</label>
        <input class="input" type="password" placeholder="••••••••">
      </div>
      <button class="btn btn-primary" style="width:100%">Sign in</button>
    </div>
  </div>
</div>`,
      },
      {
        title: "Production stack",
        html: `<div style="max-width:680px;padding:1rem;border-radius:8px;background:color-mix(in oklch, var(--muted) 40%, transparent);border:1px solid var(--border);font-size:12.5px;color:var(--muted-foreground);line-height:1.6"><span style="font-weight:600;color:var(--foreground)">In production:</span> use <code>react-hook-form</code> for state and <code>zod</code> via <code>@hookform/resolvers/zod</code> for validation. Canvas demonstrates the visual states; the runtime wiring is the consumer's choice.</div>`,
      },
    ],
  },

  // ── Glass Surface ───────────────────────────────────────
  {
    slug: "glass",
    name: "Glass Surface",
    description: "A translucent material for the floating shells and overlays of the functional layer, never content cards and never the menus a reader picks rows from. A theming-level surface mode: <ThemeProvider glass> forces it on, <ThemeProvider solid> forces flat, and omitting both gives the platform default (glass on iOS 26+, solid elsewhere).",
    sections: [
      {
        title: "What 'glass' means in Canvas",
        description: "Glass follows Apple's Liquid Glass model: it is a material for the FUNCTIONAL layer, the shells and overlays that float above content, never the content layer. It swaps NO semantic token: the material carries its own fill, glass-tint, and only the surfaces that opt into it take it. Popovers, dialogs, action sheets, the command palette, navbars, tab bars and the sidebar take the material (the drawer panel is opaque here, which is a tracked divergence from the hand-off rather than a rule); the option-list menus (dropdown, select, autocomplete, avatar menu), alert dialogs, toasts and chart tooltips stay opaque, and content surfaces (cards, lists, tables, calendars, charts) stay solid. The glass ones render through the shared GlassSurface primitive, which paints the platform's real material.",
        anatomy: "Toggle with the Solid / Glass switch in the topbar, or pass the boolean to the provider: <ThemeProvider glass> forces glass, <ThemeProvider solid> forces flat, and omitting both picks the platform default (glass on iOS 26+ via liquidGlassAvailable(), solid elsewhere).",
        html: `<div class="section-card" style="padding:1.25rem"><p style="margin:0;font-size:13.5px;color:var(--muted-foreground);line-height:1.6">Components never change for glass, and Canvas never hand-paints glass per component. Glass mode rewrites no semantic token at all: --popover and --card keep the same opaque values they carry in solid mode. What glass adds is the material's own fill, --glass-tint, painted by the surfaces that route through the GlassSurface primitive, which supplies the platform's own material: real Apple Liquid Glass via expo-glass-effect on iOS 26+, an SVG displacement lens on Chromium web (refraction at the rim, optically flat centre), a genuine frosted blur via expo-blur elsewhere on web and on Android, and the glass-tint fill on its own when neither optional peer is installed. Glass used to work by overriding --popover translucent, which is exactly what dragged every popover-filled surface, menus included, into the material.</p></div>`,
      },
      {
        title: "The four ingredients",
        description: "GlassSurface layers four ingredients to create the frosted-pane look.",
        html: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
  <div class="section-card" style="padding:16px;text-align:center">
    <div style="font-size:24px;margin-bottom:8px">&#x1F4A8;</div>
    <div style="font-size:13px;font-weight:600;margin-bottom:4px">Blur material</div>
    <code style="font-size:11px;color:var(--muted-foreground)">expo-glass-effect / lens / expo-blur</code>
  </div>
  <div class="section-card" style="padding:16px;text-align:center">
    <div style="font-size:24px;margin-bottom:8px">&#x1F3A8;</div>
    <div style="font-size:13px;font-weight:600;margin-bottom:4px">Translucent tint</div>
    <code style="font-size:11px;color:var(--muted-foreground)">glass-tint: rgba(255,255,255,0.20)</code>
  </div>
  <div class="section-card" style="padding:16px;text-align:center">
    <div style="font-size:24px;margin-bottom:8px">&#x2728;</div>
    <div style="font-size:13px;font-weight:600;margin-bottom:4px">The skin's shape</div>
    <code style="font-size:11px;color:var(--muted-foreground)">radius + border, fill stripped</code>
  </div>
  <div class="section-card" style="padding:16px;text-align:center">
    <div style="font-size:24px;margin-bottom:8px">&#x1F30C;</div>
    <div style="font-size:13px;font-weight:600;margin-bottom:4px">A live backdrop</div>
    <code style="font-size:11px;color:var(--muted-foreground)">content behind feeds the blur</code>
  </div>
</div>`,
      },
      {
        title: "Surface inventory",
        description: "Which surfaces take the material. Only the functional layer changes, and not all of it: a surface whose rows are read and acted on stays opaque, because a see-through card lets the page behind it read straight between those rows.",
        html: `<div style="font-size:13px">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid var(--border);border-radius:var(--radius-md,8px);overflow:hidden">
    <div style="padding:8px 12px;font-weight:600;background:color-mix(in oklch, var(--muted) 30%, transparent);border-bottom:1px solid var(--border)">Surface</div>
    <div style="padding:8px 12px;font-weight:600;background:color-mix(in oklch, var(--muted) 30%, transparent);border-bottom:1px solid var(--border)">Layer</div>
    <div style="padding:8px 12px;font-weight:600;background:color-mix(in oklch, var(--muted) 30%, transparent);border-bottom:1px solid var(--border)">In glass mode</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border)">Navbar / Tab bar / Sidebar</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Functional</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Glass, via GlassSurface</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border)">Dialog / Action sheet / Drawer</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Functional</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Glass, via GlassSurface</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border)">Popover / Command palette</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Functional</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Glass, via GlassSurface</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border)">Dropdown / Select / Autocomplete / Avatar menu</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Functional</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Opaque: keeps painting popover</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border)">Alert dialog / Toast / Chart tooltip</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Functional</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Opaque: a prompt or a status bar has to stay legible</div>
    <div style="padding:8px 12px">Card / List / Table / Calendar / Chart</div>
    <div style="padding:8px 12px;color:var(--muted-foreground)">Content</div>
    <div style="padding:8px 12px;color:var(--muted-foreground)">Stays solid</div>
  </div>
</div>`,
      },
      {
        title: "Live comparison",
        description: "An illustrative pair: the same panel drawn opaque and with a frosted material over a colorful backdrop. In the kit only functional-layer surfaces ever take the material (a real stat card stays solid); the Solid / Glass toggle in the topbar switches the whole docs shell at once.",
        html: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;border-radius:12px;padding:20px;background:radial-gradient(120% 120% at 0% 0%, hsl(262 83% 58% / 0.25), transparent 50%), radial-gradient(120% 120% at 100% 100%, hsl(190 90% 50% / 0.2), transparent 50%), var(--background)">
  <div>
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted-foreground);margin-bottom:8px">Solid</div>
    <div class="section-card" style="padding:16px;background:var(--card)"><div style="font-size:13px;font-weight:600;margin-bottom:4px">Active sessions</div><div style="font-size:22px;font-weight:700">1,204</div></div>
  </div>
  <div>
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted-foreground);margin-bottom:8px">Glass</div>
    <div style="padding:16px;border-radius:12px;backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4);background:hsl(255 100% 100% / 0.12);border:1px solid hsl(255 100% 100% / 0.25);box-shadow:inset 0 1px 0 hsl(255 100% 100% / 0.25)"><div style="font-size:13px;font-weight:600;margin-bottom:4px">Active sessions</div><div style="font-size:22px;font-weight:700">1,204</div></div>
  </div>
</div>`,
      },
      {
        title: "When NOT to use glass",
        description: "Glass works best for ambient UI. Avoid it in contexts where legibility or performance matters more than aesthetics.",
        html: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
  <div class="section-card" style="padding:16px;border-color:color-mix(in oklch, var(--destructive) 30%, transparent)">
    <div style="font-size:13px;font-weight:600;margin-bottom:4px;color:var(--destructive)">Dense data tables</div>
    <div style="font-size:12px;color:var(--muted-foreground)">Blur behind hundreds of rows tanks rendering. Use solid background for data tables.</div>
  </div>
  <div class="section-card" style="padding:16px;border-color:color-mix(in oklch, var(--destructive) 30%, transparent)">
    <div style="font-size:13px;font-weight:600;margin-bottom:4px;color:var(--destructive)">Low-end devices</div>
    <div style="font-size:12px;color:var(--muted-foreground)">backdrop-filter is GPU-intensive. Degrade to solid on devices without hardware acceleration.</div>
  </div>
  <div class="section-card" style="padding:16px;border-color:color-mix(in oklch, var(--destructive) 30%, transparent)">
    <div style="font-size:13px;font-weight:600;margin-bottom:4px;color:var(--destructive)">Print stylesheets</div>
    <div style="font-size:12px;color:var(--muted-foreground)">Glass has no meaning on paper. Reset to opaque backgrounds in @media print.</div>
  </div>
  <div class="section-card" style="padding:16px;border-color:color-mix(in oklch, var(--destructive) 30%, transparent)">
    <div style="font-size:13px;font-weight:600;margin-bottom:4px;color:var(--destructive)">Safety-critical UI</div>
    <div style="font-size:12px;color:var(--muted-foreground)">When misreading a value is dangerous (medical, financial), never rely on translucent surfaces.</div>
  </div>
</div>`,
      },
      {
        title: "Implementation",
        description: "The ThemeProvider resolves the surface: pass the glass or solid boolean (glass wins if both are set), or omit both for the platform default, reported by liquidGlassAvailable(). When glass is active the provider overrides no semantic token: it publishes the material's own glass-tint fill, and the surfaces that opted into the material render through the shared GlassSurface primitive, which paints the real material per platform over that tint. The option-list menus, alert dialogs, toasts and chart tooltips opt out and paint their opaque fill unchanged. When the OS asks for Reduce Transparency or Increase Contrast, GlassSurface renders the opaque path instead. On the web, setSurface(\"glass\") persists the choice and stamps data-surface on the root element as a broadcast hook; no shipped CSS reads that attribute, so the app reads it back with getSurface() and syncs it into its ThemeProvider, the way the docs shell does.",
        html: `<div style="max-width:680px;font-family:var(--font-mono);font-size:12px;background:color-mix(in oklch, var(--muted) 40%, transparent);border:1px solid var(--border);border-radius:8px;padding:1rem;white-space:pre;overflow:auto;color:var(--foreground)">// The surface axis is boolean, like every other Canvas axis.
&lt;ThemeProvider glass&gt;...&lt;/ThemeProvider&gt;  // force the material on the glass surfaces
&lt;ThemeProvider solid&gt;...&lt;/ThemeProvider&gt;  // force flat
&lt;ThemeProvider&gt;...&lt;/ThemeProvider&gt;  // default: glass on iOS 26+, solid elsewhere

// Web persistence: store the choice, then sync it into the provider.
setSurface("glass"); // persists + stamps data-surface (no CSS reads it)
const surface = getSurface();
&lt;ThemeProvider glass={surface === "glass"} solid={surface === "solid"}&gt;</div>`,
      },
    ],
  },

  // ── Loading ─────────────────────────────────────────────
  {
    slug: "loading",
    name: "Loading",
    description: "Three loading strategies: skeleton (predictable layout, >300ms), spinner (indeterminate, <300ms), and progressive disclosure (keep parent usable).",
    sections: [
      {
        title: "Choose by intent",
        description: "Pick the right loading pattern based on what the user is waiting for and how long they'll wait.",
        html: `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
  <div class="section-card" style="padding:16px">
    <div style="font-size:13px;font-weight:600;margin-bottom:4px">Skeleton</div>
    <div style="font-size:12px;color:var(--muted-foreground);margin-bottom:12px">Layout is predictable. Feels faster because shape is visible immediately.</div>
    <div style="font-size:11px;padding:4px 8px;border-radius:var(--radius-sm,4px);background:color-mix(in oklch, var(--primary) 10%, transparent);color:var(--primary);display:inline-block">Best for: page loads, lists</div>
  </div>
  <div class="section-card" style="padding:16px">
    <div style="font-size:13px;font-weight:600;margin-bottom:4px">Spinner</div>
    <div style="font-size:12px;color:var(--muted-foreground);margin-bottom:12px">Indeterminate. Good for short waits where content shape is unknown.</div>
    <div style="font-size:11px;padding:4px 8px;border-radius:var(--radius-sm,4px);background:hsl(38 92% 50%/0.1);color:hsl(38 92% 50%);display:inline-block">Best for: button actions, saves</div>
  </div>
  <div class="section-card" style="padding:16px">
    <div style="font-size:13px;font-weight:600;margin-bottom:4px">Progressive</div>
    <div style="font-size:12px;color:var(--muted-foreground);margin-bottom:12px">Show what you have, load the rest. Keeps parent interactive.</div>
    <div style="font-size:11px;padding:4px 8px;border-radius:var(--radius-sm,4px);background:hsl(142 71% 45%/0.1);color:hsl(142 71% 45%);display:inline-block">Best for: dashboards, feeds</div>
  </div>
</div>`,
      },
      {
        title: "Spinner in button",
        description: "Replace button label with spinner during async actions. Disable the button to prevent double submission.",
        html: `<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
  <button class="btn btn-primary" disabled style="display:inline-flex;align-items:center;gap:8px">
    <span class="spinner" style="width:14px;height:14px"></span> Saving...
  </button>
  <button class="btn btn-outline" disabled style="display:inline-flex;align-items:center;gap:8px">
    <span class="spinner" style="width:14px;height:14px"></span> Loading
  </button>
  <button class="btn btn-destructive" disabled style="display:inline-flex;align-items:center;gap:8px">
    <span class="spinner" style="width:14px;height:14px"></span> Deleting...
  </button>
</div>`,
      },
      {
        title: "Skeleton row",
        description: "Animated placeholder rows that match the shape of the content being loaded.",
        html: `<div class="section-card" style="padding:0;overflow:hidden">
  <div style="display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border)">
      <div class="skeleton" style="width:32px;height:32px;border-radius:50%"></div>
      <div style="flex:1"><div class="skeleton" style="width:60%;height:12px;border-radius:4px;margin-bottom:6px"></div><div class="skeleton" style="width:40%;height:10px;border-radius:4px"></div></div>
      <div class="skeleton" style="width:60px;height:10px;border-radius:4px"></div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border)">
      <div class="skeleton" style="width:32px;height:32px;border-radius:50%"></div>
      <div style="flex:1"><div class="skeleton" style="width:50%;height:12px;border-radius:4px;margin-bottom:6px"></div><div class="skeleton" style="width:35%;height:10px;border-radius:4px"></div></div>
      <div class="skeleton" style="width:48px;height:10px;border-radius:4px"></div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px">
      <div class="skeleton" style="width:32px;height:32px;border-radius:50%"></div>
      <div style="flex:1"><div class="skeleton" style="width:70%;height:12px;border-radius:4px;margin-bottom:6px"></div><div class="skeleton" style="width:45%;height:10px;border-radius:4px"></div></div>
      <div class="skeleton" style="width:54px;height:10px;border-radius:4px"></div>
    </div>
  </div>
</div>`,
      },
      {
        title: "Inline progress bar",
        description: "Determinate progress for file uploads, multi-step processes, or batch operations.",
        html: `<div style="max-width:400px">
  <div class="section-card" style="padding:16px">
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">
      <span style="font-weight:500">Uploading report.pdf</span>
      <span style="color:var(--muted-foreground)">68%</span>
    </div>
    <div style="height:6px;border-radius:9999px;background:var(--muted);overflow:hidden">
      <div style="width:68%;height:100%;border-radius:9999px;background:var(--primary);transition:width 300ms"></div>
    </div>
    <div style="font-size:11px;color:var(--muted-foreground);margin-top:6px">2.4 MB of 3.5 MB</div>
  </div>
</div>`,
      },
    ],
  },

  // ── Responsive ──────────────────────────────────────────
  {
    slug: "responsive",
    name: "Responsive",
    description: "The desktop-first responsive system: three mechanisms (intrinsic caps, container measurement, viewport breakpoints), a phone/tablet/desktop form-factor tier, and the Grid and Row-stacks layout primitives.",
    sections: [
      {
        title: "Breakpoints",
        description: "Canvas is desktop-first. The base value is the desktop case; a breakpoint entry (sm, md, lg, xl, 2xl) applies at that width and below. useResponsive resolves a value map, useBreakpoint returns the active bucket, and useFormFactor collapses it to phone / tablet / desktop (phone at or below sm, tablet at or below lg, desktop above; macOS and desktop web are the desktop form factor). An unknown viewport (SSR, the pre-layout first frame) resolves to base, the desktop variant; SSR apps that know better pass ThemeProvider's ssrBreakpoint.",
        html: `<div style="font-size:13px">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid var(--border);border-radius:var(--radius-md,8px);overflow:hidden">
    <div style="padding:8px 12px;font-weight:600;background:color-mix(in oklch, var(--muted) 30%, transparent);border-bottom:1px solid var(--border)">Name</div>
    <div style="padding:8px 12px;font-weight:600;background:color-mix(in oklch, var(--muted) 30%, transparent);border-bottom:1px solid var(--border)">Applies at</div>
    <div style="padding:8px 12px;font-weight:600;background:color-mix(in oklch, var(--muted) 30%, transparent);border-bottom:1px solid var(--border)">Typical use</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);font-weight:500">base</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:12px">default</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">The desktop base; the widest layouts, where the side table-of-contents shows</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);font-weight:500">2xl</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:12px">&#8804; 1536px</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Large monitors</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);font-weight:500">xl</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:12px">&#8804; 1280px</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Desktops</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);font-weight:500">lg</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:12px">&#8804; 1024px</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Small laptops; the sidebar collapses to a drawer at lg and below</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);font-weight:500">md</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:12px">&#8804; 768px</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Tablets</div>
    <div style="padding:8px 12px;font-weight:500">sm</div>
    <div style="padding:8px 12px;font-family:var(--font-mono);font-size:12px">&#8804; 640px</div>
    <div style="padding:8px 12px;color:var(--muted-foreground)">Phones</div>
  </div>
  <p style="margin:12px 0 0;font-size:12.5px;color:var(--muted-foreground);line-height:1.6">A breakpoint is active when the viewport is at its width or narrower, so several match at once on a small screen. The smallest matching breakpoint wins: at 700px wide, md applies (sm at 640px does not match yet), and sm takes over at 640px and below.</p>
</div>`,
      },
      {
        title: "Choosing a mechanism",
        description: "Three official layers, in order of preference. Rule of thumb: viewport for the shell, container for the components, intrinsic wherever possible.",
        html: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0.75rem">
  <div class="section-card" style="padding:1rem"><div style="font-size:14px;font-weight:600;margin-bottom:4px">1. Intrinsic sizing</div><div style="font-size:12.5px;color:var(--muted-foreground);line-height:1.5">A fixed desktop width plus maxWidth 100% (fields, dialogs, chart roots), or minWidth floors plus wrapping (Stats). Zero JS, correct in any container, correct on the server. Never swap a fixed width for width 100% below a threshold: in a content-sized parent that makes the element track its own content.</div></div>
  <div class="section-card" style="padding:1rem"><div style="font-size:14px;font-weight:600;margin-bottom:4px">2. Container measurement</div><div style="font-size:12.5px;color:var(--muted-foreground);line-height:1.5">A component that switches layout measures its OWN width (useContainerBreakpoint, useMeasuredWidth), never the window: it cannot know whether it is on a phone or in a 320px desktop panel. DataTable, Grid, Row stacks, the Navbar collapse, and Form's two-column stack all work this way.</div></div>
  <div class="section-card" style="padding:1rem"><div style="font-size:14px;font-weight:600;margin-bottom:4px">3. Viewport breakpoints</div><div style="font-size:12.5px;color:var(--muted-foreground);line-height:1.5">Only window-level chrome reads the viewport (useBreakpoint, useFormFactor, useResponsive): the Sidebar's drawer mode, the FilterPanel's drawer, app shells. If the component could plausibly sit inside a column, it is not window-level chrome.</div></div>
  <div class="section-card" style="padding:1rem"><div style="font-size:14px;font-weight:600;margin-bottom:4px">Pointer capability</div><div style="font-size:12.5px;color:var(--muted-foreground);line-height:1.5">usePointerCoarse and useHoverCapable expose the input class: touch-first constants on native, live media queries on the web, desktop-first on the server. The desktop form factor is a size AND an input class.</div></div>
</div>`,
      },
      {
        title: "Sidebar - drawer ↔ fixed",
        description: "The kit Sidebar's `responsive` prop does this: a fixed accordion rail on the desktop base, and at lg (1024px) and below a start-edge drill-down drawer opened by the hamburger button. Above lg, the fixed panel stays.",
        html: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
  <div class="section-card" style="padding:16px">
    <div style="font-size:13px;font-weight:600;margin-bottom:8px">lg and below (drawer)</div>
    <div style="display:flex;gap:0;border:1px solid var(--border);border-radius:var(--radius-md,8px);overflow:hidden;height:120px">
      <div style="flex:1;padding:8px;font-size:11px;display:flex;align-items:start">
        <div style="width:24px;height:24px;border-radius:4px;background:var(--muted);display:inline-flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer">&#9776;</div>
        <span style="margin-left:8px;color:var(--muted-foreground)">Full-width content</span>
      </div>
    </div>
    <div style="font-size:11px;color:var(--muted-foreground);margin-top:6px">Sidebar hidden. Hamburger opens drawer overlay.</div>
  </div>
  <div class="section-card" style="padding:16px">
    <div style="font-size:13px;font-weight:600;margin-bottom:8px">Above lg (fixed)</div>
    <div style="display:flex;gap:0;border:1px solid var(--border);border-radius:var(--radius-md,8px);overflow:hidden;height:120px">
      <div style="width:48px;background:var(--card);border-right:1px solid var(--border);padding:6px;font-size:9px;color:var(--muted-foreground)">Nav</div>
      <div style="flex:1;padding:8px;font-size:11px;color:var(--muted-foreground)">Main content area</div>
    </div>
    <div style="font-size:11px;color:var(--muted-foreground);margin-top:6px">Sidebar fixed. Collapsible via toggle.</div>
  </div>
</div>`,
      },
      {
        title: "Layout primitives: Grid and Row stacks",
        description: "Equal-width tiles belong to Grid: minTileWidth sets the floor (default 240), columns caps the desktop count, and the measured container decides how many fit, exactly like the auto-fit demo below. Content-sized rows that should stack at narrow widths belong to Row stacks (a toolbar, a label beside its actions); when stacked, the Row is the Column with the same props.",
        html: `<div style="display:flex;flex-direction:column;gap:16px">
  <div>
    <div style="font-size:12px;font-weight:600;margin-bottom:6px">Grid minTileWidth={140}: as many tiles as fit</div>
    <div style="display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
      <div class="section-card" style="padding:10px;text-align:center;font-size:12px">Tile</div>
      <div class="section-card" style="padding:10px;text-align:center;font-size:12px">Tile</div>
      <div class="section-card" style="padding:10px;text-align:center;font-size:12px">Tile</div>
      <div class="section-card" style="padding:10px;text-align:center;font-size:12px">Tile</div>
    </div>
  </div>
  <div>
    <div style="font-size:12px;font-weight:600;margin-bottom:6px">GridItem wide: a hero tile spanning two cells</div>
    <div style="display:grid;gap:8px;grid-template-columns:repeat(3,1fr)">
      <div class="section-card" style="padding:10px;font-size:12px;grid-column:span 2">Wide tile</div>
      <div class="section-card" style="padding:10px;text-align:center;font-size:12px">Tile</div>
    </div>
  </div>
  <div>
    <div style="font-size:12px;font-weight:600;margin-bottom:6px">Row stacks: a toolbar that becomes a column in narrow containers</div>
    <div style="display:flex;gap:8px;justify-content:space-between;align-items:center">
      <div class="section-card" style="padding:8px 12px;font-size:12px;flex:1">Search runs&#8230;</div>
      <div class="section-card" style="padding:8px 12px;font-size:12px">Filter</div>
      <div class="section-card" style="padding:8px 12px;font-size:12px">New run</div>
    </div>
  </div>
</div>`,
      },
      {
        title: "What's behind the scenes",
        description: "Specific responsive treatments worth noting beyond just stacking grids.",
        html: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0.75rem">
  <div class="section-card" style="padding:1rem"><div style="font-size:14px;font-weight:600;margin-bottom:4px">DataTable: pan or collapse</div><div style="font-size:12.5px;color:var(--muted-foreground);line-height:1.5">The table measures its own container. Below sm, web and Android pan the columns in a horizontal scroller with readable minimums; iOS collapses to the primary column, the SwiftUI compact-width treatment. The 320px floor drops once a narrower container is measured.</div></div>
  <div class="section-card" style="padding:1rem"><div style="font-size:14px;font-weight:600;margin-bottom:4px">Navbar: automatic menu</div><div style="font-size:12.5px;color:var(--muted-foreground);line-height:1.5">At and below sm container width, the links row swaps for a menu button opening the platform dropdown, with the active link checkmarked. No prop: links never clip off a phone screen.</div></div>
  <div class="section-card" style="padding:1rem"><div style="font-size:14px;font-weight:600;margin-bottom:4px">Overlays: outlet clamp</div><div style="font-size:12.5px;color:var(--muted-foreground);line-height:1.5">Anchored cards (popovers, the calendar peek) clamp both their position and their width inside the overlay outlet, so a fixed-width card fits a phone-width screen instead of running off it.</div></div>
  <div class="section-card" style="padding:1rem"><div style="font-size:14px;font-weight:600;margin-bottom:4px">Calendar: fluid month cells</div><div style="font-size:12.5px;color:var(--muted-foreground);line-height:1.5">The month grid is seven fixed cells; in a container narrower than the natural grid, the cell shrinks toward a 32px floor so the month fits a 320pt phone with no breakpoint.</div></div>
  <div class="section-card" style="padding:1rem"><div style="font-size:14px;font-weight:600;margin-bottom:4px">Density is orthogonal</div><div style="font-size:12.5px;color:var(--muted-foreground);line-height:1.5">The compact and comfortable booleans are per-component and independent of the viewport, so a dense surface keeps its tight padding at every width.</div></div>
  <div class="section-card" style="padding:1rem"><div style="font-size:14px;font-weight:600;margin-bottom:4px">Opt-in narrow modes</div><div style="font-size:12.5px;color:var(--muted-foreground);line-height:1.5">Sidebar responsive becomes a drill-down drawer, FilterPanel responsive becomes a Filters button opening a drawer, Steps stacks goes vertical, and vertical Tabs responsive flattens to the underline bar.</div></div>
</div>`,
      },
      {
        title: "Try it yourself",
        html: `<div style="max-width:680px;padding:1rem;border-radius:8px;background:color-mix(in oklch, var(--muted) 40%, transparent);border:1px solid var(--border);font-size:12.5px;color:var(--muted-foreground);line-height:1.6">Resize this browser window. Watch the sidebar collapse into a drawer, the page header stack, and the grids reflow. The same patterns apply across every page in the system.</div>`,
      },
    ],
  },
];

export function getPattern(slug: string): PatternDoc | undefined {
  return PATTERNS.find((p) => p.slug === slug);
}

export function getAllPatterns(): PatternDoc[] {
  return PATTERNS;
}
