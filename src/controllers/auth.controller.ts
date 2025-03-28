import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';
import { pool } from '../db';

export const register = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  const client = await pool.connect();

  try {
    // Check if user exists
    const existingUser = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await client.query(
      `INSERT INTO users (email, password, name, verification_token)
       VALUES ($1, $2, $3, $4)`,
      [email, hashedPassword, name, verificationToken]
    );

    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error creating user' });
  } finally {
    client.release();
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.params;
  const client = await pool.connect();

  try {
    const result = await client.query(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1 RETURNING *',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Error verifying email' });
  } finally {
    client.release();
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.is_verified) {
      return res.status(401).json({ message: 'Please verify your email first' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  } finally {
    client.release();
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  const client = await pool.connect();

  try {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    const result = await client.query(
      `UPDATE users 
       SET reset_password_token = $1, reset_password_expires = $2 
       WHERE email = $3 
       RETURNING *`,
      [resetToken, resetExpires, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await sendPasswordResetEmail(email, resetToken);

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing password reset' });
  } finally {
    client.release();
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body;
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT * FROM users 
       WHERE reset_password_token = $1 
       AND reset_password_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await client.query(
      `UPDATE users 
       SET password = $1, reset_password_token = NULL, reset_password_expires = NULL 
       WHERE reset_password_token = $2`,
      [hashedPassword, token]
    );

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  } finally {
    client.release();
  }
};

export const getProfile = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  } finally {
    client.release();
  }
};