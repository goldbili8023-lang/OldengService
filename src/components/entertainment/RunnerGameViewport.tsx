import { Pause, Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const BEST_SCORE_STORAGE_KEY = 'safeconnect-runner-best-score';
const GROUND_HEIGHT = 64;
const PLAYER_SIZE = 34;
const PLAYER_X = 88;
const GRAVITY = 1900;
const JUMP_VELOCITY = -660;
const OBSTACLE_SPEED = 360;

interface GameState {
  width: number;
  height: number;
  playerY: number;
  velocityY: number;
  obstacleX: number;
  obstacleWidth: number;
  obstacleHeight: number;
  score: number;
  bestScore: number;
  isRunning: boolean;
  isStarted: boolean;
  isGameOver: boolean;
  lastFrameTime: number;
}

function getRandomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

export default function RunnerGameViewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>();
  const publishedStateRef = useRef({
    score: 0,
    bestScore: 0,
    isRunning: false,
    isStarted: false,
    isGameOver: false,
  });
  const gameStateRef = useRef<GameState>({
    width: 0,
    height: 0,
    playerY: 0,
    velocityY: 0,
    obstacleX: 0,
    obstacleWidth: 28,
    obstacleHeight: 54,
    score: 0,
    bestScore: 0,
    isRunning: false,
    isStarted: false,
    isGameOver: false,
    lastFrameTime: 0,
  });

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  const syncReactState = useCallback(() => {
    const gameState = gameStateRef.current;
    const nextPublishedState = {
      score: Math.floor(gameState.score),
      bestScore: gameState.bestScore,
      isRunning: gameState.isRunning,
      isStarted: gameState.isStarted,
      isGameOver: gameState.isGameOver,
    };

    if (
      nextPublishedState.score === publishedStateRef.current.score &&
      nextPublishedState.bestScore === publishedStateRef.current.bestScore &&
      nextPublishedState.isRunning === publishedStateRef.current.isRunning &&
      nextPublishedState.isStarted === publishedStateRef.current.isStarted &&
      nextPublishedState.isGameOver === publishedStateRef.current.isGameOver
    ) {
      return;
    }

    publishedStateRef.current = nextPublishedState;
    setScore(nextPublishedState.score);
    setBestScore(nextPublishedState.bestScore);
    setIsRunning(nextPublishedState.isRunning);
    setIsGameOver(nextPublishedState.isGameOver);
    setIsStarted(nextPublishedState.isStarted);
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    gameStateRef.current.width = width;
    gameStateRef.current.height = height;

    const groundY = height - GROUND_HEIGHT - PLAYER_SIZE;
    if (!gameStateRef.current.isStarted || !gameStateRef.current.isRunning) {
      gameStateRef.current.playerY = groundY;
    }

    if (gameStateRef.current.obstacleX === 0) {
      gameStateRef.current.obstacleX = width + 120;
    }
  }, []);

  const restartGame = useCallback((startImmediately = true) => {
    const gameState = gameStateRef.current;
    const groundY = gameState.height - GROUND_HEIGHT - PLAYER_SIZE;

    gameState.playerY = groundY;
    gameState.velocityY = 0;
    gameState.obstacleX = gameState.width + 120;
    gameState.obstacleWidth = 28;
    gameState.obstacleHeight = 52;
    gameState.score = 0;
    gameState.isStarted = true;
    gameState.isRunning = startImmediately;
    gameState.isGameOver = false;
    gameState.lastFrameTime = 0;

    syncReactState();
  }, [syncReactState]);

  const jump = useCallback(() => {
    const gameState = gameStateRef.current;
    if (gameState.width === 0 || gameState.height === 0) return;

    if (!gameState.isStarted || gameState.isGameOver) {
      restartGame(true);
    }

    if (!gameState.isRunning) {
      gameState.isRunning = true;
      gameState.isStarted = true;
      syncReactState();
    }

    const groundY = gameState.height - GROUND_HEIGHT - PLAYER_SIZE;
    if (gameState.playerY >= groundY - 1) {
      gameState.velocityY = JUMP_VELOCITY;
    }
  }, [restartGame, syncReactState]);

  useEffect(() => {
    const storedBestScore = window.localStorage.getItem(BEST_SCORE_STORAGE_KEY);
    if (storedBestScore) {
      const parsedScore = Number(storedBestScore);
      if (!Number.isNaN(parsedScore)) {
        gameStateRef.current.bestScore = parsedScore;
        setBestScore(parsedScore);
      }
    }

    resizeCanvas();

    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [resizeCanvas]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === 'ArrowUp') {
        event.preventDefault();
        jump();
      }

      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        restartGame(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [jump, restartGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const drawFrame = (timestamp: number) => {
      const gameState = gameStateRef.current;
      if (!gameState.width || !gameState.height) {
        frameRef.current = window.requestAnimationFrame(drawFrame);
        return;
      }

      const deltaSeconds = gameState.lastFrameTime
        ? Math.min((timestamp - gameState.lastFrameTime) / 1000, 0.05)
        : 0;
      gameState.lastFrameTime = timestamp;

      const groundY = gameState.height - GROUND_HEIGHT;
      const playerGroundY = groundY - PLAYER_SIZE;

      if (gameState.isRunning && !gameState.isGameOver) {
        gameState.velocityY += GRAVITY * deltaSeconds;
        gameState.playerY += gameState.velocityY * deltaSeconds;

        if (gameState.playerY > playerGroundY) {
          gameState.playerY = playerGroundY;
          gameState.velocityY = 0;
        }

        gameState.obstacleX -= OBSTACLE_SPEED * deltaSeconds;
        if (gameState.obstacleX + gameState.obstacleWidth < -40) {
          gameState.obstacleX = gameState.width + getRandomBetween(180, 320);
          gameState.obstacleWidth = getRandomBetween(24, 34);
          gameState.obstacleHeight = getRandomBetween(40, 68);
        }

        const playerBox = {
          x: PLAYER_X,
          y: gameState.playerY,
          width: PLAYER_SIZE,
          height: PLAYER_SIZE,
        };

        const obstacleBox = {
          x: gameState.obstacleX,
          y: groundY - gameState.obstacleHeight,
          width: gameState.obstacleWidth,
          height: gameState.obstacleHeight,
        };

        const collided =
          playerBox.x < obstacleBox.x + obstacleBox.width &&
          playerBox.x + playerBox.width > obstacleBox.x &&
          playerBox.y < obstacleBox.y + obstacleBox.height &&
          playerBox.y + playerBox.height > obstacleBox.y;

        if (collided) {
          gameState.isGameOver = true;
          gameState.isRunning = false;
        } else {
          gameState.score += deltaSeconds * 14;
          const wholeScore = Math.floor(gameState.score);
          if (wholeScore > gameState.bestScore) {
            gameState.bestScore = wholeScore;
            window.localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(wholeScore));
          }
        }
      }

      const width = gameState.width;
      const height = gameState.height;

      context.clearRect(0, 0, width, height);

      const gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#ecfeff');
      gradient.addColorStop(0.68, '#d1fae5');
      gradient.addColorStop(1, '#fef3c7');
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      context.fillStyle = 'rgba(255,255,255,0.72)';
      drawRoundedRect(context, width * 0.18, 42, 88, 22, 11);
      context.fill();
      drawRoundedRect(context, width * 0.58, 72, 118, 24, 12);
      context.fill();

      context.fillStyle = '#0f766e';
      context.fillRect(0, groundY, width, GROUND_HEIGHT);

      context.strokeStyle = 'rgba(255,255,255,0.34)';
      context.setLineDash([14, 14]);
      context.beginPath();
      context.moveTo(0, groundY + 18);
      context.lineTo(width, groundY + 18);
      context.stroke();
      context.setLineDash([]);

      context.fillStyle = '#111827';
      drawRoundedRect(context, PLAYER_X, gameState.playerY, PLAYER_SIZE, PLAYER_SIZE, 8);
      context.fill();

      context.fillStyle = '#f97316';
      drawRoundedRect(
        context,
        gameState.obstacleX,
        groundY - gameState.obstacleHeight,
        gameState.obstacleWidth,
        gameState.obstacleHeight,
        6,
      );
      context.fill();

      context.fillStyle = '#111827';
      context.font = '600 16px Inter, system-ui, sans-serif';
      context.fillText(`Score ${Math.floor(gameState.score)}`, 20, 28);
      context.fillText(`Best ${gameState.bestScore}`, width - 110, 28);

      if (!gameState.isStarted) {
        context.fillStyle = 'rgba(17,24,39,0.78)';
        context.fillRect(0, 0, width, height);
        context.fillStyle = '#ffffff';
        context.font = '600 26px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText('Tap to start running', width / 2, height / 2 - 14);
        context.font = '400 16px Inter, system-ui, sans-serif';
        context.fillText('Press Space or tap the screen to jump.', width / 2, height / 2 + 18);
        context.textAlign = 'left';
      }

      if (gameState.isGameOver) {
        context.fillStyle = 'rgba(17,24,39,0.82)';
        context.fillRect(0, 0, width, height);
        context.fillStyle = '#ffffff';
        context.font = '600 28px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText('Game over', width / 2, height / 2 - 18);
        context.font = '400 16px Inter, system-ui, sans-serif';
        context.fillText('Tap restart or press R to try again.', width / 2, height / 2 + 14);
        context.textAlign = 'left';
      }

      syncReactState();

      frameRef.current = window.requestAnimationFrame(drawFrame);
    };

    frameRef.current = window.requestAnimationFrame(drawFrame);

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [syncReactState]);

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-rose-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
          <span className="truncate block">runner://safeconnect/endless-run</span>
        </div>
      </div>

      <div className="grid min-h-[34rem] bg-zinc-950 md:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex items-center justify-center p-3 sm:p-5 md:p-8">
          <div className="h-[30rem] w-full overflow-hidden rounded-lg border border-white/10 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:h-[34rem]">
            <canvas
              ref={canvasRef}
              className="h-full w-full cursor-pointer"
              onPointerDown={() => jump()}
            />
          </div>
        </div>

        <aside className="flex flex-col justify-between gap-6 border-t border-white/10 bg-zinc-950 px-5 py-5 text-white md:border-l md:border-t-0">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-teal-300">
              Runner game
            </div>

            <h2 className="mt-4 text-2xl font-semibold leading-tight text-white">
              Jump over obstacles and keep the run going.
            </h2>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-white/60">Score</p>
                <p className="mt-2 text-2xl font-semibold text-white">{score}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-white/60">Best</p>
                <p className="mt-2 text-2xl font-semibold text-white">{bestScore}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm text-white/75">
              <p>Desktop: press <span className="font-semibold text-white">Space</span> or <span className="font-semibold text-white">Arrow Up</span> to jump.</p>
              <p>Mobile: tap anywhere inside the runner screen to jump.</p>
              <p>Press <span className="font-semibold text-white">R</span> or tap restart to begin again.</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                const gameState = gameStateRef.current;
                if (!gameState.isStarted || gameState.isGameOver) {
                  restartGame(true);
                  return;
                }

                gameState.isRunning = !gameState.isRunning;
                syncReactState();
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isRunning ? 'Pause run' : isStarted && !isGameOver ? 'Resume run' : 'Start run'}
            </button>

            <button
              type="button"
              onClick={() => restartGame(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-500"
            >
              <RotateCcw className="h-4 w-4" />
              Restart
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
