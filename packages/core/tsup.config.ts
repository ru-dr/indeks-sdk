import { defineConfig } from "tsup";

const shared = {
  tsconfig: "tsconfig.build.json",
  target: "es2020",
  platform: "browser" as const,
  sourcemap: true,
};

export default defineConfig([
  {
    ...shared,
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    external: ["@useindeks/shared", "@thumbmarkjs/thumbmarkjs"],
  },
  {
    ...shared,
    entry: { "indeks.global": "src/index.ts" },
    format: ["iife"],
    minify: true,
    sourcemap: false,
    noExternal: ["@useindeks/shared"],
    esbuildOptions(options) {
      options.external = [...(options.external ?? []), "@thumbmarkjs/thumbmarkjs"];
    },
    outExtension: () => ({ js: ".js" }),
  },
]);
