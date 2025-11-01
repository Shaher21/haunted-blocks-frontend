import { Redis } from "@upstash/redis/cloudflare";

const redis = new Redis({
  url: import.meta.env.VITE_UPSTASH_REDIS_REST_URL,
  token: import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN,
});

export async function getLeaderboard() {
  try {
    const keys = await redis.keys("player:*");
    if (!keys || keys.length === 0) return [];

    const all = {};

    for (const key of keys) {
      const wallet = key.replace("player:", "");
      let data = await redis.get(key);

      // Handle both formats (old number, new object)
      if (data === null || data === undefined) continue;

      if (typeof data === "object" && "score" in data) {
        all[wallet] = data;
      } else {
        const parsed = Number(data);
        if (!isNaN(parsed)) {
          all[wallet] = { score: parsed, lines: 0, ts: 0 };
        }
      }
    }

    // Sort and limit to top 20
    return Object.entries(all)
      .map(([walletAddress, v]) => ({ walletAddress, ...v }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  } catch (err) {
    console.error("❌ Error getting leaderboard:", err);
    return [];
  }
}

export async function saveScore(walletAddress, scoreData) {
  try {
    await redis.set(`player:${walletAddress}`, scoreData);
  } catch (err) {
    console.error("❌ Error saving score:", err);
  }
}

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
