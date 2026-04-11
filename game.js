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
    this.bhzImage = null;
    
    this.animations = [];
    this.animationRunning = false;
    
    this.balls = [];
    this.ballTimer = null;
    
    this.closestBallId = null;
    this.originX = 0;
    this.originY = 0;
    
    this.lastClickTime = 0;
    
    this.flashState = true;
    this.flashTimer = null;
    
    this.breathingValue = 0;
    this.breathingDirection = 1;
    this.breathingImageIndex = -1;
    
    this.currentX = 0;
    this.currentY = 0;
    this.score = 9;
    this.totalScore = 0;
    this.highScore = this.getHighScore();
    
    this.waveOffset = 0;
    this.reflections = [];
    this.scoreTexts = [];
    this.predictedHits = 0;
    
    this.shootAudio = null;
    this.dazhaoAudio = null;
    this.bossAudio = null;
    this.meizidanAudio = null;
    this.daoAudio = null;
    this.dao3Audio = null;
    this.audioContext = null;
    this.dazhaoPlaying = false;
    this.touchStartTime = 0;
    this.longPressThreshold = 500;
    this.longPressTriggered = false;
    
    this.touches = [];
    
    this.fishKilled = 0;
    this.bigFishKilled = 0;
    this.bigFishTriggers = 0;
    this.bigFishNextTarget = 0;
    
    this.playerLevel = 0;
    this.levelThresholds = [0, 10, 50, 100, 200, 400, 600, 900, 1300, 1600, 2000];
    this.bigFishPerLevel = [3, 4, 4, 8, 8, 10, 10, 15, 15, 20, 20];
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
    
    this.selectedWeapon = 0;
    this.weaponImages = [null, null, null, null]; // 4种武器：0-飞刀1, 1-鱼叉1, 2-飞刀2, 3-鱼叉2
    this.showWeaponSelector = false;
    
    this.health = 100;
    this.maxHealth = 100;
    
    this.isGameOver = false;
    this.isVictory = false;
    this.isPaused = false;
    
    this.boss = null;
    this.bossActive = false;
    this.bossAppearedForLevel = new Set();
    
    // 说明书相关
    this.showInstruction = false;
    this.instructionScrollY = 0;
    this.instructionBtnRect = null;
    this.instructionCloseBtnRect = null;
    
    // 海盗船系统
    this.haidao = null;
    this.haidaoActive = false;
    this.haidaoAppearedForLevel = new Set();
    
    this.shootCooldown = 1000;
    this.lastShootTime = 0;
    
    // 能量条系统
    this.energyBar = {
      dazhao: 100, // 大招能量 0-100，开始时补满
      changan: 100, // 长按能量 0-100，开始时补满
      dazhaoMax: 100,
      changanMax: 100,
      dazhaoRechargeRate: 100 / 20, // 20秒补满
      changanRechargeRate: 100 / 40, // 40秒补满
      dazhaoCost: 20, // 每次使用消耗20
      changanCost: 50 // 每次使用消耗50
    };
    this.lastEnergyUpdateTime = Date.now();
    
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
    
    this.originX = this.canvasWidth / 2;
    this.originY = this.canvasHeight * (2 / 3);
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
      this.feidaoImage = await loadImage('images/feidao1.png');
      this.feidaoImage2 = await loadImage('images/feidao2.png');
      this.weaponImages[0] = this.feidaoImage || this.fishImage;
      this.weaponImages[1] = this.fishImage || this.feidaoImage;
      this.weaponImages[2] = this.feidaoImage2 || this.feidaoImage || this.fishImage;
      this.weaponImages[3] = this.fishImage2 || this.fishImage || this.feidaoImage;
      this.ballImage = await loadImage('images/feiyu.png');
      this.chuanImage = await loadImage('images/chuan.png');
      this.bigFishImage = await loadImage('images/dayu.png');
      this.bhzImage = await loadImage('images/bhz.png');
      this.jiaxueImage = await loadImage('images/jiaxue.png');
      this.xiaolongxiaImage = await loadImage('images/xiaolongxia.png');
      this.zhangyuguaiImage = await loadImage('images/zhangyuguai.png');
      this.haidaoImage = await loadImage('images/haidao.png');
      this.haidaoImage1 = await loadImage('images/haidao1.png');
      this.haidaoImage2 = await loadImage('images/haidao2.png');
      this.haidaoImage3 = await loadImage('images/haidao3.png');
      this.boss3Image = await loadImage('images/boss3.png');
      this.boss4Image = await loadImage('images/boss4.png');
      this.boss5Image = await loadImage('images/boss5.png');
      this.boss6Image = await loadImage('images/boss6.png');
      this.boss7Image = await loadImage('images/boss7.png');
      this.boss8Image = await loadImage('images/boss8.png');
      this.boss9Image = await loadImage('images/boss9.png');
      this.boss10Image = await loadImage('images/boss10.png');
      this.boss11Image = await loadImage('images/boss11.png');
    } catch (e) {
      console.error('图片加载失败:', e);
    }
    
    this.shootAudio = new Audio('images/fashe.mp3');
    this.shootAudio.preload = 'auto';
    
    this.dazhaoAudio = new Audio('images/dazhao.mp3');
    this.dazhaoAudio.preload = 'auto';
    this.dazhaoAudio.addEventListener('ended', () => {
      this.dazhaoPlaying = false;
    });
    
    this.bossAudio = new Audio('images/boss.mp3');
    this.bossAudio.preload = 'auto';
    this.bossAudio.loop = true;
    
    this.meizidanAudio = new Audio('images/meizidan.mp3');
    this.meizidanAudio.preload = 'auto';
    
    this.daoAudio = new Audio('images/dao4.mp3');
    this.daoAudio.preload = 'auto';
    
    this.dao3Audio = new Audio('images/dao3.mp3');
    this.dao3Audio.preload = 'auto';
    
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
    if (this.checkBossSpawn() || this.checkHaidaoSpawn()) {
      return;
    }
    
    const rand = Math.random();
    let ballType = 'normal';
    if (rand > 0.95) {
      ballType = 'jiaxue';
    } else if (rand > 0.85) {
      ballType = 'zhangyuguai';
    } else if (rand > 0.7) {
      ballType = 'xiaolongxia';
    } else if (rand > 0.5) {
      ballType = 'red';
    }
    
    let radius = 15;
    if (ballType === 'red' || ballType === 'xiaolongxia') {
      radius = 15 * 1.5;
    } else if (ballType === 'zhangyuguai') {
      radius = 15 * 2;
    }
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
          isRedBall: ballType === 'red',
          isXiaolongxia: ballType === 'xiaolongxia',
          isZhangyuguai: ballType === 'zhangyuguai',
          isJiaxue: ballType === 'jiaxue',
          shootTimer: 0,
          smokeTimer: 0
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
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  handleTouchStart(e) {
    e.preventDefault();
    this.touches = Array.from(e.touches);
    this.isDrawing = true;
    this.isTwoFinger = e.touches.length === 2;
    this.longPressTriggered = false;
    
    if (!this.isTwoFinger) {
      const touch = e.touches[0];
      this.startX = touch.clientX;
      this.startY = touch.clientY;
      this.touchStartTime = Date.now();
      this.findClosestImage(this.startX, this.startY);
    }
  }
  
  handleTouchMove(e) {
    e.preventDefault();
    if (!this.isDrawing) return;
    const touch = e.touches[0];
    this.currentX = touch.clientX;
    this.currentY = touch.clientY;
    
    // 检查长按时间，达到阈值立即触发
    if (!this.longPressTriggered && !this.isTwoFinger) {
      const touchDuration = Date.now() - this.touchStartTime;
      if (touchDuration >= this.longPressThreshold) {
        this.longPressTriggered = true;
        this.handleLongPress();
      }
    }
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
    
    // 如果已经触发过长按，不再处理普通发射
    if (this.longPressTriggered) {
      return;
    }
    
    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    
    this.processSwipe(endX, endY, true);
  }
  
  handleLongPress() {
    if (this.energyBar.changan < this.energyBar.changanCost) {
      return;
    }
    
    this.energyBar.changan -= this.energyBar.changanCost;
    
    if (this.selectedWeapon === 0) {
      this.handleFeidaoLongPress();
    } else if (this.selectedWeapon === 1) {
      this.handleYuchaLongPress();
    }
  }
  
  handleFeidaoLongPress() {
    const weaponImage = this.getCurrentWeaponImage();
    if (!weaponImage) return;
    
    if (this.daoAudio) {
      this.daoAudio.currentTime = 0;
      this.daoAudio.play().catch(e => console.log('dao音频播放失败:', e));
    }
    
    if (this.bossActive && this.boss) {
      this.feidaoAttackBoss();
    } else {
      this.feidaoSnakeMove();
    }
  }
  
  feidaoSnakeMove() {
    const weaponImage = this.getCurrentWeaponImage();
    if (!weaponImage) return;
    
    const weaponWidth = weaponImage.width || 60;
    const weaponHeight = weaponImage.height || 60;
    
    const startX = 50;
    const startY = this.canvasHeight - 50;
    
    this.addSnakeAnimation(startX, startY, weaponHeight);
  }
  
  addSnakeAnimation(startX, startY, stepHeight) {
    const weaponImage = this.getCurrentWeaponImage();
    if (!weaponImage) return;
    
    const weaponWidth = weaponImage.width || 60;
    const weaponHeight = weaponImage.height || 60;
    let currentX = startX;
    let currentY = startY;
    let direction = 1;
    
    const animation = {
      startX: currentX,
      startY: currentY,
      endX: currentX,
      endY: -100,
      dx: 0,
      dy: -100 - startY,
      angle: 0,
      rotation: 0,
      startTime: Date.now(),
      duration: 3000,
      snakePath: [],
      hasHitBoss: false,
      hasHitHaidao: false,
      weaponType: this.selectedWeapon
    };
    
    const halfStepHeight = stepHeight / 2;
    
    while (currentY > -weaponHeight) {
      animation.snakePath.push({ x: currentX, y: currentY });
      
      // 水平运动到左侧或右侧
      currentX = direction === 1 ? this.canvasWidth - 50 : 50;
      animation.snakePath.push({ x: currentX, y: currentY });
      
      // 垂直向上运动半个自身高度
      currentY -= halfStepHeight;
      animation.snakePath.push({ x: currentX, y: currentY });
      
      direction *= -1;
    }
    
    animation.snakePath.push({ x: currentX, y: -100 });
    this.animations.push(animation);
  }
  
  feidaoAttackBoss() {
    const weaponImage = this.getCurrentWeaponImage();
    if (!weaponImage) return;
    
    const weaponHeight = weaponImage.height || 60;
    const boss = this.boss;
    let currentX = 50;
    let currentY = this.canvasHeight - 50;
    let direction = 1;
    
    const animation = {
      startX: currentX,
      startY: currentY,
      endX: currentX,
      endY: -100,
      angle: 0,
      rotation: 0,
      startTime: Date.now(),
      duration: 3000,
      snakePath: [],
      hasHitBoss: false,
      hasHitHaidao: false,
      weaponType: this.selectedWeapon
    };
    
    const halfStepHeight = weaponHeight / 2;
    let bossEncountered = false;
    
    // 先自然走蛇形
    while (currentY > -weaponHeight) {
      animation.snakePath.push({ x: currentX, y: currentY });
      
      // 检查是否遇到 boss
      if (!bossEncountered && currentY <= boss.y + boss.height / 2 && currentY >= boss.y - boss.height / 2) {
        bossEncountered = true;
        
        // 快速左右穿过 boss 20次
        for (let i = 0; i < 20; i++) {
          const x = boss.x - boss.width / 2 - 100 + (i % 2) * (boss.width + 200);
          const y = boss.y;
          animation.snakePath.push({ x, y });
        }
      }
      
      // 水平运动到左侧或右侧
      currentX = direction === 1 ? this.canvasWidth - 50 : 50;
      animation.snakePath.push({ x: currentX, y: currentY });
      
      // 垂直向上运动半个自身高度
      currentY -= halfStepHeight;
      animation.snakePath.push({ x: currentX, y: currentY });
      
      direction *= -1;
    }
    
    // 最终向上消失
    animation.snakePath.push({ x: currentX, y: -100 });
    
    this.animations.push(animation);
  }
  
  handleYuchaLongPress() {
    const weaponImage = this.getCurrentWeaponImage();
    if (!weaponImage) return;
    
    if (this.bossActive && this.boss) {
      this.yuchaAttackBoss();
    } else {
      this.yuchaSpreadFire();
    }
  }
  
  yuchaSpreadFire() {
    const weaponWidth = 60;
    const startY = this.canvasHeight / 2;
    
    for (let i = 0; i < 20; i++) {
      const startX = 50;
      const endX = this.canvasWidth - 50;
      const startY = 50 + i * weaponWidth;
      
      if (startY < this.canvasHeight - 50) {
        this.addAnimation(startX, startY, endX, startY, endX - startX, 0);
      }
    }
    
    for (let i = 0; i < 20; i++) {
      const startX = this.canvasWidth - 50;
      const endX = 50;
      const startY = 50 + i * weaponWidth;
      
      if (startY < this.canvasHeight - 50) {
        this.addAnimation(startX, startY, endX, startY, endX - startX, 0);
      }
    }
  }
  
  yuchaAttackBoss() {
    const weaponWidth = 60;
    const boss = this.boss;
    
    const positions = [
      { x: 0, y: boss.y },
      { x: this.canvasWidth, y: boss.y },
      { x: boss.x, y: 0 },
      { x: boss.x, y: this.canvasHeight }
    ];
    
    positions.forEach(pos => {
      for (let i = 0; i < 5; i++) {
        const offsetX = (i - 2) * weaponWidth;
        const offsetY = (i - 2) * weaponWidth;
        const startX = pos.x + offsetX;
        const startY = pos.y + offsetY;
        
        const dx = boss.x - startX;
        const dy = boss.y - startY;
        
        this.addAnimation(startX, startY, boss.x, boss.y, dx, dy);
      }
    });
  }
  
  handleMouseDown(e) {
    if (e.button === 2) {
      e.preventDefault();
      // 鼠标右键触发长按效果（对应移动端长按）
      this.handleLongPress();
      return;
    }
    
    const now = Date.now();
    const isDoubleClick = now - this.lastClickTime < 300;
    this.lastClickTime = now;
    
    if (isDoubleClick) {
      // 双击鼠标左键触发大招
      this.handleTwoFingerSwipe();
      return;
    }
    
    this.isDrawing = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    
    let closestBall = null;
    let minDistance = Infinity;
    const searchRadius = 30;
    
    for (const ball of this.balls) {
      const distance = Math.sqrt((this.startX - ball.x) ** 2 + (this.startY - ball.y) ** 2);
      if (distance <= searchRadius && distance < minDistance) {
        minDistance = distance;
        closestBall = ball;
      }
    }
    
    this.targetBall = closestBall;
    this.findClosestImage(this.startX, this.startY);
  }
  
  handleMouseMove(e) {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    let hasTarget = false;
    const searchRadius = 30;
    
    for (const ball of this.balls) {
      const distance = Math.sqrt((mouseX - ball.x) ** 2 + (mouseY - ball.y) ** 2);
      if (distance <= searchRadius) {
        hasTarget = true;
        break;
      }
    }
    
    if (hasTarget && this.bhzImage) {
      this.canvas.style.cursor = 'url(images/bhz.png) 16 16, pointer';
    } else {
      this.canvas.style.cursor = 'default';
    }
    
    if (!this.isDrawing) return;
    this.currentX = mouseX;
    this.currentY = mouseY;
  }
  
  handleMouseUp(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.targetBall = null;
    
    if (this.isGameOver) {
      this.checkRestartButtonClick(e.clientX, e.clientY);
      return;
    }
    
    // PC端：从固定点位到鼠标点击位置的连线
    this.processSwipe(e.clientX, e.clientY, false);
  }
  
  processSwipe(endX, endY, isTouch = false) {
    if (isTouch && this.startY < this.canvasHeight / 2) {
      return;
    }
    
    let startX, startY, dx, dy;
    
    if (isTouch) {
      startX = this.startX;
      startY = this.startY;
      
      if (this.targetBall) {
        dx = this.targetBall.x - startX;
        dy = this.targetBall.y - startY;
      } else {
        dx = endX - startX;
        dy = endY - startY;
      }
    } else {
      startX = this.originX;
      startY = this.originY;
      
      if (this.targetBall) {
        dx = this.targetBall.x - startX;
        dy = this.targetBall.y - startY;
      } else {
        dx = endX - startX;
        dy = endY - startY;
      }
    }
    
    this.breathingImageIndex = -1;
    
    const now = Date.now();
    if (now - this.lastShootTime < this.shootCooldown) {
      return;
    }
    
    this.lastShootTime = now;
    
    const extendPoint = this.getExtendPoint(startX, startY, dx, dy);
    this.predictedHits = this.predictHits(startX, startY, extendPoint.x, extendPoint.y);
    this.addAnimation(startX, startY, extendPoint.x, extendPoint.y, dx, dy);
  }
  
  handleTwoFingerSwipe() {
    if (this.energyBar.dazhao < this.energyBar.dazhaoCost) {
      return;
    }
    
    this.energyBar.dazhao -= this.energyBar.dazhaoCost;
    
    if (this.score < 9) {
      this.score = 9;
    }
    
    if (this.selectedWeapon === 0 && this.daoAudio) {
      this.daoAudio.currentTime = 0;
      this.daoAudio.play().catch(e => console.log('dao4音频播放失败:', e));
    } else if (this.selectedWeapon === 1 && this.dao3Audio) {
      this.dao3Audio.currentTime = 0;
      this.dao3Audio.play().catch(e => console.log('dao3音频播放失败:', e));
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
    const weaponImage = this.getCurrentWeaponImage();
    if (!weaponImage) return;
    
    if (this.selectedWeapon === 0 && this.daoAudio) {
      this.daoAudio.currentTime = 0;
      this.daoAudio.play().catch(e => console.log('dao音频播放失败:', e));
    } else if (this.shootAudio) {
      this.shootAudio.currentTime = 0;
      this.shootAudio.play().catch(e => console.log('发射音频播放失败:', e));
    }
    
    const animation = {
      startX,
      startY,
      endX,
      endY,
      angle: Math.atan2(dy, dx) + Math.PI / 2,
      rotation: 0,
      startTime: Date.now(),
      duration: 2000,
      hasHitBoss: false,
      hasHitHaidao: false,
      weaponType: this.selectedWeapon
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
    
    if (this.isPaused) {
      requestAnimationFrame(() => this.runAnimationLoop());
      return;
    }
    
    const imgWidth = 60;
    const imgHeight = 60;
    const now = Date.now();
    
    // 更新能量条
    this.updateEnergyBars(now);
    
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    this.drawGradientBackground();
    this.drawWaves();
    this.drawReflections();
    
    const currentWeaponImage = this.getCurrentWeaponImage();
    if (currentWeaponImage) {
      const staticWidth = 60;
      const staticHeight = 120;
      
      this.drawStaticImage(0, this.originY, Math.PI * 2, staticWidth, staticHeight, 0);
      
      // 隐藏子弹数字显示
      // this.ctx.save();
      // this.ctx.font = '20px Arial';
      // this.ctx.fillStyle = '#000000';
      // this.ctx.textAlign = 'center';
      // this.ctx.fillText(this.score.toString(), 5, this.originY - staticHeight - 10);
      // this.ctx.restore();
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
    
    // 显示分数，隐藏等级和大招显示
    this.ctx.save();
    this.ctx.font = '16px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'left';
    // this.ctx.fillText(`等级: ${this.playerLevel}`, 10, 25);
    this.ctx.fillText(`分: ${this.totalScore}/${this.highScore}`, 10, 25);
    // 
    // const requiredPerTrigger = this.bigFishPerLevel[Math.min(this.playerLevel, this.bigFishPerLevel.length - 1)];
    // const nextTarget = (this.bigFishTriggers + 1) * requiredPerTrigger;
    // this.ctx.fillStyle = '#ff6b6b';
    // this.ctx.fillText(`大招: ${this.bigFishTriggers}/${this.bigFishKilled}/${nextTarget}`, 10, 75);
    // 
    // this.ctx.fillStyle = '#ffff00';
    // // this.ctx.fillText(`冷却: ${Math.round(this.shootCooldown)}ms`, 10, 100);
    this.ctx.restore();
    
    // 显示能量条
    this.drawEnergyBars();
    
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
          this.updateHighScore();
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
      } else if (ball.isXiaolongxia && this.xiaolongxiaImage) {
        const ballSize = ball.radius * 2;
        this.ctx.save();
        this.ctx.translate(ball.x, ball.y);
        this.ctx.rotate(ball.angle || 0);
        this.ctx.drawImage(
          this.xiaolongxiaImage,
          -ballSize / 2,
          -ballSize / 2,
          ballSize,
          ballSize
        );
        this.ctx.restore();
      } else if (ball.isZhangyuguai && this.zhangyuguaiImage) {
        const ballSize = ball.radius * 2;
        this.ctx.save();
        this.ctx.translate(ball.x, ball.y);
        this.ctx.rotate(ball.angle || 0);
        this.ctx.drawImage(
          this.zhangyuguaiImage,
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
    
    // 绘制和更新 BOSS
    if (this.bossActive && this.boss) {
      const elapsed = Date.now() - this.boss.startTime;
      
      // 左右移动
      this.boss.x = this.canvasWidth / 2 + Math.sin(elapsed * this.boss.frequency) * this.boss.amplitude;
      
      // 下落
      this.boss.y += this.boss.speed;
      
      // 绘制 BOSS
      this.ctx.save();
      this.ctx.translate(this.boss.x, this.boss.y);
      this.ctx.drawImage(
        this.boss.image,
        -this.boss.width / 2,
        -this.boss.height / 2,
        this.boss.width,
        this.boss.height
      );
      this.ctx.restore();
      
      // 绘制 BOSS 血条
      const healthBarWidth = this.boss.width;
      const healthBarHeight = 10;
      const healthBarX = this.boss.x - healthBarWidth / 2;
      const healthBarY = this.boss.y - this.boss.height / 2 - 20;
      
      this.ctx.save();
      this.ctx.fillStyle = '#333333';
      this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
      
      const healthPercentage = this.boss.health / this.boss.maxHealth;
      this.ctx.fillStyle = healthPercentage > 0.5 ? '#00ff00' : healthPercentage > 0.2 ? '#ffff00' : '#ff0000';
      this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
      
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
      this.ctx.restore();
      
      // 检测 BOSS 是否逃出屏幕
      if (this.boss.y > this.canvasHeight + this.boss.height) {
        this.boss = null;
        this.bossActive = false;
        if (this.bossAudio) {
          this.bossAudio.pause();
          this.bossAudio.currentTime = 0;
        }
        this.health = 0; // BOSS 逃出直接血量归零
        this.isGameOver = true;
        this.updateHighScore();
      }
    }
    
    // 绘制和更新海盗船
    if (this.haidaoActive && this.haidao) {
      const elapsed = Date.now() - this.haidao.startTime;
      const now = Date.now();
      
      // 左右移动
      this.haidao.x = this.canvasWidth / 2 + Math.sin(elapsed * this.haidao.frequency) * this.haidao.amplitude;
      
      // 下落
      this.haidao.y += this.haidao.speed;
      
      // 海盗船特殊动作
      if (now - this.haidao.lastActionTime > 3000) {
        this.haidao.lastActionTime = now;
        if (this.haidao.type === 'flash') {
          // 闪现
          this.haidao.x = Math.random() * (this.canvasWidth - this.haidao.width) + this.haidao.width / 2;
        } else if (this.haidao.type === 'summon') {
          // 召唤敌人
          for (let i = 0; i < 3; i++) {
            this.addBall();
          }
        }
      }
      
      // 绘制海盗船
      this.ctx.save();
      this.ctx.translate(this.haidao.x, this.haidao.y);
      this.ctx.drawImage(
        this.haidao.image,
        -this.haidao.width / 2,
        -this.haidao.height / 2,
        this.haidao.width,
        this.haidao.height
      );
      this.ctx.restore();
      
      // 绘制海盗船血条
      const healthBarWidth = this.haidao.width;
      const healthBarHeight = 10;
      const healthBarX = this.haidao.x - healthBarWidth / 2;
      const healthBarY = this.haidao.y - this.haidao.height / 2 - 20;
      
      this.ctx.save();
      this.ctx.fillStyle = '#333333';
      this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
      
      const healthPercentage = this.haidao.health / this.haidao.maxHealth;
      this.ctx.fillStyle = healthPercentage > 0.5 ? '#00ff00' : healthPercentage > 0.2 ? '#ffff00' : '#ff0000';
      this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
      
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
      this.ctx.restore();
      
      // 检测海盗船是否逃出屏幕
      if (this.haidao.y > this.canvasHeight + this.haidao.height) {
        this.haidao = null;
        this.haidaoActive = false;
        if (this.bossAudio) {
          this.bossAudio.pause();
          this.bossAudio.currentTime = 0;
        }
        this.health = 0; // 海盗船逃出直接血量归零
        this.isGameOver = true;
        this.updateHighScore();
      }
    }
    
    this.animations = this.animations.filter(anim => {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      
      let currentX, currentY;
      
      if (anim.snakePath && anim.snakePath.length > 0) {
        const pathProgress = progress * (anim.snakePath.length - 1);
        const pathIndex = Math.floor(pathProgress);
        const pathFraction = pathProgress - pathIndex;
        
        if (pathIndex < anim.snakePath.length - 1) {
          const startPoint = anim.snakePath[pathIndex];
          const endPoint = anim.snakePath[pathIndex + 1];
          
          currentX = startPoint.x + (endPoint.x - startPoint.x) * pathFraction;
          currentY = startPoint.y + (endPoint.y - startPoint.y) * pathFraction;
        } else {
          const lastPoint = anim.snakePath[anim.snakePath.length - 1];
          currentX = lastPoint.x;
          currentY = lastPoint.y;
        }
      } else {
        currentX = anim.startX + (anim.endX - anim.startX) * progress;
        currentY = anim.startY + (anim.endY - anim.startY) * progress;
      }
      
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
      
      // 检测是否击中 BOSS
      if (this.bossActive && this.boss) {
        const headX = currentX + Math.cos(anim.angle - Math.PI / 2) * (imgHeight / 2);
        const headY = currentY + Math.sin(anim.angle - Math.PI / 2) * (imgHeight / 2);
        
        const bossCenterX = this.boss.x;
        const bossCenterY = this.boss.y;
        const distance = Math.sqrt((headX - bossCenterX) ** 2 + (headY - bossCenterY) ** 2);
        
        if (distance < this.boss.width / 2) {
          if (anim.weaponType === 0) {
            // feidao武器：每次碰撞扣除1点血
            if (!anim.hasHitBoss) {
              anim.hasHitBoss = true;
              
              // 扣除1点血
              const hitCount = 1;
              this.boss.health = Math.max(0, this.boss.health - hitCount);
              
              // 显示扣除1点血的文字
              this.addScoreText(this.boss.x, this.boss.y, `-${hitCount}`, '#ff0000');
              
              if (this.boss.health <= 0) {
                const bossScore = this.boss.maxHealth;
                this.totalScore += bossScore;
                this.addScoreText(this.boss.x, this.boss.y - 20, `+${bossScore}`, '#00ff00');
                this.boss = null;
                this.bossActive = false;
                if (this.bossAudio) {
                  this.bossAudio.pause();
                  this.bossAudio.currentTime = 0;
                }
              }
            }
          } else {
            // yucha武器：每一把碰到Boss都扣除1点血，武器消失
            if (!anim.hasHitBoss) {
              anim.hasHitBoss = true;
              
              // 扣除1点血
              this.boss.health = Math.max(0, this.boss.health - 1);
              
              // 显示扣除1点血的文字
              this.addScoreText(this.boss.x, this.boss.y, '-1', '#ff0000');
              
              if (this.boss.health <= 0) {
                const bossScore = this.boss.maxHealth;
                this.totalScore += bossScore;
                this.addScoreText(this.boss.x, this.boss.y - 20, `+${bossScore}`, '#00ff00');
                this.boss = null;
                this.bossActive = false;
                if (this.bossAudio) {
                  this.bossAudio.pause();
                  this.bossAudio.currentTime = 0;
                }
              }
            }
          }
        }
      }
      
      // 检测是否击中海盗船
      if (this.haidaoActive && this.haidao) {
        const headX = currentX + Math.cos(anim.angle - Math.PI / 2) * (imgHeight / 2);
        const headY = currentY + Math.sin(anim.angle - Math.PI / 2) * (imgHeight / 2);
        
        const haidaoCenterX = this.haidao.x;
        const haidaoCenterY = this.haidao.y;
        const distance = Math.sqrt((headX - haidaoCenterX) ** 2 + (headY - haidaoCenterY) ** 2);
        
        if (distance < this.haidao.width / 2) {
          if (anim.weaponType === 0) {
            // feidao武器：从开始碰撞到结束直接算作20次击中
            if (!anim.hasHitHaidao) {
              anim.hasHitHaidao = true;
              
              // 直接扣除20点血
              const hitCount = 20;
              this.haidao.health = Math.max(0, this.haidao.health - hitCount);
              
              // 显示扣除20点血的文字
              this.addScoreText(this.haidao.x, this.haidao.y, `-${hitCount}`, '#ff0000');
              
              if (this.haidao.health <= 0) {
                const haidaoScore = this.haidao.maxHealth;
                this.totalScore += haidaoScore;
                this.addScoreText(this.haidao.x, this.haidao.y - 20, `+${haidaoScore}`, '#00ff00');
                this.haidao = null;
                this.haidaoActive = false;
                if (this.bossAudio) {
                  this.bossAudio.pause();
                  this.bossAudio.currentTime = 0;
                }
              }
            }
          } else {
            // yucha武器：每一把碰到海盗船都扣除1点血，武器消失
            if (!anim.hasHitHaidao) {
              anim.hasHitHaidao = true;
              
              // 扣除1点血
              this.haidao.health = Math.max(0, this.haidao.health - 1);
              
              // 显示扣除1点血的文字
              this.addScoreText(this.haidao.x, this.haidao.y, '-1', '#ff0000');
              
              if (this.haidao.health <= 0) {
                const haidaoScore = this.haidao.maxHealth;
                this.totalScore += haidaoScore;
                this.addScoreText(this.haidao.x, this.haidao.y - 20, `+${haidaoScore}`, '#00ff00');
                this.haidao = null;
                this.haidaoActive = false;
                if (this.bossAudio) {
                  this.bossAudio.pause();
                  this.bossAudio.currentTime = 0;
                }
              }
            }
          }
        }
      }
      
      if (closestBall && minDistance < 20) {
        this.balls = this.balls.filter(ball => ball.id !== closestBall.id);
        
        if (closestBall.ballType === 'jiaxue') {
          this.totalScore += 1;
          this.health = Math.min(100, this.health + 10);
          this.addScoreText(closestBall.x, closestBall.y - 10, '+1', '#ff0000');
          this.addScoreText(closestBall.x, closestBall.y + 10, '+10', '#00ff00');
          // 手机震动
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }
        } else if (closestBall.isXiaolongxia) {
          this.totalScore += 10;
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
            this.updateHighScore();
          }
          
          // 根据等级设置冷却时间 (0级1000ms, 每级减100ms, 9级100ms)
          this.shootCooldown = Math.max(100, 1000 - this.playerLevel * 100);
          
          // 添加得分文字动画
          this.addScoreText(closestBall.x, closestBall.y, '+10');
        } else if (closestBall.isZhangyuguai) {
          this.totalScore += 20;
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
            this.updateHighScore();
          }
          
          // 根据等级设置冷却时间 (0级1000ms, 每级减100ms, 9级100ms)
          this.shootCooldown = Math.max(100, 1000 - this.playerLevel * 100);
          
          // 添加得分文字动画
          this.addScoreText(closestBall.x, closestBall.y, '+20');
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
            this.updateHighScore();
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
            this.updateHighScore();
          }
          
          // 根据等级设置冷却时间 (0级1000ms, 每级减100ms, 9级100ms)
          this.shootCooldown = Math.max(100, 1000 - this.playerLevel * 100);
          
          // 添加得分文字动画
          this.addScoreText(closestBall.x, closestBall.y, '+1');
        }
      }
      
      // feidao 武器旋转
      if (this.selectedWeapon === 0 || this.selectedWeapon === 2) {
        anim.rotation += 0.1;
      }
      
      this.ctx.save();
      this.ctx.translate(currentX, currentY);
      this.ctx.rotate(anim.angle);
      if (this.selectedWeapon === 0 || this.selectedWeapon === 2) {
        this.ctx.rotate(anim.rotation);
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
        -imgWidth / 2,
        -imgHeight / 2,
        imgWidth,
        imgHeight
      );
      this.ctx.restore();
      
      // 动画结束时播放音效（仅yucha武器）
      if (progress >= 1 && this.selectedWeapon === 1 && this.shootAudio) {
        this.shootAudio.currentTime = 0;
        this.shootAudio.play().catch(e => console.log('发射音频播放失败:', e));
      }
      
      // yucha武器碰到Boss后立即消失
      if (anim.weaponType === 1 && anim.hasHitBoss) {
        return false;
      }
      
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
  
  checkBossSpawn() {
    if (this.playerLevel < 3 || this.playerLevel >= 11 || this.bossActive) {
      return false;
    }
    
    if (this.bossAppearedForLevel.has(this.playerLevel)) {
      return false;
    }
    
    const currentThreshold = this.levelThresholds[this.playerLevel];
    const nextThreshold = this.levelThresholds[this.playerLevel + 1];
    const scoreDiff = nextThreshold - currentThreshold;
    const bossSpawnThreshold = currentThreshold + scoreDiff * 0.9;
    
    if (this.totalScore >= bossSpawnThreshold) {
      this.spawnBoss();
      return true;
    }
    
    return false;
  }
  
  checkHaidaoSpawn() {
    if (this.playerLevel < 11 || this.haidaoActive || this.bossActive) {
      return false;
    }
    
    if (this.haidaoAppearedForLevel.has(this.playerLevel)) {
      return false;
    }
    
    const currentThreshold = this.levelThresholds[this.playerLevel];
    const nextThreshold = this.levelThresholds[this.playerLevel + 1] || currentThreshold + 500;
    const scoreDiff = nextThreshold - currentThreshold;
    const haidaoSpawnThreshold = currentThreshold + scoreDiff * 0.9;
    
    if (this.totalScore >= haidaoSpawnThreshold) {
      this.spawnHaidao();
      return true;
    }
    
    return false;
  }
  
  spawnBoss() {
    let bossImage;
    if (this.playerLevel === 3) {
      bossImage = this.boss3Image;
    } else if (this.playerLevel === 4) {
      bossImage = this.boss4Image;
    } else if (this.playerLevel === 5) {
      bossImage = this.boss5Image;
    } else if (this.playerLevel === 6) {
      bossImage = this.boss6Image;
    } else if (this.playerLevel === 7) {
      bossImage = this.boss7Image;
    } else if (this.playerLevel === 8) {
      bossImage = this.boss8Image;
    } else if (this.playerLevel === 9) {
      bossImage = this.boss9Image;
    } else if (this.playerLevel === 10) {
      bossImage = this.boss11Image;
    } else {
      bossImage = this.boss10Image;
    }
    
    const bossSize = 100;
    let bossHealth;
    if (this.playerLevel === 3) {
      bossHealth = 20; // 3→4级 20次
    } else {
      bossHealth = 20 + (this.playerLevel - 3) * 20; // 每级+20次
    }
    
    this.boss = {
      x: this.canvasWidth / 2,
      y: -bossSize,
      width: bossSize,
      height: bossSize,
      health: bossHealth,
      maxHealth: bossHealth,
      speed: this.canvasHeight / 7200, // 2分钟下落
      direction: 1,
      amplitude: 100,
      frequency: 0.005,
      startTime: Date.now(),
      image: bossImage
    };
    
    this.bossActive = true;
    this.bossAppearedForLevel.add(this.playerLevel);
    
    if (this.bossAudio) {
      this.bossAudio.currentTime = 0;
      this.bossAudio.play().catch(e => console.log('Boss音频播放失败:', e));
    }
  }
  
  spawnHaidao() {
    const haidaoTypes = [
      { image: this.haidaoImage, type: 'flash' },
      { image: this.haidaoImage1, type: 'summon' },
      { image: this.haidaoImage2, type: 'defense' },
      { image: this.haidaoImage3, type: 'flash' }
    ];
    
    const randomType = haidaoTypes[Math.floor(Math.random() * haidaoTypes.length)];
    const haidaoImage = randomType.image;
    const haidaoType = randomType.type;
    
    if (!haidaoImage) return;
    
    const haidaoSize = 150;
    const haidaoHealth = 200 + (this.playerLevel - 11) * 50;
    
    this.haidao = {
      x: this.canvasWidth / 2,
      y: -haidaoSize,
      width: haidaoSize,
      height: haidaoSize,
      health: haidaoHealth,
      maxHealth: haidaoHealth,
      speed: this.canvasHeight / 9000,
      direction: 1,
      amplitude: 150,
      frequency: 0.003,
      type: haidaoType,
      startTime: Date.now(),
      actionTimer: 0,
      lastActionTime: Date.now(),
      image: haidaoImage
    };
    
    this.haidaoActive = true;
    this.haidaoAppearedForLevel.add(this.playerLevel);
    
    if (this.bossAudio) {
      this.bossAudio.currentTime = 0;
      this.bossAudio.play().catch(e => console.log('海盗船音频播放失败:', e));
    }
  }
  
  selectWeapon(weaponIndex) {
    if (weaponIndex === 1 && this.playerLevel < 3) {
      console.log('武器2需要3级解锁');
      return;
    }
    this.selectedWeapon = weaponIndex;
    console.log('武器已切换到:', weaponIndex);
  }

  isWeaponUnlocked(weaponIndex) {
    if (weaponIndex === 1) {
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
  
  addScoreText(x, y, text, color = '#ff0000') {
    this.scoreTexts.push({
      x,
      y,
      text,
      color,
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
      const r = parseInt(text.color.slice(1, 3), 16);
      const g = parseInt(text.color.slice(3, 5), 16);
      const b = parseInt(text.color.slice(5, 7), 16);
      this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${text.opacity})`;
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
  
  getHighScore() {
    try {
      const stored = localStorage.getItem('fishHunterHighScore');
      return stored ? parseInt(stored, 10) : 0;
    } catch (e) {
      console.error('读取最高分失败:', e);
      return 0;
    }
  }

  updateHighScore() {
    if (this.totalScore > this.highScore) {
      this.highScore = this.totalScore;
      localStorage.setItem('fishHunterHighScore', this.highScore.toString());
    }
  }
  
  updateEnergyBars(now) {
    const deltaTime = (now - this.lastEnergyUpdateTime) / 1000; // 转换为秒
    this.lastEnergyUpdateTime = now;
    
    // 更新大招能量
    this.energyBar.dazhao = Math.min(
      this.energyBar.dazhaoMax,
      this.energyBar.dazhao + this.energyBar.dazhaoRechargeRate * deltaTime
    );
    
    // 更新长按能量
    this.energyBar.changan = Math.min(
      this.energyBar.changanMax,
      this.energyBar.changan + this.energyBar.changanRechargeRate * deltaTime
    );
  }
  
  drawEnergyBars() {
    const energyBarWidth = 200;
    const energyBarHeight = 15;
    const energyBarX = this.canvasWidth - energyBarWidth - 10;
    const energyBarY = 55;
    
    this.ctx.save();
    
    // 大招能量条
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(energyBarX, energyBarY, energyBarWidth, energyBarHeight);
    
    const dazhaoPercentage = this.energyBar.dazhao / this.energyBar.dazhaoMax;
    this.ctx.fillStyle = '#00ff00';
    this.ctx.fillRect(energyBarX, energyBarY, energyBarWidth * dazhaoPercentage, energyBarHeight);
    
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(energyBarX, energyBarY, energyBarWidth, energyBarHeight);
    
    // 长按能量条
    const changanY = energyBarY + energyBarHeight + 10;
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(energyBarX, changanY, energyBarWidth, energyBarHeight);
    
    const changanPercentage = this.energyBar.changan / this.energyBar.changanMax;
    this.ctx.fillStyle = '#ffff00';
    this.ctx.fillRect(energyBarX, changanY, energyBarWidth * changanPercentage, energyBarHeight);
    
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(energyBarX, changanY, energyBarWidth, energyBarHeight);
    
    // 能量条文字
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`大招: ${Math.round(this.energyBar.dazhao)}/${this.energyBar.dazhaoMax}`, energyBarX + energyBarWidth / 2, energyBarY + energyBarHeight - 3);
    this.ctx.fillText(`长按: ${Math.round(this.energyBar.changan)}/${this.energyBar.changanMax}`, energyBarX + energyBarWidth / 2, changanY + energyBarHeight - 3);
    
    this.ctx.restore();
  }
  
  restartGame() {
    this.isGameOver = false;
    this.isVictory = false;
    this.health = this.maxHealth;
    this.score = 9;
    this.totalScore = 0;
    this.playerLevel = 0;
    this.selectedWeapon = 0;
    this.balls = [];
    this.animations = [];
    this.bigFishKilled = 0;
    this.bigFishTriggers = 0;
    this.fishKilled = 0;
    this.boss = null;
    this.bossActive = false;
    this.bossAppearedForLevel.clear();
    this.shootCooldown = 1000;
    // 重置能量条为补满状态
    this.energyBar.dazhao = 100;
    this.energyBar.changan = 100;
    this.runAnimationLoop();
  }
}

window.onload = () => {
  new FishHunterGame();
};
