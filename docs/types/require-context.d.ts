// Metro's `require.context`, which the docs registry (src/core/registry.ts) uses the way
// expo-router's own route context does. Enabled in Expo's Metro config; not in Node's types.
declare namespace NodeJS {
  interface Require {
    context(
      directory: string,
      useSubdirectories?: boolean,
      filter?: RegExp,
      mode?: string,
    ): { (key: string): unknown; keys(): string[] };
  }
}
