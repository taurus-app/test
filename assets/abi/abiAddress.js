// Contract addresses configuration
// todo change contract address
const CONTRACT_ADDRESSES = {
    TAURUS: '0x3f448cbB3a5f99149B203A2eb4D298A02BE28A2E',
	// DEPOSITE: '0x1ad319A1fE3a1562e25259805F2116D51e9A704d',
	DEPOSITE: '0x75B941b67853AE8574376cF3d613B3a9A4242F13',
	TOKEN: '0x0292280A1A45cBC01B7311137F4017c3fB014444'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONTRACT_ADDRESSES;
} else {
    window.CONTRACT_ADDRESSES = CONTRACT_ADDRESSES;
}
