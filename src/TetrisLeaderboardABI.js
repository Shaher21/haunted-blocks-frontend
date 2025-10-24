export const tetrisLeaderboardABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "uint256", "name": "score", "type": "uint256" }
    ],
    "name": "submitScore",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLeaderboard",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "uint256", "name": "score", "type": "uint256" }
        ],
        "internalType": "struct TetrisLeaderboard.Player[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
