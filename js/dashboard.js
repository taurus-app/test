let userData = {
	userId: '--',
	vipLevel: '--',
	inviterId: '--',
	partnerCount: '--',
	inviteLink: '',
	slots: [], 
	isBlocked: false
};

document.addEventListener('DOMContentLoaded', async function () {
	
	let address = '';
	if (window.getCurrentAddress) {
		address = await window.getCurrentAddress();
		document.getElementById('walletAddress').value = formatAddress(address);
	}

	
	if (window.checkMembershipStatus && address) {
		window.checkMembershipStatus(address, 'dashboard');
	}

	
	await initializeWeb3AndContract();
	try {
		if (window.taurusContract && address) {
			const info = await window.taurusContract.methods.getFullUser(address).call();
			userData.userId = info.id || '--';
			userData.vipLevel = parseInt(info.currentLevel) || 0;
			userData.inviterId = info.inviterId || '--';
			userData.partnerCount = info.invitedCount || '--';
			userData.inviteLink = `https://taurus-app.net/register?invite=${userData.userId}`;
			userData.isBlocked = info.isBlocked === true || info.isBlocked === 'true'; 
			userData.slots = await getUserSlots(userData.userId, userData.vipLevel);
		}
	} catch (err) {
		window.showToast && window.showToast('Failed to load user info', 'error');
	}

	try {
		if (address) {
			await loadTokenBalance(address);
		}
	} catch (err) {
		console.error('Failed to load token balance:', err);
	}


	document.getElementById('userId').textContent = userData.userId;
	document.getElementById('vipLevel').textContent = 'T' + userData.vipLevel;
	document.getElementById('inviterId').textContent = t('dashboard.invitedBy') + ' ' + userData.inviterId;
	document.getElementById('partnerCount').innerHTML = `${t('partners.myPartners')}: <span style="font-weight: bold;">${userData.partnerCount}</span>`;
	document.getElementById('inviteLink').textContent = userData.inviteLink;

	
	renderSlots(userData.slots);

	
	document.getElementById('copyInviteBtn').onclick = function () {
		navigator.clipboard.writeText(userData.inviteLink);
		if (window.showToast) window.showToast(t('register.copySuccess'), 'success');
	};


	document.getElementById('detailsBtn').onclick = function () {
		window.location.href = 'partners.html';
	};

	// Stake button event
	document.getElementById('stakeBtn').onclick = function () {
		window.location.href = 'stake.html';
	};

	
	const slots = userData.slots;
	
	setTimeout(() => {
		showDashboardContent();
	}, 500);
	document.querySelectorAll('.slot-view-btn').forEach(function (btn, idx) {
		btn.onclick = function () {
			
			const slotLevel = slots[idx].level;
			window.location.href = `slot-history.html?vip=${slotLevel}`;
		};
	});
});


function parsePoint(point) {
	const val = BigInt(point);
	const billion = 1000000000n;
	if (val >= billion) {
		return { type: 'direct', id: (val - billion).toString() };
	} else {
		return { type: 'indirect', id: val.toString() };
	}
}


async function getUserSlots(userId, vipLevel) {
	if (!window.taurusContract || !userId || !vipLevel) return [];
	const slots = [];
	try {
		for (let level = 1; level <= vipLevel; level++) {
			try {
				const slotData = await window.taurusContract.methods.getUserSlot(userId, level).call();
				
				const slotArr = [];
				if (slotData.point1 && slotData.point1 !== '0' && slotData.point1 !== 0) {
					const p1 = parsePoint(slotData.point1);
					slotArr.push({ type: p1.type, id: p1.id });
				}
				if (slotData.point2 && slotData.point2 !== '0' && slotData.point2 !== 0) {
					const p2 = parsePoint(slotData.point2);
					slotArr.push({ type: p2.type, id: p2.id });
				}
				
				while (slotArr.length < 3) {
					slotArr.push({ type: 'empty' });
				}
				slots.push({
					level,
					amount: window.getVipAmount ? window.getVipAmount(level) : '',
					unit: 'BNB',
					slots: slotArr
				});
			} catch (e) {
				
				slots.push({
					level,
					amount: window.getVipAmount ? window.getVipAmount(level) : '',
					unit: 'BNB',
					slots: [{}, {}, {}]
				});
			}
		}
	} catch (err) {
		
		window.showToast && window.showToast(t('dashboard.failed'), 'error');
	}
	return slots;
}

function formatAddress(address) {
	if (!address || address.length <= 10) return address;
	return address.slice(0, 24) + '...' + address.slice(-4);
}

