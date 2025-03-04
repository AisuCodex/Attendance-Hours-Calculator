import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const dbPath = path.join(dataDir, 'attendance.db');
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentName TEXT,
      role TEXT,
      date TEXT,
      timeIn TEXT,
      timeOut TEXT,
      totalHours TEXT,
      imageUrl TEXT,
      createdAt INTEGER DEFAULT (strftime('%s','now') * 1000 + (strftime('%f','now') % 1000))
    )
  `);
});

// Serve static files with proper MIME types
app.use(
  express.static(path.join(__dirname, 'dist'), {
    setHeaders: (res, filepath) => {
      if (filepath.endsWith('.js')) {
        res.set('Content-Type', 'application/javascript');
      } else if (filepath.endsWith('.css')) {
        res.set('Content-Type', 'text/css');
      }
    },
  })
);

// API Routes
app.get('/api/records', (req, res) => {
  try {
    const sortOrder = req.query.sort || 'desc';
    const orderBy = sortOrder === 'asc' ? 'ASC' : 'DESC';

    db.all(
      `SELECT * FROM attendance ORDER BY createdAt ${orderBy}`,
      [],
      (err, rows) => {
        if (err) {
          console.error('Error fetching records:', err);
          return res.status(500).json({ error: err.message });
        }
        res.json(rows);
      }
    );
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/records', (req, res) => {
  try {
    const record = req.body;
    const sql = `
      INSERT INTO attendance (
        studentName, 
        role, 
        date, 
        timeIn, 
        timeOut, 
        totalHours, 
        imageUrl,
        createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const now = Date.now(); // Current timestamp in milliseconds

    db.run(
      sql,
      [
        record.studentName || '',
        record.role || '',
        record.date || '',
        record.timeIn || '',
        record.timeOut || '',
        record.totalHours || '',
        record.imageUrl || '',
        now,
      ],
      function (err) {
        if (err) {
          console.error('Error saving record:', err);
          return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, createdAt: now });
      }
    );
  } catch (error) {
    console.error('Error saving record:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/records/:id', (req, res) => {
  try {
    const { id } = req.params;
    const record = req.body;
    const sql = `
      UPDATE attendance 
      SET studentName = ?,
          role = ?,
          date = ?,
          timeIn = ?,
          timeOut = ?,
          totalHours = ?,
          imageUrl = ?
      WHERE id = ?
    `;

    db.run(
      sql,
      [
        record.studentName || '',
        record.role || '',
        record.date || '',
        record.timeIn || '',
        record.timeOut || '',
        record.totalHours || '',
        record.imageUrl || '',
        parseInt(id),
      ],
      function (err) {
        if (err) {
          console.error('Error updating record:', err);
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Record not found' });
        }

        res.json({ changes: this.changes });
      }
    );
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/records/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.run('DELETE FROM attendance WHERE id = ?', id, function (err) {
      if (err) {
        console.error('Error deleting record:', err);
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }

      res.json({ changes: this.changes });
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle client-side routing - must be after API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
