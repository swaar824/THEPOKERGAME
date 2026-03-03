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
let currentTheme = 'setA'; // 根據先後手決定牌組路徑

const joker = '🃏';

// 1. 初始化與拋硬幣邏輯
async function initGame() {
    playerHP = 2; cpuHP = 2;
    isGameOver = false; isAnimating = true; needsToDiscard = false;
    
    // 隱藏遊戲內容直到硬幣投擲結束
    document.getElementById('msg-board').innerText = "決定先後手中...";
    
    const isPlayerFirst = await tossCoin(); //
    currentTheme = isPlayerFirst ? 'setA' : 'setB'; // 2. 更換兩套不同牌面
    
    // 初始化牌組
    const baseCards = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    let fullDeck = [...baseCards, ...baseCards, joker];
    fullDeck.sort(() => Math.random() - 0.5);
    playerHand = fullDeck.slice(0, 13);
    cpuHand = fullDeck.slice(13);

    isAnimating = false;
    render();
    
    if (!isPlayerFirst) {
        document.getElementById('msg-board').innerText = "電腦先手";
        await sleep(1500);
        await cpuTurn();
    } else {
        document.getElementById('msg-board').innerText = "我方先手";
    }
}

// 1. 拋硬幣動畫函式
function tossCoin() {
    return new Promise(resolve => {
        const overlay = document.getElementById('coin-overlay');
        const coin = document.getElementById('coin');
        const resultText = document.getElementById('coin-result-text');
        
        overlay.classList.remove('hidden');
        const result = Math.random() > 0.5; // true 為我方先手
        
        // 觸發旋轉動畫
        coin.style.animation = result ? 'flip-heads 2s forwards' : 'flip-tails 2s forwards';
        
        setTimeout(() => {
            resultText.innerText = result ? "你先手" : "電腦先手";
            setTimeout(() => {
                overlay.classList.add('hidden');
                resolve(result);
            }, 1000);
        }, 2100);
    });
}

// 6-9. 渲染函式：包含重疊與 z-index 管理
function render() {
    // 7. 生命值定位顯示
    document.getElementById('player-hp').innerText = "❤️".repeat(playerHP) || "💀";
    document.getElementById('cpu-hp').innerText = "❤️".repeat(cpuHP) || "💀";

    // 6. 電腦手牌渲染 (重疊展示)
    const cpuArea = document.getElementById('cpu-hand-area');
    cpuArea.innerHTML = '';
    cpuHand.forEach((_, i) => {
        const div = document.createElement('div');
        div.className = 'card back';
        // 9. 牌背圖案
        div.style.backgroundImage = `url('assets/${currentTheme}/card_back.png')`;
        // 9. z-index 設定 (左疊右)
        div.style.zIndex = cpuHand.length - i;
        if (!isAnimating && !isGameOver && !needsToDiscard) {
            div.onclick = (e) => playerDraw(i, e.target);
        }
        cpuArea.appendChild(div);
    });

    // 6. 我方手牌渲染 (重疊與檢視動畫)
    const playerArea = document.getElementById('player-hand-area');
    playerArea.innerHTML = '';
    playerHand.forEach((card, i) => {
        const div = document.createElement('div');
        div.className = 'card';
        // 2 & 3. 不同數字與鬼牌圖片
        const imgName = card === joker ? 'joker.png' : `${card}.png`;
        div.style.backgroundImage = `url('assets/${currentTheme}/${imgName}')`;
        // 9. z-index 設定 (左方重疊至右方上方)
        div.style.zIndex = playerHand.length - i;
        playerArea.appendChild(div);
    });
}

// 鳴潮風格：展示與棄牌動畫
async function executeFancyDiscard(cardValue, isCPU = false) {
    const tempPair = [];
    const discardPile = document.getElementById('discard-pile');
    const pileRect = discardPile.getBoundingClientRect();
    
    // 3 & 4. 根據附圖決定展示中心位置
    let targetTop = window.innerHeight / 2;
    if (isCPU) {
        targetTop = document.getElementById('cpu-hand-area').getBoundingClientRect().top + 60;
    } else {
        targetTop = document.getElementById('player-hand-area').getBoundingClientRect().top - 100;
    }

    for(let i = 0; i < 2; i++) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card spotlight';
        cardEl.style.backgroundImage = `url('assets/${currentTheme}/${cardValue}.png')`;
        cardEl.style.position = 'fixed';
        cardEl.style.left = '50%';
        cardEl.style.top = targetTop + 'px';
        cardEl.style.zIndex = '2000';
        cardEl.style.transform = `translate(-50%, -50%) translateX(${(i - 0.5) * 110}px) scale(1.3)`;
        document.body.appendChild(cardEl);
        tempPair.push(cardEl);
    }

    await sleep(1000); // 展示展示動畫

    // 2. 移動至中央棄牌堆並翻轉
    for (let el of tempPair) {
        el.classList.add('dissolve');
        el.style.transition = 'all 0.6s ease-in';
        el.style.left = (pileRect.left + pileRect.width/2) + 'px';
        el.style.top = (pileRect.top + pileRect.height/2) + 'px';
        el.style.transform = 'translate(-50%, -50%) scale(1)';
        // 變成牌背
        setTimeout(() => {
            el.style.backgroundImage = `url('assets/${currentTheme}/card_back.png')`;
            el.innerText = '';
        }, 300);
    }
    
    await sleep(700);
    tempPair.forEach(el => el.remove());
}

