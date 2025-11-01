// src/services/leaderboardService.js
import { Redis } from "@upstash/redis/cloudflare";

const redis = new Redis({
  url: import.meta.env.VITE_UPSTASH_REDIS_REST_URL,
  token: import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN,
});

// 🧩 Helper: safely parse old or new stored value
function parseStored(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "score" in parsed) return parsed;
  } catch (e) {
    // not JSON, fall through
  }
  const n = Number(raw);
  if (!Number.isNaN(n)) return { score: n, lines: 0 };
  return null;
}

// 🧠 Save new score (only if higher)
export async function saveScore(walletAddress, score, linesCleared = 0) {
  try {
    if (!walletAddress || typeof walletAddress !== "string") return;
    if (!Number.isFinite(score) || score < 0) return;
    if (!Number.isFinite(linesCleared) || linesCleared < 0) return;

    // 🛡️ basic anti-cheat sanity
    if (linesCleared === 0 || score / Math.max(1, linesCleared) > 250 || score > 100000) {
      console.warn("⚠️ suspicious score ignored", { walletAddress, score, linesCleared });
      return;
    }

    const key = `player:${walletAddress.toLowerCase()}`;
    const existingRaw = await redis.get(key);
    const existing = parseStored(existingRaw);

    if (!existing || score > existing.score) {
      const toStore = JSON.stringify({
        score: Number(score),
        lines: Number(linesCleared),
        ts: Date.now(),
      });
      await redis.set(key, toStore);
      console.log(`✅ new high score for ${walletAddress}: ${score} (${linesCleared} lines)`);
    } else {
      console.log(`ℹ️ not a high score for ${walletAddress}: ${score} <= ${existing.score}`);
    }
  } catch (err) {
    console.error("❌ Error saving score:", err);
  }
}

// 🏆 Get leaderboard top N
export async function getLeaderboard(limit = 20) {
  try {
    const keys = await redis.keys("player:*");
    const all = [];

    for (const key of keys) {
      const wallet = key.replace("player:", "");
      const raw = await redis.get(key);
      const parsed = parseStored(raw);
      if (!parsed) continue;
      all.push({
        walletAddress: wallet,
        score: parsed.score,
        lines: parsed.lines ?? 0,
        ts: parsed.ts ?? null,
      });
    }

    return all.sort((a, b) => b.score - a.score).slice(0, limit);
  } catch (err) {
    console.error("❌ Error getting leaderboard:", err);
    return [];
  }
}

// 🧹 Admin reset
export async function resetLeaderboard() {
  try {
    const keys = await redis.keys("player:*");
    for (const key of keys) await redis.del(key);
    console.log("🔥 Leaderboard cleared");
  } catch (err) {
    console.error("❌ Error resetting leaderboard:", err);
  }
}
