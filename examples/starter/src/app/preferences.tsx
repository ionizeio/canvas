import { Alert, Card, Column, Form, FormSection, Grid, Listbox, Switch, Typography } from "@nannier-com/canvas";
import { Screen } from "../app-frame/screen";
import { APPEARANCES, APPEARANCE_VALUES, useSession } from "../state/session";

export default function PreferencesScreen() {
  const session = useSession();
  const draft = session.preferencesDraft;
  return (
    <Screen>
      <Column tight><Typography h1>Preferences</Typography><Typography muted>Preview changes immediately. Save keeps them for this session; Cancel restores your saved preferences.</Typography></Column>
      {session.preferencesNotice ? <Alert success title={session.preferencesNotice} /> : null}
      <Grid columns={2} minTileWidth={360} loose>
        <Card>
          <Form submitLabel="Save preferences" cancelLabel="Cancel changes" onSubmit={session.savePreferences} onCancel={session.cancelPreferences}>
            <FormSection title="Appearance" description="Choose a scheme or follow your device.">
              <Listbox bordered accessibilityLabel="Appearance" items={APPEARANCES} selected={APPEARANCE_VALUES.indexOf(draft.appearance)} onChange={(selection) => session.updatePreferences({ appearance: APPEARANCE_VALUES[typeof selection === "number" ? selection : selection[0] ?? 0]! })} />
            </FormSection>
            <Switch checked={draft.showSummary} onChange={(showSummary) => session.updatePreferences({ showSummary })} description="Display saved details beside the workspace editor.">Show workspace summary</Switch>
          </Form>
        </Card>
        <Card>
          <Column relaxed>
            <Typography h2>Made for this device</Typography>
            <Typography>Canvas uses the same component API on web, iOS, and Android. Controls use each platform's skin and native behavior.</Typography>
            <Typography muted>This starter uses system fonts and local React state. It does not create an account, send notifications, or store settings on a server.</Typography>
          </Column>
        </Card>
      </Grid>
    </Screen>
  );
}
