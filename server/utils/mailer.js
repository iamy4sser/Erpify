import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const sendResetPasswordEmail = async (email, resetLink) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `<p>Cliquez sur ce lien pour réinitialiser votre mot de passe : <a href="${resetLink}">${resetLink}</a></p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log('Email de réinitialisation envoyé');
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
};

export { sendResetPasswordEmail };