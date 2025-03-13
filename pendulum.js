class Pendulum {
    constructor(usePBD, color, masses, lengths, angles, offsetX = 0) {
        this.usePBD = usePBD;
        this.color = color;
        this.masses = [0.0];
        this.lengths = [0.0];
        this.pos = [{x: offsetX, y:0.0}];
        this.prevPos = [{x: offsetX, y:0.0}];
        this.vel = [{x:0.0, y:0.0}];
        this.theta = [0.0];
        this.omega = [0.0];
        this.offsetX = offsetX;
        this.move = '';
        this.currentHand = { move: 'Rock', emoji: '👊' };
        this.vertexHands = [null];

        this.trailX = [];
        this.trailY = [];
        this.maxTrailLength = 200; // Limit trail length for performance
        this.trailUpdateCounter = 0;
        this.trailUpdateFrequency = 3; // Only update trail every N frames
        this.unlimitedTrail = false; // New property for unlimited trail
        
        // Performance optimizations
        this.cachedTrailColor = null;
        this.maxYIndex = 1; // Cache the topmost joint index
        this.maxYUpdateCounter = 0;
        this.maxYUpdateFrequency = 3; // Only recalculate topmost joint every 3 frames

        var x = offsetX, y = 0.0;
        for (var i = 0; i < masses.length; i++) {
            this.masses.push(masses[i]);
            this.lengths.push(lengths[i]);
            this.theta.push(angles[i]);
            this.omega.push(0.0);
            x += lengths[i] * Math.sin(angles[i]);
            y += lengths[i] * -Math.cos(angles[i]); 
            this.pos.push({ x:x, y:y});
            this.prevPos.push({ x:x, y:y});
            this.vel.push({x:0, y:0});
        }

        this.updateTrail();
    }

    assignHands(handOrder) {
        this.vertexHands = [null];
        for (let i = 0; i < handOrder.length; i++) {
            const hand = handOrder[i];
            this.vertexHands.push({
                move: hand,
                icon: hand === 'Rock' ? 'f3a5' : hand === 'Paper' ? 'f15b' : 'f0c4', // gem, file, scissors unicode
                color: hand === 'Rock' ? '#ff6b6b' : hand === 'Paper' ? '#4ecdc4' : '#ffd93d'
            });
        }
    }

    determineMove(isRealtime = false) {
        let maxY = -Infinity;
        let maxYIndex = 1;
        for (let i = 1; i < this.pos.length; i++) {
            if (this.pos[i].y > maxY) {
                maxY = this.pos[i].y;
                maxYIndex = i;
            }
        }

        const hand = this.vertexHands[maxYIndex];
        this.move = hand.move;
        
        const relativeY = maxY - this.pos[0].y;
        const displayHand = {
            ...hand,
            height: relativeY,
            vertexIndex: maxYIndex
        };

        if (isRealtime) {
            this.currentHand = displayHand;
        }
        return displayHand;
    }

    simulate(dt, gravity) {
        if (this.usePBD)
            this.simulatePBD(dt, gravity);
        else
            this.simulateAnalytic(dt, gravity);
    }

    simulatePBD(dt, gravity) {
        const massesLength = this.masses.length;
        
        // Apply gravity and predict positions
        for (let i = 1; i < massesLength; i++) {
            this.vel[i].y += dt * gravity;
            this.prevPos[i].x = this.pos[i].x;
            this.prevPos[i].y = this.pos[i].y;
            this.pos[i].x += this.vel[i].x * dt;
            this.pos[i].y += this.vel[i].y * dt;
        }
        
        // Apply distance constraints
        for (let i = 1; i < massesLength; i++) {
            const dx = this.pos[i].x - this.pos[i-1].x;
            const dy = this.pos[i].y - this.pos[i-1].y;
            const d2 = dx * dx + dy * dy;
            const d = Math.sqrt(d2);
            const w0 = this.masses[i - 1] > 0.0 ? 1.0 / this.masses[i - 1] : 0.0;
            const w1 = this.masses[i] > 0.0 ? 1.0 / this.masses[i] : 0.0;
            const corr = (this.lengths[i] - d) / d / (w0 + w1);
            
            this.pos[i - 1].x -= w0 * corr * dx; 
            this.pos[i - 1].y -= w0 * corr * dy; 
            this.pos[i].x += w1 * corr * dx; 
            this.pos[i].y += w1 * corr * dy; 
        }
        
        // Update velocities and angles
        const invDt = 1.0 / dt;
        for (let i = 1; i < massesLength; i++) {
            this.vel[i].x = (this.pos[i].x - this.prevPos[i].x) * invDt;
            this.vel[i].y = (this.pos[i].y - this.prevPos[i].y) * invDt;

            const dx = this.pos[i].x - this.pos[i-1].x;
            const dy = this.pos[i].y - this.pos[i-1].y;
            this.theta[i] = Math.atan2(dx, -dy);
        }
        
        // Reset the topmost joint calculation flag
        this.maxYUpdateCounter = 0;
    }

    simulateAnalytic(dt, gravity) {
        const massesLength = this.masses.length;
        
        // Update angles based on angular velocity
        for (let i = 1; i < massesLength; i++) {
            this.theta[i] += this.omega[i] * dt;
        }
        
        // Calculate forces and update angular acceleration
        for (let i = 1; i < massesLength; i++) {
            // Calculate acceleration due to gravity
            const acc = -gravity * Math.sin(this.theta[i]) / this.lengths[i];
            
            // Apply damping (reduces energy over time)
            const damping = 0.999;
            this.omega[i] = this.omega[i] * damping;
            
            // Update angular velocity
            this.omega[i] += acc * dt;
        }
        
        // Update positions based on angles
        let x = this.offsetX;
        let y = 0.0;
        
        for (let i = 1; i < massesLength; i++) {
            x += this.lengths[i] * Math.sin(this.theta[i]);
            y += this.lengths[i] * -Math.cos(this.theta[i]);
            
            this.pos[i].x = x;
            this.pos[i].y = y;
            
            // Calculate linear velocity from angular velocity
            const vx = this.lengths[i] * Math.cos(this.theta[i]) * this.omega[i];
            const vy = this.lengths[i] * Math.sin(this.theta[i]) * this.omega[i];
            
            this.vel[i].x = vx;
            this.vel[i].y = vy;
        }
        
        // Reset the topmost joint calculation flag
        this.maxYUpdateCounter = 0;
    }

    updateTrail() {
        // Only update trail every N frames for performance
        this.trailUpdateCounter++;
        if (this.trailUpdateCounter % this.trailUpdateFrequency !== 0) {
            return;
        }
        
        const lastPos = this.pos[this.pos.length-1];
        
        // Store world coordinates instead of screen coordinates
        // This allows proper rasterization and consistent rendering
        this.trailX.push(lastPos.x);
        this.trailY.push(lastPos.y);
        
        // Limit trail length for performance if unlimited trail is not enabled
        if (!this.unlimitedTrail && this.trailX.length > this.maxTrailLength) {
            this.trailX.shift();
            this.trailY.shift();
        }
    }
    
    // Calculate which joint is the topmost (optimization: only recalculate periodically)
    calculateMaxY() {
        this.maxYUpdateCounter++;
        if (this.maxYUpdateCounter % this.maxYUpdateFrequency !== 0) {
            return this.maxYIndex;
        }
        
        let maxY = -Infinity;
        let maxYIndex = 1;
        for (let i = 1; i < this.pos.length; i++) {
            if (this.pos[i].y > maxY) {
                maxY = this.pos[i].y;
                maxYIndex = i;
            }
        }
        
        this.maxYIndex = maxYIndex;
        return maxYIndex;
    }
    
    // Get or create a cached trail color
    getTrailColor() {
        if (this.cachedTrailColor) {
            return this.cachedTrailColor;
        }
        
        this.cachedTrailColor = this.color;
        return this.color;
    }
    
    setUnlimitedTrail(enabled) {
        this.unlimitedTrail = enabled;
        
        // If disabling unlimited trail and current trail is too long, trim it
        if (!enabled && this.trailX.length > this.maxTrailLength) {
            this.trailX = this.trailX.slice(-this.maxTrailLength);
            this.trailY = this.trailY.slice(-this.maxTrailLength);
        }
    }
    
    clearTrails() {
        // Keep a small portion of the most recent trail for continuity
        const keepCount = 5;
        if (this.trailX.length > keepCount) {
            const recentX = this.trailX.slice(-keepCount);
            const recentY = this.trailY.slice(-keepCount);
            this.trailX = recentX;
            this.trailY = recentY;
        }
    }

    draw() {
        // Determine the topmost joint (using cached value when possible)
        const maxYIndex = this.calculateMaxY();

        // Draw trails
        const trailLength = this.trailX.length;
        if (trailLength > 1) {
            c.strokeStyle = this.getTrailColor();
            c.lineWidth = 2.0;
            c.beginPath();
            
            // Convert first point from world to screen coordinates
            const firstX = cX({x: this.trailX[0]});
            const firstY = cY({y: this.trailY[0]});
            c.moveTo(firstX, firstY);
            
            // For longer trails, use a simplified drawing approach
            if (trailLength > 100 && !this.unlimitedTrail) {
                // Draw only every other point for long trails
                const skipFactor = Math.max(2, Math.floor(trailLength / 100)); // Skip more points for very long trails
                for (let i = skipFactor; i < trailLength; i += skipFactor) {
                    // Convert from world to screen coordinates
                    const x = cX({x: this.trailX[i]});
                    const y = cY({y: this.trailY[i]});
                    c.lineTo(x, y);
                }
            } else {
                // Draw every point for shorter trails or when unlimited trail is enabled
                for (let i = 1; i < trailLength; i++) {
                    // Convert from world to screen coordinates
                    const x = cX({x: this.trailX[i]});
                    const y = cY({y: this.trailY[i]});
                    c.lineTo(x, y);
                }
            }
            
            c.stroke();
        }

        // Draw pendulum rods
        c.strokeStyle = "#303030";
        c.lineWidth = 10;
        c.beginPath();
        c.moveTo(cX(this.pos[0]), cY(this.pos[0]));
        
        const massesLength = this.masses.length;
        for (let i = 1; i < massesLength; i++) {
            c.lineTo(cX(this.pos[i]), cY(this.pos[i]));
        }
        c.stroke();
        c.lineWidth = 1;            

        // Draw joints and icons
        for (let i = 1; i < massesLength; i++) {
            const hand = this.vertexHands[i];
            c.fillStyle = this.color;
            
            const r = 0.03 * Math.sqrt(this.masses[i]);
            
            // Highlight the topmost joint
            if (i === maxYIndex) {
                // Draw glow effect
                const glowRadius = cScale * r * 1.5;
                const gradient = c.createRadialGradient(
                    cX(this.pos[i]), cY(this.pos[i]), cScale * r,
                    cX(this.pos[i]), cY(this.pos[i]), glowRadius
                );
                gradient.addColorStop(0, hand.color);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                c.fillStyle = gradient;
                c.beginPath();
                c.arc(cX(this.pos[i]), cY(this.pos[i]), glowRadius, 0, 2 * Math.PI);
                c.fill();
                
                // Reset fill style for the actual joint
                c.fillStyle = this.color;
            }
            
            c.beginPath();            
            c.arc(
                cX(this.pos[i]), cY(this.pos[i]), cScale * r, 0.0, 2.0 * Math.PI); 
            c.closePath();
            c.fill();

            const dx = this.pos[i].x - this.pos[i-1].x;
            const dy = this.pos[i].y - this.pos[i-1].y;
            const angle = Math.atan2(dy, dx);

            c.save();
            c.translate(cX(this.pos[i]), cY(this.pos[i]));
            c.rotate(angle);
            
            // Draw background circle with highlight for topmost joint
            if (i === maxYIndex) {
                // Larger and brighter background for the topmost joint
                c.fillStyle = 'rgba(255, 255, 255, 0.2)';
                c.beginPath();
                c.arc(0, 0, 28, 0, 2 * Math.PI);
                c.fill();
            }
            
            c.fillStyle = 'rgba(0, 0, 0, 0.7)';
            c.beginPath();
            c.arc(0, 0, 24, 0, 2 * Math.PI);
            c.fill();
            
            // Draw icon using font directly
            c.fillStyle = hand.color;
            c.font = "900 20px 'Font Awesome 6 Free'";
            c.textAlign = "center";
            c.textBaseline = "middle";
            c.fillText(String.fromCharCode(parseInt(hand.icon, 16)), 0, 0);
            
            c.restore();
        }
    }
}