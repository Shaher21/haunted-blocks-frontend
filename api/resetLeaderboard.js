import fs from "fs";
import path from "path";

const filePath = path.resolve("./leaderboard.json");

export default function handler(req, res) {
  if (req.method === "POST") {
    fs.writeFileSync(filePath, JSON.stringify({}));
    return res.status(200).json({ message: "Leaderboard reset!" });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
