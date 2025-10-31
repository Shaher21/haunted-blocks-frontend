// ✅ Safe browser-compatible Upstash client
import { Redis } from "@upstash/redis/cloudflare";

// Connect using environment variables
const redis = new Redis({
  url: import.meta.env.VITE_UPSTASH_REDIS_REST_URL,
  token: import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN,
});

// 🧹 Helper: Sort leaderboard data
function sortLeaderboard(data) {
  return Object.entries(data)
    .map(([walletAddress, score]) => ({ walletAddress, score }))
    .sort((a, b) => b.score - a.score);
}

// 🏆 Save only the highest score per wallet (anti-cheat protection)
export async function saveScore(walletAddress, score) {
  try {
    if (!walletAddress || typeof score !== "number") {
      console.warn("⚠️ Invalid data. Score not saved.");
      return;
    }

    // Simple anti-cheat: ignore unrealistic spikes (> 100000)
    if (score > 100000) {
      console.warn("🚫 Suspicious score ignored:", score);
      return;
    }

    const existing = await redis.get(`player:${walletAddress}`);

    if (!existing || score > existing) {
      await redis.set(`player:${walletAddress}`, score);
      console.log(`✅ New high score saved for ${walletAddress}: ${score}`);
    } else {
      console.log(`⚠️ Lower score ignored for ${walletAddress}: ${score}`);
    }
  } catch (err) {
    console.error("❌ Error saving score:", err);
  }
}

// 📜 Get leaderboard top 10 (safe + sorted)
export async function getLeaderboard() {
  try {
    const keys = await redis.keys("player:*");
    const all = {};

    for (const key of keys) {
      const wallet = key.replace("player:", "");
      const score = await redis.get(key);
      all[wallet] = Number(score);
    }

    // Sort and return top 20 instead of top 10
    return Object.entries(all)
      .map(([walletAddress, score]) => ({ walletAddress, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  } catch (err) {
    console.error("❌ Error getting leaderboard:", err);
    return [];
    }
}

// 🔥 Admin-only: reset all scores
export async function resetLeaderboard() {
  try {
    const keys = await redis.keys("player:*");
    for (const key of keys) {
      await redis.del(key);
    }
    console.log("🔥 Leaderboard cleared!");
  } catch (err) {
    console.error("❌ Error resetting leaderboard:", err);
  }
}
