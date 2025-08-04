const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const {DocumentProcessorServiceClient} = require('@google-cloud/documentai').v1;
const puppeteer = require('puppeteer');
const { Readable } = require('stream');

// =========================================================================
// ===================  UPDATE THESE VARIABLES  ============================
// =========================================================================

// Gmail API search query
const GMAIL_SEARCH_QUERY = 'subject:"Your receipt from" has:attachment';

// Document AI Processor Details
const DOC_AI_PROJECT_ID = 'your-gcp-project-id';
const DOC_AI_LOCATION = 'us'; // e.g., 'us' or 'eu'
const DOC_AI_PROCESSOR_ID = 'your-processor-id';

// Google Drive Folder ID to store the processed PDFs
const GOOGLE_DRIVE_FOLDER_ID = 'your-drive-folder-id';

// Google Sheet Details for logging results
const GOOGLE_SHEET_ID = 'your-google-sheet-id';
const SHEET_NAME = 'Sheet1'; // The name of the sheet/tab to write to

// =========================================================================
// =========================================================================

// Add Drive and Sheets scopes. If you change these, DELETE token.json.
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/drive.file', // To create files in Drive
    'https://www.googleapis.com/auth/spreadsheets', // To write to Sheets
];

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

// --- AUTHENTICATION (Similar to before) ---
async function loadSavedCredentialsIfExist() { /* ... no changes ... */ }
async function saveCredentials(client) { /* ... no changes ... */ }
async function authorize() { /* ... no changes, but will use new SCOPES ... */ }

/**
 * Lists messages in the user's account.
 */
async function listMessages(auth) {
    const gmail = google.gmail({version: 'v1', auth});
    console.log(`Searching for emails matching query: "${GMAIL_SEARCH_QUERY}"...`);
    const res = await gmail.users.messages.list({
        userId: 'me',
        q: GMAIL_SEARCH_QUERY,
        maxResults: 5, // Limit for example
    });
    return res.data.messages || [];
}

/**
 * Fetches email details, including date and parts.
 */
async function getMessageDetails(auth, messageId) {
    const gmail = google.gmail({version: 'v1', auth});
    const res = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full', // We need full format for the body
    });
    return res.data;
}

/**
 * Creates a unique ID from the email date and message ID.
 * @param {object} messageData The full message data from Gmail API.
 * @returns {string} A unique identifier like "2023-10-27_18b7c6d5e4f3a2b1"
 */
