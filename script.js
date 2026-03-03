window.onload = function() {
    initGame();
};
let playerHand = [];
let cpuHand = [];
let playerHP = 2;
let cpuHP = 2;
let isGameOver = false;
let isAnimating = false;
let needsToDiscard = false;
let currentTheme = 'setA'; 

const joker = '🃏';

/**
 * 1. 遊戲初始化：拋硬幣決定先後手與牌組
 */
async function initGame() {
    playerHP = 2; cpuHP = 2;
    isGameOver = false; isAnimating = true; needsToDiscard = false;
    
    document.getElementById('msg-board').innerText = "正在決定先後手...";
    
    const isPlayerFirst = await tossCoin(); 
    currentTheme = isPlayerFirst ? 'setA' : 'setB'; // 根據先後手更換牌面
    
    const baseCards = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    let fullDeck = [...baseCards, ...baseCards, joker];
    fullDeck.sort(() => Math.random() - 0.5);
    
    playerHand = fullDeck.slice(0, 13);
    cpuHand = fullDeck.slice(13);

    isAnimating = false;
    render();
    
    if (!isPlayerFirst) {
        document.getElementById('msg-board').innerText = "電腦先手";
        await sleep(1500);
        await cpuTurn();
    } else {
        document.getElementById('msg-board').innerText = "我方先手，請開始抽牌";
    }
}

/**
 * 拋硬幣動畫
 */
function tossCoin() {
    return new Promise(resolve => {
        const overlay = document.getElementById('coin-overlay');
        const coin = document.getElementById('coin');
        const resultText = document.getElementById('coin-result-text');
        
        overlay.classList.remove('hidden');
        const result = Math.random() > 0.5; 
        
        coin.style.animation = result ? 'flip-heads 2s forwards' : 'flip-tails 2s forwards';
        
        setTimeout(() => {
            resultText.innerText = result ? "你先手" : "電腦先手";
            setTimeout(() => {
                overlay.classList.add('hidden');
                resolve(result);
            }, 1000);
        }, 2100);
    });
}

/**
 * 核心渲染：處理 UI 定位與手牌檢視邏輯
 */
function render() {
    // 5. 生命值定位與字體放大
    const pHP = document.getElementById('player-hp');
    const cHP = document.getElementById('cpu-hp');
    pHP.innerHTML = `玩家生命 <span style="font-size:2.5rem; color:white;">${"❤️".repeat(playerHP) || "💀"}</span>`;
    cHP.innerHTML = `電腦生命 <span style="font-size:2.5rem; color:white;">${"❤️".repeat(cpuHP) || "💀"}</span>`;

    // 6 & 9. 渲染電腦手牌 (保持牌背，僅檢視動畫)
    const cpuArea = document.getElementById('cpu-hand-area');
    cpuArea.innerHTML = '';
    cpuHand.forEach((card, i) => {
        const div = document.createElement('div');
        div.className = 'card back';
        // 1. 確保讀取正確牌背
        div.style.backgroundImage = `url('assets/${currentTheme}/card_back.png')`;
        // 9. 左疊右 z-index
        div.style.zIndex = cpuHand.length - i;

        if (!isAnimating && !isGameOver && !needsToDiscard) {
            div.onclick = (e) => playerDraw(i, e.target);
        }
        cpuArea.appendChild(div);
    });

    // 6 & 9. 渲染我方手牌 (懸停時動態顯示正面)
    const playerArea = document.getElementById('player-hand-area');
    playerArea.innerHTML = '';
    playerHand.forEach((card, i) => {
        const div = document.createElement('div');
        div.className = 'card';
        const imgPath = `assets/${currentTheme}/${card === joker ? 'joker.png' : card + '.png'}`;
        
        // 預設顯示正面圖
        div.style.backgroundImage = `url('${imgPath}')`;
        div.style.zIndex = playerHand.length - i;

        // 10. 檢視動畫：滑鼠移入時確保顯示正面圖 (需求修正)
        div.onmouseenter = () => {
            if (!isAnimating) div.style.backgroundImage = `url('${imgPath}')`;
        };
        
        playerArea.appendChild(div);
    });
}

/**
 * 展示並棄牌動畫
 */
