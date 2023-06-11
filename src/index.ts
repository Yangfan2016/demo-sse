import { createReadStream } from "fs";
import { createServer } from "http"
import path from "path";

const rootPath = process.env.PWD || '';

function main() {

    createServer((req, res) => {
        if (!req.url) return res.end('404');
        const url = new URL(
            req.url,
            "file:///"
        )
        const { pathname } = url;
        const payloads: { data: string; delay: number }[] = [];
        const pros: Promise<any>[] = [];
        if (pathname === '/sse') {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });
            const rs = createReadStream(path.resolve(rootPath, './README.md'));
            rs.on('data', (chunk) => {
                const data = chunk.toString();
                const messages = data.split('\n');
                for (let i = 0; i < messages.length; i++) {
                    payloads.push({
                        data: messages[i],
                        delay: (Math.random() * 5e3) + 1
                    })

                }
            });
            rs.on('end', () => {
                payloads.forEach(({ data, delay }) => {
                    pros.push(new Promise((rs, rj) => {
                        setTimeout(() => {
                            res.write(`data: ${data}\n\n`);
                            rs('');
                        }, delay);
                    }))
                });
                Promise.all(pros).then(() => {
                    res.write('event: end\ndata: true\n\n');
                    res.end();
                });
            });
        } else {
            let content = '';
            let isNotFound = false;
            const rs = createReadStream(path.resolve(rootPath, pathname));
            rs.on('error', () => {
                isNotFound = true;
                // 404
                createReadStream(path.resolve(rootPath, './index.html')).pipe(res);
            });
            rs.on('data', (chunk) => {
                if (isNotFound) return;
                content += chunk
            })
            rs.on('close', () => {
                if (isNotFound) return;
                res.end(content);
            })
        }
    }).listen(3000)

}

main();