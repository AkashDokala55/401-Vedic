// utils/sendMail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,      // yourgmail@gmail.com
    pass: process.env.MAIL_PASS       // Gmail App Password
  }
});

/**
 * @param {string} to - recipient email
 * @param {string} subject - subject of the mail
 * @param {string} html - HTML content of the mail
 */
const sendMail = async (to, subject, html) => {
  const mailOptions = {
    from: `"FixIt Support" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);
  } catch (err) {
    console.error(`❌ Email failed to ${to}:`, err.message);
  }
};

module.exports = sendMail;