async function executeFancyDiscard(cardValue, isCPU = false) {
    const tempPair = [];
    const discardPile = document.getElementById('discard-pile');
    const pileRect = discardPile.getBoundingClientRect();
    
    let targetTop = window.innerHeight / 2;
    if (isCPU) {
        targetTop = document.getElementById('cpu-hand-area').getBoundingClientRect().top + 80;
    } else {
        targetTop = document.getElementById('player-hand-area').getBoundingClientRect().top - 120;
    }

    for(let i = 0; i < 2; i++) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card spotlight';
        const imgName = cardValue === joker ? 'joker.png' : `${cardValue}.png`;
        cardEl.style.backgroundImage = `url('assets/${currentTheme}/${imgName}')`;
        cardEl.style.position = 'fixed';
        cardEl.style.left = '50%';
        cardEl.style.top = targetTop + 'px';
        cardEl.style.zIndex = '3000';
        cardEl.style.transform = `translate(-50%, -50%) translateX(${(i - 0.5) * 120}px) scale(1.4)`;
        document.body.appendChild(cardEl);
        tempPair.push(cardEl);
    }

    await sleep(1000); 

    for (let el of tempPair) {
        el.style.transition = 'all 0.7s cubic-bezier(0.5, 0, 0.5, 1)';
        el.style.left = (pileRect.left + pileRect.width/2) + 'px';
        el.style.top = (pileRect.top + pileRect.height/2) + 'px';
        el.style.transform = 'translate(-50%, -50%) scale(0.8)';
        
        setTimeout(() => {
            el.style.backgroundImage = `url('assets/${currentTheme}/card_back.png')`;
        }, 350);
    }
    
    await sleep(800);
    tempPair.forEach(el => el.remove());
}

/**
 * 抽牌邏輯
 */
async function playerDraw(index, targetEl) {
    if (isAnimating || isGameOver || needsToDiscard) return;
    isAnimating = true;

    const card = cpuHand.splice(index, 1)[0];
    
    const rect = targetEl.getBoundingClientRect();
    const flyCard = document.createElement('div');
    flyCard.className = 'card';
    flyCard.style.backgroundImage = `url('assets/${currentTheme}/${card === joker ? 'joker.png' : card + '.png'}')`;
    flyCard.style.position = 'fixed';
    flyCard.style.left = rect.left + 'px';
    flyCard.style.top = rect.top + 'px';
    flyCard.style.zIndex = '2500';
    document.body.appendChild(flyCard);

    await sleep(50);
    const targetRect = document.getElementById('player-hand-area').getBoundingClientRect();
    flyCard.style.transition = 'all 0.6s ease-out';
    flyCard.style.left = '50%';
    flyCard.style.top = targetRect.top + 'px';
    
    await sleep(600);
    flyCard.remove();

    playerHand.push(card);
    
    if (card === joker) {
        playerHP--;
        triggerHeartAnim('player-hp');
        document.getElementById('msg-board').innerText = "😱 抽到鬼牌！";
    }
    
    needsToDiscard = true;
    isAnimating = false;
    render();
    checkGameStatus();
}

/**
 * 玩家出牌
 */
async function playerDiscardAll() {
    if (isAnimating || isGameOver) return;
    
    let counts = {};
    playerHand.forEach(c => counts[c] = (counts[c] || 0) + 1);
    let pairs = Object.keys(counts).filter(v => v !== joker && counts[v] >= 2);

    if (pairs.length > 0) {
        isAnimating = true;
        for (let p of pairs) {
            await executeFancyDiscard(p, false);
            for(let i = 0; i < 2; i++) playerHand.splice(playerHand.indexOf(p), 1);
            render();
        }
        isAnimating = false;
    }

    if (needsToDiscard) {
        needsToDiscard = false;
        if (!checkGameStatus()) await cpuTurn();
    }
    render();
}

/**
 * 電腦回合
 */
async function cpuTurn() {
    if (isGameOver) return;
    isAnimating = true;
    document.getElementById('msg-board').innerText = "對手正在行動...";

    let counts = {};
    cpuHand.forEach(c => counts[c] = (counts[c] || 0) + 1);
    let pair = Object.keys(counts).find(v => v !== joker && counts[v] >= 2);
    
    if(pair) {
        await executeFancyDiscard(pair, true);
        for(let i = 0; i < 2; i++) cpuHand.splice(cpuHand.indexOf(pair), 1);
        render();
    }

    if (checkGameStatus()) return;

    await sleep(1000);
    if (playerHand.length > 0) {
        const idx = Math.floor(Math.random() * playerHand.length);
        const card = playerHand.splice(idx, 1)[0];
        cpuHand.push(card);
        if (card === joker) {
            cpuHP--;
            triggerHeartAnim('cpu-hp');
        }
    }

    isAnimating = false;
    if (!checkGameStatus()) document.getElementById('msg-board').innerText = "你的回合，請抽一張牌";
    render();
}

function triggerHeartAnim(id) {
    const el = document.getElementById(id);
    el.style.filter = "brightness(3)";
    setTimeout(() => el.style.filter = "none", 1000);
}

function checkGameStatus() {
    let msg = "";
    if (playerHP <= 0) msg = "☠️ 體力耗盡，你輸了！";
    else if (cpuHP <= 0) msg = "✨ 勝利！你擊敗了對手！";
    else if (playerHand.length === 0) msg = "🏆 你清空了手牌，獲得勝利！";
    else if (cpuHand.length === 0) msg = "❌ 對手清空了手牌，你輸了！";

    if (msg) {
        isGameOver = true;
        document.getElementById('msg-board').innerText = msg;
        setTimeout(() => alert(msg), 800);
        return true;
    }
    return false;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

initGame();