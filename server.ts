import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { runSalaryDistribution, initializeSalaryScheduler } from "./server/salaryService.js";

function getLatestMtime(dir: string): number {
  let latest = 0;
  try {
    if (!fs.existsSync(dir)) return 0;
    const stats = fs.statSync(dir);
    if (!stats.isDirectory()) return stats.mtimeMs;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === "node_modules" || file === ".git" || file === "dist" || file.startsWith(".")) continue;
      const fullPath = path.join(dir, file);
      const mtime = getLatestMtime(fullPath);
      if (mtime > latest) {
        latest = mtime;
      }
    }
  } catch (e) {
    // Ignore error
  }
  return latest;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing
  app.use(express.json());

  // API routes can be added here
  app.get("/api/version", (req, res) => {
    try {
      const srcPath = path.join(process.cwd(), "src");
      const distIndex = path.join(process.cwd(), "dist/index.html");
      let version = "";
      
      if (fs.existsSync(srcPath)) {
        version = String(getLatestMtime(srcPath));
      } else if (fs.existsSync(distIndex)) {
        version = String(fs.statSync(distIndex).mtimeMs);
      } else {
        version = process.env.BUILD_VERSION || "default_version";
      }
      res.json({ version });
    } catch (err) {
      res.json({ version: "fallback" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API router to manually trigger monthly position salary distributions
  app.post("/api/admin/distribute-salaries", async (req, res) => {
    try {
      const results = await runSalaryDistribution();
      res.json({ 
        success: true, 
        message: "Salary distribution process completed.", 
        results 
      });
    } catch (err: any) {
      console.error("Error triggering manual salary distribution:", err);
      res.status(500).json({ 
        success: false, 
        error: err?.message || String(err) 
      });
    }
  });

  // Enable a GET-based trigger for ease of admin orchestration or webhook integration
  app.get("/api/admin/distribute-salaries", async (req, res) => {
    try {
      const results = await runSalaryDistribution();
      res.json({ 
        success: true, 
        message: "Salary distribution process completed.", 
        results 
      });
    } catch (err: any) {
      console.error("Error triggering manual salary distribution:", err);
      res.status(500).json({ 
        success: false, 
        error: err?.message || String(err) 
      });
    }
  });

  // Initialize the monthly salaries background scheduler
  initializeSalaryScheduler();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve static files. In the bundle, __dirname will be the 'dist' folder.
    const distPath = __dirname;
    console.log(`Production mode: Serving static files from: ${distPath}`);
    
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else {
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        }
      }
    }));
    
    // Explicit root route
    app.get('/', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });

    // SPA fallback: send index.html for all non-file requests
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
          console.error("Error sending index.html from fallback:", err);
          res.status(500).send("Error loading app");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
