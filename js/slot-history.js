
function formatTimestamp(timestamp) {
	const date = new Date(timestamp * 1000); 
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	return `${month}-${day} ${hours}:${minutes}`;
}


function formatNumber(num) {
	if (!num || num === '0') return '0';
	const n = parseFloat(num);
	if (n < 0.001) return n.toExponential(3);
	return n.toFixed(6).replace(/\.?0+$/, '');
}


function truncate(num, decimals) {
	const factor = Math.pow(10, decimals);
	return Math.floor(Number(num) * factor) / factor;
}


function formatTruncate(num, decimals) {
	return truncate(num, decimals).toLocaleString(undefined, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	});
}

document.addEventListener('DOMContentLoaded', async function () {

	let address = '';
	if (window.getCurrentAddress) {
		address = await window.getCurrentAddress();
	}

	await initializeWeb3AndContract();

	if (window.checkMembershipStatus && address) {
		window.checkMembershipStatus(address, 'slot-history');
	}


	let userId = null;
	try {
		if (window.taurusContract && address) {
			const info = await window.taurusContract.methods.getFullUser(address).call();
			userId = info.id;
		}
	} catch (e) { }


	let rewards = [];
	// Load contract ABI
	const response = await fetch('assets/abi/tauruabi.json');
	const taurusABI = await response.json();
	try {
		if (window.taurusContract && userId) {
			const web3 = new Web3("https://rpc.ankr.com/bsc/2bd6c0010236463db32d50c26a7a5efb5cbcfcc799d5d7ea4b380a4d258d8e1a");
			const taurusContract = new web3.eth.Contract(
				taurusABI,
				window.CONTRACT_ADDRESSES.TAURUS
			)

			const safeBlockNumber = 200000; 
			const latestBlock = await web3.eth.getBlockNumber();
			const fromBlock = Math.max(0, latestBlock - safeBlockNumber);

			const events = await taurusContract.getPastEvents('Notify', {
				filter: {
					fromUserId: userId
				},
				fromBlock: fromBlock,
				toBlock: latestBlock
			});

			rewards = events.map(ev => {
				const returnValues = ev.returnValues;
				return {
					fromUserId: returnValues.fromUserId,
					toUserId: returnValues.toUserId,
					level: returnValues.level,
					status: returnValues.status,
					amountBNB: returnValues.amountBNB,
					amountMainToken: returnValues.amountMainToken,
					timestamp: returnValues.timestamp || ev.blockNumber, 
					blockNumber: ev.blockNumber,
					transactionHash: ev.transactionHash
				};
			});

			setTimeout(() => {
				showDashboardContent();
			}, 500);


			rewards.sort((a, b) => b.timestamp - a.timestamp);
		}
	} catch (e) {
		console.log('Error loading rewards:', e);
		window.showToast && window.showToast('Failed to load reward history', 'error');
	}

	renderRewardList(rewards);

	document.getElementById('backBtn').onclick = function () {
		window.location.href = 'dashboard.html';
	};
});

function renderRewardList(rewards) {
	const table = document.getElementById('slotHistoryTable');
	table.innerHTML = '';
	if (!rewards || rewards.length === 0) {
		table.innerHTML = '<div class="no-reward-data">No reward history found.</div>';
		return;
	}
	rewards.forEach(reward => {
		const eventType = reward.status === '0' ? t('clear') : t('dividend');
		const formattedTime = formatTimestamp(reward.timestamp);
		const formattedBNB = window.web3.utils.fromWei(reward.amountBNB, 'ether');
		const formattedTaurus = window.web3.utils.fromWei(reward.amountMainToken, 'ether');
		const bnbStr = formatTruncate(formattedBNB, 6);
		const taurusStr = formatTruncate(formattedTaurus, 2);
		const card = document.createElement('div');
		card.className = 'reward-card';
		card.innerHTML = `
			<div class="reward-card-header flex-between">
				<span class="reward-card-source">${t('from')}: ID ${reward.toUserId}</span>
				<span class="reward-card-level">T${reward.level}</span>
			</div>
			<div class="reward-card-middle flex-between">
				<span class="reward-card-event ${eventType.toLowerCase()} pulse">${eventType}</span>
				<span class="reward-card-time">${formattedTime}</span>
			</div>
			<div class="reward-card-amounts flex-between">
				<span class="reward-card-bnb">
					<img src="assets/images/bnb.png" alt="BNB">
					${bnbStr} BNB
				</span>
				<span class="reward-card-taurus">
					<img src="assets/images/taurus_logo.png" alt="Taurus">
					${taurusStr} Taurus
				</span>
			</div>
		`;
		table.appendChild(card);
	});
} 
