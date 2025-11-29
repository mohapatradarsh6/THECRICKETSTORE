const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

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
});

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

// 3. CORS Handler
const allowCors = (fn) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

// 4. Main Handler
const handler = async (req, res) => {
  await connectToDatabase();

  // --- Verify Token ---
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.replace("Bearer ", "");
  let decodedUser;
  try {
    decodedUser = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret_key"
    );
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }

  // --- GET: Fetch Profile ---
  if (req.method === "GET") {
    try {
      const user = await User.findById(decodedUser.id).select("-password"); // Exclude password
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.status(200).json(user);
    } catch (error) {
      return res.status(500).json({ error: "Server Error" });
    }
  }

  // --- PUT: Update Profile (Addresses, Wishlist, etc.) ---
  if (req.method === "PUT") {
    try {
      const { name, addresses, wishlist, recentlyViewed } = req.body;
      const user = await User.findById(decodedUser.id);

      if (name) user.name = name;
      if (addresses) user.addresses = addresses;
      if (wishlist) user.wishlist = wishlist; // Sync wishlist
      if (recentlyViewed) user.recentlyViewed = recentlyViewed;

      await user.save();
      return res
        .status(200)
        .json({ message: "Profile updated successfully", user });
    } catch (error) {
      return res.status(500).json({ error: "Update failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};

module.exports = allowCors(handler);
