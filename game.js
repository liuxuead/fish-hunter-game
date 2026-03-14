class FishHunterGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    window.game = this;
    
    this.canvasWidth = 0;
    this.canvasHeight = 0;
    
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.isTwoFinger = false;
    
    this.fishImage = null;
    this.ballImage = null;
    this.chuanImage = null;
    this.bigFishImage = null;
    
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
    this.totalScore = 0;
    
    this.waveOffset = 0;
    this.reflections = [];
    this.scoreTexts = [];
    this.predictedHits = 0;
    
    this.shootAudio = null;
    this.audioContext = null;
    
    this.touches = [];
    
    this.fishKilled = 0;
    this.bigFishKilled = 0;
    this.bigFishTriggers = 0;
    this.bigFishNextTarget = 0;
    
    this.playerLevel = 0;
    this.levelThresholds = [0, 10, 50, 100, 300, 800, 1500, 2500, 5000, 10000, 100000];
    this.bigFishPerLevel = [3, 10, 10, 20, 50, 30, 40, 50, 100, 500, 1000];
    this.bigFishCurrentTarget = 0;
    
    this.maxFishPerLevel = [5, 5, 8, 10, 20, 30, 40, 40, 40, 40, 40];
    this.fishSpeedRanges = [
      { min: 0.1, max: 0.2 },   // 0级
      { min: 0.15, max: 0.25 },  // 1级
      { min: 0.2, max: 0.3 },    // 2级
      { min: 0.25, max: 0.35 },  // 3级
      { min: 0.3, max: 0.4 },    // 4级
      { min: 0.35, max: 0.45 },  // 5级
      { min: 0.4, max: 0.5 },    // 6级
      { min: 0.45, max: 0.55 },  // 7级
      { min: 0.5, max: 0.6 },    // 8级
      { min: 0.6, max: 0.8 },    // 9级
      { min: 0.6, max: 0.8 }     // 10级
    ];
    
    this.maxAmmoPerLevel = [5, 9, 15, 20, 20, 20, 20, 20, 20, 20, 20];
    
    this.selectedWeapon = 1;
    this.weaponImages = [null, null];
    this.showWeaponSelector = false;
    
    this.health = 100;
    this.maxHealth = 100;
    
    this.isGameOver = false;
    this.isVictory = false;
    
    this.shootCooldown = 1000;
    this.lastShootTime = 0;
    
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
      this.fishImage2 = await loadImage('images/yucha2.png');
      this.weaponImages[0] = this.fishImage;
      this.weaponImages[1] = this.fishImage2;
      this.ballImage = await loadImage('images/feiyu.png');
      this.chuanImage = await loadImage('images/chuan.png');
      this.bigFishImage = await loadImage('images/dayu.png');
      this.jiaxueImage = await loadImage('images/jiaxue.png');
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
      const maxFish = this.maxFishPerLevel[Math.min(this.playerLevel, this.maxFishPerLevel.length - 1)];
      if (this.balls.length < maxFish) {
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
    const rand = Math.random();
    let ballType = 'normal';
    if (rand > 0.9) {
      ballType = 'jiaxue';
    } else if (rand > 0.7) {
      ballType = 'red';
    }
    
    const radius = ballType === 'red' ? 15 * 1.5 : 15;
    const minDistance = 40;
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
          speed: this.getFishSpeed(),
          ballType: ballType,
          isRedBall: ballType === 'red'
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
    
    if (!this.isTwoFinger) {
      const touch = e.touches[0];
      this.startX = touch.clientX;
      this.startY = touch.clientY;
      this.findClosestImage(this.startX, this.startY);
    }
  }
  
  handleTouchMove(e) {
    e.preventDefault();
    if (!this.isDrawing) return;
    const touch = e.touches[0];
    this.currentX = touch.clientX;
    this.currentY = touch.clientY;
  }
  
  handleTouchEnd(e) {
    e.preventDefault();
    if (!this.isDrawing) return;
    this.isDrawing = false;
    
    if (this.isGameOver) {
      const touch = e.changedTouches[0];
      this.checkRestartButtonClick(touch.clientX, touch.clientY);
      return;
    }
    
    if (this.isTwoFinger) {
      this.handleTwoFingerSwipe();
      this.isTwoFinger = false;
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
    
    if (this.isGameOver) {
      this.checkRestartButtonClick(e.clientX, e.clientY);
      return;
    }
    
    this.processSwipe(e.clientX, e.clientY);
  }
  
  processSwipe(endX, endY) {
    if (this.startY < this.canvasHeight / 2) {
      return;
    }
    
    const dx = endX - this.startX;
    const dy = endY - this.startY;
    
    this.breathingImageIndex = -1;
    
    if (dx === 0 && dy === 0) {
      return;
    }
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    const isHorizontalSwipe = dx > 0 && Math.abs(dy) < 120 && distance > 120;
    
    if (isHorizontalSwipe) {
      const maxAmmo = this.maxAmmoPerLevel[Math.min(this.playerLevel, this.maxAmmoPerLevel.length - 1)];
      this.score = maxAmmo;
      return;
    }
    
    if (this.score <= 0) {
      return;
    }
    
    const now = Date.now();
    if (now - this.lastShootTime < this.shootCooldown) {
      return;
    }
    
    this.score--;
    this.lastShootTime = now;
    
    const extendPoint = this.getExtendPoint(endX, endY, dx, dy);
    this.predictedHits = this.predictHits(this.startX, this.startY, extendPoint.x, extendPoint.y);
    this.addAnimation(this.startX, this.startY, extendPoint.x, extendPoint.y, dx, dy);
  }
  
  handleTwoFingerSwipe() {
    if (this.bigFishTriggers <= 0) {
      return;
    }
    
    this.bigFishTriggers--;
    
    if (this.score < 9) {
      this.score = 9;
    }
    
    if (this.shootAudio) {
      this.shootAudio.currentTime = 0;
      this.shootAudio.play().catch(e => console.log('音频播放失败:', e));
    }
    
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
    
    if (this.predictedHits >= 3) {
      this.ctx.shadowColor = '#FF0000';
      this.ctx.shadowBlur = 20;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    }
    
    const currentWeaponImage = this.getCurrentWeaponImage();
    this.ctx.drawImage(
      currentWeaponImage,
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
    
    if (this.isGameOver) {
      this.drawGameOverScreen();
      return;
    }
    
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
    
    this.ctx.save();
    this.ctx.font = '16px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`等级: ${this.playerLevel}`, 10, 25);
    this.ctx.fillText(`分: ${this.totalScore}`, 10, 50);
    
    const requiredPerTrigger = this.bigFishPerLevel[Math.min(this.playerLevel, this.bigFishPerLevel.length - 1)];
    const nextTarget = (this.bigFishTriggers + 1) * requiredPerTrigger;
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.fillText(`大招: ${this.bigFishTriggers}/${this.bigFishKilled}/${nextTarget}`, 10, 75);
    
    this.ctx.fillStyle = '#ffff00';
    this.ctx.fillText(`冷却: ${Math.round(this.shootCooldown)}ms`, 10, 100);
    this.ctx.restore();
    
    // 绘制血条
    const healthBarWidth = 200;
    const healthBarHeight = 20;
    const healthBarX = this.canvasWidth - healthBarWidth - 10;
    const healthBarY = 25;
    
    this.ctx.save();
    
    // 血条背景
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
    
    // 血条填充
    const healthPercentage = Math.max(0, this.health / this.maxHealth);
    const healthColor = healthPercentage > 0.5 ? '#00ff00' : healthPercentage > 0.2 ? '#ffff00' : '#ff0000';
    this.ctx.fillStyle = healthColor;
    this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
    
    // 血条边框
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
    
    // 血条文字
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${Math.round(this.health)}/${this.maxHealth}`, healthBarX + healthBarWidth / 2, healthBarY + healthBarHeight - 4);
    
    this.ctx.restore();
    
    this.balls = this.balls.filter(ball => {
      ball.y += ball.speed;
      
      if (ball.y > this.canvasHeight) {
        if (ball.isRedBall) {
          this.health -= 5;
        } else {
          this.health -= 1;
        }
        
        if (this.health <= 0) {
          this.health = 0;
          this.isGameOver = true;
        }
        return false;
      }
      
      if (ball.ballType === 'jiaxue' && this.jiaxueImage) {
        const ballSize = ball.radius * 2;
        this.ctx.save();
        this.ctx.translate(ball.x, ball.y);
        this.ctx.rotate(ball.angle || 0);
        this.ctx.drawImage(
          this.jiaxueImage,
          -ballSize / 2,
          -ballSize / 2,
          ballSize,
          ballSize
        );
        this.ctx.restore();
      } else if (ball.isRedBall && this.bigFishImage) {
        const ballSize = ball.radius * 2;
        this.ctx.save();
        this.ctx.translate(ball.x, ball.y);
        this.ctx.rotate(ball.angle || 0);
        this.ctx.drawImage(
          this.bigFishImage,
          -ballSize / 2,
          -ballSize / 2,
          ballSize,
          ballSize
        );
        this.ctx.restore();
      } else if (this.ballImage) {
        const ballSize = ball.radius * 2;
        this.ctx.save();
        this.ctx.translate(ball.x, ball.y);
        this.ctx.rotate(ball.angle || 0);
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
        this.balls = this.balls.filter(ball => ball.id !== closestBall.id);
        
        if (closestBall.ballType === 'jiaxue') {
          this.totalScore += 1;
          this.health = Math.min(100, this.health + 10);
          this.addScoreText(closestBall.x, closestBall.y, '+1 血量+10');
        } else if (closestBall.isRedBall) {
          this.totalScore += 5;
          this.bigFishKilled++;
          
          // 更新玩家等级
          for (let i = this.levelThresholds.length - 1; i >= 0; i--) {
            if (this.totalScore >= this.levelThresholds[i]) {
              this.playerLevel = i;
              break;
            }
          }
          
          if (this.playerLevel >= 10 && !this.isVictory) {
            this.isVictory = true;
            this.isGameOver = true;
          }
          
          // 根据等级设置冷却时间 (0级1000ms, 每级减100ms, 9级100ms)
          this.shootCooldown = Math.max(100, 1000 - this.playerLevel * 100);
          
          const requiredPerTrigger = this.bigFishPerLevel[Math.min(this.playerLevel, this.bigFishPerLevel.length - 1)];
          const currentTriggers = Math.floor(this.bigFishKilled / requiredPerTrigger);
          
          if (currentTriggers > this.bigFishTriggers) {
            this.bigFishTriggers = currentTriggers;
          }
          
          // 添加得分文字动画
          this.addScoreText(closestBall.x, closestBall.y, '+5');
        } else {
          this.totalScore++;
          this.fishKilled++;
          
          // 更新玩家等级
          for (let i = this.levelThresholds.length - 1; i >= 0; i--) {
            if (this.totalScore >= this.levelThresholds[i]) {
              this.playerLevel = i;
              break;
            }
          }
          
          if (this.playerLevel >= 10 && !this.isVictory) {
            this.isVictory = true;
            this.isGameOver = true;
          }
          
          // 根据等级设置冷却时间 (0级1000ms, 每级减100ms, 9级100ms)
          this.shootCooldown = Math.max(100, 1000 - this.playerLevel * 100);
          
          // 添加得分文字动画
          this.addScoreText(closestBall.x, closestBall.y, '+1');
        }
      }
      
      this.ctx.save();
      this.ctx.translate(currentX, currentY);
      this.ctx.rotate(anim.angle);
      
      if (this.predictedHits >= 3) {
        this.ctx.shadowColor = '#FF0000';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
      }
      
      const currentWeaponImage = this.getCurrentWeaponImage();
      this.ctx.drawImage(
        currentWeaponImage,
        -imgWidth / 2,
        -imgHeight / 2,
        imgWidth,
        imgHeight
      );
      this.ctx.restore();
      
      return progress < 1;
    });
    
    this.updateScoreTexts();
    this.drawScoreTexts();
    
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
  
  getFishSpeed() {
    const levelIndex = Math.min(this.playerLevel, this.fishSpeedRanges.length - 1);
    const range = this.fishSpeedRanges[levelIndex];
    return range.min + Math.random() * (range.max - range.min);
  }
  
  selectWeapon(weaponIndex) {
    if (weaponIndex === 0 && this.playerLevel < 3) {
      console.log('武器1需要3级解锁');
      return;
    }
    this.selectedWeapon = weaponIndex;
    console.log('武器已切换到:', weaponIndex);
  }
  
  isWeaponUnlocked(weaponIndex) {
    if (weaponIndex === 0) {
      return this.playerLevel >= 3;
    }
    return true;
  }
  
  getCurrentWeaponImage() {
    return this.weaponImages[this.selectedWeapon] || this.weaponImages[0];
  }
  
  resetGame() {
    this.score = 9;
    this.totalScore = 0;
    this.health = 100;
    this.fishKilled = 0;
    this.bigFishKilled = 0;
    this.bigFishTriggers = 0;
    this.playerLevel = 0;
    this.balls = [];
    this.animations = [];
    this.scoreTexts = [];
  }
  
  predictHits(startX, startY, endX, endY) {
    let hitCount = 0;
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return 0;
    
    const dirX = dx / length;
    const dirY = dy / length;
    
    for (const ball of this.balls) {
      const ballDx = ball.x - startX;
      const ballDy = ball.y - startY;
      const projection = ballDx * dirX + ballDy * dirY;
      
      if (projection < 0 || projection > length) continue;
      
      const closestX = startX + dirX * projection;
      const closestY = startY + dirY * projection;
      const distance = Math.sqrt((ball.x - closestX) ** 2 + (ball.y - closestY) ** 2);
      
      if (distance < ball.radius + 20) {
        hitCount++;
      }
    }
    
    return hitCount;
  }
  
  addScoreText(x, y, text) {
    this.scoreTexts.push({
      x,
      y,
      text,
      startTime: Date.now(),
      duration: 1000,
      ySpeed: -2,
      opacity: 1
    });
  }
  
  updateScoreTexts() {
    const now = Date.now();
    this.scoreTexts = this.scoreTexts.filter(text => {
      const elapsed = now - text.startTime;
      const progress = elapsed / text.duration;
      
      text.y += text.ySpeed;
      text.opacity = 1 - progress;
      
      return progress < 1;
    });
  }
  
  drawScoreTexts() {
    this.scoreTexts.forEach(text => {
      this.ctx.save();
      this.ctx.font = '20px Arial';
      this.ctx.fillStyle = `rgba(255, 0, 0, ${text.opacity})`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(text.text, text.x, text.y);
      this.ctx.restore();
    });
  }
  
  drawGameOverScreen() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    if (this.isVictory) {
      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = '48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('恭喜通关！', this.canvasWidth / 2, this.canvasHeight / 2 - 80);
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '24px Arial';
      this.ctx.fillText(`最终得分: ${this.totalScore}`, this.canvasWidth / 2, this.canvasHeight / 2 - 20);
      this.ctx.fillText(`击杀小鱼: ${this.fishKilled}`, this.canvasWidth / 2, this.canvasHeight / 2 + 20);
      this.ctx.fillText(`击杀大鱼: ${this.bigFishKilled}`, this.canvasWidth / 2, this.canvasHeight / 2 + 60);
    } else {
      this.ctx.fillStyle = '#ff0000';
      this.ctx.font = '48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('游戏结束', this.canvasWidth / 2, this.canvasHeight / 2 - 60);
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '24px Arial';
      this.ctx.fillText(`最终得分: ${this.totalScore}`, this.canvasWidth / 2, this.canvasHeight / 2);
      this.ctx.fillText(`达到等级: ${this.playerLevel}`, this.canvasWidth / 2, this.canvasHeight / 2 + 40);
    }
    
    this.drawRestartButton();
  }
  
  drawRestartButton() {
    const btnWidth = 200;
    const btnHeight = 60;
    const btnX = this.canvasWidth / 2 - btnWidth / 2;
    const btnY = this.canvasHeight / 2 + 100;
    
    this.restartBtnRect = { x: btnX, y: btnY, width: btnWidth, height: btnHeight };
    
    this.ctx.fillStyle = '#4CAF50';
    this.ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
    
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('重新开始', this.canvasWidth / 2, btnY + 40);
  }
  
  checkRestartButtonClick(x, y) {
    if (!this.restartBtnRect) return;
    const { x: btnX, y: btnY, width, height } = this.restartBtnRect;
    if (x >= btnX && x <= btnX + width && y >= btnY && y <= btnY + height) {
      this.restartGame();
    }
  }
  
  restartGame() {
    this.isGameOver = false;
    this.isVictory = false;
    this.health = this.maxHealth;
    this.score = 9;
    this.totalScore = 0;
    this.playerLevel = 0;
    this.selectedWeapon = 1;
    this.balls = [];
    this.animations = [];
    this.bigFishKilled = 0;
    this.bigFishTriggers = 0;
    this.fishKilled = 0;
    this.shootCooldown = 1000;
    this.runAnimationLoop();
  }
}

window.onload = () => {
  new FishHunterGame();
};
