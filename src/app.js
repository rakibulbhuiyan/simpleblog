const fs = require("node:fs");
const path = require("node:path");

const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const env = require("./config/env");
const apiRoutes = require("./routes");
const { rss, sitemap } = require("./controllers/feedController");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

// Behind a proxy (Render, Railway, Nginx...) so req.ip / req.protocol are correct.
if (env.isProd) app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // Cover images and avatars are hot-linked from any https host.
        "img-src": ["'self'", "data:", "https:"],
        ...(!env.isProd && { "upgrade-insecure-requests": null }),
      },
    },
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
if (!env.isTest) app.use(morgan(env.isProd ? "combined" : "dev"));

app.use("/api", apiRoutes);
app.get("/rss.xml", rss);
app.get("/sitemap.xml", sitemap);

// In production the built React app (client/dist) is served by Express too.
const clientDist = path.join(__dirname, "..", "client", "dist");

if (fs.existsSync(clientDist)) {
  app.use("/assets", express.static(path.join(clientDist, "assets"), { immutable: true, maxAge: "1y" }));
  app.use(express.static(clientDist, { index: false }));
  app.get("/{*splat}", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
