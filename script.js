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

// 1. 初始化遊戲
function initGame() {
    playerHP = 2;
    cpuHP = 2;
    isGameOver = false;
    isAnimating = false;
    needsToDiscard = false;
    
    const baseCards = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    let fullDeck = [...baseCards, ...baseCards, joker];
    
    // 洗牌
    fullDeck.sort(() => Math.random() - 0.5);

    // 固定分配：玩家 13 張，電腦 14 張 (總共 27 張)
    playerHand = fullDeck.slice(0, 13);
    cpuHand = fullDeck.slice(13);

    document.getElementById('msg-board').innerText = "遊戲開始！請先打出對子，或直接開始抽牌。";
    render();
}

// 2. 核心繪製函式
function render() {
    // 更新生命值顯示
    const pHPDisp = document.getElementById('player-hp');
    const cHPDisp = document.getElementById('cpu-hp');
    pHPDisp.innerHTML = "❤️".repeat(playerHP) || "💀";
    cHPDisp.innerHTML = "❤️".repeat(cpuHP) || "💀";

    // 渲染電腦手牌 (背面)
    const cpuArea = document.getElementById('cpu-cards');
    cpuArea.innerHTML = '';
    cpuHand.forEach((_, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card back';
        // 只有在非動畫、非遊戲結束、且不處於待消牌狀態時才可點擊
        if (!isAnimating && !isGameOver && !needsToDiscard) {
            cardDiv.onclick = () => playerDraw(index);
        }
        cpuArea.appendChild(cardDiv);
    });

    // 渲染玩家手牌 (正面)
    const playerArea = document.getElementById('player-cards');
    playerArea.innerHTML = '';
    playerHand.forEach(card => {
        const cardDiv = document.createElement('div');
        // 抽到鬼牌且待消牌時增加震動動畫
        cardDiv.className = 'card' + (card === joker && needsToDiscard ? ' joker-anim' : '');
        cardDiv.innerText = card;
        if (card === joker) cardDiv.style.color = 'red';
        playerArea.appendChild(cardDiv);
    });

    document.getElementById('cpu-count').innerText = cpuHand.length;
    document.getElementById('player-count').innerText = playerHand.length;
}

// 3. 鳴潮風格：出牌特效邏輯
async function executeFancyDiscard(cardValue, isCPU = false) {
    const tempPair = [];
    const msg = isCPU ? `電腦打出對子：${cardValue}` : `你打出對子：${cardValue}`;
    document.getElementById('msg-board').innerText = msg;
    
    // 建立兩張展示牌
    for(let i = 0; i < 2; i++) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card spotlight' + (isCPU ? ' back' : '');
        if(!isCPU) cardEl.innerText = cardValue;
        
        // 初始位置在螢幕中央並排
        cardEl.style.position = 'fixed';
        cardEl.style.left = '50%';
        cardEl.style.top = '50%';
        cardEl.style.zIndex = '1000';
        cardEl.style.transform = `translate(-50%, -50%) translateX(${(i - 0.5) * 120}px) scale(1.2)`;
        
        document.body.appendChild(cardEl);
        tempPair.push(cardEl);
    }

    await sleep(600);

    // 如果是電腦出牌，翻轉展示正面
    if(isCPU) {
        tempPair.forEach(el => {
            el.classList.remove('back');
            el.innerText = cardValue;
        });
        await sleep(600);
    }

    // 觸發震動溶解動畫
    tempPair.forEach(el => el.classList.add('dissolve'));
    await sleep(700);

    // 移除暫存元素
    tempPair.forEach(el => el.remove());
}

// 4. 玩家行動：打出對子
async function playerDiscardAll() {
    if (isAnimating || isGameOver) return;
    
    let counts = {};
    playerHand.forEach(c => counts[c] = (counts[c] || 0) + 1);
    let pairs = Object.keys(counts).filter(v => v !== joker && counts[v] >= 2);

    if (pairs.length > 0) {
        isAnimating = true;
        for (let p of pairs) {
            await executeFancyDiscard(p, false);
            // 實際從陣列移除兩張
            for(let i = 0; i < 2; i++) {
                let idx = playerHand.indexOf(p);
                if(idx > -1) playerHand.splice(idx, 1);
            }
            render();
        }
        isAnimating = false;
    }

    // 檢查是否是由抽牌觸發的回合結束
    if (needsToDiscard) {
        needsToDiscard = false;
        if (!checkGameStatus()) {
            await cpuTurn();
        }
    } else {
        checkGameStatus();
    }
    render();
}

// 5. 玩家行動：抽牌
async function playerDraw(index) {
    if (isAnimating || isGameOver || needsToDiscard) return;
    isAnimating = true;

    try {
        const card = cpuHand.splice(index, 1)[0];
        document.getElementById('msg-board').innerText = `抽取中...`;
        await sleep(600);
        playerHand.push(card);
        
        if (card === joker) {
            playerHP--;
            triggerHeartAnim('player-hp');
            document.getElementById('msg-board').innerText = `😱 抽到鬼牌！失去生命！請點擊消牌。`;
        } else {
            document.getElementById('msg-board').innerText = `你抽到了 ${card}。請打出對子以結束回合。`;
        }
        
        needsToDiscard = true; 
    } finally {
        isAnimating = false;
        render();
        checkGameStatus();
    }
}

// 6. 電腦行動
async function cpuTurn() {
    if (isGameOver) return;
    isAnimating = true;

    try {
        // 電腦檢查並消牌
        let counts = {};
        cpuHand.forEach(c => counts[c] = (counts[c] || 0) + 1);
        let pair = Object.keys(counts).find(v => v !== joker && counts[v] >= 2);
        
        if(pair) {
            await executeFancyDiscard(pair, true);
            for(let i = 0; i < 2; i++) {
                let idx = cpuHand.indexOf(pair);
                if(idx > -1) cpuHand.splice(idx, 1);
            }
            render();
        }

        if (checkGameStatus()) return;

        // 電腦抽牌
        document.getElementById('msg-board').innerText = `電腦正在抽你的牌...`;
        await sleep(1000);
        
        if (playerHand.length > 0) {
            const idx = Math.floor(Math.random() * playerHand.length);
            const card = playerHand.splice(idx, 1)[0];
            cpuHand.push(card);
            
            if (card === joker) {
                cpuHP--;
                triggerHeartAnim('cpu-hp');
                document.getElementById('msg-board').innerText = `😏 電腦抽到了鬼牌！`;
            } else {
                document.getElementById('msg-board').innerText = `電腦抽走了一張牌。`;
            }
        }
        
        await sleep(1000);
    } finally {
        isAnimating = false;
        if (!checkGameStatus()) {
            document.getElementById('msg-board').innerText = "輪到你了，請抽牌。";
        }
        render();
    }
}

// 7. 系統功能：勝負、動畫輔助
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
        // 延遲彈窗，讓最後的溶解動畫播完
        setTimeout(() => alert(msg), 800);
        return true;
    }
    return false;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// 啟動
initGame();