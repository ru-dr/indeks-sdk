import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { plugin } from "bun";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");

plugin({
  name: "indeks-workspace-sources",
  setup(build) {
    build.onResolve({ filter: /^@indeks\/(shared|core|react)$/ }, (args) => {
      const name = args.path.split("/")[1];
      return { path: resolve(root, `packages/${name}/src/index.ts`) };
    });
  },
});

GlobalRegistrator.register({ url: "https://app.example.com/", width: 1024, height: 768 });
