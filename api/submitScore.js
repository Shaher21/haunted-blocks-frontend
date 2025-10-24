import fs from "fs";
import path from "path";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0x6682e83B7Ad638379f5Cad6F56627Fc3EEb49115";
const ABI = [
  {
    inputs: [
      { internalType: "address", name: "player", type: "address" },
      { internalType: "uint256", name: "score", type: "uint256" },
    ],
    name: "verifyScore",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
];

const provider = new ethers.JsonRpcProvider("https://rpc.sepolia.org");

// Path to persistent JSON file
const filePath = path.resolve("./leaderboard.json");

// Helper to read/write leaderboard
function readLeaderboard() {
  try {
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}));
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function writeLeaderboard(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { walletAddress, score } = req.body;
    if (!walletAddress || score === undefined)
      return res.status(400).json({ error: "Missing wallet or score" });

    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const verified = await contract.verifyScore(walletAddress, score);

    if (!verified)
      return res.status(403).json({ error: "Invalid score verification" });

    const leaderboard = readLeaderboard();
    if (!leaderboard[walletAddress] || score > leaderboard[walletAddress]) {
      leaderboard[walletAddress] = score;
      writeLeaderboard(leaderboard);
    }

    return res.status(200).json({ message: "Score verified and saved!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
