import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
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

const createUser = async (name, email, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const [rows] = await pool.execute(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [name, email, hashedPassword]
  );
  return { id: rows.insertId, name, email };
};

const getUserByEmail = async (email) => {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  return rows[0];
};

const getUserById = async (id) => {
  const [rows] = await pool.execute(
    'SELECT id, name, email, avatar_url, google_id, created_at, updated_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0];
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

export { createUser, getUserByEmail, getUserById, comparePassword, pool };