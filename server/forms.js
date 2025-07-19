import express from 'express';
import Repair from './models/Repair.js';
import Cleaning from './models/Cleaning.js';
import Message from './models/Message.js';
import { appendToSheet } from './googleSheets.js';

const router = express.Router();

// Submit repair form
router.post('/repair', async (req, res) => {
  try {
    const repair = await Repair.create(req.body);
    // Save to Google Sheets
    await appendToSheet({
      values: [repair.name, repair.address, repair.issue, new Date().toISOString()],
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Repairs!A:D',
      apiKey: process.env.GOOGLE_API_KEY
    });
    res.status(201).json(repair);
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit repair' });
  }
});

// Submit cleaning form
router.post('/cleaning', async (req, res) => {
  try {
    const cleaning = await Cleaning.create(req.body);
    // Save to Google Sheets
    await appendToSheet({
      values: [cleaning.name, cleaning.address, cleaning.date, new Date().toISOString()],
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Cleaning!A:D',
      apiKey: process.env.GOOGLE_API_KEY
    });
    res.status(201).json(cleaning);
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit cleaning' });
  }
});

// Submit message form
router.post('/message', async (req, res) => {
  try {
    const message = await Message.create(req.body);
    // Save to Google Sheets
    await appendToSheet({
      values: [message.name, message.email, message.body, new Date().toISOString()],
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Messages!A:D',
      apiKey: process.env.GOOGLE_API_KEY
    });
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: 'Failed to send message' });
  }
});

export default router;
