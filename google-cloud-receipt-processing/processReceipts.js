const crypto = require('crypto');
const { google } = require('googleapis');
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;

const config = require('./config.json');

const SERVICE_ACCOUNT_KEY_PATH = config.serviceAccountKeyPath;
const UNPROCESSED_FOLDER_ID = config.unprocessedFolderId;
const PROCESSED_FOLDER_ID = config.processedFolderId;
const DOC_AI_PROJECT_ID = config.docAi.projectId;
const DOC_AI_LOCATION = config.docAi.location;
const DOC_AI_PROCESSOR_ID = config.docAi.processorId;
const GOOGLE_SHEET_ID = config.googleSheetId;
const SHEET_NAME = config.sheetName || 'Sheet1';

/**
 * Creates authenticated Google API clients using the service account.
 */
function createClients() {
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_KEY_PATH,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });

  const drive = google.drive({ version: 'v3', auth });
  const sheets = google.sheets({ version: 'v4', auth });
  const docAIClient = new DocumentProcessorServiceClient({
    keyFilename: SERVICE_ACCOUNT_KEY_PATH,
  });

  return { drive, sheets, docAIClient };
}

/**
 * Lists files in the unprocessed Drive folder.
 */
async function listUnprocessedFiles(drive) {
  const res = await drive.files.list({
    q: `'${UNPROCESSED_FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType)',
  });
  return res.data.files || [];
}

/**
 * Downloads a file from Drive and returns its content as base64.
 */
async function downloadFile(drive, fileId) {
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  const buffer = Buffer.from(res.data);
  return { buffer, base64: buffer.toString('base64') };
}

/**
 * Sends a document to Document AI Expense Parser and extracts fields.
 */
async function processWithDocumentAI(docAIClient, base64Content, mimeType) {
  const name = `projects/${DOC_AI_PROJECT_ID}/locations/${DOC_AI_LOCATION}/processors/${DOC_AI_PROCESSOR_ID}`;

  const [result] = await docAIClient.processDocument({
    name,
    rawDocument: { content: base64Content, mimeType },
  });

  const entities = result.document?.entities || [];
  const get = (type) => entities.find((e) => e.type === type)?.mentionText || '';

  return {
    date: get('receipt_date'),
    vendor: get('supplier_name'),
    total: get('total_amount'),
    tax: get('total_tax_amount'),
  };
}

const HEADERS = ['Date', 'Vendor', 'Total', 'Tax', 'Filename', 'File Hash'];

/**
 * Ensures the header row exists in the sheet. Writes headers if row 1 is empty.
 */
async function ensureHeaders(sheets) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A1:F1`,
  });

  const firstRow = res.data.values?.[0];
  if (!firstRow || firstRow.every((cell) => !cell)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A1:F1`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [HEADERS] },
    });
    console.log('  - Wrote header row.');
  }
}

/**
 * Appends a row of extracted data to the Google Sheet.
 */
async function appendToSheet(sheets, rowData) {
  const values = [[
    rowData.date,
    rowData.vendor,
    rowData.total,
    rowData.tax,
    rowData.filename,
    rowData.fileHash,
  ]];

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values },
  });

  console.log(`  - Appended to sheet. ${res.data.updates.updatedCells} cells updated.`);
}

/**
 * Moves a file from the unprocessed folder to the processed folder,
 * renaming it to the content hash for unique identification.
 */
async function moveToProcessed(drive, fileId, newName) {
  await drive.files.update({
    fileId,
    resource: { name: newName },
    addParents: PROCESSED_FOLDER_ID,
    removeParents: UNPROCESSED_FOLDER_ID,
    fields: 'id, parents',
  });
}

/**
 * Main orchestration function.
 */
async function main() {
  const { drive, sheets, docAIClient } = createClients();

  // 1. List files in the unprocessed folder
  const files = await listUnprocessedFiles(drive);
  if (files.length === 0) {
    console.log('No files to process.');
    return;
  }
  console.log(`Found ${files.length} file(s) to process.\n`);

  await ensureHeaders(sheets);

  let processed = 0;
  let failed = 0;

  // 2. Process each file
  for (const file of files) {
    console.log(`Processing: ${file.name}`);
    try {
      // Download
      const { buffer, base64 } = await downloadFile(drive, file.id);
      const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
      const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
      console.log(`  - Downloaded. Hash: ${fileHash}`);

      // Extract with Document AI
      const extracted = await processWithDocumentAI(docAIClient, base64, file.mimeType);
      console.log(`  - Extracted: vendor="${extracted.vendor}", total="${extracted.total}"`);

      // Append to sheet
      console.log('  - Appending to sheet...');
      await appendToSheet(sheets, { ...extracted, filename: file.name, fileHash });
      console.log('  - Appended to sheet.');

      // Move to processed, renamed to its content hash
      console.log('  - Moving to processed folder...');
      await moveToProcessed(drive, file.id, `${fileHash}${ext}`);
      console.log('  - Moved to processed folder.');

      processed++;
    } catch (err) {
      console.error(`  - Error processing ${file.name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Processed: ${processed}, Failed: ${failed}`);
}

main().catch(console.error);
