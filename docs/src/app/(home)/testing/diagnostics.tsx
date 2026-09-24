import { version as reactVersion } from "react";
import { NativeModules, Platform } from "react-native";
import Constants from "expo-constants";
import { Column, Typography } from "@ionizeio/canvas";
import { readUpdateIdentity } from "../../../core/update-identity";
import { Page, PageHeader } from "../../../ui/page";

// Deliberately absent from normal navigation. These are the running bundle's
// values, not the npm registry badge or metadata fetched from a separate server.
export default function DiagnosticsFixture() {
  const build = Constants.expoConfig?.extra?.canvasBuild as Record<string, unknown> | undefined;
  const native = Platform.constants as { reactNativeVersion?: { major: number; minor: number; patch: number } } | undefined;
  const rn = native?.reactNativeVersion;
  const sourceCode = NativeModules.SourceCode;
  const bundleURL = sourceCode?.getConstants?.()?.scriptURL ?? sourceCode?.scriptURL;
  const updates = readUpdateIdentity();
  const values: Record<string, unknown> = {
    "input-mode": build?.inputMode,
    "source-revision": build?.sourceRevision,
    "candidate-revision": build?.candidateRevision,
    "source-dirty": build?.sourceDirty,
    "source-fingerprint": build?.sourceFingerprint,
    "package-version": build?.packageVersion,
    "react-version": reactVersion,
    "react-native-version": rn ? `${rn.major}.${rn.minor}.${rn.patch}` : "web",
    platform: Platform.OS,
    "app-version": Constants.nativeAppVersion ?? Constants.expoConfig?.version,
    "app-build": Constants.nativeBuildVersion,
    "bundle-url": bundleURL ?? (Platform.OS === "web" ? "web export" : "unavailable"),
    "update-id": updates.updateId,
    "embedded-launch": updates.isEmbeddedLaunch,
  };
  return (
    <Page>
      <PageHeader title="Runtime diagnostics" description="Identity of this running Canvas bundle." />
      <Column relaxed testID="runtime-diagnostics">
        {Object.entries(values).map(([name, value]) => (
          <Column tight key={name}>
            <Typography small muted>{name}</Typography>
            <Typography testID={`diagnostic-${name}`}>{value == null ? "unavailable" : String(value)}</Typography>
          </Column>
        ))}
      </Column>
    </Page>
  );
}
