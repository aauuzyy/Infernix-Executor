# Infernix Executor

A next-generation Roblox script executor built with Electron, React, and native C++ addons.

 [Website](https://infernix.vercel.app/) • [Discord](https://discord.gg/d3CdsJnHHb)

---

Infernix Executor is a desktop application for managing and executing scripts in Roblox environments. It combines an Electron-based shell with a React user interface and native C++ components for performance-critical operations.

## Features

### Core Executor
- **Monaco Editor** — Full-featured code editor with syntax highlighting, bracket coloring, and accent-colored syntax themes
- **Multi-Client Support** — Attach to and execute scripts on multiple Roblox instances simultaneously
- **Auto Attach** — Automatically attaches to new Roblox clients as they launch
- **Auto Execute** — Runs scripts automatically whenever a client joins a game
- **Execution History** — View, re-run, copy, or open past scripts directly in a tab
- **Persistent Tabs** — All open scripts and tab names are saved between sessions
- **Drag & Drop Scripts** — Drop `.lua` / `.txt` files directly onto the editor
- **Auto-Lint** — Automatic syntax checking on file drop
- **Save & Open Scripts** — Save scripts with custom names and open them via a modal browser

### Script Hub
- **Built-in Script Library** — Browse hundreds of scripts via ScriptBlox integration
- **Automatic Game Detection** — Script Hub filters to your current game
- **Virtualized Scrolling** — Smooth performance with thousands of scripts loaded

### Security
- **VirusTotal Integration** — Scan scripts for security threats before executing
- **Auto-Scan on Drop** — Files are automatically scanned when dragged into the editor
- **Tab Safety Badges** — Visual indicators show scan status on each tab
- **AI Security Summary** — AI-powered analysis of VirusTotal scan results

### AI Assistant
- **Script Generation** — Generate Roblox Lua scripts from natural language prompts
- **Script Editing** — Ask the AI to modify or improve existing scripts
- **Code Templates** — One-click inserts: Loop, Function, Event, GUI, ESP, Hook Function templates
- **Hook Function Templates** — `hookfunction`, `hookmetamethod(__namecall)`, `hookmetamethod(__index)` toolbar shortcuts

### Customization
- **Dynamic Themes** — 8 accent color presets + custom color picker; the entire UI updates instantly
- **Custom Backgrounds** — Set any image as the app background with a live blur intensity slider
- **Monaco Transparency** — Editor blends with custom backgrounds
- **Consistent Dark UI** — All colors and glows follow your selected accent throughout

### Dashboard
- **Live Stats** — Execution count, active clients, script count, uptime — all live
- **Quick Actions** — Open Executor, Script Hub, Client Manager, Kill Roblox in one click
- **Discord & Website Links** — Quick access to the community directly from the Dashboard
- **Full Changelog** — Complete in-app version history

### Quality of Life
- **Custom Window Controls** — Minimise, maximise, close with a branded title bar
- **Notification System** — In-app toasts for all actions, always rendered above overlays
- **Close Roblox on Exit** — Optionally kill all Roblox instances when Infernix closes
- **Auto-Update** — In-app update detection and one-click install with animated download progress
- **AutoExec Manager** — Manage scripts that run automatically on game join

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite / Rolldown |
| Desktop shell | Electron 40 |
| Editor | Monaco Editor |
| Native addon | Node.js N-API (C++) |
| Icons | Lucide React |
| Installer | electron-builder (NSIS, signed) |

---

## Project Structure

```
infernix-executor/   # Main desktop application (Electron + React)
infernix-bot/        # Discord bot
infernix-webpage/    # Public website (deployed on Vercel)
```

---

## License

See `LICENSE.txt` and `EULA.txt` inside the executor package for full terms. Use this software in accordance with all applicable laws and platform terms of service.
