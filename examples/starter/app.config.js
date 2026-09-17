const smoke = process.env.EXPO_PUBLIC_CANVAS_SMOKE === "1";

function isSemver(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?(?:\+(.+))?$/.exec(value);
  if (!match || match[0] !== value || match.slice(1, 4).some((part) => part.length > 1 && part.startsWith("0"))) return false;
  const identifiers = (part, numericLeadingZeroAllowed) => part.split(".").every((id) =>
    /^[0-9A-Za-z-]+$/.test(id) && (numericLeadingZeroAllowed || !/^0\d+$/.test(id)),
  );
  return (!match[4] || identifiers(match[4], false)) && (!match[5] || identifiers(match[5], true));
}

function readIdentity(raw) {
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error("CANVAS_SMOKE_IDENTITY must contain valid JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("CANVAS_SMOKE_IDENTITY must be an object.");
  }
  const checks = {
    schema: value.schema === 1,
    inputMode: value.inputMode === "package",
    sourceRevision: typeof value.sourceRevision === "string" && value.sourceRevision.length === 40 && /^[a-f0-9]{40}$/i.test(value.sourceRevision),
    candidateRevision: typeof value.candidateRevision === "string" && value.candidateRevision.length === 40 && /^[a-f0-9]{40}$/i.test(value.candidateRevision),
    packageVersion: isSemver(value.packageVersion),
    packageSha256: typeof value.packageSha256 === "string" && value.packageSha256.length === 64 && /^[a-f0-9]{64}$/i.test(value.packageSha256),
    packageName: value.packageName === undefined || value.packageName === "@ionizeio/canvas",
    sourceDirty: value.sourceDirty === undefined || value.sourceDirty === false,
    nativePackages: value.nativePackages === undefined || (Array.isArray(value.nativePackages)
      && value.nativePackages.length === 1 && value.nativePackages.every((pkg) =>
        pkg && typeof pkg === "object" && pkg.packageName === "@ionizeio/canvas-blur" && isSemver(pkg.packageVersion)
        && typeof pkg.packageSha256 === "string" && pkg.packageSha256.length === 64 && /^[a-f0-9]{64}$/.test(pkg.packageSha256))),
  };
  for (const [field, valid] of Object.entries(checks)) {
    if (!valid) throw new Error(`CANVAS_SMOKE_IDENTITY has an invalid ${field}.`);
  }
  return value;
}

const identity = smoke && process.env.CANVAS_SMOKE_IDENTITY ? readIdentity(process.env.CANVAS_SMOKE_IDENTITY) : undefined;

module.exports = {
  expo: {
    name: smoke ? "Canvas Starter Smoke" : "Canvas Starter",
    slug: "canvas-starter",
    version: "1.0.0",
    scheme: smoke ? "canvas-smoke" : "canvas-starter",
    userInterfaceStyle: "automatic",
    ios: {
      bundleIdentifier: smoke ? "com.nannier.canvas.starter.smoke" : "com.nannier.canvas.starter",
      supportsTablet: true,
      infoPlist: { ITSAppUsesNonExemptEncryption: false },
    },
    android: {
      package: smoke ? "com.nannier.canvas.starter.smoke" : "com.nannier.canvas.starter",
    },
    web: { bundler: "metro", output: "single" },
    plugins: ["expo-router", "expo-font"],
    experiments: { typedRoutes: false },
    extra: identity ? { canvasBuild: identity } : {},
  },
};
