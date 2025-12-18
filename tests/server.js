const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3002;

const reportDir = path.join(__dirname, 'e2e/report');
if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
}



function renderTemplate(filename) {
    let content = fs.readFileSync(path.join(__dirname, `../${filename}.html`), 'utf8').replace(/^\uFEFF/, '');

    // Improved Regex to capturing "js" or 'js' inside include with flexible spacing/semicolon
    // <?!= include('js'); ?> or <?!= include( "js" ) ?>
    content = content.replace(/<\?!=\s*include\s*\(\s*['"]([^'"]+)['"]\s*\)\s*;?\s*\?>/gi, (match, p1) => {
        const includePath = path.join(__dirname, `../${p1}.html`);
        if (fs.existsSync(includePath)) {
            console.log(`[Server] Included: ${p1}`);
            return fs.readFileSync(includePath, 'utf8').replace(/^\uFEFF/, '');
        }
        console.warn(`[Server] Include NOT FOUND: ${includePath}`);
        return '';
    });
    return content;
}

const mockClientScript = `
<script>
console.log('--- Mock GAS Environment Loaded ---');
window.google = {
    script: {
        run: {
            withSuccessHandler: function(callback) {
                console.log('[Client] withSuccessHandler called');
                this._successHandler = callback;
                return this;
            },
            withFailureHandler: function(callback) {
                console.log('[Client] withFailureHandler called');
                this._failureHandler = callback;
                return this;
            },
            getDashboardData: function(pass) {
                console.log('[Client] getDashboardData called with pass:', pass);
                
                // Mock Auth Logic
                // if (pass !== '1234' && pass !== 'demo') {
                //      if (!pass) {
                //          const err = { status: '403', message: 'Unauthorized' };
                //          if (this._successHandler) setTimeout(() => this._successHandler(err), 500);
                //          return;
                //      }
                // }

                const mockData = {
                     status: 'success',
                     netWorthTWD: 1580000,
                     dailyChange: 12500,
                     holdings: [
                         { ticker: 'TSLA', cat: 'Stock', qty: 10, valTWD: 50000, pnl: 5000, roi: 10, isUsd: true },
                         { ticker: 'BTC', cat: 'Crypto', qty: 0.5, valTWD: 1000000, pnl: 200000, roi: 20, isUsd: true }
                     ],
                     recentTx: [],
                     risks: [
                         { source: 'Sinopac', label: 'Maint Ratio', ratio: '160.00', status: 'Safe', debtTWD: 500000, colValTWD: 800000 },
                         { source: 'AAVE', label: 'Aggregated HF', ratio: '1.25', status: 'Warning', debtTWD: 1000000, colValTWD: 1250000 }
                     ],
                     contracts: [],
                     fx: 32.5,
                     knownTickers: ['TSLA', 'BTC']
                };
                if (this._successHandler) { 
                    setTimeout(() => this._successHandler(mockData), 500);
                }
            },
            processContractAction: function(d) { 
                console.log('[Client] processContractAction', d);
                if (this._successHandler) setTimeout(() => this._successHandler({ success: true }), 500); 
            },
            processWizard: function(d) {
                console.log('[Client] processWizard called', d);
                // Mock Wizard Response
                var msg = '[Mock] Created ' + d.proto + ' Loan. ' + (d.amount ? 'Amt:' + d.amount : '');
                if (this._successHandler) setTimeout(() => this._successHandler(msg), 800);
            },
            addTx: function(tx) { 
                if (this._successHandler) setTimeout(() => this._successHandler({ success: true }), 500); 
            },
            runSystemCheck: function() { }
        }
    }
};
</script>
`;

app.get('/', (req, res) => {
    let html = renderTemplate('index');
    html = html.replace('</body>', `${mockClientScript}</body>`);
    res.send(html);
});

app.use(express.static(path.join(__dirname, '../')));

app.listen(PORT, () => {
    console.log(`Mock Server running at http://localhost:${PORT}`);
});
