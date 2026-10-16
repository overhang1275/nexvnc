import React, { useRef, useEffect, useState } from "react";
import {
  ArrowUpRight,
  Monitor,
  Star,
  Pencil,
  Trash2,
  X,
  Plus,
  ArrowRight,
  Command,
  ShieldCheck,
} from "lucide-react";
import { address } from "./storage";

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span>NexVNC</span>
    </div>
  );
}

export function Modal({ title, children, onClose, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    if (window.matchMedia("(min-width: 701px)").matches)
      dialog.querySelector("[data-initial-focus]")?.focus();
    return () => {
      dialog.close();
      previousFocus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <header className="modal-header">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Cerrar diálogo"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}

export function ConnectionForm({ initial, onSave, onClose }) {
  const [error, setError] = useState("");
  return (
    <Modal
      title={initial ? "Editar conexión" : "Nueva conexión"}
      onClose={onClose}
    >
      <div className="dialog-symbol">
        <Monitor size={26} />
      </div>
      <p className="dialog-intro">Un acceso directo a tu otro escritorio.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const name = data.get("name").trim();
          const host = data.get("host").trim();
          const port = Number(data.get("port"));
          if (
            !name ||
            !host ||
            /[\s/\\?#@]/.test(host) ||
            !Number.isInteger(port) ||
            port < 1 ||
            port > 65535
          ) {
            setError(
              "Escribe una IP o un nombre de equipo sin espacios, rutas ni símbolos como / o @.",
            );
            event.currentTarget.elements.host.focus();
            return;
          }
          onSave({
            ...initial,
            id: initial?.id || crypto.randomUUID(),
            name,
            host,
            port,
            kind: data.get("kind"),
            favorite: initial?.favorite || false,
          });
        }}
      >
        <label className="field">
          Nombre del equipo
          <input
            data-initial-focus
            autoComplete="off"
            name="name"
            maxLength="80"
            placeholder="Por ejemplo, mi escritorio…"
            defaultValue={initial?.name}
            required
          />
        </label>
        <div className="form-row">
          <label className="field grow">
            Dirección
            <input
              name="host"
              autoComplete="off"
              autoCapitalize="none"
              aria-invalid={!!error}
              aria-describedby={error ? "connection-error" : undefined}
              onChange={() => setError("")}
              maxLength="253"
              placeholder="Por ejemplo, 192.168.1.10…"
              defaultValue={initial?.host}
              required
              spellCheck={false}
            />
          </label>
          <label className="field port-field">
            Puerto
            <input
              name="port"
              autoComplete="off"
              inputMode="numeric"
              type="number"
              min="1"
              max="65535"
              defaultValue={initial?.port || 5900}
              required
            />
          </label>
        </div>
        <label className="field">
          Tipo de equipo
          <select name="kind" defaultValue={initial?.kind || "other"}>
            <option value="other">Otro equipo</option>
            <option value="windows">Windows</option>
            <option value="mac">macOS</option>
            <option value="linux">Linux</option>
          </select>
        </label>
        <p className="form-note">
          <ShieldCheck size={15} /> Las contraseñas se solicitan al conectar y
          no se guardan.
        </p>
        {error && (
          <p id="connection-error" className="form-error" role="alert">
            {error}
          </p>
        )}
        <footer className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" type="submit">
            {initial ? "Guardar cambios" : "Guardar conexión"}
            <ArrowRight size={17} />
          </button>
        </footer>
      </form>
    </Modal>
  );
}

export function ConnectionCard({
  connection,
  onConnect,
  onFavorite,
  onEdit,
  onDelete,
}) {
  const kind = {
    windows: "Windows",
    mac: "macOS",
    linux: "Linux",
    other: "VNC",
  }[connection.kind];
  return (
    <article className={`connection-card ${connection.kind}`}>
      <div className="connection-preview">
        <span className="device-platform">{kind}</span>
        <Monitor className="device-icon" size={68} strokeWidth={1.3} />
        <button
          className={`favorite icon-button ${connection.favorite ? "active" : ""}`}
          aria-label={`${connection.favorite ? "Quitar de" : "Añadir a"} favoritos: ${connection.name}`}
          aria-pressed={connection.favorite}
          onClick={() => onFavorite(connection.id)}
        >
          <Star
            size={19}
            fill={connection.favorite ? "currentColor" : "none"}
          />
        </button>
      </div>
      <div className="connection-info">
        <div>
          <h3>{connection.name}</h3>
          <p>{address(connection)}</p>
        </div>
        <div className="card-options">
          <button
            className="icon-button"
            aria-label={`Editar ${connection.name}`}
            onClick={() => onEdit(connection)}
          >
            <Pencil size={15} />
          </button>
          <button
            className="icon-button delete"
            aria-label={`Eliminar ${connection.name}`}
            onClick={() => onDelete(connection)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <button className="card-connect" onClick={() => onConnect(connection)}>
        <span>
          Conectar<span className="sr-only"> a {connection.name}</span>
        </span>
        <ArrowUpRight size={18} />
      </button>
    </article>
  );
}

export function EmptyState({ filtered, favorites, onAdd }) {
  return (
    <div className="empty-state">
      <div className="empty-devices" aria-hidden="true">
        <div className="little-device left-device">
          <Monitor size={43} strokeWidth={1.2} />
        </div>
        <div className="main-device">
          <Monitor size={85} strokeWidth={1} />
          <span className="device-spark">
            <Plus size={18} />
          </span>
        </div>
        <div className="little-device right-device">
          <Monitor size={43} strokeWidth={1.2} />
        </div>
      </div>
      <h3>
        {filtered
          ? "No encontramos ese equipo"
          : favorites
            ? "Tus favoritos, más cerca"
            : "Tu espacio empieza con una conexión"}
      </h3>
      <p>
        {filtered
          ? "Prueba con otro nombre o dirección."
          : favorites
            ? "Marca un equipo con la estrella para encontrarlo aquí."
            : "Añade tu primer equipo y vuelve a él cuando quieras."}
      </p>
      {!filtered && !favorites && (
        <button className="button primary" onClick={onAdd}>
          <Plus size={17} />
          Añadir mi primer equipo
        </button>
      )}
      <span className="empty-caption">
        <Command size={13} /> Windows, macOS y Linux. Un mismo espacio.
      </span>
    </div>
  );
}