// 玩家抽牌與移動動畫
async function playerDraw(index, targetEl) {
    if (isAnimating || isGameOver || needsToDiscard) return;
    isAnimating = true;

    const card = cpuHand.splice(index, 1)[0];
    
    // 5. 抽取卡片移動動畫
    const rect = targetEl.getBoundingClientRect();
    const flyCard = document.createElement('div');
    flyCard.className = 'card';
    flyCard.style.backgroundImage = `url('assets/${currentTheme}/${card === joker ? 'joker.png' : card + '.png'}')`;
    flyCard.style.position = 'fixed';
    flyCard.style.left = rect.left + 'px';
    flyCard.style.top = rect.top + 'px';
    flyCard.style.zIndex = '1000';
    document.body.appendChild(flyCard);

    await sleep(50);
    const targetRect = document.getElementById('player-hand-area').getBoundingClientRect();
    flyCard.style.transition = 'all 0.6s cubic-bezier(0.2, 1, 0.3, 1)';
    flyCard.style.left = (targetRect.left + targetRect.width / 2) + 'px';
    flyCard.style.top = targetRect.top + 'px';
    
    await sleep(600);
    flyCard.remove();

    playerHand.push(card);
    
    if (card === joker) {
        playerHP--;
        triggerHeartAnim('player-hp');
        // 6. 僅在此時觸發一次閃爍/震動
        document.getElementById('msg-board').innerText = "😱 抽到鬼牌！";
    }
    
    needsToDiscard = true;
    isAnimating = false;
    render();
    checkGameStatus();
}

// 玩家打出對子邏輯
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
    } else if (needsToDiscard) {
        document.getElementById('msg-board').innerText = "手上沒有對子喔";
    }

    if (needsToDiscard && pairs.length === 0) {
        needsToDiscard = false;
        if (!checkGameStatus()) await cpuTurn();
    }
    render();
}

// 電腦回合邏輯
async function cpuTurn() {
    if (isGameOver) return;
    isAnimating = true;
    document.getElementById('msg-board').innerText = "對手回合...";

    // 電腦消牌
    let counts = {};
    cpuHand.forEach(c => counts[c] = (counts[c] || 0) + 1);
    let pair = Object.keys(counts).find(v => v !== joker && counts[v] >= 2);
    
    if(pair) {
        await executeFancyDiscard(pair, true);
        for(let i = 0; i < 2; i++) cpuHand.splice(cpuHand.indexOf(pair), 1);
        render();
    }

    if (checkGameStatus()) return;

    // 電腦抽牌
    await sleep(1000);
    if (playerHand.length > 0) {
        const idx = Math.floor(Math.random() * playerHand.length);
        const card = playerHand.splice(idx, 1)[0];
        cpuHand.push(card);
        if (card === joker) {
            cpuHP--;
            triggerHeartAnim('cpu-hp');
        }
    }

    isAnimating = false;
    if (!checkGameStatus()) document.getElementById('msg-board').innerText = "請從對手手中選擇一張牌";
    render();
}

// 輔助函式
function triggerHeartAnim(id) {
    const el = document.getElementById(id);
    el.classList.add('heart-damage'); // 2. 斜線砍掉與閃爍動畫
    setTimeout(() => el.classList.remove('heart-damage'), 1500);
}

function checkGameStatus() {
    let msg = "";
    if (playerHP <= 0) msg = "遊戲結束，對手獲勝";
    else if (cpuHP <= 0) msg = "恭喜獲勝！";
    else if (playerHand.length === 0) msg = "你先清空了手牌！";
    else if (cpuHand.length === 0) msg = "對手先清空了手牌！";

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