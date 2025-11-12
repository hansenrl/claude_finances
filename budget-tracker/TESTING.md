# Testing Guide

## Quick Test Results

The example CSV file (`example_anonymized.csv`) has been successfully tested with the parser.

### Test Results:
- ✅ **48 transactions** parsed successfully
- ✅ **38 debits** (expenses): $657.81
- ✅ **10 credits** (payments): $1,030.64
- ✅ **Net balance**: $372.83
- ✅ **3 repeated expenses** detected (subscription candidates)

### Repeated Expenses Found:
1. **CHARITY DONATE** - 10 monthly occurrences (~$12.50/month)
2. **CLOUD *STREAMSERVICE** - 10 monthly occurrences (~$9.49/month)
3. **ONLINE *SUPPORT MEMBER** - 10 monthly occurrences (varying amounts)

## Manual Testing

### Dev Server Running:
The application is running at: **http://localhost:5173/**

### Test Steps:

1. **Upload File**
   - Open http://localhost:5173/ in your browser
   - Drag `example_anonymized.csv` onto the upload zone
   - OR click to browse and select the file

2. **Verify Dashboard**
   - Total Expenses: $657.81
   - Total Income: $1,030.64
   - Net: $372.83
   - 48 transactions
   - 10 months coverage

3. **Check Charts**
   - Category pie chart should show distribution
   - Bar charts should show category totals
   - Monthly trend line should show 10 months
   - Stacked bars should show category breakdown per month

4. **Verify Repeated Expenses**
   - Should display 3 repeated expenses
   - Each should show subscription badge (monthly interval ~30 days)
   - Click to expand and see individual transactions

5. **Test Transaction List**
   - All 48 transactions visible
   - Sort by clicking column headers
   - Change category via dropdown
   - Exclude transactions and watch totals update

6. **Test Persistence**
   - Refresh the page
   - Data should persist from localStorage
   - Settings and preferences should remain

7. **Test Production Build**
   ```bash
   npm run build
   ```
   - Open `dist/index.html` directly in browser
   - Upload the CSV file again
   - Verify identical functionality works offline

## Expected Behavior

### Auto-Categorization Results:
- **Restaurants**: "FRESH BOWL BISTRO", "TASTY NOODLE HOUSE"
- **Services**: "CHARITY DONATE", "CLOUD *STREAMSERVICE", etc.
- **Merchandise**: "ONLINE *SUPPORT MEMBER"
- **Payments and Credits**: "AUTOPAY FULL BALANCE"

### Monthly Breakdown:
- February 2025: 4 transactions
- March 2025: 5 transactions
- April 2025: 5 transactions
- May 2025: 5 transactions
- And so on through November 2025

### Subscription Detection:
All 3 repeated expenses should be flagged as "Likely Subscriptions" because:
- Same merchant appears multiple times
- Amounts are similar (within 10% tolerance)
- ~30 day intervals between transactions

## Verification Checklist

- [ ] CSV file uploads successfully
- [ ] 48 transactions appear in list
- [ ] Dashboard shows correct totals
- [ ] Pie chart renders
- [ ] Bar charts render
- [ ] Line chart shows trend
- [ ] Stacked bar chart shows months
- [ ] 3 repeated expenses detected
- [ ] Subscription badges shown
- [ ] Transaction list sortable
- [ ] Category dropdown works
- [ ] Exclude checkbox functions
- [ ] Totals update when excluding
- [ ] Settings panel opens
- [ ] Custom category can be added
- [ ] Export preferences downloads JSON
- [ ] Page refresh persists data
- [ ] Production build works offline

## Troubleshooting

If you encounter issues:

1. **Check browser console** for errors
2. **Verify localStorage** is enabled (not in incognito)
3. **Clear localStorage** if data seems corrupted:
   ```javascript
   localStorage.clear()
   ```
4. **Rebuild** if changes aren't reflected:
   ```bash
   npm run build
   ```
