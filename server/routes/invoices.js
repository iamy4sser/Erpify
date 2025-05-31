import express from 'express';
import { pool } from '../models/user.js';

const router = express.Router();

// Get all invoices with filtering
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, status, type } = req.query;
    
    let query = `
      SELECT i.*, c.name as clientName, c.email as clientEmail, c.status as clientType
      FROM invoices i
      JOIN contacts c ON i.client_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      query += ' AND (i.date BETWEEN ? AND ?)';
      params.push(startDate, endDate);
    }

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    if (type) {
      if (type === 'customer') {
        query += ' AND c.status = "customer"';
      } else if (type === 'supplier') {
        query += ' AND c.status = "supplier"';
      }
    }

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Error fetching invoices' });
  }
});

// Other invoice routes...

export default router;