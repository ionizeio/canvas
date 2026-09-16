import { Alert, Card, CodeBlock, Column, Grid, Typography } from "@ionizeio/canvas";
import { Page, PageHeader } from "../../../ui/page";
import { Section } from "../../../ui/section";
import { H3 } from "../../../ui/prose";
import { PageNav } from "../../../ui/page-nav";

const FEATURES = [
  { title: "A working workspace", description: "Edit a workspace name, choose a city with Autocomplete, and select workstreams. Save updates the summary; validation explains missing values." },
  { title: "Preferences you can try", description: "Switch between system, light, and dark appearance, and control the saved-summary panel. Preview immediately, then save or cancel." },
  { title: "Universal navigation", description: "A Canvas Navbar adapts to smaller screens. A native Drawer hosts its own navigation dropdown, with safe-area and overlay providers in place." },
];

export default function BoilerplateScreen() {
  return (
    <Page>
      <Column loose>
        <PageHeader title="Boilerplate" description="A runnable Expo starter for web, iOS, and Android, built with the published Canvas package." />
        <Alert info title="An independent consumer" description="The starter has its own package.json and lockfile. Expo resolves the installed Canvas package normally, without docs aliases or a source overlay." />

        <Section title="Clone and run">
          <Typography>With access to the repository, install and run the starter from its own directory.</Typography>
          <CodeBlock copy language="sh" code={[
            "git clone https://github.com/ionizeio/canvas.git",
            "cd canvas/examples/starter",
            "bun install --frozen-lockfile",
            "bun run web",
          ].join("\n")} />
          <Typography muted>The terminal prints the web development URL. For a native app, install the matching platform toolchain and boot a simulator or emulator, then run the appropriate command.</Typography>
          <CodeBlock copy language="sh" code={["bun run ios", "# or", "bun run android"].join("\n")} />
          <Typography muted>Native builds require compatible Xcode and CocoaPods on macOS, or the Android SDK and a supported JDK. The starter README contains setup and verification details.</Typography>
        </Section>

        <Section title="Included flows">
          <Grid columns={3} minTileWidth={240} relaxed>
            {FEATURES.map((feature) => (
              <Card key={feature.title}>
                <Column snug>
                  <H3>{feature.title}</H3>
                  <Typography muted>{feature.description}</Typography>
                </Column>
              </Card>
            ))}
          </Grid>
          <Typography>All changes live in React memory. Saving keeps them for the current session; reloading or choosing Reset session restores the sample data. There is no backend or account to configure.</Typography>
        </Section>

        <Section title="Verify your changes">
          <CodeBlock copy language="sh" code={["bun run typecheck", "bun run build:web"].join("\n")} />
          <Typography muted>The production web export is written to dist/. Configure an SPA fallback to index.html when hosting it so direct visits to /preferences resolve correctly.</Typography>
        </Section>

        <Section title="Make it your app">
          <Typography>Start with src/app/index.tsx and preferences.tsx. The root layout supplies SafeAreaProvider, ThemeProvider, overlay hosting and the navigation stack; src/state/session.tsx owns immutable drafts, validation and saved values.</Typography>
          <Typography muted>The UI uses Canvas components and semantic props. Typography follows Canvas's default platform/system fonts. No custom Geist assets are loaded, and Text is not globally modified.</Typography>
          <Typography>For an existing application, install Canvas and its required peers in that app instead. The starter's SDK57 dependencies are a complete Expo application baseline, not a dependency migration recipe.</Typography>
          <CodeBlock copy language="sh" code="npm install @ionizeio/canvas react react-native react-native-svg" />
          <Typography muted>The npm package carries its own MIT license. This repository and the starter source remain all rights reserved; the example adds no source license grant.</Typography>
        </Section>
        <PageNav />
      </Column>
    </Page>
  );
}
