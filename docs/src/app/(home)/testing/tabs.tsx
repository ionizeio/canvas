import { useLocalSearchParams } from "expo-router";
import { TabsBody } from "../../../../../examples/starter/smoke/fixtures/tabs";
import { Page, PageHeader } from "../../../ui/page";

export default function TabsFixture() {
  const { disabled } = useLocalSearchParams<{ disabled?: string }>();
  return (
    <Page>
      <PageHeader title="Tabs input checks" description="Inactive and disabled tabs with selection counters, plus the glass liquid selection harness: the pill Tabs, the TabBar, the Pagination and the Calendar, with drivers, a scheme switch and readouts." />
      <TabsBody key={String(disabled === "true")} disabled={disabled === "true"} />
    </Page>
  );
}
