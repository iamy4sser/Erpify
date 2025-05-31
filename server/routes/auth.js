import express from 'express';
import jwt from 'jsonwebtoken';
import { createUser, getUserByEmail, getUserById, comparePassword, pool } from '../models/user.js';
import { forgotPasswordSchema, loginSchema, registerSchema } from '../types/auth.js';
import { z } from 'zod';
import { sendResetPasswordEmail } from '../utils/mailer.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    registerSchema.parse(req.body);
    const { name, email, password } = req.body;

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà enregistré' });
    }

    const user = await createUser(name, email, password);
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ message: 'Utilisateur créé', user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'utilisateur:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Erreur lors de la création de l\'utilisateur' });
  }
});

router.post('/login', async (req, res) => {
  try {
    loginSchema.parse(req.body);
    const { email, password } = req.body;

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const userDetails = await getUserById(user.id);

    res.json({ message: 'Connecté avec succès', user: userDetails, token });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Erreur lors de la connexion' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Non autorisé' });
      }

      const user = await getUserById(decoded.id);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      res.json(user);
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil utilisateur:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du profil utilisateur' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const [rows] = await pool.execute(
      'UPDATE users SET reset_password_token = ?, reset_password_expire = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?',
      [resetToken, user.id]
    );

    if (rows.affectedRows === 0) {
      return res.status(500).json({ message: 'Erreur lors de la mise à jour du token de réinitialisation' });
    }

    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
    await sendResetPasswordEmail(email, resetLink);

    res.json({ message: 'Un email de réinitialisation a été envoyé' });
  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation du mot de passe:', error);
    res.status(500).json({ message: 'Erreur lors de la demande de réinitialisation du mot de passe' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expire > NOW()',
      [token]
    );

    const user = rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Token de réinitialisation invalide ou expiré' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.execute(
      'UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expire = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation du mot de passe' });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    // Verify the token with Google's API
    const googleResponse = await axios.get('https://www.googleapis.com/oauth2/v3/tokeninfo', {
      params: { access_token: token }
    });

    const { email, name, sub } = googleResponse.data;

    // Check if the user already exists
    let user = await getUserByEmail(email);

    if (!user) {
      // Create a new user
      const newUser = await pool.execute(
        'INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)',
        [name, email, sub]
      );
      user = { id: newUser[0].insertId, name, email };
    }

    // Generate a JWT token
    const jwtToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const userDetails = await getUserById(user.id);

    res.json({ message: 'Connecté avec succès', user: userDetails, token: jwtToken });
  } catch (error) {
    console.error('Error during Google login:', error);
    res.status(500).json({ message: 'Error during Google login' });
  }
});

export default router;