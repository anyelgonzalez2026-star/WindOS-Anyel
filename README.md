# WindOS 1.0.0

**Build by Anyel Gonzalez**

WindOS is a browser-hosted desktop operating system simulator. It runs entirely in this tab, with a persistent virtual drive, real window management, permission-gated app capabilities and a registry of 640 individually tracked features across 40 categories.

## Open it

| Route | Purpose |
| --- | --- |
| `/` | WindOS desktop — boots immediately, no account required |
| `/os` | Alias for the same WindOS desktop (existing links keep working) |
| `/auth` | Optional Convex-backed account sign-in; returns to the desktop |
| `/dashboard` | Protected starter account page |

The OS is local-first: files live in IndexedDB, while settings, permissions, clipboard history and restore points live in `localStorage` for this origin. Nothing is uploaded to a WindOS server.

## What is included

- **46 applications** in the registry: 39 preinstalled and 7 installable through WindStore.
- **Virtual filesystem** shared by WindFiles, WindTerminal, WindCode, WindNotes, WindPaint, WindMedia, WindPhotos, WindZip, WindPDF and WindBackup.
- **Window manager** with drag, eight-way resize, minimise, maximise, snap, virtual desktops, simulated multi-monitor placement and per-window payloads.
- **Shell**: Start, global search, taskbar, widgets, quick settings, notification centre, calendar flyout, boot/welcome/tutorial/lock/sleep/restart/shutdown/recovery flows.
- **Security**: app permission prompts for notifications, camera, microphone, screen capture and clipboard; guarded data export and factory reset; honest browser-boundary documentation.
- **Real browser features where possible**: native media playback, a minimal PDF writer, ZIP creation/extraction, IndexedDB persistence, Web Crypto hashes, screen capture through `getDisplayMedia`, Open-Meteo weather with a deterministic local fallback.

## Development

```bash
bun install
bun run dev
bun tsc -b --noEmit
bun run build
```

The production build is emitted to `dist/`.

## Verification status

| Measure | Count |
| --- | ---: |
| Registered features | 640 |
| Implemented and verified | 621 |
| Documented partial limitations | 15 |
| Host-browser blocked capabilities | 4 |
| Failed/unknown checks | 0 |

The live count is calculated from `src/lib/os/features/index.ts` and shown in WindAbout, WindRegistry and WindHelp. Limitations are not hidden: they are rendered with notes in the registry and listed in [VERIFICATION.md](./VERIFICATION.md).

## Known boundaries

WindOS cannot install native EXE/MSI/APPX software, repair the host computer, expose the host's local IP or configured DNS servers, or emulate a desktop screen reader's virtual cursor. Embedded websites may refuse to render in an iframe and always have an external-tab fallback. Updates and packages are a trusted local catalogue, not a remote signed update service. PDF text extraction and a few update/media extras are explicitly marked limited rather than presented as finished.
