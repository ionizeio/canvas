import { useLocalSearchParams } from "expo-router";
import { Autocomplete, Column } from "@nannier-com/canvas";
import { Autocomplete as IosAutocomplete } from "../../../../../src/atoms/autocomplete/autocomplete.ios";
import { Autocomplete as AndroidAutocomplete } from "../../../../../src/atoms/autocomplete/autocomplete.android";
import { FormAutocompleteBody, FRUIT } from "../../../../../examples/starter/smoke/fixtures/form-autocomplete";
import { Page, PageHeader } from "../../../ui/page";

// Browser skin comparisons remain docs-only. All interaction bodies also run in
// the independent starter, where Canvas resolves through the installed package.
const PLATFORMS = [["Web", Autocomplete], ["iOS", IosAutocomplete], ["Android", AndroidAutocomplete]] as const;
export default function FormAutocompleteFixture() {
  const { scenario } = useLocalSearchParams<{ scenario?: string }>();
  return (
    <Page>
      <PageHeader title="Form and autocomplete" description="Choose a fruit with the keyboard, or type to filter the list." />
      {scenario === "targets" ? (
        <Column relaxed>
          {PLATFORMS.map(([platform, Component]) => (
            <Column snug key={platform}>
              {(["small", "default", "large"] as const).map((size) => (
                <Component key={size} label={`${platform} ${size}`}
                  small={size === "small"} large={size === "large"} options={FRUIT} />
              ))}
            </Column>
          ))}
        </Column>
      ) : <FormAutocompleteBody key={scenario ?? "default"} scenario={scenario} />}
    </Page>
  );
}
