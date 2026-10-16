import React, { useState, useCallback } from "react";
import {
  Monitor,
  Star,
  Settings,
  Plus,
  Search,
  ArrowRight,
  Zap,
  LayoutGrid,
  List,
  ArrowUpRight,
  Check,
  ShieldCheck,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import {
  Brand,
  ConnectionForm,
  ConnectionCard,
  EmptyState,
  Modal,
} from "./components";
import Session from "./Session";
import {
  loadConnections,
  saveConnections,
  loadPreferences,
  savePreferences,
} from "./storage";

export default function App() {
  const [connections, setConnections] = useState(loadConnections);
  const [preferences, setPreferences] = useState(loadPreferences);
  const [page, setPage] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("grid");
  const [editor, setEditor] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [session, setSession] = useState(null);
  const [notice, setNotice] = useState("");
  const updateConnections = useCallback((change) => {
    setConnections((current) => {
      const next = typeof change === "function" ? change(current) : change;
      try {
        saveConnections(next)?.catch(() =>
          setNotice(
            "No se pudo guardar en este dispositivo. Comprueba el espacio disponible.",
          ),
        );
      } catch {
        setNotice(
          "No se pudo guardar en este dispositivo. Comprueba el espacio disponible.",
        );
      }
      return next;
    });
  }, []);
  const onConnected = useCallback(
    (id) => {
      updateConnections((current) =>
        current.map((c) =>
          c.id === id ? { ...c, lastConnected: Date.now() } : c,
        ),
      );
    },
    [updateConnections],
  );
  const updatePreference = (key, value) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    try {
      savePreferences(next)?.catch(() =>
        setNotice("No se pudieron guardar las preferencias."),
      );
    } catch {
      setNotice("No se pudieron guardar las preferencias.");
    }
  };
  const visible = connections.filter(
    (c) =>
      (page !== "favorites" || c.favorite) &&
      `${c.name} ${c.host}`.toLowerCase().includes(query.toLowerCase()),
  );
  if (session)
    return (
      <Session
        connection={session}
        preferences={preferences}
        onClose={() => setSession(null)}
        onConnected={onConnected}
      />
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Navegación principal">
          <button
            className={`nav-item ${page === "all" ? "active" : ""}`}
            aria-current={page === "all" ? "page" : undefined}
            onClick={() => {
              setPage("all");
              setQuery("");
            }}
          >
            <Monitor size={20} />
            <span>Conexiones</span>
            <span className="nav-count">{connections.length}</span>
          </button>
          <button
            className={`nav-item ${page === "favorites" ? "active" : ""}`}
            aria-current={page === "favorites" ? "page" : undefined}
            onClick={() => {
              setPage("favorites");
              setQuery("");
            }}
          >
            <Star size={20} />
            <span>Favoritos</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="mini-brand" aria-hidden="true">
              ✳
            </span>
            <p>
              Tu escritorio.
              <br />
              <strong>A tu manera.</strong>
            </p>
          </div>
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            aria-current={page === "settings" ? "page" : undefined}
            onClick={() => setPage("settings")}
          >
            <Settings size={20} />
            <span>Configuración</span>
          </button>
          <div className="local-caption">
            <span className="status-dot" />
            Local. Sin cuentas.
          </div>
        </div>
      </aside>
      <div className="workspace">
        <main id="main-content" tabIndex={-1}>
          <header className="page-header">
            <div>
              <p className="section-overline">TU ESPACIO DE TRABAJO</p>
              <h1>
                {page === "settings"
                  ? "A tu manera"
                  : page === "favorites"
                    ? "Tus favoritos"
                    : "Tus conexiones"}
              </h1>
              <p className="page-subtitle">
                {page === "settings"
                  ? "Pequeños ajustes para sentirte en casa."
                  : page === "favorites"
                    ? "Los equipos a los que siempre vuelves."
                    : "Tu próximo escritorio, a un clic."}
              </p>
            </div>
            {page !== "settings" && (
              <button
                className="button primary new-connection"
                onClick={() => setEditor(null)}
              >
                <Plus size={18} />
                Nueva conexión
              </button>
            )}
          </header>
          {notice && (
            <div className="notice" role="alert">
              {notice}
              <button onClick={() => setNotice("")} aria-label="Cerrar aviso">
                Cerrar
              </button>
            </div>
          )}
          {page === "settings" ? (
            <section
              className="settings-panel"
              aria-labelledby="session-preferences"
            >
              <div className="settings-title">
                <SlidersHorizontal size={23} />
                <div>
                  <h2 id="session-preferences">Preferencias de sesión</h2>
                  <p>Se aplican al abrir tu siguiente conexión.</p>
                </div>
              </div>
              <label className="setting-row">
                <span>
                  <strong>Ajustar a la ventana</strong>
                  <small>
                    Escala el escritorio remoto para verlo completo.
                  </small>
                </span>
                <input
                  type="checkbox"
                  className="switch"
                  checked={preferences.scale}
                  onChange={(event) =>
                    updatePreference("scale", event.target.checked)
                  }
                />
              </label>
              <label className="setting-row">
                <span>
                  <strong>Conectar en solo lectura</strong>
                  <small>Observa el equipo sin enviar teclado ni ratón.</small>
                </span>
                <input
                  type="checkbox"
                  className="switch"
                  checked={preferences.viewOnly}
                  onChange={(event) =>
                    updatePreference("viewOnly", event.target.checked)
                  }
                />
              </label>
              <div className="privacy-note">
                <ShieldCheck size={22} />
                <div>
                  <strong>Tu biblioteca se queda contigo.</strong>
                  <p>
                    Las conexiones se guardan en este dispositivo. Sin cuentas,
                    sincronización ni telemetría. Las contraseñas del servidor
                    no se guardan.
                  </p>
                  <p>
                    La protección de la conexión depende de tu servidor VNC.
                    Para redes públicas, utiliza una VPN o un túnel seguro.
                  </p>
                </div>
              </div>
              <div className="about-row">
                <Brand />
                <span>
                  Versión 0.1.0 · Open source
                  <br />
                  Windows · macOS · Linux
                </span>
              </div>
            </section>
          ) : (
            <>
              <form
                className="quick-connect"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  const host = data.get("host").trim();
                  if (!host) return;
                  setSession({
                    id: null,
                    name: host,
                    host,
                    port: Number(data.get("port")),
                  });
                }}
              >
                <div className="quick-label">
                  <span className="quick-icon">
                    <Zap size={21} fill="currentColor" />
                  </span>
                  <div>
                    <h2>Conexión rápida</h2>
                    <p>Directo a tu otro escritorio.</p>
                  </div>
                </div>
                <div className="quick-inputs">
                  <label className="address-input">
                    <Monitor size={18} />
                    <span className="sr-only">Dirección del servidor</span>
                    <input
                      name="host"
                      autoComplete="off"
                      autoCapitalize="none"
                      placeholder="IP o nombre del equipo…"
                      required
                      maxLength="253"
                      spellCheck={false}
                    />
                  </label>
                  <label className="quick-port">
                    <span className="sr-only">Puerto</span>
                    <input
                      name="port"
                      autoComplete="off"
                      inputMode="numeric"
                      aria-label="Puerto"
                      type="number"
                      min="1"
                      max="65535"
                      defaultValue="5900"
                      required
                    />
                  </label>
                  <button className="button primary">
                    Conectar
                    <ArrowRight size={18} />
                  </button>
                </div>
              </form>
              <section className="library" aria-labelledby="library-title">
                <div className="library-toolbar">
                  <div>
                    <h2 id="library-title">
                      {page === "favorites"
                        ? "Equipos favoritos"
                        : "Equipos guardados"}
                      <span className="collection-count">
                        {page === "favorites"
                          ? connections.filter((c) => c.favorite).length
                          : connections.length}
                      </span>
                    </h2>
                    <p>Tus conexiones frecuentes, siempre a mano.</p>
                  </div>
                  <div className="library-controls">
                    <label className="search-input">
                      <Search size={17} />
                      <span className="sr-only">Buscar equipo</span>
                      <input
                        name="search"
                        aria-label="Buscar equipo"
                        autoComplete="off"
                        placeholder="Buscar equipo…"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                      {query && (
                        <button
                          className="clear-search"
                          aria-label="Limpiar búsqueda"
                          type="button"
                          onClick={() => setQuery("")}
                        >
                          ×
                        </button>
                      )}
                    </label>
                    <div className="view-toggle" aria-label="Vista de equipos">
                      <button
                        className={view === "grid" ? "selected" : ""}
                        aria-label="Vista de tarjetas"
                        aria-pressed={view === "grid"}
                        onClick={() => setView("grid")}
                      >
                        <LayoutGrid size={18} />
                      </button>
                      <button
                        className={view === "list" ? "selected" : ""}
                        aria-label="Vista de lista"
                        aria-pressed={view === "list"}
                        onClick={() => setView("list")}
                      >
                        <List size={19} />
                      </button>
                    </div>
                  </div>
                </div>
                {visible.length ? (
                  <div
                    className={`connections ${view === "list" ? "list-view" : ""}`}
                  >
                    {visible.map((connection) => (
                      <ConnectionCard
                        key={connection.id}
                        connection={connection}
                        onConnect={setSession}
                        onFavorite={(id) =>
                          updateConnections((current) =>
                            current.map((c) =>
                              c.id === id ? { ...c, favorite: !c.favorite } : c,
                            ),
                          )
                        }
                        onEdit={setEditor}
                        onDelete={setDeleting}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    filtered={!!query}
                    favorites={page === "favorites"}
                    onAdd={() => setEditor(null)}
                  />
                )}
              </section>
              <div className="bottom-note">
                <span className="bottom-note-icon">
                  <Monitor size={17} />
                </span>
                <div>
                  <strong>Tus equipos, sin intermediarios.</strong>
                  <span>Una conexión directa. Un espacio que es tuyo.</span>
                </div>
                <span className="open-source-label">
                  Hecho para conectar
                  <ArrowUpRight size={15} />
                </span>
              </div>
            </>
          )}
        </main>
        <footer className="statusbar">
          <span>
            <i className="status-dot" />
            Listo para conectar
          </span>
          <span>
            VNC<span className="footer-separator">/</span>Conexión directa
          </span>
        </footer>
      </div>
      {editor !== undefined && (
        <ConnectionForm
          initial={editor}
          onClose={() => setEditor(undefined)}
          onSave={(connection) => {
            updateConnections((current) =>
              current.some((c) => c.id === connection.id)
                ? current.map((c) => (c.id === connection.id ? connection : c))
                : [...current, connection],
            );
            setEditor(undefined);
          }}
        />
      )}
      {deleting && (
        <Modal title="Eliminar conexión" onClose={() => setDeleting(null)}>
          <p className="dialog-intro">
            ¿Eliminar <strong>{deleting.name}</strong> de tu biblioteca? El
            equipo remoto no se modifica.
          </p>
          <footer className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
            >
              Cancelar
            </button>
            <button
              className="button danger"
              onClick={() => {
                updateConnections((current) =>
                  current.filter((c) => c.id !== deleting.id),
                );
                setDeleting(null);
              }}
            >
              Eliminar conexión
            </button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
