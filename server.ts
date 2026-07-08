import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Process-level safety safeguards to prevent crashes on network hiccups or unhandled promise failures
process.on("uncaughtException", (error) => {
  console.error("[Fail-Safe] Uncaught Exception caught safely:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Fail-Safe] Unhandled Rejection caught safely at:", promise, "reason:", reason);
});

// Helper wrapper to protect Express 4 async routes from uncaught exceptions
const safeAsync = (fn: express.RequestHandler): express.RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

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

  // API Route for sending emails with safeAsync wrapper
  app.post("/api/send-email", safeAsync(async (req, res) => {
    if (!req.body) {
      return res.status(400).json({ error: "Missing request body" });
    }
    const { to, subject, text, html } = req.body;
    console.log(`[Server] Received email request to: ${to}, subject: ${subject}`);

    if (!to) {
      return res.status(400).json({ error: "Required parameter 'to' is missing or empty" });
    }

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
        subject: subject || "T.U.T. Notification",
        text: text || "",
        html: html || "",
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
  }));

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

  // Global Exception Catching middleware for Express
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Global Error Handled]:", err);
    res.status(err.status || 500).json({ 
      error: "Internal Server Error", 
      message: err.message || "An unexpected error occurred on the server.",
      timestamp: new Date().toISOString()
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
