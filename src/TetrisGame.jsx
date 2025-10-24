import React, { useEffect, useRef, useState } from "react";
import { saveScore, getLeaderboard } from "./services/leaderboardService";

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

const createEmptyBoard = () =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const randomPiece = () => {
  const shapeKeys = Object.keys(SHAPES);
  const key = shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
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
  const [gameOver, setGameOver] = useState(false);
  const [running, setRunning] = useState(false);

  const [walletAddress, setWalletAddress] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  const [textures] = useState(() => {
    const obj = {};
    Object.entries(TEXTURE_PATHS).forEach(([k, v]) => {
      const img = new Image();
      img.src = v;
      obj[k] = img;
    });
    return obj;
  });

  const drawBoard = (ctx) => {
    ctx.clearRect(0, 0, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE);
    board.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell && textures[cell]?.complete)
          ctx.drawImage(
            textures[cell],
            x * BLOCK_SIZE,
            y * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
          );
      })
    );
  };

  const drawPiece = (ctx, piece) => {
    piece.shape.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell && textures[piece.color]?.complete)
          ctx.drawImage(
            textures[piece.color],
            (piece.x + x) * BLOCK_SIZE,
            (piece.y + y) * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
          );
      })
    );
  };

  const collide = (piece, board) => {
    return piece.shape.some((row, y) =>
      row.some(
        (cell, x) =>
          cell &&
          (piece.y + y >= ROWS ||
            piece.x + x < 0 ||
            piece.x + x >= COLS ||
            board[piece.y + y][piece.x + x])
      )
    );
  };

  const mergePiece = (piece, board) => {
    const newBoard = board.map((r) => [...r]);
    piece.shape.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell && piece.y + y >= 0)
          newBoard[piece.y + y][piece.x + x] = piece.color;
      })
    );
    return newBoard;
  };

  const removeFullRows = (brd) => {
    const newBoard = brd.filter((row) => row.some((cell) => !cell));
    const cleared = ROWS - newBoard.length;
    const emptyRows = Array.from({ length: cleared }, () =>
      Array(COLS).fill(null)
    );
    return [...emptyRows, ...newBoard];
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setWalletAddress(accounts[0]);
      console.log("Connected wallet:", accounts[0]);
    } else {
      alert("Please install MetaMask!");
    }
  };

  const drop = async () => {
    if (gameOver || !running) return;
    const moved = { ...current, y: current.y + 1 };
    if (collide(moved, board)) {
      const newBoard = mergePiece(current, board);
      const clearedBoard = removeFullRows(newBoard);
      setBoard(clearedBoard);
      const nextPiece = randomPiece();
      if (collide(nextPiece, clearedBoard)) {
        setGameOver(true);
        setRunning(false);

        if (walletAddress) {
          const score = clearedBoard.flat().filter(Boolean).length;
          await saveScore(walletAddress, score);
          const updated = await getLeaderboard();
          setLeaderboard(updated);
        }
      } else {
        setCurrent(nextPiece);
      }
    } else {
      setCurrent(moved);
    }
  };

  const move = (dir) => {
    const moved = { ...current, x: current.x + dir };
    if (!collide(moved, board)) setCurrent(moved);
  };

  const rotate = () => {
    const rotated = current.shape[0].map((_, i) =>
      current.shape.map((r) => r[i])
    ).reverse();
    const rotatedPiece = { ...current, shape: rotated };
    if (!collide(rotatedPiece, board)) setCurrent(rotatedPiece);
  };

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    drawBoard(ctx);
    drawPiece(ctx, current);
  }, [board, current]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(drop, 600);
    return () => clearInterval(interval);
  }, [current, board, running, gameOver]);

  useEffect(() => {
    const handle = (e) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
      }
      if (gameOver || !running) return;
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowDown") drop();
      if (e.key === "ArrowUp") rotate();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [current, board, gameOver, running]);

  const startGame = () => {
    setBoard(createEmptyBoard());
    setCurrent(randomPiece());
    setGameOver(false);
    setRunning(true);
  };

  const restartGame = () => {
    setBoard(createEmptyBoard());
    setCurrent(randomPiece());
    setGameOver(false);
    setRunning(true);
  };

  const showLeaderboard = async () => {
    const data = await getLeaderboard();
    setLeaderboard(data);
    let message = "🏆 Top 10 Players 🏆\n\n";
    data.forEach((item, i) => {
      message += `${i + 1}. ${item.walletAddress.slice(0, 6)}...${item.walletAddress.slice(
        -4
      )} — ${item.score}\n`;
    });
    alert(message);
  };

  return (
    <div
      style={{
        textAlign: "center",
        color: "white",
        backgroundImage: "url('/assets/background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        overflow: "hidden",
        paddingTop: "20px",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: "48px",
          color: "orange",
          textShadow: "2px 2px black",
        }}
      >
        Haunted Blocks
      </h1>

      <p
        style={{
          marginTop: "10px",
          marginBottom: "20px",
          fontSize: "18px",
          color: "white",
        }}
      >
        Use arrow keys to move and rotate the blocks. Fill rows to clear them!
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
          {walletAddress ? "Wallet Connected ✅" : "Connect Wallet"}
        </button>
      </div>

      {!running && !gameOver && (
        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={startGame}
            style={{
              padding: "10px 20px",
              background: "green",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              color: "white",
              fontWeight: "bold",
            }}
          >
            Start
          </button>
        </div>
      )}

      <div style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          width={COLS * BLOCK_SIZE}
          height={ROWS * BLOCK_SIZE}
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            border: "2px solid orange",
            boxShadow: "0 0 20px orange",
          }}
        />

        {gameOver && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: COLS * BLOCK_SIZE,
              height: ROWS * BLOCK_SIZE,
              backgroundColor: "rgba(0,0,0,0.85)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              color: "orange",
              fontSize: "24px",
              fontWeight: "bold",
              borderRadius: "4px",
            }}
          >
            🎃 Game Over 👻
            <button
              onClick={restartGame}
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
