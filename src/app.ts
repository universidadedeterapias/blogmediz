import express from "express";
import path from "node:path";
import { adminRouter } from "./routes/admin.js";
import { alineRouter } from "./routes/aline.js";
import { articlesRouter } from "./routes/articles.js";
import { newsletterRouter } from "./routes/newsletter.js";

export const app = express();

app.use(express.json({ limit: "2mb" }));

app.use("/api/articles", articlesRouter);
app.use("/api/newsletter", newsletterRouter);
app.use("/api/aline-chat", alineRouter);
app.use("/api/admin", adminRouter);

const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(publicDir, "admin.html"));
});

app.get(["/", "/pt", "/es", "/en", "/pt/:slug", "/es/:slug", "/en/:slug"], (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

export default app;
