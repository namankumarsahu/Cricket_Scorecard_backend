const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed password
  // You can add more fields if needed
});

module.exports = mongoose.model("User", userSchema);