function renderSlots(slots) {
	const slotList = document.getElementById('slotList');
	slotList.innerHTML = '';
	const currentVip = Number(userData.vipLevel);
	for (let level = 1; level <= 9; level++) {
		const slot = slots.find(s => s.level === level) || { level, amount: '', unit: 'BNB', slots: [{}, {}, {}] };
		const isLocked = level > currentVip;
		const showUpgrade = level === currentVip + 1;
		const showView = level === 1;
		let rightContent = '';
		if (!isLocked) {
			if (level === currentVip && userData.isBlocked) {
				
				if (showView) {
					rightContent = `<span class="vip-locked" title="Blocked"><span class="vip-lock-icon">🔐</span></span><button class="slot-view-btn" data-level="${level}">${t('dashboard.view')}</button>`;
				} else {
					rightContent = `<span class="vip-locked" title="Blocked"><span class="vip-lock-icon">🔐</span></span>`;
				}
			} else {
				if (showView) {
					rightContent = `<button class="slot-view-btn" data-level="${level}">${t('dashboard.view')}</button>`;
				} else if (showUpgrade) {
					rightContent = `<button class="slot-view-btn upgrade-btn" data-level="${level}">${t('upgrade')}</button>`;
				}
			}
		} else if (showUpgrade) {
			rightContent = `<button class="slot-view-btn upgrade-btn" data-level="${level}">${t('upgrade')}</button>`;
		}
		const slotDiv = document.createElement('div');
		slotDiv.className = 'slot-group' + (isLocked ? ' card-disabled' : '');
		slotDiv.innerHTML = `
            <div class="slot-header">
                <span class="slot-level">T${level}</span>
                <span class="slot-amount">${window.getVipAmount ? window.getVipAmount(level) : ''}BNB</span>
                <span class="slot-header-right">${rightContent}</span>
            </div>
            <div class="slot-circles">
                ${slot.slots.map((s) => {
			let dotClass = 'slot-dot';
			if (isLocked) dotClass += ' disabled';
			else if (s.type === 'empty') dotClass += ' empty';
			else if (s.type === 'indirect') dotClass += ' indirect';
			else if (s.type === 'direct') dotClass += ' direct';
			return `<span class="${dotClass}">${s.id ? s.id : ''}</span>`;
		}).join('')}
            </div>
            <div class="slot-divider"></div>
        `;
		slotList.appendChild(slotDiv);
	}
	setTimeout(() => {
		document.querySelectorAll('.slot-view-btn').forEach(function (btn) {
			if (btn.classList.contains('upgrade-btn')) {
				let isUpgrading = false;
				btn.onclick = async function () {
					if (isUpgrading) return;
					isUpgrading = true;
					btn.disabled = true;
					btn.textContent = 'Upgrading...';
					const level = parseInt(btn.getAttribute('data-level'));
					if (!window.getVipAmount) {
						window.showToast && window.showToast('Upgrade amount not set', 'error');
						isUpgrading = false;
						btn.disabled = false;
						btn.textContent = t('upgrade');
						return;
					}
					const need = window.getVipAmount(level);
					let address = '';
					if (window.getCurrentAddress) {
						address = await window.getCurrentAddress();
					}
					if (!address) {
						window.showToast && window.showToast('Please connect your wallet.', 'error');
						isUpgrading = false;
						btn.disabled = false;
						btn.textContent = t('upgrade');
						return;
					}
					if (!window.taurusContract) {
						window.showToast && window.showToast('Contract not initialized.', 'error');
						isUpgrading = false;
						btn.disabled = false;
						btn.textContent = t('upgrade');
						return;
					}
					
					let balance = 0;
					try {
						if (window.Web3) {
							const web3 = new window.Web3(window.ethereum);
							const accounts = await web3.eth.getAccounts();
							balance = parseFloat(web3.utils.fromWei(await web3.eth.getBalance(accounts[0]), 'ether'));
						}
					} catch (e) {
						window.showToast && window.showToast('Failed to get balance', 'error');
						isUpgrading = false;
						btn.disabled = false;
						btn.textContent = t('upgrade');
						return;
					}
					if (balance < need) {
						window.showToast && window.showToast('Insufficient balance', 'error');
						isUpgrading = false;
						btn.disabled = false;
						btn.textContent = t('upgrade');
						return;
					}
					
					try {
						window.showToast && window.showToast('Waiting for wallet signature...', 'info');
						btn.textContent = 'Upgrading...';
						window.taurusContract.methods.investLevel(level).send({
							from: address,
							value: window.web3.utils.toWei(need.toString(), 'ether')
						})
							.on('transactionHash', hash => {
								window.showToast && window.showToast('Transaction sent, waiting for confirmation...', 'info');
								btn.textContent = 'Pending...';
							})
							.on('receipt', receipt => {
								window.showToast && window.showToast('Upgrade successful!', 'success');
								btn.textContent = 'Success!';
								setTimeout(() => window.location.reload(), 1200);
							})
							.on('error', error => {
								if (error && error.code === 4001) {
									window.showToast && window.showToast('Transaction rejected by user.', 'error');
								} else {
									window.showToast && window.showToast('Upgrade failed: ' + (error && error.message ? error.message : 'Unknown error'), 'error');
								}
								isUpgrading = false;
								btn.disabled = false;
								btn.textContent = t('upgrade');
							});
					} catch (err) {
						window.showToast && window.showToast('Upgrade failed: ' + (err && err.message ? err.message : 'Unknown error'), 'error');
						isUpgrading = false;
						btn.disabled = false;
						btn.textContent = t('upgrade');
					}
				};
				return;
			} else {
				btn.onclick = function () {
					window.location.href = 'slot-history.html';
				};
			}
		});
	}, 500);
}

// Load token balance
async function loadTokenBalance(address) {
	
	try {
		if (!window.web3 || !address) return;
		
		// Load ERC20 ABI
		const response = await fetch('assets/abi/erc20.json');
		const erc20ABI = await response.json();
		
		// Initialize token contract
		const tokenContract = new window.web3.eth.Contract(
			erc20ABI,
			window.CONTRACT_ADDRESSES.TOKEN
		);
		
		// Get token balance
		const balance = await tokenContract.methods.balanceOf(address).call();
		
		const formattedBalance = window.web3.utils.fromWei(balance, 'ether');
		
		// Update UI
		document.getElementById('tokenBalance').textContent = parseFloat(formattedBalance).toFixed(2);
		
	} catch (error) {
		console.error('Failed to load token balance:', error);
		document.getElementById('tokenBalance').textContent = '0.00';
	}
} 
