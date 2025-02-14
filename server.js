import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);
app.use(express.json());

// Serve static files from the dist directory with proper MIME types and logging
app.use(
  express.static(join(__dirname, 'dist'), {
    setHeaders: (res, path) => {
      console.log('Serving static file:', path);
      if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
        console.log('Set JS MIME type for:', path);
      } else if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
        console.log('Set CSS MIME type for:', path);
      }
    },
  })
);

// Log all requests
app.use((req, res, next) => {
  console.log('Request:', req.method, req.path, 'Headers:', req.headers);
  next();
});

// Ensure data directory exists
const dataDir = join(__dirname, 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const dbPath = join(dataDir, 'attendance.db');
const db = new Database(dbPath, { verbose: console.log });

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

// API Routes
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

// Handle all other routes by serving the index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
