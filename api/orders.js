const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// 1. Define Order Schema
// This schema includes fields for Tracking and Shipping integration
const orderSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  items: [
    {
      title: String,
      price: Number,
      quantity: Number,
      image: String,
    },
  ],
  total: Number,
  subtotal: Number,
  shipping: Number,
  tax: Number,
  paymentMethod: String,
  // --- NEW FEATURES ---
  status: {
    type: String,
    default: "Processing",
    enum: ["Processing", "Shipped", "Out for Delivery", "Delivered"],
  }, // For Order Tracking
  trackingId: {
    type: String,
    default: () => "TRK" + Math.floor(100000 + Math.random() * 900000),
  }, // Simulated Shipping Integration
  orderDate: { type: Date, default: Date.now },
});

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

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

  // --- SECURITY: Verify User Token ---
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }
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

  // --- GET: Fetch User's Orders ---
  if (req.method === "GET") {
    try {
      // Find orders belonging to this email, sort by newest first
      const orders = await Order.find({ userEmail: decodedUser.email }).sort({
        orderDate: -1,
      });
      return res.status(200).json(orders);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch orders" });
    }
  }

  // --- POST: Create New Order ---
  if (req.method === "POST") {
    try {
      const { items, total, subtotal, shipping, tax, paymentMethod } = req.body;

      const newOrder = new Order({
        userEmail: decodedUser.email,
        items,
        total,
        subtotal,
        shipping,
        tax,
        paymentMethod,
        // status and trackingId are set by default values in Schema
      });

      await newOrder.save();
      return res
        .status(201)
        .json({ message: "Order placed successfully", order: newOrder });
    } catch (error) {
      return res.status(500).json({ error: "Failed to create order" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};

module.exports = allowCors(handler);
