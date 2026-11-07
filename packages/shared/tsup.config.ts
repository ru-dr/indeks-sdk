import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: { compilerOptions: { composite: false } },
  tsconfig: "tsconfig.build.json",
  target: "es2020",
  platform: "browser",
  clean: true,
  sourcemap: true,
});
