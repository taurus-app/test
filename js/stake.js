// Taurus Staking Page - Optimized Version
// =============================
// Global Constants and Parameters
const levelLimits = [
    0,
    30000, // T1
    60000, // T2
    90000, // T3
    120000, // T4
    150000, // T5
    180000, // T6
    210000, // T7
    240000, // T8
    270000  // T9
];
const MIN_STAKE = 10000;
const FIXED_APR = 365;

// Global State
let address = '';
let tokenContract = null;
let stakeContract = null;
// let web3Instance = null; // Declare only once
let interestPollingTimer = null;
let interestAnimating = false;
let lastInterestValue = 0;
let stakeData = {
    tokenBalance: '0',
    stakedAmount: '0',
    pendingInterest: '0',
    maxStakeLimit: '0',
    apr: '0',
    userLevel: 1,
    totalInterestClaimed: '0'
};

// =============================
// Utility Functions
function toWei(amount) {
    return web3Instance.utils.toWei(amount.toString(), 'ether');
}
function fromWei(amount) {
    return web3Instance.utils.fromWei(amount.toString(), 'ether');
}

// =============================
// Contract and Membership Validation
async function initializeWeb3AndStakeContract() {
    if (typeof window.ethereum !== 'undefined') {
        web3Instance = new Web3(window.ethereum);
    } else if (typeof window.web3 !== 'undefined') {
        web3Instance = new Web3(window.web3.currentProvider);
    } else {
        web3Instance = new Web3(new Web3.providers.HttpProvider('https://bsc-dataseed1.binance.org/'));
    }
	
    // Load ABI
    const erc20ABI = await (await fetch('assets/abi/erc20.json')).json();
    const stakeABI = await (await fetch('assets/abi/depositeabi.json')).json();
    tokenContract = new web3Instance.eth.Contract(erc20ABI, window.CONTRACT_ADDRESSES.TOKEN);
    stakeContract = new web3Instance.eth.Contract(stakeABI, window.CONTRACT_ADDRESSES.DEPOSITE);
}

async function checkAndInit() {
    if (window.getCurrentAddress) {
        address = await window.getCurrentAddress();
    }
    if (window.checkMembershipStatus && address) {
        window.checkMembershipStatus(address, 'stake');
    }
    await initializeWeb3AndStakeContract();
}

// =============================
// Level and Data Retrieval
async function getUserLevel() {
    if (!address || !window.taurusContract) return 1;
    const info = await window.taurusContract.methods.getFullUser(address).call();
    return parseInt(info.currentLevel) || 1;
}

async function loadStakeData() {
    if (!address || !tokenContract || !stakeContract) return;
    // Get user level
    const userLevel = await getUserLevel();
    stakeData.userLevel = userLevel;
    // Token balance
    const tokenBalance = await tokenContract.methods.balanceOf(address).call();
    stakeData.tokenBalance = fromWei(tokenBalance);
    // Staking information
    const stakeInfo = await stakeContract.methods.getUserStakeInfo(address).call();
	
    stakeData.stakedAmount = fromWei(stakeInfo.stakedAmount);
    stakeData.pendingInterest = fromWei(stakeInfo.pendingInterest);
    // Calculate actual maximum staking limit: level max limit - already staked amount
    const maxStakeByLevel = levelLimits[userLevel];
    const stakedAmount = parseFloat(fromWei(stakeInfo.stakedAmount));
    const availableStakeLimit = Math.max(0, maxStakeByLevel - stakedAmount);
    stakeData.maxStakeLimit = availableStakeLimit.toString();
    stakeData.apr = FIXED_APR;
    // Total interest claimed (before tax, need to calculate after-tax value)
    const totalInterestClaimedBeforeTax = fromWei(stakeInfo.totalInterestClaimed);
    stakeData.totalInterestClaimed = (parseFloat(totalInterestClaimedBeforeTax) * 0.93).toString();
    setStakeInputDefault();
    updateStakeUI();
}

function setStakeInputDefault() {
    const input = document.getElementById('stakeAmount');
    const balance = parseFloat(stakeData.tokenBalance);
    const min = MIN_STAKE;
    const max = parseFloat(stakeData.maxStakeLimit);
    input.min = min;
    input.max = max;
    if (balance < min) {
        input.value = '';
        input.disabled = true;
    } else if (balance >= max) {
        input.value = max;
        input.disabled = false;
    } else {
        input.value = balance;
        input.disabled = false;
    }
}

