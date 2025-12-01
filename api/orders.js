const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// 1. Define Order Schema
const orderSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  items: [
    {
      title: String,
      price: Number,
      quantity: Number,
      image: String,
      discountApplied: { type: Number, default: 0 },
    },
  ],
  total: Number,
  subtotal: Number,
  shipping: Number,
  tax: Number,
  paymentMethod: String,

  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
  },

  giftOption: {
    isGift: { type: Boolean, default: false },
    message: String,
    wrapCost: { type: Number, default: 0 },
  },
  insurance: {
    hasInsurance: { type: Boolean, default: false },
    cost: { type: Number, default: 0 },
  },
  deliverySlot: { type: String },
  scheduledDate: { type: Date },

  status: {
    type: String,
    default: "Processing",
    enum: [
      "Processing",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
      "Returned",
      "Return Requested",
    ],
  },

  cancellation: { reason: String, cancelledAt: Date },
  returnRequest: { reason: String, status: String, requestedAt: Date },

  trackingId: {
    type: String,
    default: () => "TRK" + Math.floor(100000 + Math.random() * 900000),
  },
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
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST,PUT,PATCH");
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

  // --- GET: Fetch Orders (With Auto Status Update) ---
  if (req.method === "GET") {
    try {
      let orders = await Order.find({ userEmail: decodedUser.email }).sort({
        orderDate: -1,
      });

      // AUTO-UPDATE STATUS LOGIC
      const now = new Date();
      let updated = false;

      for (let order of orders) {
        // Skip if already final state
        if (["Delivered", "Cancelled", "Returned"].includes(order.status))
          continue;

        const daysPassed =
          (now - new Date(order.orderDate)) / (1000 * 60 * 60 * 24);

        // 1. Move to Shipped after 3 days
        if (order.status === "Processing" && daysPassed > 3) {
          order.status = "Shipped";
          await order.save();
          updated = true;
        }

        // 2. Move to Delivered if Scheduled Date has passed (or 6 days default)
        const deliveryDate =
          order.scheduledDate ||
          new Date(
            new Date(order.orderDate).setDate(
              new Date(order.orderDate).getDate() + 6
            )
          );
        if (now > deliveryDate && order.status !== "Delivered") {
          order.status = "Delivered";
          await order.save();
          updated = true;
        }
      }

      // Re-fetch if updates happened to ensure clean data
      if (updated) {
        orders = await Order.find({ userEmail: decodedUser.email }).sort({
          orderDate: -1,
        });
      }

      return res.status(200).json(orders);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to fetch orders" });
    }
  }

  // --- POST: Create New Order ---
  if (req.method === "POST") {
    try {
      const {
        items,
        total,
        subtotal,
        shipping,
        tax,
        paymentMethod,
        giftOption,
        insurance,
        deliverySlot,
        address,
      } = req.body;

      const newOrder = new Order({
        userEmail: decodedUser.email,
        items,
        total,
        subtotal,
        shipping,
        tax,
        paymentMethod,
        giftOption,
        insurance,
        deliverySlot,
        address,
        scheduledDate: new Date(new Date().setDate(new Date().getDate() + 5)), // 5 Days Delivery
      });

      await newOrder.save();
      return res
        .status(201)
        .json({ message: "Order placed successfully", order: newOrder });
    } catch (error) {
      return res.status(500).json({ error: "Failed to create order" });
    }
  }

  // --- PATCH: Update Order ---
  if (req.method === "PATCH") {
    try {
      const { orderId, action, reason, newDate } = req.body;
      const order = await Order.findOne({
        _id: orderId,
        userEmail: decodedUser.email,
      });

      if (!order) return res.status(404).json({ error: "Order not found" });

      if (action === "cancel") {
        if (order.status === "Delivered")
          return res
            .status(400)
            .json({ error: "Cannot cancel delivered order" });
        order.status = "Cancelled";
        order.cancellation = { reason, cancelledAt: new Date() };
      } else if (action === "return") {
        if (order.status !== "Delivered")
          return res
            .status(400)
            .json({ error: "Can only return delivered orders" });
        order.status = "Return Requested";
        order.returnRequest = {
          reason,
          status: "Pending",
          requestedAt: new Date(),
        };
      } else if (action === "reschedule") {
        if (["Delivered", "Cancelled", "Returned"].includes(order.status)) {
          return res
            .status(400)
            .json({ error: "Cannot reschedule this order" });
        }
        order.scheduledDate = new Date(newDate);
      }

      await order.save();
      return res
        .status(200)
        .json({ message: `Order ${action} successful`, order });
    } catch (error) {
      return res.status(500).json({ error: "Update failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};

module.exports = allowCors(handler);
