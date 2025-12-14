const setup = require('./tests/setup');
console.log('Exports from setup.js:', Object.keys(setup));
console.log('LoanPosition type:', typeof setup.LoanPosition);
console.log('RiskCalculator type:', typeof setup.RiskCalculator);
console.log('context has LoanPosition?', !!setup.context.LoanPosition);

try {
    const pos = new setup.LoanPosition('1', 'Test', 'Stock');
    console.log('Successfully created LoanPosition instance');
} catch (e) {
    console.error('Error creating LoanPosition:', e.message);
}
