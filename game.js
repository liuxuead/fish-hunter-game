class FishHunterGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.canvasWidth = 0;
    this.canvasHeight = 0;
    
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.isTwoFinger = false;
    
    this.fishImage = null;
    this.ballImage = null;
    this.chuanImage = null;
    
    this.animations = [];
    this.animationRunning = false;
    
    this.balls = [];
    this.ballTimer = null;
    
    this.closestBallId = null;
    this.originX = 0;
    this.originY = 0;
    
    this.flashState = true;
    this.flashTimer = null;
    
    this.breathingValue = 0;
    this.breathingDirection = 1;
    this.breathingImageIndex = -1;
    
    this.currentX = 0;
    this.currentY = 0;
    this.score = 9;
    
    this.waveOffset = 0;
    this.reflections = [];
    
    this.shootAudio = null;
    this.bubbleAudio = null;
    this.audioContext = null;
    
    // 计数系统
    this.fishKilled = 0;         // 普通鱼击杀数
    this.redBallKilled = 0;      // 红色圆球击杀数
    this.redBallRequired = 3;    // 触发双指发射需要的红色圆球数
    
    // 发射速度控制
    this.shootCooldown = 500;     // 初始冷却时间（毫秒）
    this.lastShootTime = 0;       // 上次发射时间
    this.cooldownReduction = 50;  // 每级减少的冷却时间
    this.fishPerLevel = 5;        // 每杀多少鱼提升一级速度
    
    // 双指触摸记录
    this.touchStartPositions = [];
    
    this.touches = [];
    
    this.init();
  }
  
  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    this.loadResources().then(() => {
      document.getElementById('loading').style.display = 'none';
      this.startBallTimer();
      this.startBreathingAnimation();
      this.initReflections();
      this.bindEvents();
      this.runAnimationLoop();
    });
  }
  
  resizeCanvas() {
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    
    this.originX = 0;
    this.originY = this.canvasHeight * 0.875;
  }
  
  async loadResources() {
    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };
    
    try {
      this.fishImage = await loadImage('images/yucha.png');
      this.ballImage = await loadImage('images/feiyu.png');
      this.chuanImage = await loadImage('images/chuan.png');
    } catch (e) {
      console.error('图片加载失败:', e);
    }
    
    this.shootAudio = new Audio('images/fashe.mp3');
    this.shootAudio.preload = 'auto';
    
    this.bubbleAudio = new Audio('images/qipao.mp3');
    this.bubbleAudio.preload = 'auto';
  }
  
  startBallTimer() {
    this.ballTimer = setInterval(() => {
      if (this.balls.length < 5) {
        this.addBall();
      }
    }, 1000);
  }
  
  startBreathingAnimation() {
    setInterval(() => {
      this.breathingValue += 0.015 * this.breathingDirection;
      if (this.breathingValue >= 1) {
        this.breathingDirection = -1;
      } else if (this.breathingValue <= 0) {
        this.breathingDirection = 1;
      }
    }, 20);
  }
  
  initReflections() {
    this.reflections = [];
    for (let i = 0; i < 20; i++) {
      this.reflections.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight * 0.7,
        size: 2 + Math.random() * 4,
        opacity: Math.random(),
        speed: 0.5 + Math.random() * 1.5
      });
    }
  }
  
  addBall() {
    // 30% 概率生成红色圆球（稀有一些）
    const isRedBall = Math.random() > 0.7;
    const radius = isRedBall ? 15 * 1.5 : 15; // 红色圆球大50%
    const minDistance = 110;
    const maxAttempts = 100;
    const minAngleDiff = 5 * Math.PI / 180;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = radius + Math.random() * (this.canvasWidth - radius * 2);
      const y = radius + Math.random() * (this.canvasHeight / 2 - radius * 2);
      
      let valid = true;
      
      for (const ball of this.balls) {
        const dist = Math.sqrt((x - ball.x) ** 2 + (y - ball.y) ** 2);
        if (dist < minDistance) {
          valid = false;
          break;
        }
      }
      
      if (!valid) continue;
      
      const newAngle = Math.atan2(y - this.originY, x - this.originX);
      
      for (const ball of this.balls) {
        const ballAngle = Math.atan2(ball.y - this.originY, ball.x - this.originX);
        let angleDiff = Math.abs(newAngle - ballAngle);
        if (angleDiff > Math.PI) {
          angleDiff = 2 * Math.PI - angleDiff;
        }
        if (angleDiff < minAngleDiff) {
          valid = false;
          break;
        }
      }
      
      if (valid) {
        this.balls.push({
          x,
          y,
          radius,
          id: Date.now() + Math.random(),
          angle: Math.atan2(this.originY - y, this.originX - x) + Math.PI / 2,
          speed: (1 + Math.random() * 2) * 0.2,
          isRedBall: isRedBall
        });
        
        if (this.bubbleAudio) {
          this.bubbleAudio.currentTime = 0;
          this.bubbleAudio.play().catch(e => console.log('气泡音效播放失败:', e));
        }
        
        if (!this.animationRunning) {
          this.animationRunning = true;
          this.runAnimationLoop();
        }
        return;
      }
    }
  }
  
  bindEvents() {
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
  }
  
  handleTouchStart(e) {
    e.preventDefault();
    this.touches = Array.from(e.touches);
    this.isDrawing = true;
    this.isTwoFinger = e.touches.length === 2;
    
    if (this.isTwoFinger) {
      // 记录双指起始位置（包含identifier）
      this.touchStartPositions = e.touches.map(touch => ({
        x: touch.clientX,
        y: touch.clientY,
        identifier: touch.identifier
      }));
    } else if (this.touches.length === 1) {
      const touch = e.touches[0];
      this.startX = touch.clientX;
      this.startY = touch.clientY;
      this.findClosestImage(this.startX, this.startY);
    }
  }
  
  handleTouchMove(e) {
    e.preventDefault();
    if (!this.isDrawing) return;
    // 只在单指触摸时更新位置
    if (!this.isTwoFinger && e.touches.length === 1) {
      const touch = e.touches[0];
      this.currentX = touch.clientX;
      this.currentY = touch.clientY;
    }
  }
  
  handleTouchEnd(e) {
    e.preventDefault();
    if (!this.isDrawing) return;
    this.isDrawing = false;
    
    if (this.isTwoFinger) {
      // 获取抬起的手指位置
      const endTouches = Array.from(e.changedTouches);
      if (endTouches.length > 0) {
        this.handleTwoFingerSwipe(this.touchStartPositions, endTouches);
      }
      this.isTwoFinger = false;
      this.touchStartPositions = [];
      return;
    }
    
    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    
    this.processSwipe(endX, endY);
  }
  
  handleMouseDown(e) {
    this.isDrawing = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.findClosestImage(this.startX, this.startY);
  }
  
  handleMouseMove(e) {
    if (!this.isDrawing) return;
    this.currentX = e.clientX;
    this.currentY = e.clientY;
  }
  
  handleMouseUp(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.processSwipe(e.clientX, e.clientY);
  }
  
  processSwipe(endX, endY) {
    const dx = endX - this.startX;
    const dy = endY - this.startY;
    
    this.breathingImageIndex = -1;
    
    if (dx === 0 && dy === 0) {
      return;
    }
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    const isHorizontalSwipe = dx > 0 && Math.abs(dy) < 120 && distance > 120;
    
    if (isHorizontalSwipe) {
      this.score = 9;
      return;
    }
    
    if (this.score <= 0) {
      return;
    }
    
    // 检查是否从下向上滑动（单指操作）
    const swipeDistance = this.startY - endY;
    if (swipeDistance <= 10) {
      return; // 不是向上滑动，不触发
    }
    
    // 检查冷却时间
    const now = Date.now();
    if (now - this.lastShootTime < this.shootCooldown) {
      return;
    }
    
    this.score--;
    
    const extendPoint = this.getExtendPoint(endX, endY, dx, dy);
    this.addAnimation(this.startX, this.startY, extendPoint.x, extendPoint.y, dx, dy);
    
    // 更新发射时间
    this.lastShootTime = now;
  }
  
  handleTwoFingerSwipe(startTouches, endTouches) {
    // 确保有足够的触摸点
    if (startTouches.length < 2 || endTouches.length < 1) {
      return;
    }
    
    // 获取Y坐标的辅助函数（兼容不同格式的触摸对象）
    const getY = (touch) => touch.y || touch.clientY;
    
    // 计算起始和结束的平均Y坐标
    const startAvgY = (getY(startTouches[0]) + getY(startTouches[1])) / 2;
    
    // 计算结束位置的平均Y坐标
    let endAvgY;
    if (endTouches.length === 2) {
      endAvgY = (getY(endTouches[0]) + getY(endTouches[1])) / 2;
    } else {
      // 如果只抬起了一个手指，使用另一个手指的位置
      endAvgY = getY(endTouches[0]);
    }
    
    // 计算滑动距离
    const swipeDistance = startAvgY - endAvgY;
    
    // 检查是否向上滑动（至少10像素）
    if (swipeDistance <= 10) {
      return; // 不是向上滑动，不触发
    }
    
    if (this.score < 9) {
      this.score = 9;
    }
    
    if (this.shootAudio) {
      this.shootAudio.currentTime = 0;
      this.shootAudio.play().catch(e => console.log('音频播放失败:', e));
    }
    
    // 重置红色圆球计数
    this.redBallKilled = 0;
    
    const centerX = this.canvasWidth / 2;
    const centerY = this.originY;
    
    const angleRange = Math.PI / 3;
    const angleStep = angleRange / 8;
    
    for (let i = 0; i < 9; i++) {
      const angle = -angleRange / 2 + i * angleStep + Math.PI / 2 + Math.PI;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      
      const startX = centerX;
      const startY = centerY;
      const extendPoint = this.getExtendPoint(startX, startY, dx, dy);
      
      this.addAnimation(startX, startY, extendPoint.x, extendPoint.y, dx, dy);
    }
  }
  
  findClosestImage(x, y) {
    const images = [
      { index: 0, x: 0, y: this.originY }
    ];
    
    let closestIndex = -1;
    let minDistance = Infinity;
    
    for (const img of images) {
      const distance = Math.sqrt((x - img.x) ** 2 + (y - img.y) ** 2);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = img.index;
      }
    }
    
    this.breathingImageIndex = closestIndex;
  }
  
  addAnimation(startX, startY, endX, endY, dx, dy) {
    if (!this.fishImage) return;
    
    if (this.shootAudio) {
      this.shootAudio.currentTime = 0;
      this.shootAudio.play().catch(e => console.log('音频播放失败:', e));
    }
    
    const animation = {
      startX,
      startY,
      endX,
      endY,
      angle: Math.atan2(dy, dx) + Math.PI / 2,
      startTime: Date.now(),
      duration: 2000
    };
    
    this.animations.push(animation);
    
    if (!this.animationRunning) {
      this.animationRunning = true;
      this.runAnimationLoop();
    }
  }
  
  drawStaticImage(x, y, rotation, staticWidth, staticHeight, index) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);
    
    if (index === this.breathingImageIndex) {
      this.ctx.globalAlpha = 0.3 + this.breathingValue * 0.7;
      this.ctx.shadowColor = '#FFD700';
      this.ctx.shadowBlur = 5 + this.breathingValue * 30;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    }
    
    this.ctx.drawImage(
      this.fishImage,
      -staticWidth / 2,
      -staticHeight,
      staticWidth,
      staticHeight
    );
    this.ctx.restore();
  }
  
  drawGradientBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.3, '#4682B4');
    gradient.addColorStop(0.6, '#1E90FF');
    gradient.addColorStop(1, '#00008B');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }
  
  drawWaves() {
    this.waveOffset += 0.02;
    
    const waveColors = [
      'rgba(255, 255, 255, 0.1)',
      'rgba(255, 255, 255, 0.15)',
      'rgba(255, 255, 255, 0.2)'
    ];
    
    const waveAmplitudes = [15, 20, 25];
    const waveSpeeds = [1, 0.8, 0.6];
    
    for (let layer = 0; layer < 3; layer++) {
      this.ctx.beginPath();
      this.ctx.strokeStyle = waveColors[layer];
      this.ctx.lineWidth = 2;
      
      const baseY = this.canvasHeight * (0.6 + layer * 0.1);
      
      for (let x = 0; x <= this.canvasWidth; x += 5) {
        const y = baseY + Math.sin((x * 0.01) + this.waveOffset * waveSpeeds[layer]) * waveAmplitudes[layer];
        if (x === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      
      this.ctx.stroke();
    }
  }
  
  drawReflections() {
    this.reflections.forEach(ref => {
      ref.opacity += 0.02 * ref.speed;
      if (ref.opacity > 1) {
        ref.opacity = 0;
        ref.x = Math.random() * this.canvasWidth;
        ref.y = Math.random() * this.canvasHeight * 0.7;
      }
      
      this.ctx.beginPath();
      this.ctx.arc(ref.x, ref.y, ref.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${ref.opacity * 0.5})`;
      this.ctx.fill();
    });
  }
  
  runAnimationLoop() {
    if (!this.ctx) return;
    
    const imgWidth = 60;
    const imgHeight = 60;
    const now = Date.now();
    
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    this.drawGradientBackground();
    this.drawWaves();
    this.drawReflections();
    
    if (this.fishImage) {
      const staticWidth = 60;
      const staticHeight = 120;
      
      this.drawStaticImage(0, this.originY, Math.PI * 2, staticWidth, staticHeight, 0);
      
      this.ctx.save();
      this.ctx.font = '20px Arial';
      this.ctx.fillStyle = '#000000';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.score.toString(), 5, this.originY - staticHeight - 10);
      this.ctx.restore();
    }
    
    // 显示击杀计数
    this.ctx.save();
    this.ctx.font = '16px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`鱼: ${this.fishKilled}`, 10, 30);
    this.ctx.fillStyle = '#ff4444';
    this.ctx.fillText(`红球: ${this.redBallKilled}/${this.redBallRequired}`, 10, 60);
    this.ctx.fillStyle = '#ffff00';
    this.ctx.fillText(`冷却: ${Math.round(this.shootCooldown)}ms`, 10, 90);
    this.ctx.restore();
    
    if (this.chuanImage) {
      const chuanWidth = 360;
      const chuanHeight = 240;
      this.ctx.drawImage(
        this.chuanImage,
        this.canvasWidth / 2 - chuanWidth / 2,
        this.canvasHeight - chuanHeight,
        chuanWidth,
        chuanHeight
      );
    }
    
    this.balls = this.balls.filter(ball => {
      ball.y += ball.speed;
      
      if (ball.y > this.canvasHeight) {
        return false;
      }
      
      if (this.ballImage) {
        const ballSize = ball.radius * 2;
        this.ctx.save();
        this.ctx.translate(ball.x, ball.y);
        this.ctx.rotate(ball.angle || 0);
        
        // 红色圆球特殊处理
        if (ball.isRedBall) {
          this.ctx.globalAlpha = 0.8;
          this.ctx.shadowColor = '#ff0000';
          this.ctx.shadowBlur = 10;
        }
        
        this.ctx.drawImage(
          this.ballImage,
          -ballSize / 2,
          -ballSize / 2,
          ballSize,
          ballSize
        );
        this.ctx.restore();
      }
      
      return true;
    });
    
    this.animations = this.animations.filter(anim => {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      
      const currentX = anim.startX + (anim.endX - anim.startX) * progress;
      const currentY = anim.startY + (anim.endY - anim.startY) * progress;
      
      const headX = currentX + Math.cos(anim.angle - Math.PI / 2) * (imgHeight / 2);
      const headY = currentY + Math.sin(anim.angle - Math.PI / 2) * (imgHeight / 2);
      
      let closestBall = null;
      let minDistance = Infinity;
      
      for (const ball of this.balls) {
        const distance = Math.sqrt((headX - ball.x) ** 2 + (headY - ball.y) ** 2) - ball.radius;
        if (distance < minDistance) {
          minDistance = distance;
          closestBall = ball;
        }
      }
      
      if (closestBall && minDistance < 20) {
        if (closestBall.isRedBall) {
          this.redBallKilled++;
        } else {
          this.fishKilled++;
          // 每杀一定数量的鱼提升发射速度
          const level = Math.floor(this.fishKilled / this.fishPerLevel);
          this.shootCooldown = Math.max(100, 500 - level * this.cooldownReduction);
        }
        this.balls = this.balls.filter(ball => ball.id !== closestBall.id);
      }
      
      this.ctx.save();
      this.ctx.translate(currentX, currentY);
      this.ctx.rotate(anim.angle);
      this.ctx.drawImage(
        this.fishImage,
        -imgWidth / 2,
        -imgHeight / 2,
        imgWidth,
        imgHeight
      );
      this.ctx.restore();
      
      return progress < 1;
    });
    
    requestAnimationFrame(() => this.runAnimationLoop());
  }
  
  getExtendPoint(x, y, dx, dy) {
    let t = Infinity;
    
    if (dx > 0) {
      t = Math.min(t, (this.canvasWidth - x) / dx);
    } else if (dx < 0) {
      t = Math.min(t, -x / dx);
    }
    
    if (dy > 0) {
      t = Math.min(t, (this.canvasHeight - y) / dy);
    } else if (dy < 0) {
      t = Math.min(t, -y / dy);
    }
    
    if (t === Infinity) {
      return { x, y };
    }
    
    return {
      x: x + t * dx,
      y: y + t * dy
    };
  }
}

window.onload = () => {
  new FishHunterGame();
};
