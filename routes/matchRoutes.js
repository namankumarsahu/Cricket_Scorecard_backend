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

  // Treat any status containing 'won' as Completed
  if (
    status.includes("won") ||
    status.includes("complete") ||
    status.includes("completed") ||
    status.includes("finished") ||
    status.includes("result") ||
    status.includes("draw") ||
    status.includes("abandoned") ||
    status.includes("cancelled")
  )
    return "Completed";

  if (
    status.includes("preview") ||
    status.includes("scheduled") ||
    status.includes("not started") ||
    status.includes("upcoming") ||
    status.includes("toss")
  )
    return "Upcoming";

  return apiStatus; // fallback for unknown statuses
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
    const statusRaw = info.stateTitle || info.status || "";
    const statusNormalized = normalizeStatus(statusRaw);
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
        status: statusNormalized,
        isLive: statusNormalized === "Live",
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

/* router.get("/recent", async (req, res) => {
  try {
    // await ensureFreshMatches("recent"); // Disabled external API fetch to avoid quota limits
    // Query all matches except those with status Live or Upcoming
    const matches = await Match.find({
      status: { $nin: ["Upcoming"] },
    }).sort({ startTime: -1 });
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: "Failed to get recent matches" });
  }
}); */


router.get("/recent", async (req, res) => {
  try {
    const matches = await Match.find({
      status: { $in: ["Complete", "Completed", "Abandon", "Cancelled", "Finished", "Result", "Draw"] }
    }).sort({ startTime: -1 });
    
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: "Failed to get recent matches" });
  }
});



router.get("/upcoming", async (req, res) => {
  try {
    // await ensureFreshMatches("upcoming"); // Disabled external API fetch
    const matches = await Match.find({
      status: { $in: ["Upcoming"] },
    }).sort({ startTime: 1 });
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: "Failed to get upcoming matches" });
  }
});

// For debugging — all matches
router.get("/all", async (req, res) => {
  try {
    const matches = await Match.find().sort({ startTime: -1 });
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: "Failed to get matches" });
  }
});

module.exports = router;




/* const express = require("express");
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

  // Treat any status containing 'won' as Completed
  if (
    s.includes("Won") ||
    s.includes("complete") ||
    s.includes("completed") ||
    s.includes("finished") ||
    s.includes("result") ||
    s.includes("draw") ||
    s.includes("abandoned") ||
    s.includes("cancelled")
  )
    return "Completed";

  if (
    s.includes("Preview") ||
    s.includes("scheduled") ||
    s.includes("not started") ||
    s.includes("Upcoming")
  )
    return "Upcoming";

  return apiStatus; // fallback for unknown statuses
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
    // Disabled external fetch to avoid API quota limits
    // await ensureFreshMatches("recent");
    const matches = await Match.find({
      status: { $nin: ["Live", "Upcoming"] },
    }).sort({ startTime: -1 });
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: "Failed to get recent matches" });
  }
});

router.get("/upcoming", async (req, res) => {
  try {
    // Disabled external fetch to avoid API quota limits
    // await ensureFreshMatches("upcoming");
    const matches = await Match.find({ status: "Upcoming" }).sort({ startTime: 1 });
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: "Failed to get upcoming matches" });
  }
});

// For debugging — all matches
router.get("/all", async (req, res) => {
  try {
    const matches = await Match.find().sort({ startTime: -1 });
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: "Failed to get matches" });
  }
});

module.exports = router;
 */