// =============================
// UI Rendering
function updateStakeUI() {
    document.getElementById('tokenBalance').textContent = parseFloat(stakeData.tokenBalance).toFixed(4);
    document.getElementById('totalInterestClaimed').textContent = parseFloat(stakeData.totalInterestClaimed).toFixed(4) + ' TAURUS';
    document.getElementById('stakedAmount').textContent = parseFloat(stakeData.stakedAmount).toFixed(4) + ' TAURUS';
    document.getElementById('pendingInterest').textContent = parseFloat(stakeData.pendingInterest).toFixed(4) + ' TAURUS';
    document.getElementById('apr').textContent = FIXED_APR + '%';
    document.getElementById('maxStakeLimit').textContent = `${MIN_STAKE} ~ ${parseFloat(stakeData.maxStakeLimit).toFixed(0)} TAURUS`;
}

// =============================
// Animation and Timers
function startInterestPolling() {
    if (interestPollingTimer) clearInterval(interestPollingTimer);
    interestPollingTimer = setInterval(async () => {
        try {
            if (!address || !stakeContract) return;
            const stakeInfo = await stakeContract.methods.getUserStakeInfo(address).call();
            const newInterest = parseFloat(fromWei(stakeInfo.pendingInterest));
            animateInterest(lastInterestValue, newInterest, 1000);
            lastInterestValue = newInterest;
        } catch (e) {}
    }, 3000);
}

function animateInterest(from, to, duration) {
    if (interestAnimating) return;
    interestAnimating = true;
    const el = document.getElementById('pendingInterest');
    const start = performance.now();
    function frame(now) {
        const progress = Math.min((now - start) / duration, 1);
        const value = from + (to - from) * progress;
        el.textContent = value.toFixed(4) + ' TAURUS';
        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {
            el.textContent = to.toFixed(4) + ' TAURUS';
            interestAnimating = false;
        }
    }
    requestAnimationFrame(frame);
}

// =============================
// Event Binding
function setupEventListeners() {
    document.getElementById('backBtn').onclick = function () {
        window.location.href = 'dashboard.html';
    };
    document.getElementById('stakeBtn').onclick = async function () {
        await handleStake();
    };
    document.getElementById('withdrawPrincipalBtn').onclick = async function () {
        await handleWithdrawPrincipal();
    };
    document.getElementById('claimInterestBtn').onclick = async function () {
        await handleClaimInterest();
    };
}

// =============================
// Core Logic for Staking, Withdrawal, and Claiming
async function handleStake() {
    try {
        const amount = document.getElementById('stakeAmount').value;
        if (!amount || parseFloat(amount) <= 0) {
            window.showToast && window.showToast(window.t('stake.enterValidAmount'), 'error');
            return;
        }
        
        const amountNum = parseFloat(amount);
        const minStake = MIN_STAKE;
        const maxStake = parseFloat(stakeData.maxStakeLimit);
        
        // Validate staking amount is within allowed range
        if (amountNum < minStake) {
            const errorMsg = window.t('stake.minStakeError').replace('{min}', minStake);
            window.showToast && window.showToast(errorMsg, 'error');
            return;
        }
        if (amountNum > maxStake) {
            const errorMsg = window.t('stake.maxStakeError').replace('{max}', maxStake);
            window.showToast && window.showToast(errorMsg, 'error');
            return;
        }
        
        if (!address) {
            window.showToast && window.showToast(window.t('stake.connectWallet'), 'error');
            return;
        }
        const amountWei = toWei(amount);
        const allowance = await tokenContract.methods.allowance(address, window.CONTRACT_ADDRESSES.DEPOSITE).call();
        if (BigInt(allowance) < BigInt(amountWei)) {
            window.showToast && window.showToast(window.t('stake.approvingTokens'), 'info');
            await tokenContract.methods.approve(window.CONTRACT_ADDRESSES.DEPOSITE, amountWei).send({ from: address });
        }
        window.showToast && window.showToast(window.t('stake.stakingTokens'), 'info');
        await stakeContract.methods.stake(amountWei).send({ from: address });
        window.showToast && window.showToast(window.t('stake.stakeSuccessful'), 'success');
        await loadStakeData();
    } catch (error) {
        console.error('Stake error:', error);
        if (error.code === 4001) {
            window.showToast && window.showToast(window.t('stake.transactionRejected'), 'error');
        } else {
            const errorMsg = window.t('stake.stakeFailed').replace('{error}', error.message || window.t('stake.unknownError'));
            window.showToast && window.showToast(errorMsg, 'error');
        }
    }
}

