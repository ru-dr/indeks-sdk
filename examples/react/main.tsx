import { createRoot } from "react-dom/client";
import { Indeks, useIndeks } from "@useindeks/react";
import { IndeksDebugger } from "@useindeks/react/debugger";

function Page() {
  const { track, identify, sessionId } = useIndeks();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: "40rem", margin: "2rem auto" }}>
      <h1>React</h1>
      <p>Session: {sessionId ?? "starting"}</p>
      <button
        type="button"
        onClick={() => {
          track("add_to_cart", { sku: "A-1" }, { category: "shop", value: 19 });
          identify("demo-user");
        }}
      >
        Add to cart
      </button>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <Indeks apiKey="example_project_key" config={{ endpoint: "/collect" }} debug>
    <Page />
    <IndeksDebugger />
  </Indeks>,
);
