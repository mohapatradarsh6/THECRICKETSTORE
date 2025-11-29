const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");

// 1. Define User Schema (Inline for simplicity on Vercel)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: { type: Date, default: Date.now },
  addresses: [
    {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String,
      isDefault: { type: Boolean, default: false },
    },
  ],
  wishlist: [
    {
      title: String,
      price: Number,
      image: String,
    },
  ],

  // --- UPDATED FIELD ---
  // Changed from [String] to ObjectIds to link real product data
  recentlyViewed: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

  cart: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: { type: Number, default: 1 },
      selectedSize: String,
      selectedColor: String,
      price: Number, // Store price at time of adding (optional but good for history)
      title: String,
      image: String,
    },
  ],

  savedForLater: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      addedAt: { type: Date, default: Date.now },
    },
  ],
});

// Prevent model recompilation error
const User = mongoose.models.User || mongoose.model("User", userSchema);

// 2. Database Connection
let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing");
  const db = await mongoose.connect(process.env.MONGO_URI);
  cachedDb = db;
  return db;
}

// 3. The Handler
const allowCors = (fn) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

const handler = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectToDatabase();
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // --- SECURE PASSWORD HASHING ---
    // Salt: Random data added to password to make it impossible to reverse
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword, // Save the hash, NOT the real password
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = allowCors(handler);
