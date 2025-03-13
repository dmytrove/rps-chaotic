# Rock Paper Scissors - Chaotic Simulations

A unique take on the classic Rock Paper Scissors game, featuring beautiful chaotic simulations using pendulums and three-body systems to determine the moves.

## Features

- **Two Simulation Types**:
  - **Pendulum Simulation**: A multi-segment pendulum system where the highest point determines the move
  - **Three-Body Simulation**: A chaotic three-body gravitational system where the largest angle determines the move

- **Visual Elements**:
  - Beautiful trails with dynamic colors
  - Smooth animations and transitions
  - Responsive design that works on all screen sizes
  - Modern, dark-themed UI with intuitive controls

- **Game Features**:
  - Real-time move determination based on simulation state
  - Match history with visual move indicators
  - Configurable round timer
  - Score tracking
  - Autoplay mode for continuous simulation

- **Technical Features**:
  - Progressive Web App (PWA) support
  - Offline functionality
  - Responsive canvas rendering
  - Performance-optimized trail rendering
  - Smooth animations

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/rps-chaotic.git
cd rps-chaotic
```

2. Open `index.html` in a modern web browser to run the application.

## Usage

1. **Starting a Game**:
   - Click the dice icon to start a new game
   - Use the play button to begin the simulation

2. **Choosing Simulation Type**:
   - Toggle between pendulum and three-body simulations using the switch
   - Each simulation type offers a unique visual experience

3. **Controlling the Simulation**:
   - Use the autoplay toggle to switch between manual and automatic simulation
   - In manual mode, click the play button to advance the simulation
   - In autoplay mode, the simulation runs continuously

4. **Game Settings**:
   - Access settings through the gear icon
   - Adjust round timer duration
   - View game information and match history

## Technical Details

### Simulation Types

#### Pendulum Simulation
- Multi-segment pendulum system
- Physics-based simulation using Position Based Dynamics (PBD)
- Move determination based on highest point position
- Dynamic trail rendering with color gradients

#### Three-Body Simulation
- Gravitational three-body system
- Chaotic motion with energy conservation
- Move determination based on largest angle
- Optimized trail rendering with performance controls

### Performance Optimizations
- Trail length limiting for better performance
- Skip factor for long trails
- Cached color calculations
- Efficient coordinate transformations
- Periodic updates for expensive calculations

## Browser Support

The application is designed to work on modern browsers that support:
- HTML5 Canvas
- CSS3 Flexbox and Grid
- ES6+ JavaScript features
- Progressive Web App capabilities

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.