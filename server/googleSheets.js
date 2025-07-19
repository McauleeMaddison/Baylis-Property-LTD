import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

const sheets = google.sheets('v4');

export async function appendToSheet({ values, spreadsheetId, range, apiKey }) {
  const auth = apiKey;
  return sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    resource: { values: [values] },
    key: auth
  });
}
