const mongoose = require("mongoose");

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

module.exports = mongoose.model("Product", productSchema);
