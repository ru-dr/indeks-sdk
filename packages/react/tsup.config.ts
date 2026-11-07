import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/debugger.ts"],
  format: ["esm", "cjs"],
  dts: true,
  tsconfig: "tsconfig.build.json",
  target: "es2020",
  platform: "browser",
  clean: true,
  sourcemap: true,
  splitting: false,
  external: ["react", "react-dom", "@useindeks/core", "@useindeks/shared"],
});
