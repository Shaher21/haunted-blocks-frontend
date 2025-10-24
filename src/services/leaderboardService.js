import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit
} from "firebase/firestore";

const leaderboardRef = collection(db, "leaderboard");

// Save score to Firebase
export async function saveScore(walletAddress, score) {
  try {
    await addDoc(leaderboardRef, {
      walletAddress,
      score,
      timestamp: new Date(),
    });
    console.log("Score saved!");
  } catch (e) {
    console.error("Error saving score: ", e);
  }
}

// Load top scores
export async function getLeaderboard() {
  const q = query(leaderboardRef, orderBy("score", "desc"), limit(10));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
}
