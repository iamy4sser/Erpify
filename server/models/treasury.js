import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_ERP_HOST,
  user: process.env.DB_ERP_USER,
  password: process.env.DB_ERP_PASSWORD,
  database: process.env.DB_ERP_NAME,
  port: process.env.DB_ERP_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const createScenario = async (name, description, data) => {
  const [result] = await pool.execute(
    'INSERT INTO treasury_scenarios (name, description, data) VALUES (?, ?, ?)',
    [name || '', description || '', JSON.stringify(data || {})]
  );
  return result.insertId;
};

const getScenarios = async () => {
  const [rows] = await pool.execute('SELECT * FROM treasury_scenarios');
  return rows.map(row => ({
    ...row,
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
  }));
};

const updateScenario = async (id, name, description, data) => {
  await pool.execute(
    'UPDATE treasury_scenarios SET name = ?, description = ?, data = ? WHERE id = ?',
    [name || '', description || '', JSON.stringify(data || {}), id]
  );
};

const deleteScenario = async (id) => {
  await pool.execute('DELETE FROM treasury_scenarios WHERE id = ?', [id]);
};

export { createScenario, getScenarios, updateScenario, deleteScenario };