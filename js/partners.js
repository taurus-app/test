document.addEventListener('DOMContentLoaded', async function() {
    let address = '';
    if (window.getCurrentAddress) {
        address = await window.getCurrentAddress();
    }
	await initializeWeb3AndContract();

    if (window.checkMembershipStatus && address) {
        window.checkMembershipStatus(address, 'partners');
    }


    let partnerCount = '--';
    let newPartners = [];
    try {
        if (window.taurusContract && address) {

            const info = await window.taurusContract.methods.getFullUser(address).call();
            partnerCount = info.invitedCount || 0;
            const partnerAddresses = await getPartnersByEvent(address);
            newPartners = await Promise.all(partnerAddresses.map(async (addr) => {
                try {
                    const pInfo = await window.taurusContract.methods.getFullUser(addr).call();
                    return {
                        id: pInfo.id || '--',
                        vip: pInfo.currentLevel || '--',
                        address: addr
                    };
                } catch (e) {
                    return {
                        id: '--',
                        vip: '--',
                        address: addr
                    };
                }
            }));

	if (newPartners.length === 0 && info.invitedUsers) {
	    console.log('invitedUsers from events');
	    
	    const validInvitedUsers = info.invitedUsers.filter(addr => 
		addr && addr !== '0x0000000000000000000000000000000000000000'
	    );
	    
	    newPartners = await Promise.all(validInvitedUsers.map(async (addr) => {
		try {
		    const pInfo = await window.taurusContract.methods.getFullUser(addr).call();
		    return {
			id: pInfo.id || '--',
			vip: pInfo.currentLevel || '--',
			address: addr
		    };
		} catch (e) {
		    return {
			id: '--',
			vip: '--',
			address: addr
		    };
		}
	    }));}
        }
    } catch (err) {
        window.showToast && window.showToast(t('partners.noData'), 'error');
    }

    document.getElementById('partnerCount').innerHTML = `${t('partners.myPartners')}: <span style="font-weight: bold;">${partnerCount}</span>`;
    renderPartnerList(newPartners);
	setTimeout(() => {
		showDashboardContent();
	}, 500);

    document.getElementById('backBtn').onclick = function() {
        window.location.href = 'dashboard.html';
    };
});

async function getPartnersByEvent(inviterAddress) {
    try {
        const response = await fetch('assets/abi/tauruabi.json');
        const taurusABI = await response.json();

        const web3 = new Web3("https://rpc.ankr.com/bsc/2bd6c0010236463db32d50c26a7a5efb5cbcfcc799d5d7ea4b380a4d258d8e1a");
        const taurusContract = new web3.eth.Contract(
            taurusABI,
            window.CONTRACT_ADDRESSES.TAURUS
        );

        const currentBlock = await web3.eth.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 400000);
        

        const events = await taurusContract.getPastEvents('Registered', {
            filter: { inviter: inviterAddress },
            fromBlock: fromBlock,
            toBlock: 'latest'
        });
        const addresses = events.map(event => event.returnValues.user);
        const uniqueAddresses = [...new Set(addresses)];
        
        return uniqueAddresses;
    } catch (error) {
        console.error('Error fetching partners by event:', error);
        return [];
    }
}

function renderPartnerList(partners) {
    const list = document.getElementById('partnerList');
    list.innerHTML = '';
    if (!partners || partners.length === 0) {
        list.innerHTML = `<div class="no-partner-data">${t('partners.noData')}</div>`;
        return;
    }
    partners.forEach(p => {
        const card = document.createElement('div');
        card.className = 'partner-card';
        card.innerHTML = `
            <div class="partner-card-header">
                <span class="partner-card-id">ID: <span style="color:#F0B90B">${p.id}</span></span>
                <span class="partner-card-vip">T${p.vip}</span>
            </div>
            <div class="partner-card-address">${formatAddress(p.address)}</div>
        `;
        list.appendChild(card);
    });
}

function formatAddress(address) {
    if (!address || address.length < 10) return address;
    return address.slice(0, 28) + '...' + address.slice(-4);
} 
