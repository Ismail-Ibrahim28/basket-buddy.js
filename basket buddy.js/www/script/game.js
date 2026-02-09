const k = kaplay({
  width: 1600,
  height: 700,
  background: [115, 177, 240],
});

const {
  scene, add, text, pos, anchor, area, color, rect, go, opacity, z,
  onUpdate, isKeyDown, width, height, rand, loop, move, DOWN,
  destroy, dt, loadSprite, sprite, scale, destroyAll, choose, wait, rgb,
  loadSound, play, get
} = k;

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

// GLOBAL TRACKERS
const MAX_LIVES = 3; 
let totalCoinsCollected = 0; 
let highestScore = 0;
let musicHandle = null; 
let unlockedLevel = 1;

// ========================
// LOAD ASSETS
// ========================
try {
    loadSprite("background", "../sprites/background.jpg");
    loadSprite("basket", "../sprites/basket.png");
    loadSprite("apple", "../sprites/Apple.png");
    loadSprite("banana", "../sprites/banana.png");
    loadSprite("mango", "../sprites/mango.png");
    loadSprite("pear", "../sprites/pear.png");
    loadSprite("strawberry", "../sprites/strawberry.png");
    loadSprite("watermelon", "../sprites/watermelon.png");
    loadSprite("rock", "../sprites/rock.png");
    loadSprite("ice", "../sprites/ice.png");
    loadSprite("heart", "../sprites/heart.png");
    loadSprite("coin", "../sprites/coin.png");

    loadSound("start", "../sound/start.mp3");
    loadSound("fruit", "../sound/fruit.mp3");
    loadSound("music", "../sound/music.mp3");
    loadSound("victory", "../sound/victory.mp3");
    loadSound("wrong", "../sound/wrong.mp3");
} catch(e) { console.log("Asset load error:", e); }

const FRUITS = ["apple", "banana", "mango", "pear", "strawberry", "watermelon"];

// ========================
// MATH QUIZ
// ========================
function startMathQuiz(levelNum, onComplete) {
  destroyAll("quiz-ui");
  let num1, num2, question, answer;

  if (levelNum === 1) { 
    num1 = Math.floor(rand(1, 10)); num2 = Math.floor(rand(1, 10));
    answer = num1 + num2; question = `${num1} + ${num2}`;
  } else if (levelNum === 2) {
    num1 = Math.floor(rand(10, 20)); num2 = Math.floor(rand(5, 15));
    answer = num1 + num2; question = `${num1} + ${num2}`;
  } else {
    num1 = Math.floor(rand(2, 10)); num2 = choose([2, 5, 10]);
    answer = num1 * num2; question = `${num1} x ${num2}`;
  }

  const overlay = add([rect(width(), height()), color(0, 0, 0), opacity(0.8), pos(0, 0), z(100), "quiz-ui"]);
  add([text(`QUIZ TIME!\n\n${question} = ?`, { size: 48 }), pos(width() / 2, height() / 3), anchor("center"), z(101), "quiz-ui"]);

  const options = [answer, answer + 2, answer - 3].sort(() => rand() - 0.5);
  options.forEach((opt, i) => {
    const btn = add([rect(240, 60), pos(width() / 2, height() / 2 + (i * 80)), anchor("center"), area(), color(150, 150, 255), z(101), "quiz-ui", "quiz-btn"]);
    add([text(opt.toString(), { size: 30 }), pos(width() / 2, height() / 2 + (i * 80)), anchor("center"), z(102), "quiz-ui"]);
    btn.onClick(() => { 
        destroyAll("quiz-ui"); 
        if (opt !== answer) play("wrong");
        onComplete(opt === answer); 
    });
  });
}

