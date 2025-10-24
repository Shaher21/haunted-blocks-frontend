import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";

const leaderboardRef = collection(db, "leaderboard");

// Save only the highest score per wallet
export async function saveScore(walletAddress, score) {
  try {
    const snapshot = await getDocs(query(leaderboardRef));
    let existingEntry = null;
    snapshot.forEach((docSnap) => {
      if (docSnap.data().walletAddress === walletAddress) {
        existingEntry = { id: docSnap.id, ...docSnap.data() };
      }
    });

    if (existingEntry) {
      if (score > existingEntry.score) {
        const playerDoc = doc(db, "leaderboard", existingEntry.id);
        await updateDoc(playerDoc, { score, timestamp: new Date() });
        console.log("✅ Updated high score:", score);
      } else {
        console.log("⚠️ New score is lower — not updating.");
      }
    } else {
      await addDoc(leaderboardRef, {
        walletAddress,
        score,
        timestamp: new Date(),
      });
      console.log("🏆 New player added!");
    }
  } catch (e) {
    console.error("Error saving score: ", e);
  }
}

// Load top 10 high scores
export async function getLeaderboard() {
  const q = query(leaderboardRef, orderBy("score", "desc"), limit(10));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data());
}

// Delete all scores
export async function resetLeaderboard() {
  try {
    const snapshot = await getDocs(leaderboardRef);
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
    }
    console.log("🔥 Leaderboard has been reset!");
  } catch (e) {
    console.error("Error resetting leaderboard:", e);
  }
}
