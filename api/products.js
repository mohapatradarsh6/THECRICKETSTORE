const mongoose = require("mongoose");

// 1. Define Schema
const productSchema = new mongoose.Schema({
  title: String,
  price: Number,
  originalPrice: Number,
  category: String,
  brand: String,
  image: String,
  rating: { type: Number, default: 4.5 },
  reviews: { type: Number, default: 0 },
  description: String,
  isNewArrival: { type: Boolean, default: false },
  isBestSeller: { type: Boolean, default: false },
  stock: { type: Number, default: 10 },
  inStock: { type: Boolean, default: true },
  sizes: [String],
  colors: [String],

  // 1. Tags: Keywords for "Related Products" logic (e.g., "english-willow", "power-hitting")
  tags: [String],

  // 2. FBT: Links to other specific Product IDs
  frequentlyBoughtTogether: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  ],
});

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

// 2. Database Connection (Cached for speed)
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing");

  const db = await mongoose.connect(process.env.MONGO_URI);
  cachedDb = db;
  return db;
}

// 3. The Handler
module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  try {
    await connectToDatabase();

    // JUST FETCH DATA. NO SEEDING.
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
};
