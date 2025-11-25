const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// 1. Re-define User Schema (Must match register.js and login.js)
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
  recentlyViewed: [String],
});

// IMPORTANT: Do not re-define User if it already exists
const User = mongoose.models.User || mongoose.model("User", userSchema);

// 2. Database Connection
let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing");
  // Use the connection method that does not throw warnings
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
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

// 4. Main API Handler Logic
const handler = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectToDatabase();
    const { email } = req.body;

    // A. Find the user
    const user = await User.findOne({ email });
    if (!user) {
      // Security measure: Always return a generic success message
      // even if the user doesn't exist to prevent email enumeration attacks.
      return res.status(200).json({
        message:
          "If that email address is in our system, we've sent instructions to reset your password.",
      });
    }

    // B. Generate a temporary, secure token
    // The payload contains user ID and is valid for 1 hour (3600 seconds)
    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "default_reset_secret_key",
      { expiresIn: "1h" }
    );

    // C. Save the token and its expiry to the database
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now (in milliseconds)
    await user.save();

    // D. Build the reset link (SIMULATED EMAIL)
    // NOTE: In a real app, 'client-side-domain.com' would be your deployed frontend URL
    const resetLink = `https://your-client-side-domain.com/reset-password?token=${resetToken}&email=${user.email}`;

    // E. Respond to the client and LOG THE LINK for manual testing
    console.log(`\n\n--- PASSWORD RESET LINK FOR ${user.email} ---`);
    console.log(resetLink);
    console.log(`--------------------------------------------------\n`);

    res.status(200).json({
      message:
        "If that email address is in our system, we've sent instructions to reset your password.",
      // In a real app, you would NOT return the token or link to the client.
      // We include it here only for easy testing in development/Vercel logs.
      token: resetToken,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    // If it's a validation error (like invalid email format), you might handle it differently.
    res
      .status(500)
      .json({ error: "Failed to process reset request. Server Error." });
  }
};

module.exports = allowCors(handler);
