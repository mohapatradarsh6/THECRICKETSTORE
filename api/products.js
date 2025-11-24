// File: api/products.js
const mongoose = require("mongoose");

// 1. Define Schema Inline (Best for Vercel Serverless isolation)
const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  category: { type: String, required: true },
  brand: { type: String, required: true },
  image: { type: String, required: true },
  rating: { type: Number, default: 4.5 },
  reviews: { type: Number, default: 0 },
  description: { type: String },
  isNewArrival: { type: Boolean, default: false },
  isBestSeller: { type: Boolean, default: false },
});

// Prevent "OverwriteModelError" during hot reloads
const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

// 2. Cached Connection (Critical for Serverless)
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in Environment Variables");
  }

  // FIXED: Removed deprecated options (useNewUrlParser, useUnifiedTopology)
  // because they crash Mongoose v8+
  const db = await mongoose.connect(process.env.MONGO_URI);

  cachedDb = db;
  return db;
}

// 3. The Handler
module.exports = async (req, res) => {
  // Handle CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    await connectToDatabase();

    if (req.method === "GET") {
      const products = await Product.find();
      return res.status(200).json(products);
    }

    if (req.method === "POST") {
      const product = new Product(req.body);
      const newProduct = await product.save();
      return res.status(201).json(newProduct);
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("Database Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
