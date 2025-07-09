
const vipLevelAmountMap = {
    1: 0.1,
    2: 0.2,
    3: 0.4,
    4: 0.8,
    5: 1.6,
    6: 3.2,
    7: 6.4,
    8: 12.8,
    9: 25.6
};


function getVipAmount(vipLevel) {
    return vipLevel && vipLevelAmountMap[vipLevel] ? vipLevelAmountMap[vipLevel] : 0;
}

window.getVipAmount = getVipAmount; 
