const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const ROOT = __dirname;

const server = http.createServer((req, res) => {
    // Serve index.html for root
    let filePath = req.url === '/' ? 'index.html' : req.url;
    if (filePath.startsWith('/')) filePath = filePath.slice(1);

    // Resolve absolute path
    const absPath = path.join(ROOT, filePath);

    if (req.url === '/') {
        fs.readFile(absPath, 'utf8', (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
                return;
            }

            // 1. Inject Mock API
            content = content.replace('<head>', '<head>\n<script src="/mock_api.js?v=repair_' + Date.now() + '"></script>');

            // 2. Resolve GAS includes: <?!= include('filename'); ?>
            // Regex to find include tags
            const includePattern = /<\?!=\s*include\(['"](.+?)['"]\);\s*\?>/g;

            content = content.replace(includePattern, (match, filename) => {
                try {
                    // Try filename.html first
                    const incPath = path.join(ROOT, filename + '.html');
                    if (fs.existsSync(incPath)) {
                        return fs.readFileSync(incPath, 'utf8');
                    }
                    return `<!-- Include not found: ${filename} -->`;
                } catch (e) {
                    return `<!-- Error including ${filename}: ${e.message} -->`;
                }
            });

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(content);
        });
    } else {
        // Serve static files (mock_api.js, or others)
        fs.readFile(absPath, (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
            } else {
                let contentType = 'text/plain; charset=utf-8';
                if (filePath.endsWith('.js')) contentType = 'text/javascript; charset=utf-8';
                if (filePath.endsWith('.css')) contentType = 'text/css; charset=utf-8';
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
    }
});

server.listen(PORT, () => {
    console.log(`\nLocal Dev Server running at http://localhost:${PORT}`);
    console.log(`- Automatically injecting 'mock_api.js'`);
    console.log(`- Resolving <?!= include(...) ?> tags`);
});
