import express, { Router } from "express";
import serverless from "serverless-http";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const router = Router();

app.use(express.json());

// Health Check
router.get("/health", (req, res) => {
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.trim();
  
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    config: {
      gmailUserSet: !!gmailUser,
      gmailAppPasswordSet: !!gmailPass,
      gmailAppPasswordLength: gmailPass?.length || 0,
      isCorrectLength: gmailPass?.length === 16,
      adminEmail: process.env.ADMIN_EMAIL || 'Not Set'
    }
  });
});

// API Route for sending emails
router.post("/send-email", async (req, res) => {
  const { to, subject, text, html } = req.body;
  console.log(`[Netlify Function] Received email request to: ${to}`);

  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.trim();

  if (!gmailUser || !gmailPass) {
    return res.status(500).json({ error: "Email service not configured" });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  try {
    await transporter.sendMail({
      from: `"T.U.T. System" <${gmailUser}>`,
      to,
      subject,
      text,
      html,
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error("[Email Error] Failed to send email:", error);
    res.status(500).json({ error: "Failed to send email", details: error.message });
  }
});

app.use("/api/", router);
app.use("/.netlify/functions/api/", router);

export const handler = serverless(app);