// ========================
// MAIN LEVEL ENGINE
// ========================
function setupLevel(targetScore, fallSpeed, spawnRate, nextLevelName, levelNum) {
  let score = 0; 
  let lives = MAX_LIVES;
  let isPaused = false; 
  
  add([sprite("background"), pos(0, 0), scale(width() / 700, height() / 300), z(-1)]);

  const basket = add([sprite("basket"), scale(0.5), pos(width() / 2, height() - 40), anchor("center"), area({ scale: 0.5 }), "basket"]);
  const scoreLabel = add([text(`Level Score: 0 / ${targetScore}`, { size: 24 }), pos(20, 20)]);

  function updateHearts() {
    destroyAll("heart_icon");
    for (let i = 0; i < lives; i++) {
        add([sprite("heart"), scale(0.08), pos(width() - 220 + i * 60, 35), anchor("center"), "heart_icon"]);
    }
  }
  updateHearts();

  onUpdate(() => {
    if (isPaused) return;
    const SPEED = 800;
    if (isKeyDown("left")) basket.pos.x -= SPEED * dt();
    if (isKeyDown("right")) basket.pos.x += SPEED * dt();
    basket.pos.x = clamp(basket.pos.x, 100, width() - 100);
    if (score > highestScore) highestScore = score;
  });

  const spawnTimer = loop(spawnRate, () => {
    if (isPaused) return; 
    const r = rand(0, 1);
    let sName = choose(FRUITS);
    let type = "fruit";
    if (r < 0.15) { type = "rock"; sName = "rock"; } 
    else if (r < 0.30) { type = "ice"; sName = "ice"; }

    const item = add([
      sprite(sName), scale(0.12), pos(rand(100, width() - 100), -50), 
      area({ scale: 0.5 }), anchor("center"), move(DOWN, fallSpeed), type,
      "falling_item"
    ]);

    item.onUpdate(() => {
      if (isPaused) return; 
      if (item.pos.y > height() + 50) {
        if (item.is("fruit")) { lives--; updateHearts(); }
        destroy(item);
        if (lives <= 0) go("gameover", { score });
      }
    });

    item.onCollide("basket", () => {
      if (isPaused) return;
      if (item.is("fruit")) { score++; play("fruit"); } 
      else { lives--; updateHearts(); }
      destroy(item);
      scoreLabel.text = `Level Score: ${score} / ${targetScore}`;
      if (lives <= 0) go("gameover", { score });
      if (score >= targetScore) go("win", { score, nextLevel: nextLevelName, levelNum });
    });
  });

  wait(15, () => {
    loop(20, () => {
      if (isPaused) return;
      isPaused = true; 
      spawnTimer.paused = true; 
      get("falling_item").forEach((item) => {
        item.paused = true; 
      });

      startMathQuiz(levelNum, (correct) => {
        if (correct) { 
          score += 10; 
          totalCoinsCollected += 1;
          scoreLabel.text = `Level Score: ${score} / ${targetScore}`; 
        } else { lives--; updateHearts(); }
        
        isPaused = false; 
        spawnTimer.paused = false; 
        get("falling_item").forEach((item) => {
          item.paused = false; 
        });

        if (lives <= 0) go("gameover", { score });
        if (score >= targetScore) go("win", { score, nextLevel: nextLevelName, levelNum });
      });
    });
  });
}

// ========================
// UPDATED SCENES
// ========================

scene("menu", () => {
  if (!musicHandle) musicHandle = play("music", { loop: true, volume: 0.5 });
  const emojiList = ["🍎", "🍌", "🍓", "🍉", "🍍", "🍐"];
  
  // Animated background emojis
  loop(0.8, () => {
    add([
      text(choose(emojiList), { size: 40 }),
      pos(rand(0, width()), -50),
      move(DOWN, rand(100, 200)),
      opacity(0.6),
      "menu-emoji"
    ]);
  });

  add([text("BASKET BUDDY", { size: 70 }), pos(width() / 2, 120), anchor("center")]);
  
  // NEW: Row of emojis below the title
  add([text("🍎 🍌 🍉 🍇 🍓 🍍", { size: 30 }), pos(width() / 2, 185), anchor("center")]);

  const btn = (txt, y, target) => {
      const b = add([rect(320, 60), pos(width() / 2, y), anchor("center"), area(), color(180, 230, 200)]);
      add([text(txt, { size: 28 }), pos(width() / 2, y), anchor("center")]);
      b.onClick(() => go(target)); 
  };

  btn("START GAME", 300, "difficulty_select"); 
  btn("HOW TO PLAY", 380, "rules");
  btn("CREDITS", 460, "credits");
});

scene("rules", () => {
  add([text("HOW TO PLAY", { size: 54 }), pos(width() / 2, 80), anchor("center")]);
  
  const rulesList = [
    "🎮 Use LEFT and RIGHT arrows to move your basket.",
    "🍎 Catch FRUIT to earn 1 point and stay alive.",
    "⚠️ Avoid ROCKS and ICE - they cost you 1 life!",
    "💡 Don't let fruit fall! Every missed fruit costs 1 life.",
    "🧠 Solve MATH QUIZZES to earn a massive +10 points!",
    "🏆 Reach the Target Score to unlock the next level."
  ];

  rulesList.forEach((line, i) => {
    add([
      text(line, { size: 22 }), 
      pos(width() / 2, 200 + (i * 55)), 
      anchor("center")
    ]);
  });

  const backBtn = add([rect(200, 50), pos(width() / 2, 600), anchor("center"), area(), color(150, 150, 150)]);
  add([text("BACK", { size: 24 }), pos(width() / 2, 600), anchor("center")]);
  backBtn.onClick(() => go("menu"));
});

