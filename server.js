import express from 'express';
import cors from 'cors';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// PostgreSQL connection configuration
const { Pool } = pg;

// Log the database URL (without sensitive information)
console.log(
  'Database connection attempt with URL:',
  process.env.DATABASE_URL ? 'URL provided' : 'No URL provided'
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  // Add connection timeout
  connectionTimeoutMillis: 5000,
  // Add idle timeout
  idleTimeoutMillis: 30000,
  // Maximum number of clients the pool should contain
  max: 20,
});

// Test database connection and create table if it doesn't exist
async function initializeDatabase() {
  let client;
  try {
    // Test the connection
    client = await pool.connect();
    console.log('Successfully connected to the database');

    // Create the attendance table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        studentName TEXT,
        role TEXT,
        date TEXT,
        timeIn TEXT,
        timeOut TEXT,
        totalHours TEXT,
        imageUrl TEXT,
        createdAt BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
      )
    `);

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error details:', {
      message: err.message,
      code: err.code,
      stack: err.stack,
      connectionString: process.env.DATABASE_URL ? 'URL exists' : 'No URL',
    });

    // Don't exit the process, just log the error
    console.error(
      'Warning: Database initialization failed, will retry on requests'
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Initialize database but don't exit if it fails
initializeDatabase().catch(console.error);

// Add a connection error handler
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// API Routes
app.get('/api/records', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const sortOrder = req.query.sort || 'desc';
    const orderBy = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const result = await client.query(
      'SELECT * FROM attendance ORDER BY createdAt ' + orderBy
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching records:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    res.status(500).json({
      error: error.message,
      code: error.code,
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

app.post('/api/records', async (req, res) => {
  try {
    const record = req.body;
    const now = Date.now();

    const result = await pool.query(
      `INSERT INTO attendance 
        (studentName, role, date, timeIn, timeOut, totalHours, imageUrl, createdAt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, createdAt`,
      [
        record.studentName || '',
        record.role || '',
        record.date || '',
        record.timeIn || '',
        record.timeOut || '',
        record.totalHours || '',
        record.imageUrl || '',
        now,
      ]
    );

    res.json({
      id: result.rows[0].id,
      createdAt: result.rows[0].createdat,
    });
  } catch (error) {
    console.error('Error saving record:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const record = req.body;

    const result = await pool.query(
      `UPDATE attendance 
       SET studentName = $1,
           role = $2,
           date = $3,
           timeIn = $4,
           timeOut = $5,
           totalHours = $6,
           imageUrl = $7
       WHERE id = $8
       RETURNING *`,
      [
        record.studentName || '',
        record.role || '',
        record.date || '',
        record.timeIn || '',
        record.timeOut || '',
        record.totalHours || '',
        record.imageUrl || '',
        parseInt(id),
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ changes: result.rowCount });
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM attendance WHERE id = $1', [
      parseInt(id),
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ changes: result.rowCount });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle client-side routing
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
