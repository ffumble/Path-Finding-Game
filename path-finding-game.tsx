"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

// Constants
const GRID_SIZE = 35
const CELL_SIZE = 15
const SCREEN_SIZE = GRID_SIZE * CELL_SIZE
const TIME_LIMIT = 12 // seconds
const MISTAKES_ALLOWED = 3
const ERROR_FLASH_DURATION = 200 // milliseconds

// Colors
const GREEN = "#00FF00"
const GRAY = "#666666"
const RED = "#FF0000"
const DARK_BLUE = "#1A1A2E"
const GRID_BLUE = "#252538"

export default function PathFindingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<"idle" | "playing" | "won" | "lost">("idle")
  const [mistakes, setMistakes] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [path, setPath] = useState<Array<[number, number]>>([])
  const [playerPos, setPlayerPos] = useState<[number, number]>([0, 0])
  const [isErrorFlashing, setIsErrorFlashing] = useState(false)

  // Refs for animation and audio
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const errorSoundRef = useRef<HTMLAudioElement | null>(null)
  const errorFlashTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize the audio element
  useEffect(() => {
    errorSoundRef.current = new Audio("/error-sound.mp3")
    errorSoundRef.current.volume = 0.5 // Set volume to 50%
  }, [])

  // Play error sound function
  const playErrorSound = () => {
    if (errorSoundRef.current) {
      errorSoundRef.current.currentTime = 0 // Reset to start
      errorSoundRef.current.play().catch((err) => console.log("Audio play failed:", err))
    }
  }

  // Flash error effect
  const flashErrorEffect = () => {
    // Clear any existing timeout
    if (errorFlashTimeoutRef.current) {
      clearTimeout(errorFlashTimeoutRef.current)
    }

    // Set error flash state
    setIsErrorFlashing(true)

    // Clear error flash after duration
    errorFlashTimeoutRef.current = setTimeout(() => {
      setIsErrorFlashing(false)
      errorFlashTimeoutRef.current = null
    }, ERROR_FLASH_DURATION)
  }

  // Generate a valid path from bottom to top
  const generatePath = () => {
    const newPath: Array<[number, number]> = []
    let x = Math.floor(GRID_SIZE / 2)
    let y = GRID_SIZE - 1
    newPath.push([x, y])

    while (y > 0) {
      // Only allow up, left, right
      const directions = [
        [0, -1],
        [-1, 0],
        [1, 0],
      ]
      shuffleArray(directions)

      let moved = false
      for (const [dx, dy] of directions) {
        const nx = x + dx
        const ny = y + dy

        if (isValidMove(newPath, nx, ny) && !formsSquare(newPath, nx, ny)) {
          x = nx
          y = ny
          newPath.push([x, y])
          moved = true
          break
        }
      }

      if (!moved) break // No valid moves, path ends
    }

    return newPath
  }

  // Check if a move is valid (for path generation)
  const isValidMove = (path: Array<[number, number]>, x: number, y: number) => {
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && !path.some(([px, py]) => px === x && py === y)
  }

  // Check if a position is within grid bounds
  const isWithinBounds = (x: number, y: number) => {
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE
  }

  // Check if a position is on the path
  const isOnPath = (x: number, y: number) => {
    return path.some(([px, py]) => px === x && py === y)
  }

  // Check if a move would form a square with existing path cells
  const formsSquare = (path: Array<[number, number]>, x: number, y: number) => {
    const hasPoint = (px: number, py: number) => path.some(([x, y]) => x === px && y === py)

    return (
      (hasPoint(x - 1, y) && hasPoint(x, y - 1) && hasPoint(x - 1, y - 1)) ||
      (hasPoint(x + 1, y) && hasPoint(x, y - 1) && hasPoint(x + 1, y - 1)) ||
      (hasPoint(x - 1, y) && hasPoint(x, y + 1) && hasPoint(x - 1, y + 1)) ||
      (hasPoint(x + 1, y) && hasPoint(x, y + 1) && hasPoint(x + 1, y + 1))
    )
  }

  // Shuffle array in place
  const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
  }

  // Draw the game grid
  const drawGrid = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas with dark background
    ctx.fillStyle = DARK_BLUE
    ctx.fillRect(0, 0, SCREEN_SIZE, SCREEN_SIZE + 10)

    // Draw grid cells
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        ctx.fillStyle = GRID_BLUE
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)

        // Add subtle grid lines
        ctx.strokeStyle = "rgba(0,0,0,0.2)"
        ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
      }
    }

    // Draw path cells with spacing to make them distinct
    for (const [x, y] of path) {
      ctx.fillStyle = GRAY
      // Draw slightly smaller squares to create spacing between them
      const padding = 1
      ctx.fillRect(x * CELL_SIZE + padding, y * CELL_SIZE + padding, CELL_SIZE - padding * 2, CELL_SIZE - padding * 2)
    }

    // Draw player position in green or red if error flashing
    const [playerX, playerY] = playerPos
    ctx.fillStyle = isErrorFlashing ? RED : GREEN
    ctx.fillRect(playerX * CELL_SIZE, playerY * CELL_SIZE, CELL_SIZE, CELL_SIZE)

    // Draw timer bar at bottom
    const timerWidth = SCREEN_SIZE * (timeLeft / TIME_LIMIT)
    ctx.fillStyle = RED
    ctx.fillRect(0, SCREEN_SIZE, timerWidth, 10)
  }

  // Start a new game
  const startGame = () => {
    // Cancel any existing animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Clear any existing error flash timeout
    if (errorFlashTimeoutRef.current) {
      clearTimeout(errorFlashTimeoutRef.current)
      errorFlashTimeoutRef.current = null
    }

    // Generate new path
    const newPath = generatePath()
    setPath(newPath)

    // Set player at start position
    setPlayerPos(newPath[0])

    // Reset game state
    setMistakes(0)
    setTimeLeft(TIME_LIMIT)
    setGameState("playing")
    setIsErrorFlashing(false)

    // Set start time
    startTimeRef.current = Date.now()
  }

  // Check if player has reached the end of the path
  const checkWinCondition = () => {
    const [playerX, playerY] = playerPos
    const endPoint = path[path.length - 1]

    // Make sure we have a valid end point
    if (!endPoint) return

    const [endX, endY] = endPoint

    // Check if player is at the end point
    if (playerX === endX && playerY === endY) {
      // Set a small timeout to ensure the final position is rendered before showing win screen
      setTimeout(() => {
        setGameState("won")
      }, 50)
    }
  }

  // Handle keyboard input
  const handleKeyDown = (e: KeyboardEvent) => {
    if (gameState !== "playing") return

    const [playerX, playerY] = playerPos
    let dx = 0,
      dy = 0

    // Support both arrow keys and WASD
    switch (e.key.toLowerCase()) {
      case "arrowleft":
      case "a":
        dx = -1
        e.preventDefault()
        break
      case "arrowright":
      case "d":
        dx = 1
        e.preventDefault()
        break
      case "arrowup":
      case "w":
        dy = -1
        e.preventDefault()
        break
      case "arrowdown":
      case "s":
        dy = 1
        e.preventDefault()
        break
      default:
        return
    }

    const newX = playerX + dx
    const newY = playerY + dy

    // Check if the new position is within bounds
    if (isWithinBounds(newX, newY)) {
      // Always move the player to the new position
      setPlayerPos([newX, newY])

      // Check if the new position is NOT on the path
      if (!isOnPath(newX, newY)) {
        // Count as a mistake
        const newMistakes = mistakes + 1
        setMistakes(newMistakes)

        // Play error sound and flash
        playErrorSound()
        flashErrorEffect()

        // End game if mistakes reach the limit
        if (newMistakes >= MISTAKES_ALLOWED) {
          setGameState("lost")
        }
      } else {
        // Check if player reached the end of the path
        // This needs to be called AFTER updating the player position
        setTimeout(() => checkWinCondition(), 0)
      }
    }
  }

  // Update game state on each frame
  useEffect(() => {
    // Only run the game loop when the game is playing
    if (gameState !== "playing") return

    const updateGame = () => {
      // Update timer
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const newTimeLeft = Math.max(0, TIME_LIMIT - elapsed)
      setTimeLeft(newTimeLeft)

      // Check if time is up
      if (newTimeLeft <= 0) {
        setGameState("lost")
        return
      }

      // Continue the game loop
      animationFrameRef.current = requestAnimationFrame(updateGame)
    }

    // Start the game loop
    animationFrameRef.current = requestAnimationFrame(updateGame)

    // Clean up when component unmounts or game state changes
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [gameState])

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [gameState, playerPos, path, mistakes])

  // Draw the game whenever state changes
  useEffect(() => {
    drawGrid()
  }, [gameState, playerPos, path, timeLeft, isErrorFlashing])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (errorFlashTimeoutRef.current) {
        clearTimeout(errorFlashTimeoutRef.current)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Initialize the canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.fillStyle = DARK_BLUE
        ctx.fillRect(0, 0, SCREEN_SIZE, SCREEN_SIZE + 10)
      }
    }
  }, [])

  // Check win condition whenever player position changes
  useEffect(() => {
    if (gameState === "playing") {
      checkWinCondition()
    }
  }, [playerPos])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 relative">
      <motion.div
        className="absolute top-4 left-4 text-2xl font-bold text-white"
        initial={{ opacity: 0, y: -20 }}
        animate={{
          opacity: 1,
          y: 0,
          textShadow: ["0 0 5px #00ff00", "0 0 15px #00ff00", "0 0 5px #00ff00"],
        }}
        transition={{
          duration: 1,
          textShadow: {
            duration: 1.5,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          },
        }}
      >
        Made by 4nem
      </motion.div>

      <div className="absolute bottom-4 left-4 text-sm text-gray-400">fumble x</div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={SCREEN_SIZE}
          height={SCREEN_SIZE + 10}
          className="border border-gray-800 shadow-lg"
        />

        {gameState !== "playing" && gameState !== "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4 text-white">{gameState === "won" ? "You Win!" : "Game Over!"}</h2>
              <Button onClick={startGame} className="bg-gray-700 hover:bg-gray-600" autoFocus>
                Play Again
              </Button>
            </div>
          </div>
        )}

        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4 text-white">Path Finding Game</h2>
              <p className="text-gray-300 mb-4">
                Use arrow keys or WASD to navigate the path. You have {TIME_LIMIT} seconds and {MISTAKES_ALLOWED}{" "}
                mistakes allowed.
              </p>
              <Button onClick={startGame} className="bg-gray-700 hover:bg-gray-600" autoFocus>
                Start Game
              </Button>
            </div>
          </div>
        )}
      </div>

      {gameState === "playing" && (
        <div className="mt-2 text-white text-sm">
          Mistakes: {mistakes}/{MISTAKES_ALLOWED}
        </div>
      )}
    </div>
  )
}