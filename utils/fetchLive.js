const express = require("express");
const axios = require("axios");
const router = express.Router();
const Match = require("../models/Match");

const RAPID_API_KEY = "ab4302ddf2mshfc84f874a286583p12444cjsne47ba9b781db";
const RAPID_API_HOST = "cricbuzz-cricket.p.rapidapi.com";

// Status normalization util
function normalizeStatus(apiStatus) {
  if (!apiStatus) return "Upcoming";
  const status = apiStatus.toLowerCase();
  if (status.includes("live") || status.includes("progress")) return "Live";
  if (
    status.includes("completed") ||
    status.includes("finished") ||
    status.includes("result") ||
    status.includes("stumps") ||
    status.includes("draw") ||
    status.includes("abandoned") ||
    status.includes("cancelled")
  )
    return "Completed";
  if (
    status.includes("upcoming") ||
    status.includes("scheduled") ||
    status.includes("not started")
  )
    return "Upcoming";
  return apiStatus;
}

// Extract matches (flattens nested API response)
function extractMatches(data) {
  const matches = [];
  data?.typeMatches?.forEach((tm) => {
    tm.seriesMatches?.forEach((sm) => {
      const series = sm.seriesAdWrapper;
      if (series?.matches) {
        series.matches.forEach((m) => {
          if (!m.matchInfo) return;
          matches.push(m);
        });
      }
    });
  });
  return matches;
}

// Save matches to MongoDB
async function saveMatches(apiMatches) {
  for (const m of apiMatches) {
    const info = m.matchInfo;
    const score = m.matchScore || {};
    const status = normalizeStatus(info.stateTitle || info.status);
    await Match.findOneAndUpdate(
      { externalId: info.matchId?.toString() },
      {
        externalId: info.matchId?.toString(),
        team1: {
          name: info.team1?.teamName || "-",
          score: score.team1Score?.inngs1?.runs?.toString() || "-",
          wickets: score.team1Score?.inngs1?.wickets ?? 0,
          overs: score.team1Score?.inngs1?.overs?.toString() || "-",
        },
        team2: {
          name: info.team2?.teamName || "-",
          score: score.team2Score?.inngs1?.runs?.toString() || "-",
          wickets: score.team2Score?.inngs1?.wickets ?? 0,
          overs: score.team2Score?.inngs1?.overs?.toString() || "-",
        },
        venue: info.venueInfo?.ground || "-",
        status,
        isLive: status === "Live",
        startTime: info.startDate ? new Date(Number(info.startDate)) : null,
        tournament: info.seriesName || "Unknown",
        lastUpdated: new Date(),
      },
      { upsert: true }
    );
  }
}

// Fetch and save helper
async function fetchAndSaveMatches(endpoint) {
  const headers = {
    "x-rapidapi-key": RAPID_API_KEY,
    "x-rapidapi-host": RAPID_API_HOST,
  };
  const res = await axios.get(
    `https://${RAPID_API_HOST}/matches/v1/${endpoint}`,
    { headers }
  );
  const raw = extractMatches(res.data);
  await saveMatches(raw);
}

// Single endpoint to refresh DB before serving
async function ensureFreshMatches(type) {
  const endpoint = type;
  await fetchAndSaveMatches(endpoint);
}

// API routes for frontend

router.get("/live", async (req, res) => {
  try {
    await ensureFreshMatches("live");
    const matches = await Match.find({ isLive: true }).sort({ startTime: -1 });
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: "Failed to get live matches" });
  }
});

router.get("/recent", async (req, res) => {
  try {
    // await ensureFreshMatches("recent"); // Disable external API fetch temporarily
    const matches = await Match.find({
      status: { $nin: ["Live", "Upcoming"] }
    }).sort({ startTime: -1 });
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: "Failed to get recent matches" });
  }
});


/* 
router.get("/recent", async (req, res) => {
  try {
    await ensureFreshMatches("recent");
    const matches = await Match.find({ status: "Completed" }).sort({
      startTime: -1,
    });
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: "Failed to get recent matches" });
  }
});
 */
/* router.get("/recent", async (req, res) => {
  try {
    await ensureFreshMatches("recent");
    const matches = await Match.find({
      status: { $nin: ["Live", "Upcoming"] }
    }).sort({ startTime: -1 });
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: "Failed to get recent matches" });
  }
});
 */


/* 



router.get("/upcoming", async (req, res) => {
  try {
    await ensureFreshMatches("upcoming");
    const matches = await Match.find({ status: "Upcoming" }).sort({
      startTime: 1,
    });
    res.json({ matches });         // prev
  } catch (err) {
    res.status(500).json({ error: "Failed to get upcoming matches" });
  }
});

 */



/* 
router.get("/upcoming", async (req, res) => {
  try {
    console.log("[DEBUG] About to refresh upcoming matches...");
    await ensureFreshMatches("upcoming");
    console.log("[DEBUG] Fetch succeeded, querying DB");
    const matches = await Match.find({ status: "Upcoming" }).sort({ startTime: 1 });
    res.json({ matches });
  } catch (err) {
    console.error("[ERROR] Failed to get upcoming matches:", err);
    res.status(500).json({ error: "Failed to get upcoming matches" });
  }
});
 */

router.get("/upcoming", async (req, res) => {
  try {
    // await ensureFreshMatches("upcoming"); // Disable API refresh for now
    const matches = await Match.find({ status: "Upcoming" }).sort({ startTime: 1 });
    res.json({ matches });
  } catch (err) {
    console.error("[ERROR] Failed to get upcoming matches:", err);
    res.status(500).json({ error: "Failed to get upcoming matches" });
  }
});


// For debugging—all matches
router.get("/all", async (req, res) => {
  try {
    const matches = await Match.find().sort({ startTime: -1 });
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: "Failed to get matches" });
  }
});

module.exports = router;
