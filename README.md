# Infernix Executor

A modern, feature-rich Roblox script executor built with Electron, React, and native C++ addons.

## 🚀 Features

- **Modern UI**: Built with React and Framer Motion for smooth animations
- **Monaco Editor**: Full-featured code editor with syntax highlighting
- **Native Integration**: C++ addon for robust script execution
- **Multi-Client Support**: Manage and execute scripts on multiple Roblox instances
- **Script Hub**: Built-in script library
- **AI Assistant**: Integrated AI help system
- **Settings Manager**: Customizable configuration

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Framer Motion
- **Desktop**: Electron 40
- **Editor**: Monaco Editor (VS Code's editor)
- **Native**: Node.js N-API C++ addon
- **Icons**: Lucide React

## 📦 Project Structure

```
infernix-executor/
├── electron/          # Electron main and preload scripts
├── src/              # React frontend source
│   ├── components/   # UI components
│   └── assets/       # Static assets
├── native/           # Native C++ addon
│   └── infernix-addon/
│       └── src/      # C++ source code
└── public/           # Public assets
```

## 🔧 Development

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Python 3.x (for native addon compilation)
- Visual Studio Build Tools (Windows)

### Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd infernix-executor
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run electron:dev
```

This will start the Vite dev server and launch Electron.

### Available Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run electron` - Run Electron
- `npm run electron:dev` - Run in development mode
- `npm run lint` - Lint code

## 🏗️ Building

To build the native addon:

```bash
cd native/infernix-addon
npm install
npm run build
```

## 📝 Components

- **Dashboard**: Main overview and quick actions
- **EditorView**: Monaco-based script editor
- **ClientManager**: Manage connected Roblox instances
- **ScriptHub**: Browse and load pre-made scripts
- **Assistant**: AI-powered help and suggestions
- **SettingsView**: Application configuration
- **TitleBar**: Custom window controls

## ⚠️ Disclaimer

This project is for educational purposes only. Use responsibly and at your own risk.

## 📄 License

See LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
