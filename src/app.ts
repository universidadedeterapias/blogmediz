import cookieParser from "cookie-parser";
import express from "express";
import path from "node:path";
import { adminRouter } from "./routes/admin.js";
import { cronRouter } from "./routes/cron.js";
import { uploadRouter } from "./routes/upload.js";
import { alineRouter } from "./routes/aline.js";
import { alineLeadRouter } from "./routes/aline-lead.js";
import { articlesRouter } from "./routes/articles.js";
import { newsletterRouter } from "./routes/newsletter.js";

export const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.use("/api/articles", articlesRouter);
app.use("/api/newsletter", newsletterRouter);
app.use("/api/aline-chat", alineRouter);
app.use("/api/aline-lead", alineLeadRouter);
app.use("/api/admin", adminRouter);
app.use("/api/cron", cronRouter);
app.use("/api/admin/upload", uploadRouter);

const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(publicDir, "admin.html"));
});

app.get(["/", "/pt", "/es", "/en", "/pt/:slug", "/es/:slug", "/en/:slug"], (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

export default app;
