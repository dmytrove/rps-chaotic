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
                emoji: hand === 'Rock' ? '🪨' : hand === 'Paper' ? '📄' : '✂️'
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
        for (var i = 1; i < this.masses.length; i++) {
            this.vel[i].y += dt * gravity;
            this.prevPos[i].x = this.pos[i].x;
            this.prevPos[i].y = this.pos[i].y;
            this.pos[i].x += this.vel[i].x * dt;
            this.pos[i].y += this.vel[i].y * dt;
        }
        for (var i = 1; i < this.masses.length; i++) {
            var dx = this.pos[i].x - this.pos[i-1].x;
            var dy = this.pos[i].y - this.pos[i-1].y;
            var d = Math.sqrt(dx * dx + dy * dy);
            var w0 = this.masses[i - 1] > 0.0 ? 1.0 / this.masses[i - 1] : 0.0;
            var w1 = this.masses[i] > 0.0 ? 1.0 / this.masses[i] : 0.0;
            var corr = (this.lengths[i] - d) / d / (w0 + w1);
            this.pos[i - 1].x -= w0 * corr * dx; 
            this.pos[i - 1].y -= w0 * corr * dy; 
            this.pos[i].x += w1 * corr * dx; 
            this.pos[i].y += w1 * corr * dy; 
        }
        for (var i = 1; i < this.masses.length; i++) {
            this.vel[i].x = (this.pos[i].x - this.prevPos[i].x) / dt;
            this.vel[i].y = (this.pos[i].y - this.prevPos[i].y) / dt;

            const dx = this.pos[i].x - this.pos[i-1].x;
            const dy = this.pos[i].y - this.pos[i-1].y;
            this.theta[i] = Math.atan2(dx, -dy);
        }
    }

    updateTrail() {
        this.trailX.push(cX(this.pos[this.pos.length-1]));
        this.trailY.push(cY(this.pos[this.pos.length-1]));
    }

    draw() {
        if (this.trailX.length > 1) {
            c.strokeStyle = this.color;
            c.lineWidth = 2.0;
            c.beginPath();
            c.moveTo(this.trailX[0], this.trailY[0]);
            for (let i = 1; i < this.trailX.length; i++) {
                c.lineTo(this.trailX[i], this.trailY[i]);
            }
            c.stroke();
        }

        c.strokeStyle = "#303030";
        c.lineWidth = 10;
        c.beginPath();
        c.moveTo(cX(this.pos[0]), cY(this.pos[0]));
        for (var i = 1; i < this.masses.length; i++) 
            c.lineTo(cX(this.pos[i]), cY(this.pos[i]));
        c.stroke();
        c.lineWidth = 1;            

        for (var i = 1; i < this.masses.length; i++) {
            const hand = this.vertexHands[i];
            c.fillStyle = this.color;
            
            var r = 0.03 * Math.sqrt(this.masses[i]);
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
            
            c.fillStyle = 'rgba(0, 0, 0, 0.7)';
            c.beginPath();
            c.arc(0, 0, 20, 0, 2 * Math.PI);
            c.fill();
            
            c.fillStyle = this.color;
            c.font = "24px Arial";
            c.textAlign = "center";
            c.textBaseline = "middle";
            c.fillText(hand.emoji, 0, 0);
            c.restore();
        }
    }
}