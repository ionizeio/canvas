import { useRef } from "react";
import { type TextInput } from "react-native";
import { Alert, Autocomplete, Badge, Card, Column, DescriptionList, Field, Form, Grid, Input, Listbox, Row, Typography } from "@nannier-com/canvas";
import { Screen } from "../app-frame/screen";
import { CITIES, WORKSTREAMS, useSession } from "../state/session";

export default function WorkspaceScreen() {
  const session = useSession();
  const nameInput = useRef<TextInput>(null);
  const draft = session.workspaceDraft;
  const save = () => {
    if (!session.saveWorkspace() && draft.name.trim().length < 2) nameInput.current?.focus();
  };
  return (
    <Screen>
      <Column tight>
        <Row snug alignCenter wrap><Typography h1>Your workspace</Typography><Badge secondary>Local session</Badge></Row>
        <Typography muted>Shape a space for your team. Changes stay in this app until you reload or reset it.</Typography>
      </Column>
      {session.workspaceNotice ? <Alert success title={session.workspaceNotice} /> : null}
      <Grid columns={session.preferencesDraft.showSummary ? 2 : 1} minTileWidth={360} loose>
        <Card>
          <Column loose>
            <Column tight>
              <Typography h2>Workspace details</Typography>
              <Typography muted>Edit the draft, then save or discard your changes.</Typography>
            </Column>
            <Form submitLabel="Save workspace" cancelLabel="Cancel changes" onSubmit={save} onCancel={session.cancelWorkspace}>
              <Field label="Workspace name" required helper="At least two characters." error={session.errors.name}>
                <Input ref={nameInput} value={draft.name} onChangeText={(name) => session.updateWorkspace({ name })} returnKeyType="done" />
              </Field>
              <Field label="Home city" required helper="Type to find a city, then choose a suggestion." error={session.errors.city}>
                <Autocomplete options={CITIES} query={session.cityQuery} onQueryChange={session.updateCityQuery} value={draft.city} onValueChange={(city) => session.updateWorkspace({ city })} />
              </Field>
              <Field label="Workstreams" helper="Choose one or more areas of work." error={session.errors.workstreams}>
                <Listbox multi bordered accessibilityLabel="Workspace workstreams" items={WORKSTREAMS} selected={draft.workstreams} onChange={(selection) => session.updateWorkspace({ workstreams: Array.isArray(selection) ? selection : [selection] })} />
              </Field>
            </Form>
          </Column>
        </Card>
        {session.preferencesDraft.showSummary ? (
          <Card>
            <Column loose>
              <Column tight><Typography h2>Saved workspace</Typography><Typography muted>This summary changes when you save.</Typography></Column>
              <DescriptionList divided items={[
                { term: "Name", value: session.workspace.name },
                { term: "Home city", value: session.workspace.city },
                { term: "Workstreams", value: session.workspace.workstreams.map((index) => WORKSTREAMS[index]!.label).join(", ") },
              ]} />
              <Typography small muted>Saved for this session only. Reloading restores the sample data.</Typography>
            </Column>
          </Card>
        ) : null}
      </Grid>
    </Screen>
  );
}
