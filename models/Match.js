const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  name: { type: String, default: "-" },
  score: { type: String, default: "-" }, // e.g. '123'
  wickets: { type: Number, default: 0 },
  overs: { type: String, default: "-" }, // e.g. '15.2'
});

const matchSchema = new mongoose.Schema(
  {
    externalId: { type: String, required: true, unique: true },
    team1: teamSchema,
    team2: teamSchema,
    venue: { type: String, default: "-" },
    status: { type: String, default: "Upcoming" }, // 'Live', 'Completed', 'Upcoming'
    startTime: { type: Date, default: null },
    tournament: { type: String, default: "Unknown" },
    isLive: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Match", matchSchema);
