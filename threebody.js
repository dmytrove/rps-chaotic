class ThreeBodySystem {
    constructor(colors, offsetX = 0) {
        // If a single color is provided, convert it to an array of 3 identical colors
        this.colors = Array.isArray(colors) ? colors : [colors, colors, colors];
        this.offsetX = offsetX;
        this.G = 0.1;
        this.zoomScale = 1.0;
        
        this.bodies = this.initializeBodies();
        
        this.vertexHands = [
            { 
                move: 'Rock',
                icon: 'f3a5', // gem unicode
                color: '#ff6b6b'
            },
            { 
                move: 'Paper',
                icon: 'f15b', // file unicode
                color: '#4ecdc4'
            },
            { 
                move: 'Scissors',
                icon: 'f0c4', // scissors unicode
                color: '#ffd93d'
            }
        ];
        
        this.trails = [
            { x: [], y: [] },
            { x: [], y: [] },
            { x: [], y: [] }
        ];
        
        this.maxTrailLength = 200; // Limit trail length for performance
        this.trailUpdateCounter = 0;
        this.trailUpdateFrequency = 3; // Only update trail every N frames
        this.unlimitedTrail = false; // New property for unlimited trail
        
        this.energy = 0;
        this.angularMomentum = 0;
        this.chaos = 0;
        
        // Cache for expensive calculations
        this.cachedTrailColors = [null, null, null];
        this.maxAngleIndex = -1;
        this.maxAngle = -1;
        this.angleUpdateCounter = 0;
        this.angleUpdateFrequency = 5; // Only recalculate angles every 5 frames
    }

    initializeBodies() {
        const bodies = [];
        const systemRotation = Math.random() * 2 * Math.PI;
        const systemScale = 0.8 + Math.random() * 0.4;
        const angularVelocity = (Math.random() * 0.4 - 0.2);
        
        for (let i = 0; i < 3; i++) {
            const baseAngle = (2 * Math.PI * i / 3);
            const angleVariation = Math.random() * Math.PI / 2 - Math.PI / 4;
            const angle = baseAngle + angleVariation + systemRotation;
            
            const r = (0.1 + Math.random() * 0.1) * systemScale;
            const randomMass = 0.05 + Math.random() * 0.15;
            
            const x = this.offsetX + r * Math.cos(angle);
            const y = r * Math.sin(angle);
            
            const vx = -y * angularVelocity + (Math.random() * 0.3 - 0.15);
            const vy = x * angularVelocity + (Math.random() * 0.3 - 0.15);
            
            bodies.push({
                mass: randomMass,
                pos: { x, y },
                vel: { x: vx, y: vy },
                acc: { x: 0, y: 0 }
            });
        }
        return bodies;
    }

    calculateForces() {
        // Reset accelerations
        for (let i = 0; i < 3; i++) {
            this.bodies[i].acc.x = 0;
            this.bodies[i].acc.y = 0;
        }

        // Calculate forces between each pair of bodies
        for (let i = 0; i < 3; i++) {
            for (let j = i + 1; j < 3; j++) {
                // Skip if any position is non-finite
                if (!isFinite(this.bodies[i].pos.x) || !isFinite(this.bodies[i].pos.y) ||
                    !isFinite(this.bodies[j].pos.x) || !isFinite(this.bodies[j].pos.y)) {
                    continue;
                }
                
                const dx = this.bodies[j].pos.x - this.bodies[i].pos.x;
                const dy = this.bodies[j].pos.y - this.bodies[i].pos.y;
                const r2 = dx * dx + dy * dy;
                
                // Add a small epsilon to prevent division by zero
                const safeR2 = Math.max(r2, 1e-10);
                const r = Math.sqrt(safeR2);
                
                // Calculate force with a minimum distance to prevent extreme forces
                const force = this.G * this.bodies[i].mass * this.bodies[j].mass / safeR2;
                
                // Check if force is finite and not too large
                if (!isFinite(force) || force > 1e6) {
                    continue;
                }

                const fx = force * dx / r;
                const fy = force * dy / r;
                
                // Check if force components are finite
                if (!isFinite(fx) || !isFinite(fy)) {
                    continue;
                }
                
                // Calculate accelerations with safety checks
                const accX1 = fx / this.bodies[i].mass;
                const accY1 = fy / this.bodies[i].mass;
                const accX2 = fx / this.bodies[j].mass;
                const accY2 = fy / this.bodies[j].mass;
                
                // Apply accelerations only if they are finite and not too large
                const maxAcc = 100.0; // Maximum allowed acceleration
                
                if (isFinite(accX1) && isFinite(accY1) && 
                    Math.abs(accX1) < maxAcc && Math.abs(accY1) < maxAcc) {
                    this.bodies[i].acc.x += accX1;
                    this.bodies[i].acc.y += accY1;
                }
                
                if (isFinite(accX2) && isFinite(accY2) && 
                    Math.abs(accX2) < maxAcc && Math.abs(accY2) < maxAcc) {
                    this.bodies[j].acc.x -= accX2;
                    this.bodies[j].acc.y -= accY2;
                }
            }
        }
    }

    updateSystemMetrics() {
        let ke = 0, pe = 0;
        let am = 0;

        this.bodies.forEach(body => {
            ke += 0.5 * body.mass * (body.vel.x * body.vel.x + body.vel.y * body.vel.y);
            am += body.mass * (body.pos.x * body.vel.y - body.pos.y * body.vel.x);
        });

        for (let i = 0; i < 3; i++) {
            for (let j = i + 1; j < 3; j++) {
                const dx = this.bodies[j].pos.x - this.bodies[i].pos.x;
                const dy = this.bodies[j].pos.y - this.bodies[i].pos.y;
                const r = Math.sqrt(dx * dx + dy * dy);
                pe -= this.G * this.bodies[i].mass * this.bodies[j].mass / r;
            }
        }

        this.energy = ke + pe;
        this.angularMomentum = am;

        let maxVel = 0;
        this.bodies.forEach(body => {
            const v = Math.sqrt(body.vel.x * body.vel.x + body.vel.y * body.vel.y);
            maxVel = Math.max(maxVel, v);
        });
        this.chaos = maxVel;
    }

    getTriangleProperties() {
        const sides = [];
        const angles = [];
        
        for (let i = 0; i < 3; i++) {
            const j = (i + 1) % 3;
            const dx = this.bodies[j].pos.x - this.bodies[i].pos.x;
            const dy = this.bodies[j].pos.y - this.bodies[i].pos.y;
            sides.push(Math.sqrt(dx * dx + dy * dy));
        }
        
        for (let i = 0; i < 3; i++) {
            const a = sides[i];
            const b = sides[(i + 1) % 3];
            const c = sides[(i + 2) % 3];
            const angle = Math.acos((b * b + c * c - a * a) / (2 * b * c));
            angles.push(angle * 180 / Math.PI);
        }
        
        const s = (sides[0] + sides[1] + sides[2]) / 2;
        const area = Math.sqrt(s * (s - sides[0]) * (s - sides[1]) * (s - sides[2]));
        
        return {
            sides,
            angles,
            area,
            perimeter: s * 2
        };
    }

    determineMove(isRealtime = false) {
        const angles = [];
        const vertexInfo = [];
        
        for (let i = 0; i < 3; i++) {
            const prev = this.bodies[(i + 2) % 3].pos;
            const curr = this.bodies[i].pos;
            const next = this.bodies[(i + 1) % 3].pos;
            
            const v1x = prev.x - curr.x;
            const v1y = prev.y - curr.y;
            const v2x = next.x - curr.x;
            const v2y = next.y - curr.y;
            
            // Calculate magnitudes first to check for very small values
            const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
            const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
            
            // Default angle if vectors are too small
            let angle = 60; // Default to 60 degrees
            
            // Only calculate angle if vectors have sufficient magnitude
            if (mag1 >= 1e-10 && mag2 >= 1e-10) {
                // Normalize vectors before calculating dot product
                const v1xNorm = v1x / mag1;
                const v1yNorm = v1y / mag1;
                const v2xNorm = v2x / mag2;
                const v2yNorm = v2y / mag2;
                
                const dot = v1xNorm * v2xNorm + v1yNorm * v2yNorm;
                
                // Clamp dot product to [-1, 1] to handle floating point errors
                const clampedDot = Math.max(-1, Math.min(1, dot));
                
                // Calculate angle in degrees
                angle = Math.acos(clampedDot) * 180 / Math.PI;
                
                // If angle is NaN (shouldn't happen with clamping), use default
                if (isNaN(angle)) {
                    angle = 60;
                }
            }
            
            vertexInfo.push({
                index: i,
                angle: angle,
                hand: this.vertexHands[i]
            });
        }

        const maxAngleVertex = vertexInfo.reduce((max, current) => 
            current.angle > max.angle ? current : max, vertexInfo[0]);
        
        const hand = {
            move: maxAngleVertex.hand.move,
            emoji: maxAngleVertex.hand.emoji,
            state: 'Angle: ' + Math.round(maxAngleVertex.angle) + '°',
            metric: Math.round(maxAngleVertex.angle)
        };

        if (isRealtime) {
            this.currentHand = hand;
        }
        return hand;
    }

    simulate(dt) {
        this.calculateForces();
        
        // Use a safe version of dt to prevent extreme values
        const safeDt = isFinite(dt) ? Math.min(Math.max(dt, 0.0001), 0.1) : 0.01;
        
        for (let i = 0; i < this.bodies.length; i++) {
            const body = this.bodies[i];
            
            // Skip updating if any values are already non-finite
            if (!isFinite(body.pos.x) || !isFinite(body.pos.y) || 
                !isFinite(body.vel.x) || !isFinite(body.vel.y) || 
                !isFinite(body.acc.x) || !isFinite(body.acc.y)) {
                continue;
            }
            
            // Calculate new position using safe operations
            const newPosX = body.pos.x + body.vel.x * safeDt + 0.5 * body.acc.x * safeDt * safeDt;
            const newPosY = body.pos.y + body.vel.y * safeDt + 0.5 * body.acc.y * safeDt * safeDt;
            
            // Calculate new velocity
            const newVelX = body.vel.x + body.acc.x * safeDt;
            const newVelY = body.vel.y + body.acc.y * safeDt;
            
            // Only update if new values are finite
            if (isFinite(newPosX) && isFinite(newPosY)) {
                body.pos.x = newPosX;
                body.pos.y = newPosY;
            }
            
            if (isFinite(newVelX) && isFinite(newVelY)) {
                body.vel.x = newVelX;
                body.vel.y = newVelY;
            }
            
            // Apply velocity damping to prevent extreme values
            const maxVelocity = 10.0;
            const velocityMagnitude = Math.sqrt(body.vel.x * body.vel.x + body.vel.y * body.vel.y);
            
            if (velocityMagnitude > maxVelocity) {
                const scale = maxVelocity / velocityMagnitude;
                body.vel.x *= scale;
                body.vel.y *= scale;
            }
        }
        
        // Periodically check for and fix any non-finite values
        if (Math.random() < 0.01) { // 1% chance each step
            this.sanitizeSystem();
        }
    }

    updateTrail() {
        // Only update trail every N frames for performance
        this.trailUpdateCounter++;
        if (this.trailUpdateCounter % this.trailUpdateFrequency !== 0) {
            return;
        }
        
        for (let i = 0; i < 3; i++) {
            this.trails[i].x.push(this.bodies[i].pos.x);
            this.trails[i].y.push(this.bodies[i].pos.y);
            
            // Limit trail length for performance if unlimited trail is not enabled
            if (!this.unlimitedTrail && this.trails[i].x.length > this.maxTrailLength) {
                this.trails[i].x.shift();
                this.trails[i].y.shift();
            }
        }
    }
    
    setUnlimitedTrail(enabled) {
        this.unlimitedTrail = enabled;
        
        // If disabling unlimited trail and current trails are too long, trim them
        if (!enabled) {
            this.bodies.forEach((_, i) => {
                if (this.trails[i].x.length > this.maxTrailLength) {
                    this.trails[i].x = this.trails[i].x.slice(-this.maxTrailLength);
                    this.trails[i].y = this.trails[i].y.slice(-this.maxTrailLength);
                }
            });
        }
    }
    
    clearTrails() {
        // Keep a small portion of the most recent trail for continuity
        const keepCount = 5;
        this.bodies.forEach((_, i) => {
            if (this.trails[i].x.length > keepCount) {
                const recentX = this.trails[i].x.slice(-keepCount);
                const recentY = this.trails[i].y.slice(-keepCount);
                this.trails[i].x = recentX;
                this.trails[i].y = recentY;
            }
        });
    }

    // Calculate which body has the largest angle (optimization: only recalculate periodically)
    calculateMaxAngle() {
        this.angleUpdateCounter++;
        if (this.angleUpdateCounter % this.angleUpdateFrequency !== 0 && this.maxAngleIndex !== -1) {
            return;
        }
        
        this.maxAngle = -1;
        this.maxAngleIndex = -1;
        
        for (let index = 0; index < 3; index++) {
            const prev = this.bodies[(index + 2) % 3].pos;
            const curr = this.bodies[index].pos;
            const next = this.bodies[(index + 1) % 3].pos;
            
            const v1x = prev.x - curr.x;
            const v1y = prev.y - curr.y;
            const v2x = next.x - curr.x;
            const v2y = next.y - curr.y;
            
            // Calculate magnitudes first to check for very small values
            const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
            const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
            
            // Skip calculation if vectors are too small to avoid numerical issues
            if (mag1 < 1e-10 || mag2 < 1e-10) {
                continue;
            }
            
            // Normalize vectors before calculating dot product to improve numerical stability
            const v1xNorm = v1x / mag1;
            const v1yNorm = v1y / mag1;
            const v2xNorm = v2x / mag2;
            const v2yNorm = v2y / mag2;
            
            const dot = v1xNorm * v2xNorm + v1yNorm * v2yNorm;
            
            // Clamp dot product to [-1, 1] to handle floating point errors
            const clampedDot = Math.max(-1, Math.min(1, dot));
            
            // Calculate angle in degrees
            const angle = Math.acos(clampedDot) * 180 / Math.PI;
            
            // Check for NaN (should not happen with clamping, but just in case)
            if (!isNaN(angle) && angle > this.maxAngle) {
                this.maxAngle = angle;
                this.maxAngleIndex = index;
            }
        }
        
        // If no valid angle was found, default to the first body
        if (this.maxAngleIndex === -1) {
            this.maxAngleIndex = 0;
            this.maxAngle = 60; // Default to 60 degrees
        }
    }

    // Get or create a cached trail color
    getTrailColor(bodyIndex) {
        if (this.cachedTrailColors[bodyIndex]) {
            return this.cachedTrailColors[bodyIndex];
        }
        
        const bodyColor = this.colors[bodyIndex];
        let trailColor;
        
        if (bodyColor.startsWith('#')) {
            // Parse the hex color
            const hex = bodyColor.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            trailColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
        } else {
            // Fallback to default colors if not hex
            trailColor = "rgba(150, 150, 150, 0.8)";
        }
        
        this.cachedTrailColors[bodyIndex] = trailColor;
        return trailColor;
    }

    draw() {
        const zoomedScale = cScale * this.zoomScale;
        
        // Safe coordinate transformation functions that handle invalid inputs
        const zX = (pos) => {
            const x = canvas.width / 2 + pos.x * zoomedScale;
            return isFinite(x) ? x : canvas.width / 2; // Return center if invalid
        };
        
        const zY = (pos) => {
            const y = canvas.height / 2 + pos.y * zoomedScale;
            return isFinite(y) ? y : canvas.height / 2; // Return center if invalid
        };

        // Draw trails
        for (let bodyIndex = 0; bodyIndex < 3; bodyIndex++) {
            const trailLength = this.trails[bodyIndex].x.length;
            if (trailLength <= 1) continue;
            
            // Get cached trail color
            const trailColor = this.getTrailColor(bodyIndex);
            
            c.beginPath();
            
            // Safely get the first point
            const firstX = zX({ x: this.trails[bodyIndex].x[0] });
            const firstY = zY({ y: this.trails[bodyIndex].y[0] });
            
            // Only proceed if the first point is valid
            if (isFinite(firstX) && isFinite(firstY)) {
                c.moveTo(firstX, firstY);
                
                // For longer trails, use a simplified drawing approach
                if (trailLength > 100 && !this.unlimitedTrail) {
                    // Draw only every other point for long trails
                    const skipFactor = Math.max(2, Math.floor(trailLength / 100)); // Skip more points for very long trails
                    for (let i = skipFactor; i < trailLength; i += skipFactor) {
                        const x = zX({ x: this.trails[bodyIndex].x[i] });
                        const y = zY({ y: this.trails[bodyIndex].y[i] });
                        
                        // Only draw if coordinates are valid
                        if (isFinite(x) && isFinite(y)) {
                            c.lineTo(x, y);
                        }
                    }
                } else {
                    // Draw every point for shorter trails or when unlimited trail is enabled
                    for (let i = 1; i < trailLength; i++) {
                        const x = zX({ x: this.trails[bodyIndex].x[i] });
                        const y = zY({ y: this.trails[bodyIndex].y[i] });
                        
                        // Only draw if coordinates are valid
                        if (isFinite(x) && isFinite(y)) {
                            c.lineTo(x, y);
                        }
                    }
                }
                
                c.strokeStyle = trailColor;
                c.lineWidth = Math.max(2, 3 * this.zoomScale);
                c.stroke();
            }
        }

        // Draw triangle connecting bodies - only if all coordinates are valid
        const validCoords = this.bodies.every(body => 
            isFinite(body.pos.x) && isFinite(body.pos.y)
        );
        
        if (validCoords) {
            c.beginPath();
            c.moveTo(zX(this.bodies[0].pos), zY(this.bodies[0].pos));
            c.lineTo(zX(this.bodies[1].pos), zY(this.bodies[1].pos));
            c.lineTo(zX(this.bodies[2].pos), zY(this.bodies[2].pos));
            c.closePath();
            
            // Check if all coordinates are valid before creating gradient
            const x0 = zX(this.bodies[0].pos);
            const y0 = zY(this.bodies[0].pos);
            const x1 = zX(this.bodies[1].pos);
            const y1 = zY(this.bodies[1].pos);
            
            // Validate coordinates to prevent non-finite values
            if (isFinite(x0) && isFinite(y0) && isFinite(x1) && isFinite(y1)) {
                // Use a gradient for the triangle lines
                try {
                    const gradient = c.createLinearGradient(x0, y0, x1, y1);
                    gradient.addColorStop(0, this.colors[0] + "40");
                    gradient.addColorStop(1, this.colors[1] + "40");
                    c.strokeStyle = gradient;
                } catch (e) {
                    // Fallback to a solid color if gradient creation fails
                    console.warn("Gradient creation failed, using fallback color", e);
                    c.strokeStyle = this.colors[0] + "40";
                }
            } else {
                // Use a solid color if coordinates are invalid
                c.strokeStyle = this.colors[0] + "40";
            }
            
            c.lineWidth = 2;
            c.stroke();
        }

        // Calculate which body has the largest angle (optimization: only recalculate periodically)
        this.calculateMaxAngle();

        // Draw bodies and icons
        for (let index = 0; index < 3; index++) {
            const body = this.bodies[index];
            
            // Skip drawing if position is invalid
            if (!isFinite(body.pos.x) || !isFinite(body.pos.y)) {
                continue;
            }
            
            const isHighlighted = (index === this.maxAngleIndex);
            
            // Fixed icon sizes regardless of zoom
            const fixedIconSize = 24; // Constant icon size
            const fixedBackgroundSize = 30; // Constant background size
            const fixedHighlightSize = 45; // Constant highlight size
            
            // Draw highlight for the body with the largest angle
            if (isHighlighted) {
                const bodyColor = this.colors[index];
                const bodyX = zX(body.pos);
                const bodyY = zY(body.pos);
                
                // Create a more visible highlight with multiple layers based on fixed sizes
                // Outer glow
                try {
                    const outerGradient = c.createRadialGradient(
                        bodyX, bodyY, fixedBackgroundSize * 0.8,
                        bodyX, bodyY, fixedHighlightSize
                    );
                    outerGradient.addColorStop(0, bodyColor + "90"); // More opaque
                    outerGradient.addColorStop(0.6, bodyColor + "60");
                    outerGradient.addColorStop(1, bodyColor + "00");
                    
                    c.beginPath();
                    c.arc(bodyX, bodyY, fixedHighlightSize, 0, 2 * Math.PI);
                    c.fillStyle = outerGradient;
                    c.fill();
                } catch (e) {
                    console.warn("Radial gradient creation failed", e);
                }
                
                // Inner highlight ring
                c.beginPath();
                c.arc(bodyX, bodyY, fixedBackgroundSize * 1.2, 0, 2 * Math.PI);
                c.strokeStyle = bodyColor;
                c.lineWidth = 3;
                c.stroke();
                
                // Pulsating effect - use time-based animation
                const pulseSize = Math.sin(Date.now() / 300) * 0.2 + 1.0; // Pulsate between 0.8x and 1.2x
                const pulseRadius = fixedBackgroundSize * pulseSize;
                
                c.beginPath();
                c.arc(bodyX, bodyY, pulseRadius, 0, 2 * Math.PI);
                c.strokeStyle = bodyColor;
                c.lineWidth = 2;
                c.stroke();
            }
            
            // Draw the body with size based on zoom
            c.fillStyle = this.colors[index];
            const radius = (5 + body.mass * 50) * this.zoomScale;
            c.beginPath();
            c.arc(zX(body.pos), zY(body.pos), radius, 0, 2 * Math.PI);
            c.fill();
            
            // Add a border to the body for better visibility
            c.strokeStyle = isHighlighted ? '#ffffff' : this.colors[index] + '80';
            c.lineWidth = isHighlighted ? 3 * this.zoomScale : 1.5 * this.zoomScale;
            c.stroke();

            // Draw velocity vector (only if significant and valid)
            const velocityScale = 100 * this.zoomScale;
            const vx = body.vel.x * velocityScale;
            const vy = body.vel.y * velocityScale;
            
            // Skip drawing velocity vector if values are invalid
            if (isFinite(vx) && isFinite(vy)) {
                const vectorLength = Math.sqrt(vx * vx + vy * vy);
                
                if (vectorLength > 5) { // Only draw if vector is visible
                    const bodyX = zX(body.pos);
                    const bodyY = zY(body.pos);
                    const endX = bodyX + vx;
                    const endY = bodyY + vy;
                    
                    // Only draw if end coordinates are valid
                    if (isFinite(endX) && isFinite(endY)) {
                        c.beginPath();
                        c.moveTo(bodyX, bodyY);
                        c.lineTo(endX, endY);
                        c.strokeStyle = this.colors[index];
                        c.lineWidth = 2 * this.zoomScale;
                        c.stroke();
        
                        const arrowSize = 8 * this.zoomScale;
                        const angle = Math.atan2(vy, vx);
                        
                        // Calculate arrow points
                        const arrow1X = endX - arrowSize * Math.cos(angle - Math.PI / 6);
                        const arrow1Y = endY - arrowSize * Math.sin(angle - Math.PI / 6);
                        const arrow2X = endX - arrowSize * Math.cos(angle + Math.PI / 6);
                        const arrow2Y = endY - arrowSize * Math.sin(angle + Math.PI / 6);
                        
                        // Only draw arrow if all coordinates are valid
                        if (isFinite(arrow1X) && isFinite(arrow1Y) && isFinite(arrow2X) && isFinite(arrow2Y)) {
                            c.beginPath();
                            c.moveTo(endX, endY);
                            c.lineTo(arrow1X, arrow1Y);
                            c.lineTo(arrow2X, arrow2Y);
                            c.closePath();
                            c.fillStyle = this.colors[index];
                            c.fill();
                        }
                    }
                }
            }

            // Draw the hand icon
            const hand = this.vertexHands[index];
            
            c.save();
            c.translate(zX(body.pos), zY(body.pos));
            
            // Draw background circle with fixed size
            c.fillStyle = 'rgba(0, 0, 0, 0.7)';
            c.beginPath();
            c.arc(0, 0, fixedBackgroundSize / 2, 0, 2 * Math.PI);
            c.fill();
            
            // Draw icon using font directly with fixed size
            c.fillStyle = hand.color;
            c.font = `900 ${fixedIconSize}px 'Font Awesome 6 Free'`;
            c.textAlign = "center";
            c.textBaseline = "middle";
            c.fillText(String.fromCharCode(parseInt(hand.icon, 16)), 0, 0);
            
            c.restore();
        }
    }

    checkBounds() {
        const margin = 50;
        const maxX = canvas.width / 2;
        const maxY = canvas.height / 2;
        let maxDistance = 0;
        let systemCenter = { x: 0, y: 0 };
        let validBodiesCount = 0;
        
        // Calculate system center (only using valid bodies)
        for (let i = 0; i < this.bodies.length; i++) {
            const body = this.bodies[i];
            if (isFinite(body.pos.x) && isFinite(body.pos.y)) {
                systemCenter.x += body.pos.x;
                systemCenter.y += body.pos.y;
                validBodiesCount++;
            }
        }
        
        // If no valid bodies, return early
        if (validBodiesCount === 0) {
            return;
        }
        
        // Calculate average position
        systemCenter.x /= validBodiesCount;
        systemCenter.y /= validBodiesCount;
        
        // Calculate maximum distance from center (only using valid bodies)
        for (let i = 0; i < this.bodies.length; i++) {
            const body = this.bodies[i];
            if (isFinite(body.pos.x) && isFinite(body.pos.y)) {
                const dx = body.pos.x - systemCenter.x;
                const dy = body.pos.y - systemCenter.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (isFinite(distance)) {
                    maxDistance = Math.max(maxDistance, distance);
                }
            }
        }
        
        // If maxDistance is not valid, use a default value
        if (!isFinite(maxDistance) || maxDistance === 0) {
            maxDistance = 0.5; // Default reasonable distance
        }
        
        // Calculate screen distance
        const screenX = canvas.width / 2 + systemCenter.x * cScale;
        const screenY = canvas.height / 2 + systemCenter.y * cScale;
        
        // Ensure screen coordinates are valid
        if (!isFinite(screenX) || !isFinite(screenY)) {
            return;
        }
        
        const distanceFromCenter = Math.sqrt(
            Math.pow(screenX - canvas.width/2, 2) + 
            Math.pow(screenY - canvas.height/2, 2)
        );
        
        // Calculate required zoom
        const maxAllowedDistance = Math.min(maxX, maxY) - margin;
        
        // If system is too large, adjust zoom
        if (maxDistance * cScale > maxAllowedDistance) {
            const requiredZoom = maxAllowedDistance / (maxDistance * cScale);
            // Apply zoom gradually for smoother transition
            this.zoomScale = Math.max(0.1, this.zoomScale * 0.9 + requiredZoom * 0.1);
        } else if (this.zoomScale < 1.0) {
            // If system is small enough, gradually return to normal zoom
            this.zoomScale = Math.min(1.0, this.zoomScale * 1.05);
        }
        
        // Enforce minimum zoom level to prevent excessive zooming out
        const minZoomLevel = 0.05;
        this.zoomScale = Math.max(minZoomLevel, this.zoomScale);
        
        // If the system is very far from center, apply a small force to bring it back
        if (distanceFromCenter > maxAllowedDistance * 2) {
            const centeringForce = 0.0001;
            for (let i = 0; i < this.bodies.length; i++) {
                const body = this.bodies[i];
                if (isFinite(body.pos.x) && isFinite(body.pos.y) && 
                    isFinite(body.vel.x) && isFinite(body.vel.y)) {
                    const dx = systemCenter.x;
                    const dy = systemCenter.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance > 0 && isFinite(distance)) {
                        body.vel.x -= (dx / distance) * centeringForce * distance;
                        body.vel.y -= (dy / distance) * centeringForce * distance;
                    }
                }
            }
        }
        
        // Check for and fix any non-finite values in the system
        this.sanitizeSystem();
    }

    sanitizeSystem() {
        // Check each body for non-finite values and reset them if needed
        for (let i = 0; i < this.bodies.length; i++) {
            const body = this.bodies[i];
            
            // Check position
            if (!isFinite(body.pos.x) || !isFinite(body.pos.y)) {
                // Reset position to a valid value near the center
                const angle = (2 * Math.PI * i / 3);
                const r = 0.1 + Math.random() * 0.1;
                body.pos.x = this.offsetX + r * Math.cos(angle);
                body.pos.y = r * Math.sin(angle);
                console.warn(`Fixed non-finite position for body ${i}`);
            }
            
            // Check velocity
            if (!isFinite(body.vel.x) || !isFinite(body.vel.y)) {
                // Reset velocity to a small random value
                body.vel.x = (Math.random() - 0.5) * 0.1;
                body.vel.y = (Math.random() - 0.5) * 0.1;
                console.warn(`Fixed non-finite velocity for body ${i}`);
            }
            
            // Check acceleration
            if (!isFinite(body.acc.x) || !isFinite(body.acc.y)) {
                // Reset acceleration to zero
                body.acc.x = 0;
                body.acc.y = 0;
                console.warn(`Fixed non-finite acceleration for body ${i}`);
            }
        }
        
        // Check and fix trails if needed
        for (let i = 0; i < this.trails.length; i++) {
            const trail = this.trails[i];
            
            // Check if trail arrays exist
            if (!trail.x || !trail.y) {
                trail.x = [];
                trail.y = [];
                continue;
            }
            
            // Find any non-finite values in trails
            let hasNonFinite = false;
            for (let j = 0; j < trail.x.length; j++) {
                if (!isFinite(trail.x[j]) || !isFinite(trail.y[j])) {
                    hasNonFinite = true;
                    break;
                }
            }
            
            // If non-finite values found, clear the trail
            if (hasNonFinite) {
                trail.x = [];
                trail.y = [];
                console.warn(`Cleared trail for body ${i} due to non-finite values`);
            }
        }
    }
}