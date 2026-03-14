# Receipt Processing Script

This script processes receipts and adds a row to a google sheet.

│ ---                                                                                                                                       │
GCP Setup Guide (user must do manually)                                                                                           │
│                                                                                                                                           │
│ 1a. Create GCP Project & Enable APIs                                                                                                      │
│                                                                                                                                           │
│ 1. Go to console.cloud.google.com                                                                                                         │
│ 2. Create a new project (or use existing)                                                                                                 │
│ 3. Enable these APIs (APIs & Services → Library):                                                                                         │
│   - Cloud Document AI API                                                                                                                 │
│   - Google Drive API                                                                                                                      │
│   - Google Sheets API                                                                                                                     │
│                                                                                                                                           │
│ 1b. Create Document AI Expense Parser                                                                                                     │
│                                                                                                                                           │
│ 1. Go to Document AI → Processors → Create Processor                                                                                      │
│ 2. Choose Expense Parser (pre-trained, no training needed)                                                                                │
│ 3. Select region (e.g., us)                                                                                                               │
│ 4. Note the Processor ID from the processor details page                                                                                  │
│                                                                                                                                           │
│ 1c. Create Service Account                                                                                                                │
│                                                                                                                                           │
│ 1. Go to IAM & Admin → Service Accounts → Create                                                                                          │
│ 2. Name it something like receipt-processor                                                                                               │
│ 3. Grant role: Document AI API User                                                                                                       │
│ 4. Click into the service account → Keys → Add Key → JSON                                                                                 │
│ 5. Download the key file, save as service-account-key.json in the project directory                                                       │
│                                                                                                                                           │
│ 1d. Set Up Drive & Sheets                                                                                                                 │
│                                                                                                                                           │
│ 1. Create two Google Drive folders: "Unprocessed Receipts" and "Processed Receipts"                                                       │
│ 2. Note each folder's ID (from the URL: drive.google.com/drive/folders/<FOLDER_ID>)                                                       │
│ 3. Share both folders with the service account email (e.g., receipt-processor@your-project.iam.gserviceaccount.com) — give it Editor      │
│ access                                                                                                                                    │
│ 4. Create a Google Sheet for logging                                                                                                      │
│ 5. Share the sheet with the service account email — give it Editor access                                                                 │
│ 6. Note the Sheet ID (from the URL)