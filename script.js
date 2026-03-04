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
 * 1. 遊戲初始化
 */
async function initGame() {
    playerHP = 2; cpuHP = 2;
    isGameOver = false; isAnimating = true; needsToDiscard = false;
    
    // 重新開始後清空棄牌堆樣式
    const discardPile = document.getElementById('discard-pile');
    if (discardPile) {
        discardPile.style.backgroundImage = 'none';
        discardPile.style.border = '2px dashed rgba(255,255,255,0.3)';
    }

    document.getElementById('msg-board').innerText = "正在決定先後手...";
    
    const isPlayerFirst = await tossCoin(); 
    currentTheme = isPlayerFirst ? 'setA' : 'setB'; 
    
    const baseCards = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    let fullDeck = [...baseCards, ...baseCards, joker];
    fullDeck.sort(() => Math.random() - 0.5);
    
    playerHand = fullDeck.slice(0, 13);
    cpuHand = fullDeck.slice(13);

    isAnimating = false;
    render();
    
    if (!isPlayerFirst) {
        document.getElementById('msg-board').innerText = "電腦先手";
        await sleep(1000);
        await cpuTurn();
    } else {
        document.getElementById('msg-board').innerText = "我方先手，請抽牌";
    }
}

/**
 * 核心渲染：修正牌背渲染與位置偏移
 */
function render() {
    // 生命值：向上移動並放大
    const pHP = document.getElementById('player-hp');
    const cHP = document.getElementById('cpu-hp');
    pHP.innerHTML = `玩家生命 <span style="font-size:2.5rem; color:white;">${"❤️".repeat(playerHP) || "💀"}</span>`;
    cHP.innerHTML = `電腦生命 <span style="font-size:2.5rem; color:white;">${"❤️".repeat(cpuHP) || "💀"}</span>`;

    // 電腦手牌渲染修正：確保路徑加上引號並強制 cover
    const cpuArea = document.getElementById('cpu-hand-area');
    cpuArea.innerHTML = '';
    const cpuBackUrl = `assets/${currentTheme}/card_back.png`;
    
    cpuHand.forEach((card, i) => {
        const div = document.createElement('div');
        div.className = 'card back'; 
        // 修正點：使用 JS 直接注入 inline style 確保最高優先級
        div.style.backgroundImage = `url('${cpuBackUrl}')`; 
        div.style.backgroundSize = "cover";
        div.style.backgroundRepeat = "no-repeat";
        div.style.zIndex = cpuHand.length - i;
        
        if (!isAnimating && !isGameOver && !needsToDiscard) {
            div.onclick = (e) => playerDraw(i, e.target);
        }
        cpuArea.appendChild(div);
    });

    // 我方手牌渲染
    const playerArea = document.getElementById('player-hand-area');
    playerArea.innerHTML = '';
    playerHand.forEach((card, i) => {
        const div = document.createElement('div');
        div.className = 'card';
        const imgPath = `assets/${currentTheme}/${card === joker ? 'joker.png' : card + '.png'}`;
        div.style.backgroundImage = `url('${imgPath}')`;
        div.style.backgroundSize = "cover";
        div.style.zIndex = playerHand.length - i;
        
        // 懸停置頂與檢視動畫邏輯
        div.onmouseenter = () => { if (!isAnimating) div.style.zIndex = 500; };
        div.onmouseleave = () => { if (!isAnimating) div.style.zIndex = playerHand.length - i; };
        
        playerArea.appendChild(div);
    });
}

/**
 * 棄牌動畫邏輯：展示 -> 翻面閃爍 -> 蓋至棄牌堆
 */
async function executeFancyDiscard(cardValue, isCPU = false) {
    const tempPair = [];
    const discardPile = document.getElementById('discard-pile');
    const pileRect = discardPile.getBoundingClientRect();
    const backUrl = `assets/${currentTheme}/card_back.png`;
    
    let targetTop = window.innerHeight / 2;
    if (isCPU) {
        targetTop = document.getElementById('cpu-hand-area').getBoundingClientRect().top + 100;
    } else {
        targetTop = document.getElementById('player-hand-area').getBoundingClientRect().top - 150;
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

    await sleep(800); 

    for (let el of tempPair) {
        el.style.filter = "brightness(2) contrast(1.5)"; 
        await sleep(100);
        el.style.filter = "none";
        el.style.backgroundImage = `url('${backUrl}')`; 
        
        el.style.transition = 'all 0.6s cubic-bezier(0.5, 0, 0.5, 1)';
        el.style.left = (pileRect.left + pileRect.width/2) + 'px';
        el.style.top = (pileRect.top + pileRect.height/2) + 'px';
        el.style.transform = 'translate(-50%, -50%) scale(1) rotate(' + (Math.random()*20-10) + 'deg)';
    }
    
    await sleep(650);
    discardPile.style.backgroundImage = `url('${backUrl}')`;
    discardPile.style.border = 'none';
    tempPair.forEach(el => el.remove());
}

/**
 * 電腦邏輯：可隨時打出所有對子
 */
async function cpuDiscardAll() {
    let hasPairs = true;
    while(hasPairs) {
        let counts = {};
        cpuHand.forEach(c => counts[c] = (counts[c] || 0) + 1);
        let pair = Object.keys(counts).find(v => v !== joker && counts[v] >= 2);
        
        if(pair) {
            await executeFancyDiscard(pair, true);
            for(let i = 0; i < 2; i++) {
                cpuHand.splice(cpuHand.indexOf(pair), 1);
            }
            render();
            await sleep(500);
        } else {
            hasPairs = false;
        }
    }
}

async function cpuTurn() {
    if (isGameOver) return;
    isAnimating = true;
    document.getElementById('msg-board').innerText = "對手正在檢查手牌...";

    await cpuDiscardAll();
    if (checkGameStatus()) return;

    await sleep(1000);
    if (playerHand.length > 0) {
        const idx = Math.floor(Math.random() * playerHand.length);
        const card = playerHand.splice(idx, 1)[0];
        cpuHand.push(card);
        document.getElementById('msg-board').innerText = "電腦抽走了一張牌";
        if (card === joker) {
            cpuHP--;
            triggerHeartAnim('cpu-hp');
        }
        render();
        await sleep(800);
        await cpuDiscardAll();
    }

    isAnimating = false;
    if (!checkGameStatus()) document.getElementById('msg-board').innerText = "你的回合，請抽一張牌";
    render();
}

/**
 * 玩家邏輯
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
    flyCard.style.top = (targetRect.top + 20) + 'px';
    
    await sleep(600);
    flyCard.remove();

    playerHand.push(card);
    if (card === joker) {
        playerHP--;
        triggerHeartAnim('player-hp');
        document.getElementById('msg-board').innerText = "😱 抽到了鬼牌！";
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
    }
    render();
}

/**
 * 系統輔助
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
            setTimeout(() => { overlay.classList.add('hidden'); resolve(result); }, 1000);
        }, 2100);
    });
}

function triggerHeartAnim(id) {
    const el = document.getElementById(id);
    el.style.filter = "brightness(3)";
    setTimeout(() => { el.style.filter = "none"; }, 1000);
}

function checkGameStatus() {
    let msg = "";
    if (playerHP <= 0) msg = "☠️ 你輸了！";
    else if (cpuHP <= 0) msg = "✨ 勝利！";
    else if (playerHand.length === 0) msg = "🏆 你清空了手牌！";
    else if (cpuHand.length === 0) msg = "❌ 對手清空了手牌！";

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