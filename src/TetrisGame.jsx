import React, { useEffect, useRef, useState } from "react";
import {
  saveScore,
  getLeaderboard,
  resetLeaderboard,
} from "./services/leaderboardService";

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  L: [
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  J: [
    [0, 1],
    [0, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
};

const TYPES = ["pumpkin", "bat", "ghost", "skull"];
const TEXTURE_PATHS = {
  pumpkin: "/assets/pumpkin.png",
  bat: "/assets/bat.png",
  ghost: "/assets/ghost.png",
  skull: "/assets/skull.png",
};

// 🎧 Sounds
const bgMusic = new Audio("/assets/music.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.4;

const tetrisSound = new Audio("/assets/tetris.mp3");
tetrisSound.volume = 0.8;

const gameOverSound = new Audio("/assets/gameover.mp3");
gameOverSound.volume = 0.9;

const createEmptyBoard = () =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const randomPiece = () => {
  const keys = Object.keys(SHAPES);
  const key = keys[Math.floor(Math.random() * keys.length)];
  const shape = SHAPES[key];
  const color = TYPES[Math.floor(Math.random() * TYPES.length)];
  return {
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
    color,
  };
};

export default function TetrisGame() {
  const canvasRef = useRef(null);
  const [board, setBoard] = useState(createEmptyBoard());
  const [current, setCurrent] = useState(randomPiece());
  const [nextPiece, setNextPiece] = useState(randomPiece());
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [walletAddress, setWalletAddress] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [muted, setMuted] = useState(() => localStorage.getItem("muted") === "true");

  const adminWallet = "0x6682e83B7Ad638379f5Cad6F56627Fc3EEb49115";

  const [textures] = useState(() => {
    const o = {};
    Object.entries(TEXTURE_PATHS).forEach(([k, v]) => {
      const img = new Image();
      img.src = v;
      o[k] = img;
    });
    return o;
  });

  const collide = (p, b) =>
    p.shape.some((r, y) =>
      r.some(
        (c, x) =>
          c &&
          (p.y + y >= ROWS ||
            p.x + x < 0 ||
            p.x + x >= COLS ||
            b[p.y + y][p.x + x])
      )
    );

  const mergePiece = (p, b) => {
    const copy = b.map((r) => [...r]);
    p.shape.forEach((row, y) =>
      row.forEach((c, x) => {
        if (c && p.y + y >= 0) copy[p.y + y][p.x + x] = p.color;
      })
    );
    return copy;
  };

  const removeFullRows = (b) => {
    const newB = b.filter((r) => r.some((c) => !c));
    const cleared = ROWS - newB.length;
    const empty = Array.from({ length: cleared }, () => Array(COLS).fill(null));
    return [empty, newB, cleared];
  };

  const drop = async () => {
    if (!running) return;
    const moved = { ...current, y: current.y + 1 };
    if (collide(moved, board)) {
      let merged = mergePiece(current, board);
      const [empty, filtered, cleared] = removeFullRows(merged);
      merged = [...empty, ...filtered];
      if (cleared > 0) {
        setScore((s) => s + cleared * 100);
        if (cleared === 4 && !muted) tetrisSound.play();
      }
      const next = nextPiece;
      if (collide(next, merged)) {
        if (!muted) {
          bgMusic.pause();
          gameOverSound.play();
        } else bgMusic.pause();
        setRunning(false);
        setGameOver(true);
        if (walletAddress) await saveScore(walletAddress, score);
      } else {
        setBoard(merged);
        setCurrent(next);
        setNextPiece(randomPiece());
      }
    } else setCurrent(moved);
  };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE);
    board.forEach((r, y) =>
      r.forEach((c, x) => {
        if (c && textures[c]?.complete)
          ctx.drawImage(
            textures[c],
            x * BLOCK_SIZE,
            y * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
          );
      })
    );
    current.shape.forEach((r, y) =>
      r.forEach((c, x) => {
        if (c && textures[current.color]?.complete)
          ctx.drawImage(
            textures[current.color],
            (current.x + x) * BLOCK_SIZE,
            (current.y + y) * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
          );
      })
    );
  }, [board, current]);

  useEffect(() => {
    const handleKey = (e) => {
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"].includes(e.key))
        e.preventDefault();
      if (!running) return;
      if (e.key === "ArrowLeft") {
        const m = { ...current, x: current.x - 1 };
        if (!collide(m, board)) setCurrent(m);
      } else if (e.key === "ArrowRight") {
        const m = { ...current, x: current.x + 1 };
        if (!collide(m, board)) setCurrent(m);
      } else if (e.key === "ArrowDown") {
        drop();
      } else if (e.key === "ArrowUp") {
        const rotated = current.shape[0]
          .map((_, i) => current.shape.map((r) => r[i]))
          .reverse();
        const r = { ...current, shape: rotated };
        if (!collide(r, board)) setCurrent(r);
      }
    };
    window.addEventListener("keydown", handleKey, { passive: false });
    return () => window.removeEventListener("keydown", handleKey);
  }, [current, board, running]);

  useEffect(() => {
    const canvas = document.getElementById("next-piece");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 120, 120);
    const bs = 20;
    nextPiece.shape.forEach((r, y) =>
      r.forEach((c, x) => {
        if (c && textures[nextPiece.color]?.complete)
          ctx.drawImage(
            textures[nextPiece.color],
            x * bs + 40,
            y * bs + 40,
            bs,
            bs
          );
      })
    );
  }, [nextPiece, textures]);

  useEffect(() => {
    if (!running) return;
    const baseSpeed = 600;
    const speed = Math.max(150, baseSpeed - Math.floor(score / 300) * 50);
    const interval = setInterval(drop, speed);
    return () => clearInterval(interval);
  }, [running, board, current, score]);

  const startGame = () => {
    if (!muted) {
      bgMusic.currentTime = 0;
      bgMusic.play();
    }
    setBoard(createEmptyBoard());
    setCurrent(randomPiece());
    setNextPiece(randomPiece());
    setScore(0);
    setGameOver(false);
    setRunning(true);
  };

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask!");
    const acc = await window.ethereum.request({ method: "eth_requestAccounts" });
    setWalletAddress(acc[0]);
  };

  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    localStorage.setItem("muted", newMuted);
    if (newMuted) bgMusic.pause();
    else if (running) bgMusic.play();
  };

  const showLeaderboard = async () => {
    const data = await getLeaderboard();
    setLeaderboard(data);
    let msg = "🎃🏆 Haunted Blocks Leaderboard 🏆👻\n\n";
    data.forEach((item, i) => {
      const m = i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : `${i + 1}. `;
      msg += `${m}${item.walletAddress.slice(0, 6)}...${item.walletAddress.slice(
        -4
      )} — ${item.score}\n`;
    });
    alert(msg);
  };

  return (
    <div
      style={{
        textAlign: "center",
        color: "white",
        backgroundImage: "url('/assets/background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "20px",
        overflow: "hidden",
        position: "fixed",
      }}
    >
      <h1
        style={{
          color: "orange",
          fontSize: 50,
          textShadow: "2px 2px black",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        🦇🎃 Haunted Blocks 👻🕸️
      </h1>

      <p
        style={{
          fontSize: "18px",
          color: "white",
          textShadow: "1px 1px black",
          marginTop: "5px",
          marginBottom: "15px",
        }}
      >
        Use arrow keys to move and rotate blocks. Fill rows to clear them!
      </p>

      {/* Top Buttons */}
      <div style={{ position: "absolute", top: 20, left: 20 }}>
        <button
          onClick={showLeaderboard}
          style={{
            padding: "10px 20px",
            background: "orange",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            color: "black",
            fontWeight: "bold",
          }}
        >
          Leaderboard
        </button>

        <button
          onClick={connectWallet}
          style={{
            marginLeft: "10px",
            padding: "10px 20px",
            background: walletAddress ? "green" : "purple",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            color: "white",
            fontWeight: "bold",
          }}
        >
          {walletAddress
            ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
            : "Connect Wallet"}
        </button>

        {walletAddress?.toLowerCase() === adminWallet.toLowerCase() && (
          <button
            onClick={async () => {
              const c = confirm("⚠️ Reset all scores?");
              if (c) {
                await resetLeaderboard();
                alert("🔥 Leaderboard cleared!");
              }
            }}
            style={{
              marginLeft: "10px",
              padding: "10px 20px",
              background: "darkred",
              border: "none",
              borderRadius: "8px",
              color: "white",
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* 🔊 Mute Button */}
      <div style={{ position: "absolute", top: 20, right: 20, fontSize: 24 }}>
        <span
          onClick={toggleMute}
          style={{ cursor: "pointer", userSelect: "none" }}
        >
          {muted ? "🔇" : "🔊"}
        </span>
      </div>

      {!running && !gameOver && (
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={startGame}
            style={{
              padding: "10px 20px",
              background: "green",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Start
          </button>
        </div>
      )}

      {/* Game + Score Box */}
      <div style={{ position: "relative", marginTop: "20px" }}>
        <canvas
          ref={canvasRef}
          width={COLS * BLOCK_SIZE}
          height={ROWS * BLOCK_SIZE}
          style={{
            backgroundColor: "rgba(0,0,0,0.8)",
            border: "2px solid orange",
            boxShadow: "0 0 20px orange",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "-200px",
            backgroundColor: "rgba(0,0,0,0.6)",
            border: "2px solid orange",
            borderRadius: "10px",
            padding: "10px",
            width: "160px",
            textAlign: "center",
            boxShadow: "0 0 10px orange",
          }}
        >
          <div style={{ color: "orange", fontSize: "18px", fontWeight: "bold" }}>
            Score: {score}
          </div>

          <div
            style={{
              marginTop: "10px",
              backgroundColor: "rgba(20,20,20,0.9)",
              border: "1px solid orange",
              width: "120px",
              height: "120px",
              margin: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <canvas
              id="next-piece"
              width="120"
              height="120"
              style={{ backgroundColor: "black" }}
            ></canvas>
          </div>
        </div>

        {/* Game Over Overlay */}
        {gameOver && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: COLS * BLOCK_SIZE,
              height: ROWS * BLOCK_SIZE,
              backgroundColor: "rgba(0,0,0,0.85)",
              color: "orange",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: "bold",
            }}
          >
            🎃 Game Over 👻
            <button
              onClick={startGame}
              style={{
                marginTop: "20px",
                padding: "10px 20px",
                background: "orange",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                color: "black",
                fontWeight: "bold",
              }}
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
