const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'akashalpha55@gmail.com',          // your email
    pass: 'cemhsdkloufiwncl'             // Gmail App Password
  }
});

/**
 * @param {string} to - recipient email
 * @param {string} subject - subject of the mail
 * @param {string} html - HTML content of the mail
 */
const sendMail = async (to, subject, html) => {
  const mailOptions = {
    from: `"FixIt Support" <akashalpha55@gmail.com>`,
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
