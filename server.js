import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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
const db = new Database(dbPath);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentName TEXT,
    role TEXT,
    date TEXT,
    timeIn TEXT,
    timeOut TEXT,
    totalHours TEXT,
    imageUrl TEXT
  )
`);

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
    const stmt = db.prepare('SELECT * FROM attendance ORDER BY date DESC');
    const records = stmt.all();
    res.json(records);
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/records', (req, res) => {
  try {
    const record = req.body;
    const stmt = db.prepare(`
      INSERT INTO attendance (studentName, role, date, timeIn, timeOut, totalHours, imageUrl)
      VALUES (@studentName, @role, @date, @timeIn, @timeOut, @totalHours, @imageUrl)
    `);

    const result = stmt.run({
      studentName: record.studentName || '',
      role: record.role || '',
      date: record.date || '',
      timeIn: record.timeIn || '',
      timeOut: record.timeOut || '',
      totalHours: record.totalHours || '',
      imageUrl: record.imageUrl || '',
    });

    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error saving record:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/records/:id', (req, res) => {
  try {
    const { id } = req.params;
    const record = req.body;
    const stmt = db.prepare(`
      UPDATE attendance 
      SET studentName = @studentName,
          role = @role,
          date = @date,
          timeIn = @timeIn,
          timeOut = @timeOut,
          totalHours = @totalHours,
          imageUrl = @imageUrl
      WHERE id = @id
    `);

    const result = stmt.run({
      id: parseInt(id),
      studentName: record.studentName || '',
      role: record.role || '',
      date: record.date || '',
      timeIn: record.timeIn || '',
      timeOut: record.timeOut || '',
      totalHours: record.totalHours || '',
      imageUrl: record.imageUrl || '',
    });

    if (result.changes === 0) {
      res.status(404).json({ error: 'Record not found' });
    } else {
      res.json({ changes: result.changes });
    }
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/records/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM attendance WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Record not found' });
    } else {
      res.json({ changes: result.changes });
    }
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
