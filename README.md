# Claude Finances - Personal Budget Tracker

A privacy-focused, offline-first personal finance web application that runs entirely in your browser. Track expenses, categorize transactions, and analyze spending patterns without ever sending your financial data to a server.

**[🚀 Try it now on GitHub Pages](https://hansenrl.github.io/claude_finances/)**

## What is This?

This repository contains a single-page web application (SPA) that helps you:
- Import financial transactions from bank files (QFX/OFX, CSV)
- Automatically categorize spending
- Visualize spending patterns with charts and graphs
- Identify recurring expenses and subscriptions
- Analyze month-over-month trends
- Keep all your financial data private and local

**Key Feature**: Everything runs in your browser. No backend, no cloud storage, no data transmission.

## Quick Start

### Prerequisites

- **Node.js 18+** and npm
- A modern web browser (Chrome, Firefox, Safari, or Edge)

### Get Started in 3 Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/hansenrl/claude_finances.git
   cd claude_finances
   ```

2. **Navigate to the app and install dependencies**
   ```bash
   cd budget-tracker
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

   Open your browser to `http://localhost:5173` and start using the app!

### Building for Production

To create a standalone HTML file you can use anywhere:

```bash
cd budget-tracker
npm run build
```

This creates `budget-tracker/dist/index.html` - a single 512KB file containing the entire application. You can:
- Open it directly in any browser (no server needed)
- Host it on GitHub Pages, Netlify, or any static hosting
- Email it to yourself for use on another computer
- Store it on a USB drive for portable use

## Repository Structure

```
claude_finances/
├── README.md                  # This file - getting started guide
├── requirements.md            # Detailed product requirements
├── technical_design.md        # Technical architecture and design decisions
├── example_data/              # Sample financial data files for testing
└── budget-tracker/            # Main application source code
    ├── src/                   # React/TypeScript source files
    ├── dist/                  # Production build output (generated)
    ├── package.json           # Dependencies and scripts
    ├── README.md              # Detailed app documentation
    └── TESTING.md             # Testing guide
```

## Features Overview

- **Multi-Format Import**: QFX (Chase, Fidelity) and CSV (Discover) file support
- **Smart Categorization**: 15 default categories with customizable regex-based rules
- **Visual Analytics**: Interactive charts, graphs, and spending breakdowns
- **Monthly Trends**: Track spending patterns over time
- **Subscription Detection**: Automatically identify recurring charges
- **100% Private**: All data stays in your browser's localStorage
- **Fully Offline**: No internet required after initial load
- **Export/Import**: Backup and restore your preferences and data

## Documentation

- **[budget-tracker/README.md](budget-tracker/README.md)** - Complete application documentation, usage guide, and technical details
- **[requirements.md](requirements.md)** - Comprehensive product requirements document
- **[technical_design.md](technical_design.md)** - Architecture and technical design specifications
- **[budget-tracker/TESTING.md](budget-tracker/TESTING.md)** - Testing procedures and file format examples

## Development Workflow

### Running in Development Mode

```bash
cd budget-tracker
npm run dev
```

Hot module replacement (HMR) is enabled - changes appear instantly in your browser.

### Building for Production

```bash
cd budget-tracker
npm run build
```

Generates a single-file HTML bundle in `budget-tracker/dist/index.html`.

### Preview Production Build

```bash
cd budget-tracker
npm run preview
```

Test the production build locally before deployment.

### Type Checking

```bash
cd budget-tracker
npx tsc --noEmit
```

### Linting

```bash
cd budget-tracker
npm run lint
```

## Technology Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS v4
- **Charts**: Chart.js + react-chartjs-2
- **File Parsing**: ofx-data-extractor, papaparse
- **State Management**: React Context API
- **Storage**: Browser localStorage
- **Deployment**: Single HTML file via vite-plugin-singlefile

## Privacy & Security

- **Zero Network Calls**: No data leaves your device
- **No Analytics**: No tracking or telemetry
- **No Backend**: All processing happens in your browser
- **Offline First**: Works completely without internet
- **Your Control**: Export, import, or delete data anytime

## Supported File Formats

### QFX/OFX Files
- Chase Bank
- Fidelity
- Most institutions using standard OFX format

### CSV Files
- Discover Card format
- Headers: `Trans. Date`, `Post Date`, `Description`, `Amount`, `Category`

See `example_data/` for sample files.

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Modern mobile browsers

Requires JavaScript and localStorage enabled.

## Getting Help

1. Check the [budget-tracker/README.md](budget-tracker/README.md) for detailed documentation
2. Review [requirements.md](requirements.md) for feature specifications
3. See [budget-tracker/TESTING.md](budget-tracker/TESTING.md) for file format examples
4. Open an issue on GitHub for bugs or feature requests

## Contributing

This is a personal finance tracker designed for private use. Feel free to fork and customize for your own needs.

## License

MIT License - Free to use, modify, and distribute.

---

**Ready to take control of your finances?** Head to the [budget-tracker](budget-tracker/) directory and follow the README to get started!
