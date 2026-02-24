import express from "express";
import path from "node:path";
import { articlesRouter } from "./routes/articles.js";

export const app = express();

app.use(express.json({ limit: "2mb" }));

app.use("/api/articles", articlesRouter);

const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));

app.get(["/", "/pt", "/es", "/en", "/pt/:slug", "/es/:slug", "/en/:slug"], (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

export default app;
