window.onload = function() {
    initGame();
};
let playerHand = [];
let cpuHand = [];
let playerHP = 2;
let cpuHP = 2;
let isGameOver = false;
let isAnimating = false;
let needsToDiscard = false; // 玩家抽完牌後必須消對子的狀態

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
    fullDeck.sort(() => Math.random() - 0.5);

    playerHand = fullDeck.slice(0, 13);
    cpuHand = fullDeck.slice(13);

    document.getElementById('msg-board').innerText = "遊戲開始！請先打出對子，或開始抽牌。";
    render();
}

// 2. 核心繪製
function render() {
    document.getElementById('player-hp').innerText = "❤️".repeat(playerHP) || "💀";
    document.getElementById('cpu-hp').innerText = "❤️".repeat(cpuHP) || "💀";

    const cpuArea = document.getElementById('cpu-cards');
    cpuArea.innerHTML = '';
    cpuHand.forEach((_, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        // 嚴格檢查：非動畫中、遊戲未結束、且非等待消牌狀態才可點擊
        if (!isAnimating && !isGameOver && !needsToDiscard) {
            cardDiv.onclick = () => playerDraw(index);
        } else {
            cardDiv.style.cursor = 'default';
        }
        cpuArea.appendChild(cardDiv);
    });

    const playerArea = document.getElementById('player-cards');
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

// 3. 玩家抽牌
async function playerDraw(index) {
    if (isAnimating || isGameOver || needsToDiscard) return;
    isAnimating = true;

    try {
        const card = cpuHand.splice(index, 1)[0];
        document.getElementById('msg-board').innerText = `正在抽取...`;
        await sleep(600);
        playerHand.push(card);
        
        if (card === joker) {
            playerHP--;
            document.getElementById('msg-board').innerText = `😱 抽到鬼牌！扣 1 點生命！請點擊打出對子。`;
        } else {
            document.getElementById('msg-board').innerText = `你抽到了：${card}。請點擊「打出全部對子」以結束回合。`;
        }
        
        needsToDiscard = true; // 鎖定抽牌，強制要求點擊消牌按鈕
    } catch (e) {
        console.error(e);
    } finally {
        isAnimating = false;
        render();
        checkGameStatus();
    }
}

// 4. 玩家消牌按鈕邏輯
async function playerDiscardAll() {
    if (isAnimating || isGameOver) return;
    
    let counts = {};
    playerHand.forEach(c => counts[c] = (counts[c] || 0) + 1);
    let pairs = Object.keys(counts).filter(val => val !== joker && counts[val] >= 2);

    if (pairs.length > 0) {
        // 執行消牌動畫流程
        await executeDiscard(pairs);
    } else {
        // 如果沒對子了
        if (needsToDiscard) {
            document.getElementById('msg-board').innerText = "手邊沒有對子，輪到電腦。";
            needsToDiscard = false; // 解除狀態
            await cpuTurn();
        } else {
            document.getElementById('msg-board').innerText = "手上目前沒有對子。";
        }
    }
    render();
}

async function executeDiscard(pairs) {
    isAnimating = true;
    document.getElementById('msg-board').innerText = `打出對子：${pairs.join(', ')}`;
    
    pairs.forEach(val => {
        for(let i=0; i<2; i++) {
            let idx = playerHand.indexOf(val);
            if(idx > -1) playerHand.splice(idx, 1);
        }
    });

    await sleep(800);
    
    // 如果是抽完牌後的消牌，消完即進入電腦回合
    if (needsToDiscard) {
        needsToDiscard = false;
        render();
        if (!checkGameStatus()) {
            await cpuTurn();
        }
    } else {
        render();
        checkGameStatus();
    }
    isAnimating = false;
}

// 5. 電腦回合
async function cpuTurn() {
    if (isGameOver) return;
    isAnimating = true;

    try {
        // 電腦檢查對子並打出
        let counts = {};
        cpuHand.forEach(c => counts[c] = (counts[c] || 0) + 1);
        let pairCard = Object.keys(counts).find(c => c !== joker && counts[c] >= 2);

        if (pairCard) {
            document.getElementById('msg-board').innerText = `電腦展示並打出一對：${pairCard}`;
            for(let i=0; i<2; i++) {
                let idx = cpuHand.indexOf(pairCard);
                cpuHand.splice(idx, 1);
            }
            await sleep(1000);
            render();
        }

        if (checkGameStatus()) return;

        // 電腦抽牌
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

        await sleep(1000);
    } finally {
        isAnimating = false;
        needsToDiscard = false; // 確保徹底解除鎖定
        if (!checkGameStatus()) {
            document.getElementById('msg-board').innerText = "輪到你了，請抽牌。";
        }
        render();
    }
}

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
    render();
    setTimeout(() => alert(msg), 100);
    return true;
}

initGame();