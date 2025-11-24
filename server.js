require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path"); // Added this to handle file paths
const Product = require("./products");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------
// 1. SERVE STATIC FILES (Frontend)
// ---------------------------------------------------------
// This tells Express to serve index.html, style.css, etc.
app.use(express.static(path.join(__dirname)));

// ---------------------------------------------------------
// 2. CONNECT TO MONGODB
// ---------------------------------------------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ---------------------------------------------------------
// 3. API ROUTES (Data)
// ---------------------------------------------------------

// GET: Fetch all products
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST: Add a new product
app.post("/api/products", async (req, res) => {
  const product = new Product(req.body);
  try {
    const newProduct = await product.save();
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ---------------------------------------------------------
// 4. CATCH-ALL ROUTE
// ---------------------------------------------------------
// We use /(.*)/ (regex) instead of "*" because "*" is invalid in the new Express
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Website running at http://localhost:${PORT}`)
);
