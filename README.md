# NexVNC

A modern, open-source VNC client built with Electron.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Platforms](https://img.shields.io/badge/Platforms-Windows%20%7C%20macOS%20%7C%20Linux-4263eb)
[![Electron](https://img.shields.io/badge/Built%20with-Electron-47848f?logo=electron)](https://www.electronjs.org/)
[![GitHub release](https://img.shields.io/github/v/release/overhang1275/nexvnc)](https://github.com/overhang1275/nexvnc/releases)

[Website](https://opencore.dpdns.org) · [Releases](https://github.com/overhang1275/nexvnc/releases) · [Issues](https://github.com/overhang1275/nexvnc/issues)

## About

NexVNC is a desktop VNC viewer with a clean interface and a local connection library. Connect directly to a VNC server without creating a NexVNC account or relying on a cloud service.

The application uses Electron, React and noVNC. It targets **Windows, macOS and Linux**. Windows has been validated locally; macOS and Linux builds still require platform-specific verification. The current interface is in Spanish.

## Features

- Connect using a hostname or IP address and port.
- Save, edit and remove connections locally.
- Organize favorites, search connections and switch between card and list views.
- View and control a remote desktop through noVNC.
- Fit the remote desktop to the window, use view-only mode or enter fullscreen.
- Send clipboard text and Ctrl+Alt+Delete to the remote computer.
- Enter server credentials for the current session without saving passwords.
- Use the application without a NexVNC account, cloud synchronization or telemetry.

NexVNC is a client. It does not install a VNC server on remote computers.

## Screenshots

<!-- Replace these placeholder paths with screenshots before publishing images. -->

![Connection library](screenshots/connections.png)
![Remote desktop session](screenshots/remote-session.png)

## Requirements

For packaged builds:

- Windows, macOS or a Linux desktop environment compatible with Electron.
- A reachable VNC server and its connection details.
- Server credentials when required by the remote server.

For building from source:

- Node.js 22 or later.
- npm and Git.
- Network access to download dependencies and packaging tools.

## Installation

### GitHub Releases

Visit [GitHub Releases](https://github.com/overhang1275/nexvnc/releases) and download a package matching your operating system and architecture when release assets are available:

| Platform | Package targets |
| --- | --- |
| Windows | NSIS installer (`.exe`) |
| macOS | Disk image (`.dmg`) |
| Linux | AppImage or Debian package (`.deb`) |

If no suitable asset has been published, build from source. Local builds are not automatically signed or notarized.

### Build from source

```sh
git clone https://github.com/overhang1275/nexvnc.git
cd nexvnc
npm ci
npm start
```

`npm start` builds the interface and launches the Electron application.

Generate a distributable on the corresponding operating system:

```sh
npm run dist:win
npm run dist:mac
npm run dist:linux
```

Run the command for your host platform. Packages are written to `release/`; configuring a target does not verify it on that operating system.

## Usage

1. Start NexVNC.
2. Enter the server address and port under **Conexión rápida**, or choose **Nueva conexión** to save a connection.
3. Select **Conectar**.
4. Enter the remote server credentials if prompted.
5. Use the session toolbar to adjust the view or disconnect.

Example connection:

```text
Name: Office desktop
Host: 192.168.1.10
Port: 5900
```

Replace the example address with your server's address. The VNC server must already be running and reachable. No NexVNC login is required; remote server authentication remains independent.

## Supported VNC servers

NexVNC uses [noVNC](https://github.com/novnc/noVNC) for the RFB protocol. Compatibility depends on the server's authentication method, encoding and configuration.

TigerVNC, TightVNC, x11vnc and other servers exposing a standard VNC endpoint are candidates for direct connections. Individual server versions have not yet been comprehensively tested. Consult noVNC's supported authentication methods when configuring your server.

Vendor-specific cloud connections and account-based relay services are not implemented.

## Security recommendations

- Use a trusted network, VPN or SSH tunnel when your VNC server does not provide suitable transport encryption.
- Do not expose an unauthenticated VNC server directly to the internet.
- Use strong server credentials and restrict access with firewall rules.
- Keep NexVNC, Electron and your VNC server updated.
- Back up your local connection library before changing or removing application data.

The WebSocket-to-TCP bridge listens only on `127.0.0.1` and checks request origins with single-use connection tickets. It does **not** automatically encrypt the connection to the remote VNC server.

Passwords are not saved in the connection library. Saved hostnames and addresses are local application data and should still be treated as private.

## Troubleshooting

| Problem | Check |
| --- | --- |
| Connection refused or timeout | Confirm the hostname, port, running VNC server, firewall and VPN route. |
| Authentication rejected | Verify the server credentials and whether its authentication method is supported by noVNC. |
| Desktop is too large or too small | Toggle the fit-to-window control in the session toolbar. |
| Keyboard or mouse does not control the server | Disable view-only mode and check the server's access permissions. |
| Local library cannot be opened | Back up `library.json` in the operating system's application-data directory before investigating file permissions or corruption. |
| Browser preview cannot create a connection | Use the documented `127.0.0.1` URL and ensure the local backend is running. |
| Packaging fails for another operating system | Build on the target operating system with its required tooling. |

Report reproducible problems through [GitHub Issues](https://github.com/overhang1275/nexvnc/issues). Remove passwords, tokens, private addresses and other sensitive data from reports.

## Development

```sh
npm ci
npm start
```

For interface development with hot reload, use two terminals:

```sh
# Terminal 1: local bridge
node server/index.js --dev

# Terminal 2: Vite
npm run dev
```

Open `http://127.0.0.1:5173`. Use `127.0.0.1` rather than `localhost` to match the development origin checks.

To inspect the production interface in a browser:

```sh
npm run build
npm run preview
```

Open `http://127.0.0.1:47832`. The browser preview stores its library separately from the Electron application's native library.

```text
electron/   Desktop lifecycle, isolated preload and local persistence
server/     Loopback HTTP server and WebSocket-to-TCP bridge
src/        React interface, connection management and noVNC session
public/     Static application assets
assets/     Desktop application icon
```

Run `npm run build` before submitting changes. Never commit dependencies, build output, credentials or machine-specific configuration.

## Contributing

Issues and pull requests are welcome.

1. Open an issue for substantial changes.
2. Fork the repository and create a focused branch.
3. Keep the implementation original and preserve third-party license notices.
4. Verify affected behavior and the production build; state which operating systems you tested.
5. Submit a pull request describing the change and any remaining limitations.

Do not include proprietary code, extracted application assets or private connection details.

## Roadmap

- [ ] Verify packaged releases on macOS and Linux.
- [ ] Expand interoperability testing against real VNC servers.
- [ ] Add release signing and macOS notarization.
- [ ] Improve localization and accessibility coverage.

Roadmap items are planned work, not current features.

## FAQ

**Do I need an account?**

No. NexVNC has no account or registration system. A remote VNC server may still require credentials.

**Does NexVNC include a VNC server?**

No. Install and configure a server on the remote computer separately.

**Are passwords saved?**

No. Server passwords are used only during the current connection session.

**Are connections synchronized between devices?**

No. The connection library is stored locally.

**Is every connection encrypted?**

No. Transport protection depends on your VNC server and network setup. Use a VPN or secure tunnel when necessary.

**Does it support file transfer or audio?**

These features are not implemented.

**Can I use it on Windows, macOS and Linux?**

These are the build targets. Windows has been checked locally; macOS and Linux still need platform-specific verification.

## MIT License

NexVNC's original source code is released under the [MIT License](LICENSE), copyright © 2026 overhang1275.

Dependencies retain their own licenses:

| Component | License |
| --- | --- |
| Electron | MIT, with Chromium and third-party notices |
| React / React DOM | MIT |
| noVNC | MPL-2.0, with its included third-party notices |
| ws | MIT |
| Lucide | ISC |
| Inter | SIL Open Font License 1.1 |
| Vite and electron-builder | MIT |

noVNC is used without modification. Its corresponding source is available through the version pinned in `package-lock.json` and the [upstream repository](https://github.com/novnc/noVNC). Preserve dependency license files and notices when redistributing. NexVNC's MIT license does not replace third-party licenses.

## Author

Created by [@overhang1275](https://github.com/overhang1275).

Website: [opencore.dpdns.org](https://opencore.dpdns.org)
