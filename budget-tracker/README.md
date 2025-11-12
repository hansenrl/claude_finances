# Budget Tracker

A single-page web application for personal financial budget tracking that runs entirely in your browser with no backend required. All data is stored locally on your device for complete privacy.

## Features

- **Multi-Format File Import**: Upload QFX (Chase, Fidelity) and CSV (Discover) files
- **Auto-Categorization**: 15 default categories with customizable regex-based rules
- **Transaction Management**: View, categorize, and exclude transactions
- **Analytics Dashboard**: Summary statistics with date ranges and totals
- **Category Breakdown**: Pie charts and bar charts showing spending by category
- **Monthly Analysis**: Trend lines and stacked charts for month-by-month comparison
- **Subscription Detection**: Automatically identify repeated expenses and subscriptions
- **Data Persistence**: All data saved locally in your browser (localStorage)
- **Export/Import**: Export and import preferences and transaction data as JSON
- **Fully Offline**: No internet connection required after initial page load
- **Single File**: Entire app bundled into one HTML file (512 KB / 162 KB gzipped)

## Getting Started

### Prerequisites

- Node.js 18+ and npm installed on your machine
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

### Installation

1. Navigate to the project directory:
   ```bash
   cd budget-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

To run the application in development mode with hot module replacement:

```bash
npm run dev
```

This will start a local development server (usually at `http://localhost:5173`). Open the URL in your browser and the app will automatically reload when you make changes to the code.

### Building for Production

To build the application as a single HTML file:

```bash
npm run build
```

This command will:
1. Compile TypeScript to JavaScript
2. Bundle all dependencies
3. Inline all CSS and JavaScript
4. Generate a single `index.html` file in the `dist/` directory

**Output**: `dist/index.html` (512 KB / 162 KB gzipped)

### Opening the App

#### Option 1: Direct File Access (Recommended)

Simply open the generated HTML file in your browser:

1. Navigate to the `dist` folder
2. Double-click `index.html` or right-click and select "Open with" → your browser
3. The app will run completely offline with full functionality

#### Option 2: Local Server (Development)

If you prefer using a local server:

```bash
npm run preview
```

This starts a preview server (usually at `http://localhost:4173`) to test the production build.

#### Option 3: Any Static Server

You can host the `dist/index.html` file on any static hosting service:
- GitHub Pages
- Netlify
- Vercel
- AWS S3
- Or copy it to any web server

## Usage

### Uploading Transactions

1. **Drag and drop** QFX or CSV files onto the upload area, or click to select files
2. The app will automatically parse and categorize transactions
3. View parsing errors (if any) in the error panel

### Managing Transactions

- **Sort**: Click column headers in the transaction list to sort
- **Categorize**: Use the dropdown in each row to change categories
- **Exclude**: Check the exclude checkbox to remove transactions from analytics
- **Virtual Scrolling**: Handles 1000+ transactions smoothly

### Viewing Analytics

- **Dashboard**: Overview of total expenses, income, and monthly averages
- **Category Breakdown**: Visual charts showing spending distribution
- **Monthly Analysis**: Track spending trends over time
- **Repeated Expenses**: Identify subscriptions and recurring charges

### Managing Data

#### Settings Panel

- **Categories**: Add custom categories with custom colors
- **Export Preferences**: Download your categories and rules as JSON
- **Import Preferences**: Upload previously exported preferences
- **Export All Data**: Download complete dataset (transactions + preferences)
- **Clear All Data**: Reset the application (requires confirmation)

#### Data Persistence

- All data automatically saves to browser's localStorage
- Persists across browser sessions
- Maximum storage: ~5-10 MB (typically sufficient for thousands of transactions)

## Supported File Formats

### QFX/OFX Files

Supported institutions:
- Chase Bank
- Fidelity
- Most banks using standard OFX format

File characteristics:
- Extension: `.qfx` or `.QFX`
- Contains: Transaction date, amount, merchant name, transaction type

### CSV Files

Supported format (Discover card format):
- Headers: `Trans. Date`, `Post Date`, `Description`, `Amount`, `Category`
- Date format: `MM/DD/YYYY`
- Extension: `.csv`

## Tech Stack

### Core Framework
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server

### Libraries
- **Chart.js** + **react-chartjs-2** - Data visualizations
- **@tanstack/react-virtual** - Virtual scrolling for performance
- **date-fns** - Date formatting and manipulation
- **ofx-data-extractor** - QFX/OFX file parsing
- **papaparse** - CSV file parsing
- **Tailwind CSS v4** - Styling
- **vite-plugin-singlefile** - Single HTML output

### Architecture
- **React Context API** - State management
- **localStorage** - Client-side data persistence
- **Modular design** - Separate parsers, analytics, and UI components

## Project Structure

```
budget-tracker/
├── dist/                     # Production build output
│   └── index.html           # Single-file bundle (deploy this!)
├── src/
│   ├── components/          # React UI components
│   │   ├── FileUploadZone.tsx
│   │   ├── Dashboard.tsx
│   │   ├── CategoryBreakdown.tsx
│   │   ├── MonthlyAnalysis.tsx
│   │   ├── RepeatedExpenses.tsx
│   │   ├── TransactionList.tsx
│   │   └── Settings.tsx
│   ├── context/
│   │   └── AppContext.tsx   # Global state management
│   ├── lib/
│   │   ├── parsers/         # QFX & CSV parsers
│   │   ├── categorization/  # Auto-categorization engine
│   │   ├── analytics/       # Analytics calculations
│   │   ├── storage/         # localStorage manager
│   │   ├── defaults.ts      # Default categories & rules
│   │   └── utils.ts         # Utility functions
│   ├── types/
│   │   └── index.ts         # TypeScript interfaces
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── package.json
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS config
└── tsconfig.app.json        # TypeScript config
```

## Default Categories

The app includes 15 pre-configured categories:

1. Groceries
2. Restaurants & Dining
3. Transportation
4. Gas & Fuel
5. Entertainment
6. Shopping & Retail
7. Utilities
8. Healthcare
9. Insurance
10. Housing
11. Subscriptions
12. Travel
13. Services
14. Income/Payments
15. Other

Each category includes smart auto-categorization rules based on common merchant names.

## Privacy & Security

- **100% Local**: No data ever leaves your browser
- **No Backend**: No server required, no API calls
- **No Tracking**: No analytics, no telemetry, no external scripts
- **Offline-First**: Works without internet connection
- **Your Data**: You control all exports and can delete everything anytime

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Modern mobile browsers (iOS Safari, Chrome Android)

**Note**: Requires JavaScript enabled and localStorage support.

## Troubleshooting

### Upload not working
- Ensure files are `.qfx` or `.csv` format
- Check browser console for specific error messages
- Verify file is not corrupted

### Data not persisting
- Check if localStorage is enabled in browser settings
- Verify you're not in Private/Incognito mode
- Check storage quota (Settings → Storage info)

### Performance issues
- The app handles 1000+ transactions smoothly
- If experiencing slowness, try excluding old transactions
- Consider exporting and clearing old data periodically

### Build errors
- Ensure Node.js 18+ is installed
- Delete `node_modules` and `package-lock.json`, then run `npm install`
- Clear build cache: `rm -rf dist node_modules/.vite`

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npx tsc --noEmit

# Lint code
npm run lint
```

## Contributing

This is a personal finance tracker designed for local, private use. Feel free to fork and customize for your needs.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with React, TypeScript, and Vite
- Charts powered by Chart.js
- Financial data parsing by ofx-data-extractor and papaparse
- Styling with Tailwind CSS
