const mongoose = require("mongoose");

// 1. Define Coupon Schema
const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true }, // e.g., "SAVE10"
  discountType: { type: String, enum: ["percent", "flat"], required: true }, // "percent" or "flat"
  value: { type: Number, required: true }, // e.g., 10 (for 10%) or 100 (for ₹100 off)
  minOrderValue: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  expiryDate: { type: Date },
});

const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);

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
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

// 4. Main Handler
const handler = async (req, res) => {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    await connectToDatabase();

    const { code, cartTotal } = req.body; // Frontend sends code & total amount

    if (!code) return res.status(400).json({ error: "Coupon code required" });

    // Find Coupon
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    // Validate Coupon
    if (!coupon) {
      return res.status(404).json({ error: "Invalid coupon code" });
    }
    if (!coupon.isActive) {
      return res.status(400).json({ error: "This coupon is no longer active" });
    }
    if (coupon.expiryDate && new Date() > coupon.expiryDate) {
      return res.status(400).json({ error: "This coupon has expired" });
    }
    if (cartTotal < coupon.minOrderValue) {
      return res.status(400).json({
        error: `Minimum order value of ₹${coupon.minOrderValue} required`,
      });
    }

    // Calculate Discount
    let discountAmount = 0;
    if (coupon.discountType === "percent") {
      discountAmount = (cartTotal * coupon.value) / 100;
      // Optional: Cap max discount for % based (e.g., max ₹500)
      // if (discountAmount > 500) discountAmount = 500;
    } else {
      discountAmount = coupon.value;
    }

    // Ensure discount doesn't exceed total
    if (discountAmount > cartTotal) discountAmount = cartTotal;

    res.status(200).json({
      success: true,
      code: coupon.code,
      discountAmount: discountAmount,
      finalTotal: cartTotal - discountAmount,
      message: "Coupon applied successfully!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = allowCors(handler);
