# Chaotic Rock Paper Scissors

A unique implementation of Rock Paper Scissors where player moves are determined by physical simulations - a pendulum system and a three-body gravitational system. The project demonstrates how chaotic systems can be used to create engaging game mechanics.

## Features

- **Two Distinct Simulation Modes:**
  - **Pendulum Simulation**: Uses a multi-pendulum system where the highest vertex determines the move
  - **Three-Body Simulation**: Employs gravitational interactions between three bodies where the vertex with the largest angle determines the move

- **Real-time Visualization:**
  - Motion trails for tracking system evolution
  - Visual indicators for current moves and system state
  - Dynamic zoom adaptation in three-body mode
  - Vertex angle display and highlighting

- **Game Features:**
  - Player vs Player setup with score tracking
  - Match history with color-coded results
  - 10-second round timer
  - Autoplay mode for continuous gameplay
  - Adjustable simulation parameters

## How It Works

### Pendulum Mode
The simulation uses Position Based Dynamics (PBD) to simulate a connected pendulum system. Each player has three vertices, each assigned a move (Rock, Paper, or Scissors). The vertex that reaches the highest position determines the player's move.

### Three-Body Mode
Each player has a system of three gravitating bodies forming a triangle. The vertex with the largest angle determines the move. The bodies interact according to Newton's law of universal gravitation, creating chaotic but deterministic behavior.

## Controls

- **New Game**: Start a fresh game
- **Run**: Start the current round
- **Step**: Advance simulation by one step
- **Autoplay**: Toggle automatic continuous gameplay
- **Simulation Steps**: Adjust simulation accuracy
- **Speed**: Control simulation speed (Three-Body mode only)

## Implementation Details

The project is built using vanilla JavaScript and HTML5 Canvas for rendering. Key components:

- `pendulum.js`: Implements the pendulum physics system
- `threebody.js`: Implements the gravitational three-body system
- `main.js`: Handles game logic and simulation management
- `styles.css`: Provides responsive and modern UI styling

## Running the Project

1. Clone the repository
2. Open `index.html` in a modern web browser
3. Select your preferred simulation mode and enjoy!

## Requirements

- Modern web browser with HTML5 Canvas support
- JavaScript enabled