scene("credits", () => {
  add([text("CREDITS", { size: 54 }), pos(width() / 2, 80), anchor("center")]);
  
  add([text("🌟 CREATED BY 🌟", { size: 30 }), pos(width() / 2, 200), anchor("center")]);
  add([text("[ISMAIL IBRAHIM", { size: 40, color: rgb(255, 255, 255) }), pos(width() / 2, 260), anchor("center")]);
  
  add([text("🛠️ TOOLS & ASSETS 🛠️", { size: 26 }), pos(width() / 2, 360), anchor("center")]);
  add([text("Engine: KAPLAY.js", { size: 20 }), pos(width() / 2, 410), anchor("center")]);
  add([text("Art: Custom Sprite Collection", { size: 20 }), pos(width() / 2, 450), anchor("center")]);
  add([text("Music & SFX: Retro Sound Pack", { size: 20 }), pos(width() / 2, 490), anchor("center")]);

  const backBtn = add([rect(200, 50), pos(width() / 2, 600), anchor("center"), area(), color(150, 150, 150)]);
  add([text("BACK", { size: 24 }), pos(width() / 2, 600), anchor("center")]);
  backBtn.onClick(() => go("menu"));
});

// Original logic for scenes that weren't changed
scene("difficulty_select", () => {
    add([text("SELECT LEVEL", { size: 48 }), pos(width() / 2, 80), anchor("center")]);
    const levels = [
        { name: "LEVEL 1", scene: "level1", id: 1 },
        { name: "LEVEL 2", scene: "level2", id: 2 },
        { name: "LEVEL 3", scene: "level3", id: 3 },
    ];
    levels.forEach((lvl, i) => {
        const isUnlocked = unlockedLevel >= lvl.id;
        const btnColor = isUnlocked ? rgb(180, 230, 200) : rgb(150, 150, 150);
        const btn = add([rect(300, 70), pos(width() / 2, 220 + i * 100), anchor("center"), area(), color(btnColor)]);
        add([text(isUnlocked ? lvl.name : "LOCKED 🔒", { size: 28 }), pos(width() / 2, 220 + i * 100), anchor("center")]);
        if (isUnlocked) btn.onClick(() => { totalCoinsCollected = 0; play("start"); go(lvl.scene); });
    });
    const back = add([rect(200, 50), pos(width() / 2, 580), anchor("center"), area(), color(150, 150, 150)]);
    add([text("BACK", { size: 24 }), pos(width() / 2, 580), anchor("center")]);
    back.onClick(() => go("menu"));
});

scene("win", ({ score, nextLevel, levelNum }) => {
  if (levelNum === 1) unlockedLevel = Math.max(unlockedLevel, 2);
  if (levelNum === 2) unlockedLevel = Math.max(unlockedLevel, 3);
  play("victory");
  add([text("LEVEL CLEARED! 🎉", { size: 48, color: rgb(0, 200, 0) }), pos(width() / 2, 80), anchor("center")]);
  add([text(`Current Score: ${score}`, { size: 32 }), pos(width() / 2, 180), anchor("center")]);
  add([text(`Highscore: ${highestScore}`, { size: 32, color: rgb(255, 215, 0) }), pos(width() / 2, 240), anchor("center")]);
  add([sprite("coin"), pos(width() / 2 - 60, 340), scale(0.15), anchor("center")]);
  add([text(`x ${totalCoinsCollected}`, { size: 40 }), pos(width() / 2 + 20, 340), anchor("center")]);
  const btn = add([rect(280, 60), pos(width() / 2, 480), anchor("center"), area(), color(100, 200, 100)]);
  add([text(nextLevel ? "NEXT LEVEL" : "MAIN MENU", { size: 24 }), pos(width() / 2, 480), anchor("center")]);
  btn.onClick(() => go(nextLevel ? "difficulty_select" : "menu"));
});

scene("gameover", ({ score }) => {
  add([text("GAME OVER 😵", { size: 64, color: rgb(255, 0, 0) }), pos(width() / 2, 80), anchor("center")]);
  add([text(`Current Score: ${score}`, { size: 32 }), pos(width() / 2, 180), anchor("center")]);
  add([text(`Highscore: ${highestScore}`, { size: 32, color: rgb(255, 215, 0) }), pos(width() / 2, 240), anchor("center")]);
  add([sprite("coin"), pos(width() / 2 - 60, 340), scale(0.15), anchor("center")]);
  add([text(`x ${totalCoinsCollected}`, { size: 40 }), pos(width() / 2 + 20, 340), anchor("center")]);
  const btn = add([rect(200, 50), pos(width() / 2, 480), anchor("center"), area(), color(200, 100, 100)]);
  add([text("RETRY", { size: 24 }), pos(width() / 2, 480), anchor("center")]);
  btn.onClick(() => go("difficulty_select"));
});

scene("level1", () => setupLevel(60, 180, 1.4, "level2", 1));
scene("level2", () => setupLevel(100, 280, 1.0, "level3", 2));
scene("level3", () => setupLevel(150, 420, 0.7, null, 3));

go("menu");
