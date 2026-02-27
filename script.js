let playerHand = [];
let cpuHand = [];
let playerHP = 2;
let cpuHP = 2;
let isGameOver = false;

const joker = '🃏';

function initGame() {
    // 重置遊戲狀態
    playerHP = 2;
    cpuHP = 2;
    isGameOver = false;
    let deck = ['A', 'A', 'K', 'K', 'Q', 'Q', 'J', 'J', '10', '10', joker];
    deck.sort(() => Math.random() - 0.5);

    cpuHand = deck.slice(0, 5);
    playerHand = deck.slice(5);

    // 初始自動配對
    cpuHand = removePairs(cpuHand);
    playerHand = removePairs(playerHand);

    document.getElementById('msg-board').innerText = "遊戲開始！抽一張電腦的牌吧。";
    render();
}

function removePairs(hand) {
    let counts = {};
    hand.forEach(card => counts[card] = (counts[card] || 0) + 1);
    // 只保留單數張的牌，或是鬼牌
    return hand.filter(card => counts[card] % 2 !== 0 || card === joker);
}

function render() {
    const cpuArea = document.getElementById('cpu-cards');
    const playerArea = document.getElementById('player-cards');
    
    // 渲染生命值
    document.getElementById('player-hp').innerText = "❤️".repeat(playerHP) || "💀";
    document.getElementById('cpu-hp').innerText = "❤️".repeat(cpuHP) || "💀";

    // 渲染電腦牌
    cpuArea.innerHTML = '';
    cpuHand.forEach((_, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        if (!isGameOver) cardDiv.onclick = () => playerDraw(index);
        cpuArea.appendChild(cardDiv);
    });

    // 渲染玩家牌
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

function playerDraw(index) {
    if (isGameOver) return;

    const card = cpuHand.splice(index, 1)[0];
    playerHand.push(card);
    
    let msg = `你抽到了 ${card}！`;
    
    if (card === joker) {
        playerHP--;
        msg = `糟糕！你抽到了鬼牌 🃏，失去 1 點生命！`;
    }

    playerHand = removePairs(playerHand);
    document.getElementById('msg-board').innerText = msg;
    
    render();
    if (checkGameStatus()) return;

    // 電腦在 1 秒後抽牌
    setTimeout(cpuDraw, 1000);
}

function cpuDraw() {
    if (isGameOver) return;

    const randomIndex = Math.floor(Math.random() * playerHand.length);
    const card = playerHand.splice(randomIndex, 1)[0];
    cpuHand.push(card);

    let msg = `電腦抽走了你的一張牌...`;

    if (card === joker) {
        cpuHP--;
        msg = `哈哈！電腦抽到了鬼牌 🃏，它失去 1 點生命！`;
    }

    cpuHand = removePairs(cpuHand);
    document.getElementById('msg-board').innerText = msg;
    
    render();
    checkGameStatus();
}

function checkGameStatus() {
    if (playerHP <= 0) {
        endGame("💀 生命歸零！你輸了比賽。");
        return true;
    }
    if (cpuHP <= 0) {
        endGame("🎉 電腦生命歸零！你贏了！");
        return true;
    }
    if (playerHand.length === 0) {
        endGame("🏆 你把手牌清空了！獲勝！");
        return true;
    }
    if (cpuHand.length === 0) {
        endGame("❌ 電腦清空了手牌，你輸了。");
        return true;
    }
    return false;
}

function endGame(message) {
    isGameOver = true;
    document.getElementById('msg-board').innerText = message;
    alert(message);
}

// 啟動遊戲
initGame();