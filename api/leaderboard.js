import fs from "fs";
import path from "path";

const filePath = path.resolve("./leaderboard.json");

export default function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}));
    const leaderboard = JSON.parse(fs.readFileSync(filePath, "utf8"));

    const sorted = Object.entries(leaderboard)
      .map(([wallet, score]) => ({ walletAddress: wallet, score }))
      .sort((a, b) => b.score - a.score);

    res.status(200).json(sorted);
  } catch (e) {
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
}
