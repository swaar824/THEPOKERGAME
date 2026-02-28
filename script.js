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

// 2. 核心渲染
function render() {
    document.getElementById('player-hp').innerText = "❤️".repeat(playerHP) || "💀";
    document.getElementById('cpu-hp').innerText = "❤️".repeat(cpuHP) || "💀";

    const cpuArea = document.getElementById('cpu-cards');
    cpuArea.innerHTML = '';
    cpuHand.forEach((_, i) => {
        const div = document.createElement('div');
        div.className = 'card back';
        if (!isAnimating && !isGameOver && !needsToDiscard) div.onclick = (e) => playerDraw(i, e.target);
        cpuArea.appendChild(div);
    });

    const playerArea = document.getElementById('player-cards');
    playerArea.innerHTML = '';
    playerHand.forEach(card => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerText = card;
        if (card === joker) div.style.color = 'red';
        playerArea.appendChild(div);
    });

    document.getElementById('cpu-count').innerText = cpuHand.length;
    document.getElementById('player-count').innerText = playerHand.length;
}

// 3. 抽牌移動動畫 (新增需求 5)
async function animateCardMove(fromEl, toAreaId, cardValue, isToPlayer) {
    const rect = fromEl.getBoundingClientRect();
    const targetArea = document.getElementById(toAreaId);
    const targetRect = targetArea.getBoundingClientRect();

    const flyCard = document.createElement('div');
    flyCard.className = 'card' + (isToPlayer ? '' : ' back');
    flyCard.style.position = 'fixed';
    flyCard.style.left = rect.left + 'px';
    flyCard.style.top = rect.top + 'px';
    flyCard.style.zIndex = '1000';
    if (isToPlayer) flyCard.innerText = cardValue;
    document.body.appendChild(flyCard);

    await sleep(50);
    flyCard.style.transition = 'all 0.6s cubic-bezier(0.5, 0, 0.5, 1)';
    flyCard.style.left = (targetRect.left + targetRect.width / 2) + 'px';
    flyCard.style.top = (targetRect.top + targetRect.height / 2) + 'px';
    
    await sleep(600);
    flyCard.remove();
}

// 4. 展示與棄牌動畫 (新增需求 1, 2, 3, 4)
async function executeFancyDiscard(cardValue, isCPU = false) {
    const tempPair = [];
    const discardPile = document.getElementById('discard-pile');
    const pileRect = discardPile.getBoundingClientRect();
    
    // 計算展示位置 (需求 3 & 4)
    let targetTop;
    if (isCPU) {
        const cpuArea = document.getElementById('cpu-cards');
        targetTop = cpuArea.getBoundingClientRect().top + 50; // 覆蓋在電腦手牌
    } else {
        const msgBoard = document.getElementById('msg-board');
        targetTop = msgBoard.getBoundingClientRect().bottom + 50; // 提示文字下方
    }

    for(let i = 0; i < 2; i++) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card spotlight' + (isCPU ? ' back' : '');
        if(!isCPU) cardEl.innerText = cardValue;
        cardEl.style.position = 'fixed';
        cardEl.style.left = '50%';
        cardEl.style.top = targetTop + 'px';
        cardEl.style.zIndex = '1000';
        cardEl.style.transform = `translate(-50%, -50%) translateX(${(i - 0.5) * 110}px) scale(1.2)`;
        document.body.appendChild(cardEl);
        tempPair.push(cardEl);
    }

    await sleep(800);
    if(isCPU) {
        tempPair.forEach(el => { el.classList.remove('back'); el.innerText = cardValue; });
        await sleep(800);
    }

    // 展示後移動至棄牌區並變回牌背 (需求 2)
    for (let el of tempPair) {
        el.classList.add('dissolve'); // 震動發光效果
        await sleep(100);
        el.style.transition = 'all 0.5s ease-in';
        el.style.left = pileRect.left + 'px';
        el.style.top = pileRect.top + 'px';
        el.style.transform = 'translate(0, 0) scale(1) rotate(0deg)';
        el.classList.add('back');
        el.innerText = '';
    }
    
    await sleep(500);
    tempPair.forEach(el => el.remove());
}

// 5. 玩家行動
async function playerDraw(index, targetEl) {
    if (isAnimating || isGameOver || needsToDiscard) return;
    isAnimating = true;

    const card = cpuHand.splice(index, 1)[0];
    await animateCardMove(targetEl, 'player-cards', card, true);
    playerHand.push(card);
    
    if (card === joker) {
        playerHP--;
        triggerHeartAnim('player-hp');
        // 需求 6: 抽取時觸發一次特效
        targetEl.classList.add('joker-anim'); 
        document.getElementById('msg-board').innerText = `😱 抽到鬼牌！失去生命！`;
        await sleep(1000);
    } else {
        document.getElementById('msg-board').innerText = `抽到了 ${card}，請打出對子。`;
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
            await executeFancyDiscard(p, false);
            for(let i = 0; i < 2; i++) playerHand.splice(playerHand.indexOf(p), 1);
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

// 6. 電腦行動
async function cpuTurn() {
    if (isGameOver) return;
    isAnimating = true;

    let counts = {};
    cpuHand.forEach(c => counts[c] = (counts[c] || 0) + 1);
    let pair = Object.keys(counts).find(v => v !== joker && counts[v] >= 2);
    
    if(pair) {
        await executeFancyDiscard(pair, true);
        for(let i = 0; i < 2; i++) cpuHand.splice(cpuHand.indexOf(pair), 1);
        render();
    }

    if (checkGameStatus()) { isAnimating = false; return; }

    document.getElementById('msg-board').innerText = `電腦正在抽你的牌...`;
    await sleep(800);
    
    if (playerHand.length > 0) {
        const idx = Math.floor(Math.random() * playerHand.length);
        const card = playerHand.splice(idx, 1)[0];
        const playerCardEls = document.querySelectorAll('#player-cards .card');
        await animateCardMove(playerCardEls[idx], 'cpu-cards', card, false);
        cpuHand.push(card);
        
        if (card === joker) {
            cpuHP--;
            triggerHeartAnim('cpu-hp');
        }
    }

    isAnimating = false;
    if (!checkGameStatus()) document.getElementById('msg-board').innerText = "輪到你了，請抽牌。";
    render();
}

// 7. 輔助系統
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
        setTimeout(() => alert(msg), 800);
        return true;
    }
    return false;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
initGame();