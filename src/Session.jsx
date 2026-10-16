import React, { useEffect, useRef, useState } from "react";
import RFB from "@novnc/novnc";
import {
  ArrowLeft,
  Maximize,
  Minimize,
  Clipboard,
  Keyboard,
  Monitor,
  Scaling,
  Eye,
  LoaderCircle,
  Unplug,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Modal } from "./components";
import { address } from "./storage";

export default function Session({
  connection,
  preferences,
  onClose,
  onConnected,
}) {
  const screen = useRef(null);
  const rfb = useRef(null);
  const container = useRef(null);
  const timer = useRef(null);
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [scale, setScale] = useState(preferences.scale);
  const [viewOnly, setViewOnly] = useState(preferences.viewOnly);
  const [clipboard, setClipboard] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const restartTimeout = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setError("El servidor tardó demasiado en responder.");
      setStatus("error");
      setCredentials(null);
      rfb.current?.disconnect();
    }, 15000);
  };
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);
  useEffect(() => {
    let alive = true;
    let client;
    const abort = new AbortController();
    (async () => {
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            host: connection.host,
            port: connection.port,
          }),
          signal: abort.signal,
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "No se pudo iniciar la conexión.");
        if (!alive) return;
        client = new RFB(
          screen.current,
          `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/vnc?ticket=${result.ticket}`,
        );
        rfb.current = client;
        client.scaleViewport = preferences.scale;
        client.resizeSession = false;
        client.viewOnly = preferences.viewOnly;
        client.background = "#171c2b";
        client.addEventListener("connect", () => {
          if (!alive) return;
          clearTimeout(timer.current);
          setStatus("connected");
          onConnected(connection.id);
        });
        client.addEventListener("credentialsrequired", (event) => {
          if (alive) {
            clearTimeout(timer.current);
            setCredentials(event.detail.types);
            setStatus("auth");
          }
        });
        client.addEventListener("securityfailure", (event) => {
          if (alive) {
            clearTimeout(timer.current);
            setError(
              event.detail.reason || "El servidor rechazó las credenciales.",
            );
            setCredentials(null);
            setStatus("error");
          }
        });
        client.addEventListener("disconnect", (event) => {
          if (alive) {
            clearTimeout(timer.current);
            setCredentials(null);
            setStatus((current) =>
              current === "error" ? current : "disconnected",
            );
            setError(
              (current) =>
                current ||
                (event.detail.clean
                  ? "El servidor cerró la conexión."
                  : "No se pudo conectar. Revisa el servidor, el puerto y la red."),
            );
          }
        });
        client.addEventListener("clipboard", (event) => {
          if (alive)
            setClipboard((current) =>
              current === null ? null : event.detail.text,
            );
        });
        restartTimeout();
      } catch (error) {
        if (alive && error.name !== "AbortError") {
          setError(error.message);
          setStatus("error");
        }
      }
    })();
    return () => {
      alive = false;
      clearTimeout(timer.current);
      abort.abort();
      client?.disconnect();
      rfb.current = null;
    };
  }, [connection]);
  useEffect(() => {
    if (rfb.current) rfb.current.scaleViewport = scale;
  }, [scale]);
  useEffect(() => {
    if (rfb.current) rfb.current.viewOnly = viewOnly;
  }, [viewOnly]);
  const connected = status === "connected";
  return (
    <div className="remote-session" ref={container}>
      <header className="session-toolbar">
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Volver a conexiones y desconectar"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="session-heading">
          <strong>{connection.name || connection.host}</strong>
          <span>{address(connection)}</span>
        </div>
        <span
          className={`session-status ${connected ? "connected" : ""}`}
          role="status"
        >
          <i />
          {connected
            ? "Conectado"
            : status === "auth"
              ? "Autenticación"
              : status === "connecting"
                ? "Conectando…"
                : "Desconectado"}
        </span>
        <div className="session-actions">
          <button
            className={`icon-button ${scale ? "selected" : ""}`}
            aria-label="Ajustar escritorio a la ventana"
            aria-pressed={scale}
            disabled={!connected}
            onClick={() => setScale(!scale)}
          >
            <Scaling size={20} />
          </button>
          <button
            className={`icon-button ${viewOnly ? "selected" : ""}`}
            aria-label="Solo lectura"
            aria-pressed={viewOnly}
            disabled={!connected}
            onClick={() => setViewOnly(!viewOnly)}
          >
            <Eye size={20} />
          </button>
          <button
            className="icon-button"
            aria-label="Enviar texto al portapapeles remoto"
            disabled={!connected || viewOnly}
            onClick={() => setClipboard("")}
          >
            <Clipboard size={19} />
          </button>
          <button
            className="icon-button"
            aria-label="Enviar Control Alt Suprimir"
            disabled={!connected || viewOnly}
            onClick={() => rfb.current?.sendCtrlAltDel()}
          >
            <Keyboard size={20} />
          </button>
          <button
            className="icon-button"
            aria-label={
              fullscreen ? "Salir de pantalla completa" : "Pantalla completa"
            }
            onClick={async () => {
              try {
                if (document.fullscreenElement) await document.exitFullscreen();
                else await container.current.requestFullscreen();
              } catch {
                setError("No se pudo activar la pantalla completa.");
              }
            }}
          >
            {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          <button className="button disconnect-button" onClick={onClose}>
            <Unplug size={16} />
            Desconectar
          </button>
        </div>
      </header>
      <div
        className="remote-screen"
        ref={screen}
        aria-label="Escritorio remoto"
      />
      {!connected && (
        <div className="session-overlay">
          {status === "connecting" ? (
            <LoaderCircle size={36} className="spin" />
          ) : status === "auth" ? (
            <Monitor size={40} />
          ) : (
            <AlertCircle size={40} />
          )}
          <h2>
            {status === "connecting"
              ? "Abriendo tu escritorio…"
              : status === "auth"
                ? "El servidor solicita credenciales"
                : "No se pudo mantener la conexión"}
          </h2>
          <p>
            {status === "connecting"
              ? `Conectando con ${address(connection)}`
              : status === "auth"
                ? "La contraseña se utiliza solo durante esta sesión."
                : error}
          </p>
          {status !== "connecting" && status !== "auth" && (
            <button className="button primary" onClick={onClose}>
              Volver a mis conexiones
              <ArrowRight size={17} />
            </button>
          )}
        </div>
      )}
      {credentials && (
        <Modal title="Acceso al servidor VNC" onClose={onClose}>
          <p className="dialog-intro">
            Credenciales de {connection.name || connection.host}. No se
            guardarán.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              restartTimeout();
              rfb.current?.sendCredentials({
                username: data.get("username") || "",
                password: data.get("password") || "",
                target: data.get("target") || "",
              });
              setCredentials(null);
              setStatus("connecting");
            }}
          >
            {credentials.includes("username") && (
              <label className="field">
                Usuario
                <input name="username" autoComplete="off" autoFocus required />
              </label>
            )}
            {credentials.includes("target") && (
              <label className="field">
                Destino
                <input name="target" autoComplete="off" required />
              </label>
            )}
            <label className="field">
              Contraseña del servidor
              <input
                name="password"
                type="password"
                autoComplete="off"
                autoFocus={!credentials.includes("username")}
                required
              />
            </label>
            <footer className="dialog-actions">
              <button
                className="button secondary"
                type="button"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button className="button primary">
                Conectar
                <ArrowRight size={17} />
              </button>
            </footer>
          </form>
        </Modal>
      )}
      {clipboard !== null && (
        <Modal title="Portapapeles remoto" onClose={() => setClipboard(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              rfb.current?.clipboardPasteFrom(clipboard);
              setClipboard(null);
            }}
          >
            <label className="field">
              Texto para el equipo remoto
              <textarea
                rows="6"
                autoFocus
                value={clipboard}
                onChange={(event) => setClipboard(event.target.value)}
              />
            </label>
            <footer className="dialog-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setClipboard(null)}
              >
                Cancelar
              </button>
              <button className="button primary">
                Enviar texto
                <ArrowRight size={17} />
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </div>
  );
}