async function handleWithdrawPrincipal() {
    try {
        if (!address) {
            window.showToast && window.showToast(window.t('stake.connectWallet'), 'error');
            return;
        }
        if (parseFloat(stakeData.stakedAmount) <= 0) {
            window.showToast && window.showToast(window.t('stake.noPrincipalToWithdraw'), 'error');
            return;
        }
        window.showToast && window.showToast(window.t('stake.withdrawingPrincipal'), 'info');
        await stakeContract.methods.withdrawPrincipal().send({ from: address });
        window.showToast && window.showToast(window.t('stake.withdrawSuccessful'), 'success');
        await loadStakeData();
    } catch (error) {
        console.error('Withdraw error:', error);
        if (error.code === 4001) {
            window.showToast && window.showToast(window.t('stake.transactionRejected'), 'error');
        } else {
            const errorMsg = window.t('stake.withdrawFailed').replace('{error}', error.message || window.t('stake.unknownError'));
            window.showToast && window.showToast(errorMsg, 'error');
        }
    }
}

async function handleClaimInterest() {
    try {
        if (!address) {
            window.showToast && window.showToast(window.t('stake.connectWallet'), 'error');
            return;
        }
        if (parseFloat(stakeData.pendingInterest) <= 0) {
            window.showToast && window.showToast(window.t('stake.noInterestToClaim'), 'error');
            return;
        }
        window.showToast && window.showToast(window.t('stake.claimingInterest'), 'info');
        await stakeContract.methods.claimInterest().send({ from: address });
        window.showToast && window.showToast(window.t('stake.interestClaimedSuccessfully'), 'success');
        await loadStakeData();
    } catch (error) {
        console.error('Claim error:', error);
        if (error.code === 4001) {
            window.showToast && window.showToast(window.t('stake.transactionRejected'), 'error');
        } else {
            const errorMsg = window.t('stake.claimFailed').replace('{error}', error.message || window.t('stake.unknownError'));
            window.showToast && window.showToast(errorMsg, 'error');
        }
    }
}

// =============================
// Page Entry Point
// 1. Contract initialization, membership validation
// 2. Data loading, event binding, animation polling
// 3. Display content

document.addEventListener('DOMContentLoaded', async function () {
    // Language switching setup
    const userLang = localStorage.getItem('lang') || 'en';
    if (window.applyI18n) window.applyI18n(userLang);
    
    // Language button event binding
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === userLang);
        btn.onclick = function() {
            const lang = btn.dataset.lang;
            localStorage.setItem('lang', lang);
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const dropdown = document.querySelector('.lang-dropdown');
            if(dropdown) dropdown.classList.remove('open');
            window.location.reload();
        };
    });
    
    // Language dropdown toggle event binding
    const langDropdownBtn = document.getElementById('langDropdownBtn');
    const langDropdown = langDropdownBtn ? langDropdownBtn.closest('.lang-dropdown') : null;
    
    if(langDropdownBtn && langDropdown) {
        langDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            langDropdown.classList.toggle('open');
        });
        document.addEventListener('click', function(e) {
            if (!langDropdown.contains(e.target)) {
                langDropdown.classList.remove('open');
            }
        });
    }
    
    // Main initialization
    await checkAndInit();
    await loadStakeData();
    setupEventListeners();
    setTimeout(() => {
        showStakeContent();
        lastInterestValue = parseFloat(stakeData.pendingInterest) || 0;
        startInterestPolling();
    }, 500);
});

function showStakeContent() {
    const skeleton = document.querySelector('.skeleton-content');
    if (skeleton) {
        skeleton.classList.add('fade-out');
        setTimeout(() => skeleton.style.display = 'none', 500);
    }
    const mainContent = document.querySelector('.dashboard-main-content');
    if (mainContent) {
        mainContent.classList.remove('invisible');
        mainContent.classList.add('fade-in');
    }
    
    // Re-bind language dropdown events after content is shown
    setTimeout(() => {
        const langDropdownBtn = document.getElementById('langDropdownBtn');
        const langDropdown = langDropdownBtn ? langDropdownBtn.closest('.lang-dropdown') : null;
        
        if(langDropdownBtn && langDropdown) {
            // Remove existing event listeners
            langDropdownBtn.replaceWith(langDropdownBtn.cloneNode(true));
            const newLangDropdownBtn = document.getElementById('langDropdownBtn');
            
            newLangDropdownBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                langDropdown.classList.toggle('open');
            });
        }
    }, 600);
} 