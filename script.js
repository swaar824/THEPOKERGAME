window.onload = function() {
    initGame();
};
let playerHand = [];
let cpuHand = [];
let playerHP = 2;
let cpuHP = 2;
let isGameOver = false;
let isAnimating = false;

const joker = '🃏';

// 1. 初始化遊戲
function initGame() {
    playerHP = 2;
    cpuHP = 2;
    isGameOver = false;
    isAnimating = false;
    
    // 建立固定牌組：A-K 各兩張 + 1張鬼牌 (共 27 張)
    const baseCards = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    let fullDeck = [...baseCards, ...baseCards, joker];
    
    // 洗牌
    fullDeck.sort(() => Math.random() - 0.5);

    // 固定分配：玩家 13 張，電腦 14 張
    playerHand = fullDeck.slice(0, 13);
    cpuHand = fullDeck.slice(13);

    document.getElementById('msg-board').innerText = "遊戲開始！請先打出對子，或開始抽牌。";
    render();
}

// 2. 核心繪製函式
function render() {
    const cpuArea = document.getElementById('cpu-cards');
    const playerArea = document.getElementById('player-cards');
    
    // 更新生命值顯示
    document.getElementById('player-hp').innerText = "❤️".repeat(playerHP) || "💀";
    document.getElementById('cpu-hp').innerText = "❤️".repeat(cpuHP) || "💀";

    // 渲染電腦手牌 (背面)
    cpuArea.innerHTML = '';
    cpuHand.forEach((_, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        // 只有在非動畫中、遊戲未結束、且玩家有手牌時才可點擊
        if (!isAnimating && !isGameOver) {
            cardDiv.onclick = () => playerDraw(index);
        }
        cpuArea.appendChild(cardDiv);
    });

    // 渲染玩家手牌 (正面)
    playerArea.innerHTML = '';
    playerHand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.innerText = card;
        if (card === joker) cardDiv.style.color = 'red';
        playerArea.appendChild(cardDiv);
    });

    document.getElementById('cpu-count').innerText = cpuHand.length;
    document.getElementById('player-count').innerText = playerHand.length;
}

// 3. 玩家手動打出對子
async function playerDiscardAll() {
    if (isAnimating || isGameOver) return;
    isAnimating = true;

    try {
        let counts = {};
        playerHand.forEach(c => counts[c] = (counts[c] || 0) + 1);
        
        let pairs = [];
        for (let val in counts) {
            if (val !== joker && counts[val] >= 2) {
                pairs.push(val);
            }
        }

        if (pairs.length === 0) {
            document.getElementById('msg-board').innerText = "你手上沒有對子可以打出。";
            return;
        }

        document.getElementById('msg-board').innerText = `你打出了對子：${pairs.join(', ')}`;
        
        // 移除邏輯
        pairs.forEach(val => {
            for(let i=0; i<2; i++) {
                let idx = playerHand.indexOf(val);
                if(idx > -1) playerHand.splice(idx, 1);
            }
        });

        await sleep(800); 
    } finally {
        isAnimating = false;
        render();
        checkGameStatus();
    }
}

// 4. 玩家抽牌邏輯 (包含觸發電腦回合)
async function playerDraw(index) {
    if (isAnimating || isGameOver) return;
    isAnimating = true;

    try {
        const card = cpuHand.splice(index, 1)[0];
        document.getElementById('msg-board').innerText = `正在抽取...`;
        
        await sleep(600);
        playerHand.push(card);
        
        if (card === joker) {
            playerHP--;
            document.getElementById('msg-board').innerText = `😱 抽到鬼牌！玩家失去 1 點生命！`;
        } else {
            document.getElementById('msg-board').innerText = `你抽到了：${card}`;
        }

        render();
        await sleep(1000);
        
        if (!checkGameStatus()) {
            await cpuTurn(); // 等待電腦演完
        }
    } catch (e) {
        console.error("發生錯誤:", e);
    } finally {
        isAnimating = false;
        if (!isGameOver) {
            document.getElementById('msg-board').innerText = "輪到你了，請抽牌。";
        }
        render();
    }
}

// 5. 電腦回合邏輯
async function cpuTurn() {
    if (isGameOver) return;

    // A. 電腦先檢查是否有對子可以打出
    let counts = {};
    cpuHand.forEach(c => counts[c] = (counts[c] || 0) + 1);
    let pairCard = Object.keys(counts).find(c => c !== joker && counts[c] >= 2);

    if (pairCard) {
        document.getElementById('msg-board').innerText = `電腦展示並打出一對：${pairCard}`;
        for(let i=0; i<2; i++) {
            let idx = cpuHand.indexOf(pairCard);
            cpuHand.splice(idx, 1);
        }
        await sleep(1200);
        render();
    }

    if (checkGameStatus()) return;

    // B. 電腦抽玩家的牌
    document.getElementById('msg-board').innerText = `電腦正在挑選你的牌...`;
    await sleep(1000);
    
    if (playerHand.length > 0) {
        const randomIndex = Math.floor(Math.random() * playerHand.length);
        const card = playerHand.splice(randomIndex, 1)[0];
        cpuHand.push(card);

        if (card === joker) {
            cpuHP--;
            document.getElementById('msg-board').innerText = `嘿嘿！電腦抽到了鬼牌 🃏！`;
        } else {
            document.getElementById('msg-board').innerText = `電腦抽走了一張牌。`;
        }
    }

    render();
    await sleep(1000);
    checkGameStatus();
}

// 輔助函式
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function checkGameStatus() {
    if (playerHP <= 0) return endGame("💀 玩家生命歸零，電腦獲勝！");
    if (cpuHP <= 0) return endGame("🎉 電腦生命歸零，玩家獲勝！");
    if (playerHand.length === 0) return endGame("🏆 你清空了手牌，恭喜獲勝！");
    if (cpuHand.length === 0) return endGame("❌ 電腦清空了手牌，你輸了。");
    return false;
}

function endGame(msg) {
    isGameOver = true;
    document.getElementById('msg-board').innerText = msg;
    alert(msg);
    return true;
}

// 啟動遊戲
initGame();