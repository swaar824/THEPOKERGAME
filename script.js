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
    
    // 建立固定牌組：A-K各兩張 + 1張鬼牌 (共27張)
    let baseCards = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    let fullDeck = [...baseCards, ...baseCards, joker];
    
    // 洗牌
    fullDeck.sort(() => Math.random() - 0.5);

    // 固定分配：玩家13張，電腦14張
    playerHand = fullDeck.slice(0, 13);
    cpuHand = fullDeck.slice(13);

    document.getElementById('msg-board').innerText = "遊戲開始！請先打出對子，或開始抽牌。";
    render();
}

// 2. 核心 Render 函式 (繪製畫面)
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
        // 非動畫中且遊戲未結束才可點擊
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

// 3. 玩家手動打出對子 (附帶動畫感)
async function playerDiscardAll() {
    if (isAnimating || isGameOver) return;
    isAnimating = true;

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
        isAnimating = false;
        return;
    }

    document.getElementById('msg-board').innerText = `你打出了對子：${pairs.join(', ')}`;
    
    // 執行刪除邏輯
    pairs.forEach(val => {
        for(let i=0; i<2; i++) {
            let idx = playerHand.indexOf(val);
            if(idx > -1) playerHand.splice(idx, 1);
        }
    });

    await sleep(800); 
    render();
    isAnimating = false;
    checkGameStatus();
}

// 4. 玩家抽牌邏輯
async function playerDraw(index) {
    if (isAnimating || isGameOver) return;
    isAnimating = true;

    const card = cpuHand.splice(index, 1)[0];
    document.getElementById('msg-board').innerText = `正在從電腦那裡抽取...`;
    
    await sleep(600);
    playerHand.push(card);
    
    if (card === joker) {
        playerHP--;
        document.getElementById('msg-board').innerText = `😱 抽到鬼牌！扣除 1 點生命！`;
    } else {
        document.getElementById('msg-board').innerText = `你抽到了：${card}`;
    }

    render();
    await sleep(1000);
    
    isAnimating = false;
    if (!checkGameStatus()) {
        cpuTurn(); // 輪到電腦
    }
}

// 5. 電腦回合邏輯
async function cpuTurn() {
    if (isGameOver) return;
    isAnimating = true;

    // A. 電腦先檢查是否有對子可以打出
    let counts = {};
    cpuHand.forEach(c => counts[c] = (counts[c] || 0) + 1);
    let pairCard = Object.keys(counts).find(c => c !== joker && counts[c] >= 2);

    if (pairCard) {