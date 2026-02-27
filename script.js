window.onload = function() {
    initGame();
};
let playerHand = [];
let cpuHand = [];
let playerHP = 2;
let cpuHP = 2;
let isGameOver = false;
let isAnimating = false; // 防止連續點擊造成動畫錯亂

const joker = '🃏';

function initGame() {
    playerHP = 2;
    cpuHP = 2;
    isGameOver = false;
    isAnimating = false;
    
    // 1. 固定牌組分配 (A-K 各兩張 + 1鬼牌 = 27張)
    let baseCards = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    let fullDeck = [...baseCards, ...baseCards, joker];
    
    // 洗牌
    fullDeck.sort(() => Math.random() - 0.5);

    // 規定：玩家 13 張，電腦 14 張
    playerHand = fullDeck.slice(0, 13);
    cpuHand = fullDeck.slice(13);

    document.getElementById('msg-board').innerText = "遊戲開始！先打出你手上的對子，或直接開始抽牌。";
    render();
}

// 2. 玩家手動打出對子
async function playerDiscardAll() {
    if (isAnimating || isGameOver) return;
    isAnimating = true;

    let counts = {};
    playerHand.forEach(c => counts[c] = (counts[c] || 0) + 1);
    
    let pairs = [];
    for (let card in counts) {
        if (card !== joker && counts[card] >= 2) {
            pairs.push(card);
        }
    }

    if (pairs.length === 0) {
        document.getElementById('msg-board').innerText = "你手上沒有可以成對的牌。";
        isAnimating = false;
        return;
    }

    document.getElementById('msg-board').innerText = `打出對子：${pairs.join(', ')}`;
    
    // 動畫效果：移除對子
    pairs.forEach(cardValue => {
        // 從陣列中移除兩個該數值的牌
        for(let i=0; i<2; i++) {
            let idx = playerHand.indexOf(cardValue);
            playerHand.splice(idx, 1);
        }
    });

    await sleep(600); 
    render();
    isAnimating = false;
    checkGameStatus();
}

// 3. 抽牌動畫邏輯
async function playerDraw(index) {
    if (isAnimating || isGameOver) return;
    isAnimating = true;

    const card = cpuHand.splice(index, 1)[0];
    document.getElementById('msg-board').innerText = `抽牌中...`;

    // 模擬抽牌過程動畫
    await sleep(500);
    playerHand.push(card);
    
    if (card === joker) {
        playerHP--;
        document.getElementById('msg-board').innerText = `糟糕！抽到鬼牌 🃏！`;
    } else {
        document.getElementById('msg-board').innerText = `你抽到了 ${card}`;
    }

    render();
    await sleep(800);
    
    isAnimating = false;
    if (!checkGameStatus()) {
        setTimeout(cpuTurn, 500);
    }
}

async function cpuTurn() {
    if (isGameOver) return;
    isAnimating = true;

    // 電腦先嘗試打出對子 (展示動畫)
    let counts = {};
    cpuHand.forEach(c => counts[c] = (counts[c] || 0) + 1);
    let pairCard = Object.keys(counts).find(c => c !== joker && counts[c] >= 2);

    if (pairCard) {
        document.getElementById('msg-board').innerText = `電腦展示並打出一對：${pairCard}`;
        // 這裡可以增加展示電腦特定牌的邏輯
        for(let i=0; i<2; i++) {
            let idx = cpuHand.indexOf(pairCard);
            cpuHand.splice(idx, 1);
        }
        await sleep(1000);
        render();
    }

    // 電腦抽玩家的牌
    document.getElementById('msg-board').innerText = `電腦正在思考抽哪張...`;
    await sleep(1000);
    
    const randomIndex = Math.floor(Math.random() * playerHand.length);
    const card = playerHand.splice(randomIndex, 1)[0];
    cpuHand.push(card);

    if (card === joker) {
        cpuHP--;
        document.getElementById('msg-board').innerText = `哈哈！電腦抽到了鬼牌 🃏！`;
    } else {
        document.getElementById('msg-board').innerText = `電腦抽走了一張牌。`;
    }

    render();
    await sleep(800);
    isAnimating = false;
    checkGameStatus();
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// 其餘 render 和 checkGameStatus 保持類似，但需確保 render 不會自動刪牌
// ... (保留之前的 render 邏輯，但刪除 render 內部的自動 checkWin 以免干擾動畫)