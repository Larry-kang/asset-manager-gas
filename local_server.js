const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3003;
const ROOT = __dirname;

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});


const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
};

function include(filename) {
    try {
        const filePath = path.join(ROOT, filename + '.html');
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf8');
        }
        // Fallback for .js if named without .html extension in GAS
        const jsPath = path.join(ROOT, filename + '.js');
        if (fs.existsSync(jsPath)) {
            return `<script>${fs.readFileSync(jsPath, 'utf8')}</script>`;
        }
        return `<!-- Missing include: ${filename} -->`;
    } catch (e) {
        return `<!-- Error including ${filename}: ${e.message} -->`;
    }
}

http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    if (req.url === '/' || req.url === '/index.html') {
        fs.readFile(path.join(ROOT, 'index.html'), 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
                return;
            }

            // Emulate GAS Template evaluation
            let output = data.replace(/<\?!= include\('(.+?)'\); \?>/g, (match, p1) => {
                return include(p1);
            });

            // INJECT MOCK API (Special for Local Dev)
            // We inject it before the first script that needs it, or just before </body>
            // Actually, index.html <head> or close to top is best.
            // Let's inject it right after <head> start
            const mockScript = fs.readFileSync(path.join(ROOT, 'mock_api.js'), 'utf8');
            output = output.replace('<head>', `<head><script>${mockScript}</script>`);

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(output);
        });
    } else {
        // Serve static files if needed
        const filePath = path.join(ROOT, req.url);
        const extname = path.extname(filePath);
        const contentType = mimeTypes[extname] || 'application/octet-stream';

        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code == 'ENOENT') {
                    res.writeHead(404);
                    res.end('404 Not Found');
                } else {
                    res.writeHead(500);
                    res.end('500 Error');
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
    }

}).listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
