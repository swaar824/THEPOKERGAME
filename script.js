window.onload = function() {
    initGame();
};
let playerHand = [];
let cpuHand = [];
let playerHP = 2;
let cpuHP = 2;
let isGameOver = false;
let isAnimating = false;
let needsToDiscard = false; // 新增狀態：標記玩家是否正處於「抽完牌待消牌」的階段

const joker = '🃏';

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

    document.getElementById('msg-board').innerText = "遊戲開始！請先打出對子，或直接開始抽牌。";
    render();
}

function render() {
    document.getElementById('player-hp').innerText = "❤️".repeat(playerHP) || "💀";
    document.getElementById('cpu-hp').innerText = "❤️".repeat(cpuHP) || "💀";

    const cpuArea = document.getElementById('cpu-cards');
    cpuArea.innerHTML = '';
    cpuHand.forEach((_, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        // 如果玩家還沒消對子，不能抽下一張
        if (!isAnimating && !isGameOver && !needsToDiscard) {
            cardDiv.onclick = () => playerDraw(index);
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

// 玩家抽牌
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
            document.getElementById('msg-board').innerText = `😱 抽到鬼牌！扣 1 點生命！`;
        } else {
            document.getElementById('msg-board').innerText = `你抽到了：${card}。請打出對子以結束回合。`;
        }
        
        render();
        await sleep(500);
        
        // 抽完牌後，進入「必須消牌」狀態
        needsToDiscard = true; 
        
    } finally {
        isAnimating = false;
        checkGameStatus();
    }
}

// 玩家打出對子並結束回合
async function playerDiscardAll() {
    if (isAnimating || isGameOver) return;
    
    // 檢查手上有無對子
    let counts = {};
    playerHand.forEach(c => counts[c] = (counts[c] || 0) + 1);
    let pairs = Object.keys(counts).filter(val => val !== joker && counts[val] >= 2);

    // 如果玩家正處於抽完牌階段，但手上有對子卻不打出
    if (needsToDiscard && pairs.length > 0) {
        executeDiscard(pairs);
    } else if (needsToDiscard && pairs.length === 0) {
        // 手上沒對子了，直接進入電腦回合
        needsToDiscard = false;
        await cpuTurn();
    } else if (!needsToDiscard && pairs.length > 0) {
        // 平時（非抽牌後）也可以主動點擊消牌
        executeDiscard(pairs);
    } else {
        document.getElementById('msg-board').innerText = "手邊沒有對子可以打出。";
    }
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
    render();
    
    // 如果是因為抽完牌而消牌，消完後進入電腦回合
    if (needsToDiscard) {
        needsToDiscard = false;
        if (!checkGameStatus()) {
            await cpuTurn();
        }
    }
    isAnimating = false;
}

async function cpuTurn() {
    if (isGameOver) return;
    isAnimating = true;

    // 電腦檢查對子
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

    render();
    await sleep(1000);
    isAnimating = false;
    if (!checkGameStatus()) {
        document.getElementById('msg-board').innerText = "輪到你了，請抽牌。";
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
    document.getElementById('msg-board').innerText = msg;
    alert(msg);
    return true;
}

initGame();