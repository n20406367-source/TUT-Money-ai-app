import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health Check
  app.get("/api/health", (req, res) => {
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
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, text, html } = req.body;
    console.log(`[Server] Received email request to: ${to}, subject: ${subject}`);

    const gmailUser = process.env.GMAIL_USER?.trim();
    const gmailPass = process.env.GMAIL_APP_PASSWORD?.trim();

    if (!gmailUser || !gmailPass) {
      console.error("[Server] Gmail credentials not configured");
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
      console.log(`[Server] Email sent successfully to: ${to}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Email Error] Failed to send email:", error);
      
      let errorMessage = "Failed to send email";
      if (error.code === 'EAUTH') {
        errorMessage = "Gmail Login Failed: Please check your GMAIL_USER and GMAIL_APP_PASSWORD. Ensure you are using a 16-character App Password, not your regular password.";
      }
      
      res.status(500).json({ error: errorMessage, details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
