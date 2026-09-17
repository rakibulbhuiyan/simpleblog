const express = require("express");

const blogRoutes = require("./routes/blogRoutes");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "SimpleBlog API is running"
  });
});

app.use("/api/blogs", blogRoutes);

module.exports = app;