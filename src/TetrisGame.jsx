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

const rotateSound = new Audio("/assets/rotate.mp3");
rotateSound.volume = 0.6;

const clearSound = new Audio("/assets/clear.mp3");
clearSound.volume = 0.7;

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
  const nextRef = useRef(null);
  const boardRef = useRef(createEmptyBoard());
  const pieceRef = useRef(randomPiece());
  const [board, setBoard] = useState(boardRef.current);
  const [nextPiece, setNextPiece] = useState(randomPiece());
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [walletAddress, setWalletAddress] = useState(null);
  const [muted, setMuted] = useState(() => localStorage.getItem("muted") === "true");
  const [scale, setScale] = useState(Math.min(window.innerHeight / 800, 1));

  const adminWallet = "0x619fAd7514e9AE65c5fDE00b4bEa79721f557612";

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

  const drawNextPiece = () => {
    const canvas = nextRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 120, 120);
    const bs = 20;
    const offsetX = (120 - nextPiece.shape[0].length * bs) / 2;
    const offsetY = (120 - nextPiece.shape.length * bs) / 2;
    nextPiece.shape.forEach((r, y) =>
      r.forEach((c, x) => {
        if (c && textures[nextPiece.color]?.complete)
          ctx.drawImage(
            textures[nextPiece.color],
            offsetX + x * bs,
            offsetY + y * bs,
            bs,
            bs
          );
      })
    );
  };

  useEffect(drawNextPiece, [nextPiece, textures]);

  // 🕹️ Gravity loop
  useEffect(() => {
    if (!running) return;
    let frame;

    const tick = () => {
      const baseSpeed = 600;
      const speed = Math.max(150, baseSpeed - Math.floor(score / 300) * 50);
      const current = pieceRef.current;
      const moved = { ...current, y: current.y + 1 };
      const board = boardRef.current;

      if (collide(moved, board)) {
        let merged = mergePiece(current, board);
        const [empty, filtered, cleared] = removeFullRows(merged);
        merged = [...empty, ...filtered];
        boardRef.current = merged;
        setBoard(merged);

        if (cleared > 0) {
          let points = cleared * 100;
          if (cleared === 4) points += 600; // 💎 bonus for Tetris!
           setScore((s) => s + points);

        if (!muted) {
          clearSound.play();
          if (cleared === 4) tetrisSound.play();
          }
        }

        const next = nextPiece;
        if (collide(next, merged)) {
          if (!muted) {
            bgMusic.pause();
            gameOverSound.play();
          } else bgMusic.pause();
          setRunning(false);
          setGameOver(true);
          if (walletAddress) saveScore(walletAddress, score);
          cancelAnimationFrame(frame);
          return;
        } else {
          pieceRef.current = next;
          setNextPiece(randomPiece());
        }
      } else {
        pieceRef.current = moved;
      }

      frame = setTimeout(tick, Math.max(150, 600 - Math.floor(score / 300) * 50));
    };

    frame = setTimeout(tick, 600);
    return () => clearTimeout(frame);
  }, [running, nextPiece, score]);

  // 🎨 Render board and active piece
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const draw = () => {
      ctx.clearRect(0, 0, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE);
      const b = boardRef.current;
      const p = pieceRef.current;

      b.forEach((r, y) =>
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

      p.shape.forEach((r, y) =>
        r.forEach((c, x) => {
          if (c && textures[p.color]?.complete)
            ctx.drawImage(
              textures[p.color],
              (p.x + x) * BLOCK_SIZE,
              (p.y + y) * BLOCK_SIZE,
              BLOCK_SIZE,
              BLOCK_SIZE
            );
        })
      );
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }, [textures]);

  // 🚫 Prevent page scrolling when using arrow keys
  useEffect(() => {
    const preventScroll = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.key)) {
        e.preventDefault();
      }
    };

    const handleKey = (e) => {
      if (!running) return;

      const current = pieceRef.current;
      const board = boardRef.current;

      if (e.key === "ArrowLeft") {
        const m = { ...current, x: current.x - 1 };
        if (!collide(m, board)) pieceRef.current = m;
      } else if (e.key === "ArrowRight") {
        const m = { ...current, x: current.x + 1 };
        if (!collide(m, board)) pieceRef.current = m;
      } else if (e.key === "ArrowDown") {
        const m = { ...current, y: current.y + 1 };
        if (!collide(m, board)) pieceRef.current = m;
      } else if (e.key === "ArrowUp") {
        const rotated = current.shape[0]
          .map((_, i) => current.shape.map((r) => r[i]))
          .reverse();
        const r = { ...current, shape: rotated };
        if (!collide(r, board)) {
          pieceRef.current = r;
          if (!muted) rotateSound.play();
        }
      }
    };

    window.addEventListener("keydown", preventScroll, { passive: false });
    window.addEventListener("keydown", handleKey, { passive: false });

    return () => {
      window.removeEventListener("keydown", preventScroll);
      window.removeEventListener("keydown", handleKey);
    };
  }, [running, muted]);

  // ⚖️ Dynamic scaling
  useEffect(() => {
    const handleResize = () => setScale(Math.min(window.innerHeight / 800, 1));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const startGame = () => {
    boardRef.current = createEmptyBoard();
    pieceRef.current = randomPiece();
    setBoard(boardRef.current);
    setNextPiece(randomPiece());
    setScore(0);
    setGameOver(false);
    setRunning(true);
    if (!muted) {
      bgMusic.currentTime = 0;
      bgMusic.play();
    }
    drawNextPiece();
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
    let msg = "🎃🏆 Haunted Blocks Leaderboard 🏆👻\n\n";
    data.forEach((item, i) => {
      const m = i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : `${i + 1}. `;
      msg += `${m}${item.walletAddress} — ${item.score}\n`;
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
        height: "100%",
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "20px",
        overflow: "auto",
        position: "relative",
      }}
    >
      <h1 style={{ color: "orange", fontSize: 50, textShadow: "2px 2px black" }}>
        🦇🎃 Haunted Blocks 👻🕸️
      </h1>

      <p style={{ color: "white", textShadow: "1px 1px black" }}>
        Use arrow keys to move and rotate blocks. Fill rows to clear them!
      </p>

      <div style={{ position: "absolute", top: 20, left: 20 }}>
        <button
          onClick={showLeaderboard}
          style={{
            padding: "10px 20px",
            background: "orange",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
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
              if (confirm("⚠️ Reset all scores?")) {
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

      <div style={{ position: "absolute", top: 20, right: 20, fontSize: 24 }}>
        <span onClick={toggleMute} style={{ cursor: "pointer", userSelect: "none" }}>
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

      {/* 🎮 Game Area */}
      <div
        style={{
          position: "relative",
          marginTop: "20px",
          transform: `scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
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

        {/* 🧩 Next piece + score */}
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

          <canvas
            ref={nextRef}
            width="120"
            height="120"
            style={{
              backgroundColor: "black",
              marginTop: "10px",
              border: "1px solid orange",
            }}
          ></canvas>
        </div>

        {/* 👻 Game Over */}
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
