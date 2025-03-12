class ThreeBodySystem {
    constructor(color, offsetX = 0) {
        this.color = color;
        this.offsetX = offsetX;
        this.G = 0.1;
        this.currentHand = { move: 'Rock', emoji: '👊' };
        this.zoomScale = 1.0;
        
        this.bodies = this.initializeBodies();
        
        this.vertexHands = [
            { move: 'Rock', emoji: '👊' },
            { move: 'Paper', emoji: '✋' },
            { move: 'Scissors', emoji: '✌️' }
        ];
        
        this.trails = [
            { x: [], y: [] },
            { x: [], y: [] },
            { x: [], y: [] }
        ];
        
        this.energy = 0;
        this.angularMomentum = 0;
        this.chaos = 0;
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
        this.bodies.forEach(body => {
            body.acc.x = 0;
            body.acc.y = 0;
        });

        for (let i = 0; i < 3; i++) {
            for (let j = i + 1; j < 3; j++) {
                const dx = this.bodies[j].pos.x - this.bodies[i].pos.x;
                const dy = this.bodies[j].pos.y - this.bodies[i].pos.y;
                const r2 = dx * dx + dy * dy;
                const r = Math.sqrt(r2);
                const force = this.G * this.bodies[i].mass * this.bodies[j].mass / r2;

                const fx = force * dx / r;
                const fy = force * dy / r;

                this.bodies[i].acc.x += fx / this.bodies[i].mass;
                this.bodies[i].acc.y += fy / this.bodies[i].mass;
                this.bodies[j].acc.x -= fx / this.bodies[j].mass;
                this.bodies[j].acc.y -= fy / this.bodies[j].mass;
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
            
            const dot = v1x * v2x + v1y * v2y;
            const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
            const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
            const angle = Math.acos(dot / (mag1 * mag2)) * 180 / Math.PI;
            
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
            document.getElementById(this.color === "#FF3030" ? "info1" : "info2")
                .innerHTML = vertexInfo.map(v => 
                    `Vertex ${v.index + 1}: ${v.hand.emoji} ${v.hand.move} (${Math.round(v.angle)}°)`
                ).join('<br>') +
                `<br>Strongest: Vertex ${maxAngleVertex.index + 1} (${Math.round(maxAngleVertex.angle)}°)`;
        }
        return hand;
    }

    simulate(dt) {
        this.calculateForces();
        
        this.bodies.forEach(body => {
            body.pos.x += body.vel.x * dt + 0.5 * body.acc.x * dt * dt;
            body.pos.y += body.vel.y * dt + 0.5 * body.acc.y * dt * dt;
            body.vel.x += body.acc.x * dt;
            body.vel.y += body.acc.y * dt;
        });
    }

    updateTrail() {
        this.bodies.forEach((body, i) => {
            this.trails[i].x.push(body.pos.x);
            this.trails[i].y.push(body.pos.y);
        });
    }

    draw() {
        const zoomedScale = cScale * this.zoomScale;
        
        const zX = (pos) => canvas.width / 2 + pos.x * zoomedScale;
        const zY = (pos) => canvas.height / 2 + pos.y * zoomedScale;

        this.bodies.forEach((_, bodyIndex) => {
            if (this.trails[bodyIndex].x.length > 1) {
                let trailColor;
                if (this.color === "#FF3030") {
                    trailColor = "rgba(255, 150, 150, 0.8)";
                } else if (this.color === "#30FF30") {
                    trailColor = "rgba(150, 255, 150, 0.8)";
                }
                
                c.beginPath();
                c.moveTo(
                    zX({ x: this.trails[bodyIndex].x[0] }),
                    zY({ y: this.trails[bodyIndex].y[0] })
                );
                
                for (let i = 1; i < this.trails[bodyIndex].x.length; i++) {
                    c.lineTo(
                        zX({ x: this.trails[bodyIndex].x[i] }),
                        zY({ y: this.trails[bodyIndex].y[i] })
                    );
                }
                
                c.strokeStyle = trailColor;
                c.lineWidth = Math.max(2, 3 * this.zoomScale);
                c.stroke();
            }
        });

        this.bodies.forEach((body, index) => {
            c.fillStyle = this.color;
            const radius = (5 + body.mass * 50) * this.zoomScale;
            c.beginPath();
            c.arc(zX(body.pos), zY(body.pos), radius, 0, 2 * Math.PI);
            c.fill();

            const velocityScale = 100 * this.zoomScale;
            const vx = body.vel.x * velocityScale;
            const vy = body.vel.y * velocityScale;
            const vectorLength = Math.sqrt(vx * vx + vy * vy);
            
            if (vectorLength > 0) {
                c.beginPath();
                c.moveTo(zX(body.pos), zY(body.pos));
                const endX = zX(body.pos) + vx;
                const endY = zY(body.pos) + vy;
                c.lineTo(endX, endY);
                c.strokeStyle = this.color;
                c.lineWidth = 2 * this.zoomScale;
                c.stroke();

                const arrowSize = 8 * this.zoomScale;
                const angle = Math.atan2(vy, vx);
                c.beginPath();
                c.moveTo(endX, endY);
                c.lineTo(
                    endX - arrowSize * Math.cos(angle - Math.PI / 6),
                    endY - arrowSize * Math.sin(angle - Math.PI / 6)
                );
                c.lineTo(
                    endX - arrowSize * Math.cos(angle + Math.PI / 6),
                    endY - arrowSize * Math.sin(angle + Math.PI / 6)
                );
                c.closePath();
                c.fillStyle = this.color;
                c.fill();
            }

            const prev = this.bodies[(index + 2) % 3].pos;
            const curr = body.pos;
            const next = this.bodies[(index + 1) % 3].pos;
            
            const v1x = prev.x - curr.x;
            const v1y = prev.y - curr.y;
            const v2x = next.x - curr.x;
            const v2y = next.y - curr.y;
            
            const dot = v1x * v2x + v1y * v2y;
            const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
            const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
            const vertexAngle = Math.acos(dot / (mag1 * mag2)) * 180 / Math.PI;

            c.font = `${12 * this.zoomScale}px Arial`;
            c.fillStyle = this.color;
            c.fillText(
                `${Math.round(vertexAngle)}° ${this.vertexHands[index].emoji}`,
                zX(body.pos) + radius * 1.2,
                zY(body.pos) + radius * 1.2
            );
        });

        c.beginPath();
        c.moveTo(zX(this.bodies[0].pos), zY(this.bodies[0].pos));
        c.lineTo(zX(this.bodies[1].pos), zY(this.bodies[1].pos));
        c.lineTo(zX(this.bodies[2].pos), zY(this.bodies[2].pos));
        c.closePath();
        c.strokeStyle = this.color + "40";
        c.lineWidth = 2;
        c.stroke();

        let maxAngle = -1;
        let maxAngleIndex = -1;
        
        this.bodies.forEach((body, index) => {
            const prev = this.bodies[(index + 2) % 3].pos;
            const curr = body.pos;
            const next = this.bodies[(index + 1) % 3].pos;
            
            const v1x = prev.x - curr.x;
            const v1y = prev.y - curr.y;
            const v2x = next.x - curr.x;
            const v2y = next.y - curr.y;
            
            const dot = v1x * v2x + v1y * v2y;
            const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
            const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
            const angle = Math.acos(dot / (mag1 * mag2)) * 180 / Math.PI;
            
            if (angle > maxAngle) {
                maxAngle = angle;
                maxAngleIndex = index;
            }
        });

        if (maxAngleIndex !== -1) {
            const highlightBody = this.bodies[maxAngleIndex];
            const radius = (12 + highlightBody.mass * 60) * this.zoomScale;
            
            const gradient = c.createRadialGradient(
                zX(highlightBody.pos), zY(highlightBody.pos), radius * 0.8,
                zX(highlightBody.pos), zY(highlightBody.pos), radius * 1.5
            );
            gradient.addColorStop(0, this.color + "80");
            gradient.addColorStop(1, this.color + "00");
            
            c.beginPath();
            c.arc(zX(highlightBody.pos), zY(highlightBody.pos), radius * 1.5, 0, 2 * Math.PI);
            c.fillStyle = gradient;
            c.fill();
            
            c.beginPath();
            c.arc(zX(highlightBody.pos), zY(highlightBody.pos), radius, 0, 2 * Math.PI);
            c.strokeStyle = this.color;
            c.lineWidth = 3 * this.zoomScale;
            c.stroke();
        }

        if (this.currentHand) {
            c.fillStyle = this.color;
            c.font = "20px Arial";
            const x = this.offsetX < 0 ? 20 : canvas.width - 200;
            const y = canvas.height - 40;
            c.fillText(`${this.currentHand.emoji} (${this.currentHand.state})`, x, y);
        }
    }

    checkBounds() {
        const margin = 50;
        const maxX = canvas.width / 2;
        const maxY = canvas.height / 2;
        let maxDistance = 0;

        this.bodies.forEach(body => {
            const screenX = cX(body.pos);
            const screenY = cY(body.pos);
            const distanceFromCenter = Math.sqrt(
                Math.pow(screenX - canvas.width/2, 2) + 
                Math.pow(screenY - canvas.height/2, 2)
            );
            maxDistance = Math.max(maxDistance, distanceFromCenter);
        });

        if (maxDistance > Math.min(maxX, maxY) - margin) {
            const requiredZoom = (Math.min(maxX, maxY) - margin) / maxDistance;
            this.zoomScale = Math.min(this.zoomScale, requiredZoom);
        }
    }
}