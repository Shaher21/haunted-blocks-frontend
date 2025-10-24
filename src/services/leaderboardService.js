// src/services/leaderboardService.js

// Save only the highest score per wallet through your Vercel API
export async function saveScore(walletAddress, score) {
  try {
    const response = await fetch("/api/submitScore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, score }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }
    console.log("🏆 Score submitted successfully!");
  } catch (e) {
    console.error("Error saving score:", e);
  }
}

// Load leaderboard (mocked locally until backend persistence is added)
let cachedLeaderboard = [];

export async function getLeaderboard() {
  try {
    // For now, fetch from in-memory store on Vercel (same endpoint will serve soon)
    const res = await fetch("/api/leaderboard");
    if (res.ok) {
      cachedLeaderboard = await res.json();
    }
  } catch {
    console.log("⚠️ Leaderboard service not yet implemented, using cache");
  }
  return cachedLeaderboard.sort((a, b) => b.score - a.score).slice(0, 10);
}

// Reset leaderboard (only works for admin wallet)
export async function resetLeaderboard() {
  try {
    const response = await fetch("/api/resetLeaderboard", { method: "POST" });
    if (response.ok) {
      console.log("🔥 Leaderboard has been reset!");
    } else {
      console.warn("⚠️ Reset failed");
    }
  } catch (e) {
    console.error("Error resetting leaderboard:", e);
  }
}
