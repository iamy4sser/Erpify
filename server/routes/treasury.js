import express from 'express';
import { pool } from '../models/user.js';
import { treasuryScenarioSchema, treasuryEntrySchema } from '../types/finance.js';
import { z } from 'zod';

const router = express.Router();

// Get all scenarios
router.get('/scenarios', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM treasury_scenarios ORDER BY `order`');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({ message: 'Error fetching scenarios' });
  }
});

// Create new scenario
router.post('/scenarios', async (req, res) => {
  try {
    const data = treasuryScenarioSchema.parse(req.body);
    
    const [result] = await pool.execute(
      'INSERT INTO treasury_scenarios (name, description, type, `order`) VALUES (?, ?, ?, ?)',
      [data.name, data.description, data.type, data.order]
    );

    const [scenario] = await pool.execute(
      'SELECT * FROM treasury_scenarios WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(scenario[0]);
  } catch (error) {
    console.error('Error creating scenario:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors[0].message });
    } else {
      res.status(500).json({ message: 'Error creating scenario' });
    }
  }
});

// Delete scenario
router.delete('/scenarios/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM treasury_scenarios WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting scenario:', error);
    res.status(500).json({ message: 'Error deleting scenario' });
  }
});

// Get entries for date range
router.get('/entries', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM treasury_entries';
    const params = [];

    if (startDate && endDate) {
      query += ' WHERE month BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ message: 'Error fetching entries' });
  }
});

// Create or update entry
router.post('/entries', async (req, res) => {
  try {
    const data = treasuryEntrySchema.parse(req.body);

    // Try to update first
    const [updateResult] = await pool.execute(
      'UPDATE treasury_entries SET amount = ? WHERE scenario_id = ? AND month = ?',
      [data.amount, data.scenario_id, data.month]
    );

    // If no rows were updated, insert new entry
    if (updateResult.affectedRows === 0) {
      const [insertResult] = await pool.execute(
        'INSERT INTO treasury_entries (scenario_id, month, amount) VALUES (?, ?, ?)',
        [data.scenario_id, data.month, data.amount]
      );

      const [entry] = await pool.execute(
        'SELECT * FROM treasury_entries WHERE id = ?',
        [insertResult.insertId]
      );

      res.status(201).json(entry[0]);
    } else {
      const [entry] = await pool.execute(
        'SELECT * FROM treasury_entries WHERE scenario_id = ? AND month = ?',
        [data.scenario_id, data.month]
      );

      res.json(entry[0]);
    }
  } catch (error) {
    console.error('Error creating/updating entry:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors[0].message });
    } else {
      res.status(500).json({ message: 'Error creating/updating entry' });
    }
  }
});

export default router;