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

const joker = '🃏';

// 1. 初始化
function initGame() {
    playerHP = 2; cpuHP = 2;
    isGameOver = false; isAnimating = false; needsToDiscard = false;
    const baseCards = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    let fullDeck = [...baseCards, ...baseCards, joker];
    fullDeck.sort(() => Math.random() - 0.5);
    playerHand = fullDeck.slice(0, 13);
    cpuHand = fullDeck.slice(13);
    document.getElementById('msg-board').innerText = "遊戲開始！請先打出對子，或開始抽牌。";
    render();
}

// 2. 核心繪製
function render() {
    const pHPDisp = document.getElementById('player-hp');
    const cHPDisp = document.getElementById('cpu-hp');
    pHPDisp.innerHTML = "❤️".repeat(playerHP) || "💀";
    cHPDisp.innerHTML = "❤️".repeat(cpuHP) || "💀";

    const cpuArea = document.getElementById('cpu-cards');
    cpuArea.innerHTML = '';
    cpuHand.forEach((_, i) => {
        const div = document.createElement('div');
        div.className = 'card back';
        if (!isAnimating && !isGameOver && !needsToDiscard) div.onclick = () => playerDraw(i);
        cpuArea.appendChild(div);
    });

    const playerArea = document.getElementById('player-cards');
    playerArea.innerHTML = '';
    playerHand.forEach(card => {
        const div = document.createElement('div');
        div.className = 'card' + (card === joker && needsToDiscard ? ' joker-anim' : '');
        div.innerText = card;
        if (card === joker) div.style.color = 'red';
        playerArea.appendChild(div);
    });

    document.getElementById('cpu-count').innerText = cpuHand.length;
    document.getElementById('player-count').innerText = playerHand.length;
}

// 3. 棄牌動畫 (修正版)
async function animateDiscard(cardValue, fromElement, isCPU = false) {
    const discardTarget = document.getElementById('discard-pile');
    const targetRect = discardTarget.getBoundingClientRect();
    const startRect = fromElement.getBoundingClientRect();

    for(let i=0; i<2; i++) {
        const flyCard = document.createElement('div');
        flyCard.className = 'card flying-card' + (isCPU ? ' back' : '');
        flyCard.style.left = startRect.left + 'px';
        flyCard.style.top = startRect.top + 'px';
        if(!isCPU) flyCard.innerText = cardValue;
        document.body.appendChild(flyCard);

        await sleep(100);
        if(isCPU) {
            flyCard.classList.remove('back');
            flyCard.innerText = cardValue; // 展示正面
            await sleep(500);
            flyCard.classList.add('back'); // 翻轉回背面
            flyCard.innerText = '';
        } else {
            await sleep(300);
            flyCard.classList.add('back'); // 玩家牌翻轉
            flyCard.innerText = '';
        }

        flyCard.style.left = targetRect.left + 'px';
        flyCard.style.top = targetRect.top + 'px';
        flyCard.style.transform = 'scale(0.5) rotate(360deg)';
        flyCard.style.opacity = '0';
        
        setTimeout(() => flyCard.remove(), 800);
    }
    await sleep(400); // 等待動畫完成感
}

// 4. 玩家行動
async function playerDraw(index) {
    if (isAnimating || isGameOver || needsToDiscard) return;
    isAnimating = true;

    const card = cpuHand.splice(index, 1)[0];
    document.getElementById('msg-board').innerText = `正在抽取電腦的牌...`;
    await sleep(600);
    playerHand.push(card);
    
    if (card === joker) {
        playerHP--;
        triggerHeartAnim('player-hp');
        document.getElementById('msg-board').innerText = `😱 抽到鬼牌！失去 1 點生命！請點擊消牌。`;
    } else {
        document.getElementById('msg-board').innerText = `你抽到了 ${card}，請打出對子結束回合。`;
    }
    
    needsToDiscard = true;
    isAnimating = false;
    render();
    checkGameStatus();
}

async function playerDiscardAll() {
    if (isAnimating || isGameOver) return;
    
    let counts = {};
    playerHand.forEach(c => counts[c] = (counts[c] || 0) + 1);
    let pairs = Object.keys(counts).filter(v => v !== joker && counts[v] >= 2);

    if (pairs.length > 0) {
        isAnimating = true;
        for (let p of pairs) {
            const idx = playerHand.indexOf(p);
            const cardEl = document.querySelectorAll('#player-cards .card')[idx];
            if(cardEl) await animateDiscard(p, cardEl, false);
            
            // 實際移除
            for(let i=0; i<2; i++) playerHand.splice(playerHand.indexOf(p), 1);
            render();
        }
        isAnimating = false;
    }

    if (needsToDiscard) {
        needsToDiscard = false;
        if (!checkGameStatus()) await cpuTurn();
    } else {
        checkGameStatus();
    }
    render();
}

// 5. 電腦行動
async function cpuTurn() {
    if (isGameOver) return;
    isAnimating = true;

    // 電腦消牌
    let counts = {};
    cpuHand.forEach(c => counts[c] = (counts[c] || 0) + 1);
    let pair = Object.keys(counts).find(v => v !== joker && counts[v] >= 2);
    
    if(pair) {
        document.getElementById('msg-board').innerText = `電腦正在打出對子...`;
        const cpuEl = document.querySelector('#cpu-cards .card');
        if(cpuEl) await animateDiscard(pair, cpuEl, true);
        for(let i=0; i<2; i++) cpuHand.splice(cpuHand.indexOf(pair), 1);
        render();
    }

    if (checkGameStatus()) { isAnimating = false; return; }

    // 電腦抽牌
    document.getElementById('msg-board').innerText = `電腦正在抽你的牌...`;
    await sleep(1000);
    if(playerHand.length > 0) {
        const idx = Math.floor(Math.random() * playerHand.length);
        const card = playerHand.splice(idx, 1)[0];
        cpuHand.push(card);
        if(card === joker) {
            cpuHP--;
            triggerHeartAnim('cpu-hp');
            document.getElementById('msg-board').innerText = `哈哈！電腦抽到鬼牌了！`;
        }
    }

    isAnimating = false;
    if (!checkGameStatus()) {
        document.getElementById('msg-board').innerText = "輪到你了，請抽牌。";
    }
    render();
}

// 6. 輔助系統
function triggerHeartAnim(id) {
    const el = document.getElementById(id);
    el.classList.add('heart-damage');
    setTimeout(() => el.classList.remove('heart-damage'), 1500);
}

function checkGameStatus() {
    let msg = "";
    if (playerHP <= 0) msg = "💀 玩家生命歸零，電腦獲勝！";
    else if (cpuHP <= 0) msg = "🎉 電腦生命歸零，玩家獲勝！";
    else if (playerHand.length === 0) msg = "🏆 你清空了手牌，恭喜獲勝！";
    else if (cpuHand.length === 0) msg = "❌ 電腦清空了手牌，你輸了。";

    if (msg) {
        isGameOver = true;
        document.getElementById('msg-board').innerText = msg;
        setTimeout(() => alert(msg), 500);
        return true;
    }
    return false;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

initGame();