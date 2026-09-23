import { Row, Column, Card, Typography, Input, Button, CodeBlock } from "@ionizeio/canvas";
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
        description: "Every interactive element gets a visible focus indicator on keyboard focus. The kit's Pressable colours the browser's own ring with the palette's ring token, 2px off the control; a field paints its own ring-coloured border instead, and a full-bleed row draws the ring just inside itself so its container cannot clip it.",
        anatomy: "The ring appears on keyboard focus only (the browser's :focus-visible), never on a mouse click, and follows the control's border-radius. Chromium paints it in the ring colour; Firefox and Safari keep their own ring colour unless the page loads the CSS hand-off, whose :focus-visible rule draws a solid 2px ring in --ring everywhere.",
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
    description: "A theme-level material preference selected by surface role and context: stable frost for reading/content panes, Liquid Glass for eligible functional surfaces, and inherited treatment for unfilled anatomy. <ThemeProvider glass> requests glass, <ThemeProvider solid> selects complete opaque appearance, and omitting both uses the platform default (glass on supported iOS 26+, solid elsewhere).",
    sections: [
      {
        title: "What 'glass' means in Canvas",
        description: "Material, density, and motion are separate decisions. Reading panes, field wells, passive badges, and chart frames use stable frost. Functional floating shells and controls can use Liquid Glass where supported, with native feedback first. Labels, images, chart marks, layout wrappers, and unfilled variants inherit their host instead of gaining a pane. Shared GlassSurface and GlassPane rendering supplies the material; glass-tint, glass-tint-content, glass-tint-control, and glass-tint-dense control coverage without replacing semantic colors. A dense menu can remain Liquid Glass while keeping its rows legible. A liquid material names the surface, never a motion: nothing deforms, travels or springs.",
        anatomy: "Toggle with the Solid / Glass switch in the topbar, or pass the boolean to the provider: <ThemeProvider glass> forces glass, <ThemeProvider solid> forces flat, and omitting both picks the platform default (glass on iOS 26+ via liquidGlassAvailable(), solid elsewhere).",
        html: `<div class="section-card" style="padding:1.25rem"><p style="margin:0;font-size:13.5px;color:var(--muted-foreground);line-height:1.6">Component APIs stay the same, and shared rendering owns the material. The --popover and --card tokens remain opaque. Eligible functional surfaces can use Apple Liquid Glass via expo-glass-effect on supported iOS 26+ or a browser lens where supported; stable content panes use frost. Browser frost is built in. Native frost uses available native support, including optional @ionizeio/canvas-blur on Android 12+ with a safe live target, or supported expo-blur paths. Missing or unsafe material restores the complete solid skin, never an unsupported translucent tint alone. Reduce Transparency, Increase Contrast, and print use opaque treatment. Focus, values, open state, and scrolling survive changes in either direction; solid appearance creates no material capture demand.</p></div>`,
      },
      {
        title: "The four ingredients",
        description: "Supported material combines a live backdrop, readable tint, and the platform skin's shape. The renderer keeps crisp content above it and restores the full solid skin when material is unavailable.",
        html: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
  <div class="section-card" style="padding:16px;text-align:center">
    <div style="font-size:24px;margin-bottom:8px">&#x1F4A8;</div>
    <div style="font-size:13px;font-weight:600;margin-bottom:4px">Blur material</div>
    <code style="font-size:11px;color:var(--muted-foreground)">native Liquid Glass / browser lens / native or browser frost</code>
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
        description: "Representative surfaced roles and tint density. The component variant and surrounding context determine whether a pane exists. Reading content remains still, functional surfaces use supported liquid material, and unfilled variants inherit. Density does not select motion.",
        html: `<div style="font-size:13px">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid var(--border);border-radius:var(--radius-md,8px);overflow:hidden">
    <div style="padding:8px 12px;font-weight:600;background:color-mix(in oklch, var(--muted) 30%, transparent);border-bottom:1px solid var(--border)">Surface</div>
    <div style="padding:8px 12px;font-weight:600;background:color-mix(in oklch, var(--muted) 30%, transparent);border-bottom:1px solid var(--border)">Layer</div>
    <div style="padding:8px 12px;font-weight:600;background:color-mix(in oklch, var(--muted) 30%, transparent);border-bottom:1px solid var(--border)">In glass mode</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border)">Floating Navbar / Tab bar / Sidebar</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Functional</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Functional glass; complete solid fallback</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border)">Dialog / Action sheet / Drawer</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Functional</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Functional glass; complete solid fallback</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border)">Popover / Command palette</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Functional</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Functional glass; complete solid fallback</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border)">Dropdown / Select / Autocomplete / Row menu / Avatar menu</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Dense</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Glass under the densest tint (glass-tint-dense)</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border)">Alert dialog / Toast / Tooltip / Chart flag</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Dense</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Glass under the densest tint; the inverse ones (tooltip, M3 snackbar) tint with the ink</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border)">Card / List / Table / Calendar / Chart / Alert</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Content</div>
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted-foreground)">Static frost under glass-tint-content; chart and text ink stay crisp</div>
    <div style="padding:8px 12px">Field / Button / Tabs / Chip / Badge / Switch / Checkbox</div>
    <div style="padding:8px 12px;color:var(--muted-foreground)">Control</div>
    <div style="padding:8px 12px;color:var(--muted-foreground)">Static for reading; liquid for controls; unfilled variants inherit</div>
  </div>
</div>`,
      },
      {
        title: "Live comparison",
        description: "An illustrative pair: the same panel drawn opaque and with a frosted material over a colorful backdrop. In the kit a real stat card takes the content layer's denser tint; the Solid / Glass toggle in the topbar switches the whole docs shell at once.",
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
        description: "Use the complete solid appearance when the material cannot preserve readability, performance, or accessibility. A static content frame is appropriate only when its content remains clear.",
        html: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
  <div class="section-card" style="padding:16px;border-color:color-mix(in oklch, var(--destructive) 30%, transparent)">
    <div style="font-size:13px;font-weight:600;margin-bottom:4px;color:var(--destructive)">Dense data tables</div>
    <div style="font-size:12px;color:var(--muted-foreground)">Share one static frame instead of blurring every row. Verify dense text over moving content and choose solid when readability or performance fails.</div>
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
        description: "ThemeProvider carries the preference: pass glass or solid (glass wins if both are set), or omit both for the platform default reported by liquidGlassAvailable(). Shared rendering selects a supported material for each surfaced role, with complete opaque fallback when accessibility or capability requires it. Material changes preserve interaction state and native host identity. On the web, setSurface(\"glass\") persists the choice and sets data-surface for the CSS handoff's material mode and page backdrop. Also pass the choice from getSurface() to ThemeProvider so React Native components follow it. CSS variables do not style native components.",
        html: `<div style="max-width:680px;font-family:var(--font-mono);font-size:12px;background:color-mix(in oklch, var(--muted) 40%, transparent);border:1px solid var(--border);border-radius:8px;padding:1rem;white-space:pre;overflow:auto;color:var(--foreground)">// The surface axis is boolean, like every other Canvas axis.
&lt;ThemeProvider glass&gt;...&lt;/ThemeProvider&gt;  // force the material on the glass surfaces
&lt;ThemeProvider solid&gt;...&lt;/ThemeProvider&gt;  // force flat
&lt;ThemeProvider&gt;...&lt;/ThemeProvider&gt;  // default: glass on iOS 26+, solid elsewhere

// Web persistence: store the choice, then sync it into the provider.
setSurface("glass"); // persists + updates the CSS handoff attribute
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
    description: "The desktop-first responsive system: the parent provides the bounds (FILL and HUG components, Container steps, Row spans, Grid tiles), then three mechanisms (intrinsic sizing, container measurement, viewport breakpoints), a phone/tablet/desktop form-factor tier, and the Row-stacks primitive.",
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
        title: "The parent provides the bounds",
        description: "A component never dictates its own width. It is FILL (a field, a card, a table, a chart: width 100% plus flexShrink so it fills a Column and shares a Row) or HUG (a button, a badge, a chip: its content's width), and the nearest layout container provides the bounds from one width scale. Container conforms to its parent by default and caps at a named step (xxxs 192 through page 1280) when asked; a Row child's span is its width in twelfths; Grid fits equal tiles. The fields, Field, Form, Button, and ButtonGroup can also name a step of their own (the measure axis: xs, lg, start), which is that same cap moved onto the component. That is Bootstrap's contract in React Native terms, and the reason no component takes a width or maxWidth in its style.",
        html: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0.75rem">
  <div class="section-card" style="padding:1rem"><div style="font-size:14px;font-weight:600;margin-bottom:4px">FILL</div><div style="font-size:12.5px;color:var(--muted-foreground);line-height:1.5">Input, Select, Textarea, Card, Alert, DataTable, every chart: width 100% with the row-sharing pair. Fills a Column, takes the remainder beside a hugging Button in a Row, splits a Row equally with another fill sibling, takes its own line in a wrap Row.</div></div>
  <div class="section-card" style="padding:1rem"><div style="font-size:14px;font-weight:600;margin-bottom:4px">HUG</div><div style="font-size:12.5px;color:var(--muted-foreground);line-height:1.5">Button, Badge, Chip, Kbd, ButtonGroup: the content's own width, resolved against the nearest kit container so a hug component keeps its width inside a stretching Column and stays centered in a Row. block turns a Button or ButtonGroup into FILL, and a measure step (md, lg) makes it FILL up to that width.</div></div>
  <div class="section-card" style="padding:1rem"><div style="font-size:14px;font-weight:600;margin-bottom:4px">Container steps</div><div style="font-size:12.5px;color:var(--muted-foreground);line-height:1.5">One width scale, Tailwind's max-w ladder copied by hand: xxxs 192, xxs 256, xs 320, sm 384, md 448, lg 512, xl 576, xxl 672, xxxl 768, wide 896, wider 1024, widest 1152, page 1280. Container conforms to its parent by default (full width, no cap); a step caps and centers it, start pins the leading edge. The measure axis puts the same steps on Input, Textarea, Select, Autocomplete, Listbox, Slider, Progress, Field, Form, Button, and ButtonGroup: a step is FILL capped at that width (fluid below it), centered unless start pins it, the cap alone inside a Row.</div></div>
  <div class="section-card" style="padding:1rem"><div style="font-size:14px;font-weight:600;margin-bottom:4px">Row spans and Grid</div><div style="font-size:12.5px;color:var(--muted-foreground);line-height:1.5">A Row child's span is twelfths of the Row, measured into px cells with the gaps in the arithmetic; stacks ignores spans once stacked (col-12 col-md-6 without a second prop). A bare Column inside a Row hugs its content (col-auto), the toolbar cell for a Select. Grid fits equal-width, equal-height tiles.</div></div>
</div>`,
      },
      {
        title: "Choosing a mechanism",
        description: "Three official layers, in order of preference. Rule of thumb: viewport for the shell, container for the components, intrinsic wherever possible.",
        html: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0.75rem">
  <div class="section-card" style="padding:1rem"><div style="font-size:14px;font-weight:600;margin-bottom:4px">1. Intrinsic sizing</div><div style="font-size:12.5px;color:var(--muted-foreground);line-height:1.5">A component is FILL or HUG and the parent provides the bounds: a Container step, a Row span, a Grid cell; plus minWidth floors with wrapping (Stats). Zero JS, correct in any definite container, correct on the server. Never give a component root a fixed width, and never make a parent content-sized where a fill child must resolve: in such a parent the child tracks its own content.</div></div>
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
