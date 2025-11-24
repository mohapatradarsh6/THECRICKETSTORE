const mongoose = require("mongoose");

// 1. Product Data
const seedProducts = [
  {
    title: "SG HP33 Kashmir Willow",
    price: 4999,
    originalPrice: 6999,
    category: "bats",
    brand: "sg",
    image: "images/SS.png",
    rating: 4.5,
    reviews: 125,
    isBestSeller: true,
    description: "Hand-crafted Kashmir Willow bat.",
  },
  {
    title: "Kookaburra Kahuna Pro",
    price: 8999,
    originalPrice: 10999,
    category: "bats",
    brand: "kookaburra",
    image: "images/Kookabura.png",
    rating: 5,
    isNewArrival: true,
    description: "The iconic Kahuna.",
  },
  {
    title: "Kookaburra Kahuna Pro",
    price: 8999,
    originalPrice: 10999,
    category: "bats",
    brand: "kookaburra",
    image: "images/Kookabura.png",
    rating: 5,
    reviews: 89,
    isNewArrival: true,
    description:
      "The iconic Kahuna. Mid-blade sweet spot for all-round stroke play.",
  },
  {
    title: "SS Ton Retro Classic",
    price: 11500,
    originalPrice: 13999,
    category: "bats",
    brand: "ss",
    image: "images/ssretro.png",
    rating: 4.8,
    reviews: 45,
    description: "Grade 1 English Willow. Huge edges and massive power.",
  },
  {
    title: "MRF Grand Edition",
    price: 22000,
    originalPrice: 24999,
    category: "bats",
    brand: "mrf",
    image: "images/mrf.png",
    rating: 5,
    reviews: 32,
    description:
      "Virat Kohli's choice. Premium English Willow with lightweight pickup.",
  },
  {
    title: "Gray-Nicolls Cobra",
    price: 7499,
    originalPrice: 9999,
    category: "bats",
    brand: "gray-nicolls",
    image: "images/grayniccols.png",
    rating: 4.6,
    reviews: 67,
    description: "Low-profile sweet spot, perfect for front-foot drives.",
  },
  {
    title: "BAS Vampire SR23",
    price: 7499,
    originalPrice: 9999,
    category: "bats",
    brand: "bas",
    image: "images/BAS.png",
    rating: 4.5,
    reviews: 156,
    description: "Legendary BAS profile with thick edges.",
  },

  // --- BALLS ---
  {
    title: "SG Test Cricket Ball",
    price: 899,
    originalPrice: 1199,
    category: "balls",
    brand: "sg",
    image: "images/sgred.png",
    rating: 5,
    reviews: 78,
    isBestSeller: true,
    description: "Official Test match ball. High-quality alum tanned leather.",
  },
  {
    title: "Kookaburra Turf White",
    price: 1299,
    originalPrice: 1699,
    category: "balls",
    brand: "kookaburra",
    image: "images/kookaburaball.png",
    rating: 5,
    reviews: 156,
    description: "Regulation white ball for T20/ODI cricket. Excellent swing.",
  },
  {
    title: "SG Pink Leather Ball",
    price: 499,
    originalPrice: 650,
    category: "balls",
    brand: "sg",
    image: "images/sgpink.png",
    rating: 4.2,
    reviews: 200,
    description: "Durable 4-piece ball perfect for club matches and nets.",
  },
  {
    title: "Heavy Tennis Ball (Pack of 5)",
    price: 540,
    originalPrice: 720,
    category: "balls",
    brand: "dsc",
    image: "images/tball.png",
    rating: 4.5,
    reviews: 500,
    description: "Heavy duty tennis balls for box cricket.",
  },

  // --- PADS ---
  {
    title: "Kookaburra Batting Pads",
    price: 2999,
    originalPrice: 3999,
    category: "pads",
    brand: "kookaburra",
    image: "images/pads.png",
    rating: 4,
    reviews: 92,
    description: "Lightweight foam pads with traditional cane protection.",
  },
  {
    title: "Moonwalkr Thigh Pad Combo",
    price: 2800,
    originalPrice: 3200,
    category: "pads",
    brand: "moonwalkr",
    image: "images/mthighpad.jpg",
    rating: 4.9,
    reviews: 110,
    isBestSeller: true,
    description: "Futuristic slim design. Integrated inner/outer thigh guard.",
  },
  {
    title: "SS Limited Edition Pads",
    price: 3200,
    originalPrice: 4000,
    category: "pads",
    brand: "ss",
    image: "images/sspad.png",
    rating: 4.5,
    reviews: 56,
    description: "Premium PU facing with cotton filled knee rolls.",
  },
  {
    title: "SG Test Thigh Guard",
    price: 899,
    originalPrice: 1199,
    category: "pads",
    brand: "sg",
    image: "images/thighpad.png",
    rating: 4,
    reviews: 71,
    description: "Standard pre-shaped thigh guard with soft towel backing.",
  },

  // --- GLOVES ---
  {
    title: "BAS Vampire Batting Gloves",
    price: 1999,
    originalPrice: 2499,
    category: "gloves",
    brand: "bas",
    image: "images/gloves.png",
    rating: 5,
    reviews: 145,
    isBestSeller: true,
    description:
      "Super soft sheep leather palm with sausage finger protection.",
  },
  {
    title: "Kookaburra Pro Keeper Gloves",
    price: 2799,
    originalPrice: 3699,
    category: "gloves",
    brand: "kookaburra",
    image: "images/kgloves.png",
    rating: 4.5,
    reviews: 84,
    isNewArrival: true,
    description: "Short cuff design with octopus grip for superior catching.",
  },
  {
    title: "SS Millenium Pro Gloves",
    price: 2200,
    originalPrice: 2600,
    category: "gloves",
    brand: "ss",
    image: "images/ssmgloves.png",
    rating: 4.6,
    reviews: 40,
    description: "Multi-flex points for unrestricted hand movement.",
  },

  // --- HELMETS ---
  {
    title: "SG Aerotech Helmet",
    price: 3499,
    originalPrice: 4499,
    category: "helmets",
    brand: "sg",
    image: "images/helmet.png",
    rating: 4.5,
    reviews: 67,
    description: "High impact polypropylene shell with sweat absorbent lining.",
  },
  {
    title: "Shrey Master Class Air",
    price: 5500,
    originalPrice: 6500,
    category: "helmets",
    brand: "shrey",
    image: "images/shhelmet.png",
    rating: 4.9,
    reviews: 45,
    isNewArrival: true,
    description: "Lightweight titanium grille. Choice of international pros.",
  },

  // --- SHOES ---
  {
    title: "Kookaburra KC 2.0 Spikes",
    price: 4999,
    originalPrice: 6999,
    category: "shoes",
    brand: "kookaburra",
    image: "images/shoes.png",
    rating: 4,
    reviews: 98,
    description:
      "Durable spikes for turf wickets with excellent ankle support.",
  },
  {
    title: "Adidas Vector Mid",
    price: 8999,
    originalPrice: 12999,
    category: "shoes",
    brand: "adidas",
    image: "images/ashoes.png",
    rating: 5,
    reviews: 120,
    description: "Premium bowling spikes used by fast bowlers worldwide.",
  },
  {
    title: "Asics Gel Peake Rubber",
    price: 5500,
    originalPrice: 6500,
    category: "shoes",
    brand: "asics",
    image: "images/asicshoes.png",
    rating: 4.8,
    reviews: 65,
    description: "Rubber studs perfect for hard wickets and artificial turf.",
  },

  // --- BAGS ---
  {
    title: "SG Teampak Wheelie Bag",
    price: 3999,
    originalPrice: 5499,
    category: "bags",
    brand: "sg",
    image: "images/bags.png",
    rating: 5,
    reviews: 112,
    description: "Large capacity wheelie bag. Fits pads, bats, and helmet.",
  },
  {
    title: "SS Duffle Bag Pro",
    price: 2499,
    originalPrice: 3299,
    category: "bags",
    brand: "ss",
    image: "images/duffle.jpg",
    rating: 4.4,
    reviews: 88,
    isBestSeller: true,
    description: "Modern backpack style duffle bag with shoe compartment.",
  },
  {
    title: "Kookaburra Pro Players Bag",
    price: 6999,
    originalPrice: 8500,
    category: "bags",
    brand: "kookaburra",
    image: "images/kbags.png",
    reviews: 25,
    description: "Heavy duty coffin bag for professional players.",
  },

  // --- ACCESSORIES ---
  {
    title: "Premium Wooden Stumps",
    price: 799,
    originalPrice: 999,
    category: "accessories",
    brand: "sg",
    image: "images/stumps.png",
    rating: 4,
    reviews: 67,
    description: "Seasoned wooden stumps set with bails.",
  },
  {
    title: "Premium Bat Grips (3 Pack)",
    price: 299,
    originalPrice: 450,
    category: "accessories",
    brand: "sg",
    image: "images/grips.png",
    rating: 5,
    reviews: 234,
    isBestSeller: true,
    description: "High traction octopus grips in assorted colors.",
  },
  {
    title: "Fiber Tape",
    price: 150,
    originalPrice: 200,
    category: "accessories",
    brand: "generic",
    image: "images/tape.jpg",
    rating: 4.2,
    reviews: 110,
    description: "Strong fiber tape for bat repair and protection.",
  },

  // --- KITS ---
  {
    title: "BAS Players Complete Kit",
    price: 12999,
    originalPrice: 18999,
    category: "kits",
    brand: "bas",
    image: "images/baskit.png",
    rating: 4.5,
    reviews: 89,
    isNewArrival: true,
    description: "Full kit including Bat, Pads, Gloves, Helmet, and Bag.",
  },
  {
    title: "SG Junior Cricket Kit",
    price: 6999,
    originalPrice: 8999,
    category: "kits",
    brand: "sg",
    image: "images/junior.png",
    rating: 4.8,
    reviews: 210,
    description:
      "Perfect starter kit for ages 10-14. Includes Kashmir willow bat.",
  },
];

// 2. Schema
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
});

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

// 3. The Handler
module.exports = async (req, res) => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing");
    await mongoose.connect(process.env.MONGO_URI);

    // DELETE OLD & INSERT NEW
    await Product.deleteMany({});
    await Product.insertMany(seedProducts);

    res
      .status(200)
      .json({ message: "✅ Database successfully filled with products!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
