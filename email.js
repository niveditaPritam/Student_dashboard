// email.js
require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  auth: {
    user: "your-brevo-email@example.com", // Replace with your Brevo login email
    pass: process.env.BREVO_API_KEY,      // Your Brevo SMTP key in .env
  },
});

async function sendSuggestionEmail(suggestion) {
  const mailOptions = {
    from: "suggestion-bot@yourdomain.com", // This can be a fictional address
    to: "your-personal-email@example.com",     // The email where you want to receive suggestions
    subject: "New Suggestion for EduHub",
    text: suggestion,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Suggestion email sent successfully.");
    return true;
  } catch (error) {
    console.error("Error sending suggestion email:", error);
    return false;
  }
}

module.exports = { sendSuggestionEmail };