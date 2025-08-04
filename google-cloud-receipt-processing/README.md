# Receipt Processing Script

This script processes email receipts through the following steps:

1. **Search & Fetch**: Finds emails based on your query.

2. **PDF Logic**:
   - If a PDF attachment exists, it uses that.
   - If not, it takes the email's HTML body and uses Puppeteer (a headless browser) to convert it into a PDF on the fly.

3. **Create Unique ID**: Generates a unique ID for each receipt based on the email's date (e.g., `2023-10-27_...`).

4. **Archive to Drive**: Saves the resulting PDF (original or generated) to a specific Google Drive folder, named with the unique ID.

5. **Process with Document AI**: Extracts structured data like company name and cost.

6. **Log to Google Sheets**: Appends a new row to a Google Sheet with the extracted `companyName` and the `uniqueId`.