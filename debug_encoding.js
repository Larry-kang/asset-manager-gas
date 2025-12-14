const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'Logic.gs'), 'utf8');
console.log('Content length:', content.length);
const lines = content.split('\n');
const target = lines.find(l => l.includes('維持率'));
console.log('Line with 維持率:', target);
console.log('Hex of 維持率:', Buffer.from('維持率').toString('hex'));

if (target) {
    const foundStr = target.match(/label:\s*'([^']+)'/);
    if (foundStr) {
        console.log('Found label:', foundStr[1]);
        console.log('Hex of found label:', Buffer.from(foundStr[1]).toString('hex'));
    }
}