function createUniqueId(messageData) {
    const date = new Date(parseInt(messageData.internalDate));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}_${messageData.id}`;
}

/**
 * Extracts a PDF attachment OR generates a PDF from the email body.
 * @returns {Promise<string|null>} Base64 encoded PDF data or null.
 */
async function getOrCreatePdf(auth, messageData) {
    const gmail = google.gmail({version: 'v1', auth});
    const payload = messageData.payload;

    // 1. Prioritize finding a PDF attachment
    const pdfPart = payload.parts?.find(p => p.mimeType === 'application/pdf');
    if (pdfPart && pdfPart.body.attachmentId) {
        console.log(`  - Found PDF attachment: ${pdfPart.filename}`);
        const attachment = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: messageData.id,
            id: pdfPart.body.attachmentId,
        });
        return attachment.data.data;
    }

    // 2. Fallback: Generate PDF from HTML body
    console.log('  - No PDF attachment found. Generating PDF from email body.');
    let htmlBody = '';
    if (payload.body.size > 0 && payload.mimeType === 'text/html') {
        htmlBody = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else {
        const htmlPart = payload.parts?.find(p => p.mimeType === 'text/html');
        if (htmlPart) {
            htmlBody = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
        }
    }

    if (!htmlBody) {
        console.error('  - Could not find HTML body to generate PDF.');
        return null;
    }

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(htmlBody, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();
    console.log('  - Successfully generated PDF from email body.');
    return pdfBuffer.toString('base64');
}


/**
 * Uploads a file (from a Base64 string) to Google Drive.
 */
async function uploadToDrive(auth, pdfBase64, fileName) {
    const drive = google.drive({ version: 'v3', auth });
    const fileMetadata = {
        name: `${fileName}.pdf`,
        parents: [GOOGLE_DRIVE_FOLDER_ID],
    };
    const media = {
        mimeType: 'application/pdf',
        body: Readable.from(Buffer.from(pdfBase64, 'base64')),
    };
    try {
        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        });
        console.log(`  - Successfully uploaded to Drive. File ID: ${file.data.id}`);
        return file.data.id;
    } catch (err) {
        console.error('  - Error uploading to Drive:', err.message);
    }
}


/**
 * Processes a receipt PDF using Document AI and extracts key info.
 * @returns {Promise<object|null>} Extracted data or null.
 */
async function processReceipt(pdfBase64) {
    const docAIClient = new DocumentProcessorServiceClient({ keyFilename: 'service-account-key.json' });
    const name = `projects/${DOC_AI_PROJECT_ID}/locations/${DOC_AI_LOCATION}/processors/${DOC_AI_PROCESSOR_ID}`;

    const request = {
        name,
        rawDocument: { content: pdfBase64, mimeType: 'application/pdf' },
    };

    console.log('  - Sending to Document AI for processing...');
    const [result] = await docAIClient.processDocument(request);
    const { document } = result;
    console.log('  - Document AI processing complete.');

    const supplier = document.entities.find(e => e.type === 'supplier_name')?.mentionText;
    const total = document.entities.find(e => e.type === 'total_amount')?.mentionText;
    
    if (supplier || total) {
        const extractedData = {
            companyName: supplier || 'N/A',
            totalCost: total || 'N/A',
        };
        console.log(`  - Extracted Data: Company='${extractedData.companyName}', Total='${extractedData.totalCost}'`);
        return extractedData;
    } else {
        console.log('  - Could not find supplier name or total amount.');
        return null;
    }
}

/**
 * Appends a new row of data to the specified Google Sheet.
 */
async function appendToSheet(auth, uniqueId, data) {
    const sheets = google.sheets({ version: 'v4', auth });
    const values = [[uniqueId, data.companyName, data.totalCost]]; // The data to append
    const resource = { values };
    try {
        const result = await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: `${SHEET_NAME}!A1`, // Append after the last row in this sheet
            valueInputOption: 'USER_ENTERED',
            resource,
        });
        console.log(`  - Successfully appended to Google Sheet. ${result.data.updates.updatedCells} cells updated.`);
    } catch (err) {
        console.error('  - Error updating Google Sheet:', err.message);
    }
}

/**
 * Main orchestration function.
 */
async function main() {
    // 1. Authenticate with all required permissions
    const auth = await authorize();

    // 2. Find matching emails
    const messages = await listMessages(auth);
    if (messages.length === 0) {
        console.log('No new messages to process.');
        return;
    }

    // 3. Process each email one by one
    for (const message of messages) {
        console.log(`\nProcessing message ID: ${message.id}`);
        const messageData = await getMessageDetails(auth, message.id);
        const uniqueId = createUniqueId(messageData);
        console.log(`  - Generated Unique ID: ${uniqueId}`);

        const pdfBase64 = await getOrCreatePdf(auth, messageData);

        if (pdfBase64) {
            // 4. Archive to Drive, process with AI, and log to Sheet
            await uploadToDrive(auth, pdfBase64, uniqueId);
            const extractedData = await processReceipt(pdfBase64);

            if (extractedData) {
                await appendToSheet(auth, uniqueId, extractedData);
            }
        } else {
            console.log('  - Skipping message due to PDF creation failure.');
        }
    }
    console.log('\nScript finished.');
}

// Helper functions for auth (no changes)
async function loadSavedCredentialsIfExist() { try { const c = await fs.readFile(TOKEN_PATH); return google.auth.fromJSON(JSON.parse(c)); } catch (e) { return null; } }
async function saveCredentials(client) { const c = await fs.readFile(CREDENTIALS_PATH); const k = JSON.parse(c); const key = k.installed || k.web; const p = JSON.stringify({ type: 'authorized_user', client_id: key.client_id, client_secret: key.client_secret, refresh_token: client.credentials.refresh_token, }); await fs.writeFile(TOKEN_PATH, p); }
async function authorize() { let c = await loadSavedCredentialsIfExist(); if (c) return c; c = await authenticate({ scopes: SCOPES, keyfilePath: CREDENTIALS_PATH, }); if (c.credentials) await saveCredentials(c); return c; }

main().catch(console.error);