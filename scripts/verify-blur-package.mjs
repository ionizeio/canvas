// Validate the optional module's installable bytes independently of Canvas.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function verifyBlurPackage(directory) {
  const read = (file) => readFileSync(join(directory, file), 'utf8');
  const pkg = JSON.parse(read('package.json'));
  if (pkg.name !== '@ionizeio/canvas-blur' || pkg.types !== './dist/index.d.ts' || pkg.main !== './dist/index.js'
    || pkg.exports?.['.']?.types !== pkg.types || pkg.exports?.['.']?.default !== pkg.main
    || pkg['react-native'] !== pkg.main) throw new Error('Invalid blur package entry points');
  if (!pkg.peerDependencies?.['expo-modules-core'] || pkg.peerDependenciesMeta?.['expo-modules-core']?.optional
    || !pkg.peerDependencies.react || !pkg.peerDependencies['react-native']) throw new Error('Missing required blur module peers');
  if (!read('dist/index.js').includes('CanvasBlur')) throw new Error('Missing native module implementation');
  if (/expo-modules-core|\b(?:HTMLElement|HTMLDivElement|Document)\b/.test(read('dist/index.d.ts'))) {
    throw new Error('Blur declarations must expose only structural React and React Native types');
  }
  const config = JSON.parse(read('expo-module.config.json'));
  if (JSON.stringify(config.platforms) !== '["android"]'
    || JSON.stringify(config.android?.modules) !== '["io.ionize.canvas.blur.CanvasBlurModule"]') throw new Error('Invalid Android autolinking config');
  if (!read('android/build.gradle').includes("namespace 'io.ionize.canvas.blur'")) throw new Error('Wrong Android namespace');
  read('android/src/main/AndroidManifest.xml');
  if (!read('android/src/main/java/io/ionize/canvas/blur/CanvasBlurModule.kt').includes('Name("CanvasBlur")')) throw new Error('Wrong native module name');
  function walk(directory, prefix = '') {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('Package cannot contain symlinks');
      const file = prefix + entry.name;
      if (entry.isDirectory()) walk(join(directory, entry.name), file + '/');
      else if (file.startsWith('dist/') && /(?<!\.d)\.tsx?$/.test(file)) throw new Error('Raw TypeScript in distribution');
      else if (file.startsWith('android/build/') || file.includes('/.gradle/')) throw new Error('Native build output in distribution');
    }
  }
  // Source checkouts can contain Gradle caches; the files allowlist controls
  // packing. The release seal separately verifies the unpacked native bytes.
  if (JSON.stringify(pkg.files) !== JSON.stringify(['dist', 'android/build.gradle', 'android/src/main', 'expo-module.config.json', 'README.md', 'CHANGELOG.md'])) {
    throw new Error('Blur package must exclude native build output and raw source TypeScript');
  }
  walk(join(directory, 'dist'), 'dist/');
  console.log(`verify-blur-package: ${pkg.name}@${pkg.version} verified`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyBlurPackage(resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '../packages/canvas-blur')));
}
