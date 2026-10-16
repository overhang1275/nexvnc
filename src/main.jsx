import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import { initializeStorage } from "./storage";
const root = createRoot(document.getElementById("root"));
try {
  await initializeStorage();
  root.render(<App />);
} catch {
  root.render(
    <main>
      <h1>No pudimos abrir tu biblioteca</h1>
      <p>El archivo local no se pudo leer. Tus datos no se han sobrescrito.</p>
      <button onClick={() => location.reload()}>Volver a intentar</button>
    </main>,
  );
}
