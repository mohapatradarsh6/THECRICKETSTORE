// server.js (Cleaned Up)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Product = require("./products");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. CONNECT TO MONGODB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// 2. API ROUTES
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/products", async (req, res) => {
  const product = new Product(req.body);
  try {
    const newProduct = await product.save();
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
/*if (require.main === module) {
  app.listen(PORT, () =>
    console.log(`🚀 Website running at http://localhost:${PORT}`)
  );
}
*/
module.exports = app;
