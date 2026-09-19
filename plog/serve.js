#!/usr/bin/env node
// Tiny zero-dependency server for editing the plog locally.
//   node plog/serve.js      → http://localhost:8080/plog/write.html
// Serves the site statically and lets write.html publish posts straight
// into plog/posts/ + plog/posts.json. Localhost only — never deployed.

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'plog', 'posts');
const INDEX = path.join(ROOT, 'plog', 'posts.json');
const PORT = Number(process.env.PORT) || 8080;

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
	'.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
	'.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
	'.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
	'.ico': 'image/x-icon'
};

function json(res, code, obj) {
	const body = JSON.stringify(obj);
	res.writeHead(code, {
		'Content-Type': 'application/json; charset=utf-8',
		'Content-Length': Buffer.byteLength(body)
	});
	res.end(body);
}

function readIndex() {
	try {
		const parsed = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
		return Array.isArray(parsed) ? parsed : [];
	} catch (e) {
		return [];
	}
}

function publish(req, res) {
	let body = '';
	req.on('data', (c) => {
		body += c;
		if (body.length > 5e6) req.destroy();
	});
	req.on('end', () => {
		let data;
		try {
			data = JSON.parse(body);
		} catch (e) {
			return json(res, 400, { error: 'bad JSON' });
		}

		const meta = data && data.meta;
		if (!meta || typeof meta.slug !== 'string' || typeof data.html !== 'string') {
			return json(res, 400, { error: 'missing meta.slug or html' });
		}
		// slug goes into a filename — keep it strictly safe
		if (!/^[a-z0-9][a-z0-9-]*$/.test(meta.slug)) {
			return json(res, 400, { error: 'slug must be lowercase letters, numbers and dashes' });
		}

		const file = path.join(POSTS_DIR, meta.slug + '.html');
		try {
			fs.mkdirSync(POSTS_DIR, { recursive: true });
			fs.writeFileSync(file, data.html, 'utf8');

			const posts = readIndex().filter((p) => p.slug !== meta.slug);
			posts.push({
				slug: meta.slug,
				title: meta.title || meta.slug,
				date: meta.date || new Date().toISOString().slice(0, 10),
				summary: meta.summary || ''
			});
			posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
			fs.writeFileSync(INDEX, JSON.stringify(posts, null, '\t') + '\n', 'utf8');
		} catch (e) {
			return json(res, 500, { error: e.message });
		}

		console.log('published  plog/posts/' + meta.slug + '.html');
		json(res, 200, { ok: true, path: 'plog/posts/' + meta.slug + '.html' });
	});
}

function serveStatic(req, res, urlPath) {
	let rel = decodeURIComponent(urlPath.split('?')[0]);
	if (rel.endsWith('/')) rel += 'index.html';

	const file = path.join(ROOT, rel);
	// never serve outside the site root
	if (!file.startsWith(ROOT + path.sep)) {
		res.writeHead(403).end('forbidden');
		return;
	}

	fs.stat(file, (err, st) => {
		if (err || !st.isFile()) {
			res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
				.end('<h1>404</h1><p><a href="/plog/">back to the plog</a></p>');
			return;
		}
		res.writeHead(200, {
			'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
			'Content-Length': st.size,
			'Cache-Control': 'no-store'
		});
		fs.createReadStream(file).pipe(res);
	});
}

http.createServer((req, res) => {
	const url = req.url || '/';

	// This server writes files, so only ever talk to this machine.
	const ip = req.socket.remoteAddress || '';
	if (!(ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1')) {
		res.writeHead(403).end('local access only');
		return;
	}

	if (url === '/api/ping') return json(res, 200, { ok: true });
	if (url === '/api/publish' && req.method === 'POST') return publish(req, res);

	if (req.method !== 'GET' && req.method !== 'HEAD') {
		res.writeHead(405).end('method not allowed');
		return;
	}
	serveStatic(req, res, url);
}).listen(PORT, '::', () => {
	// Bind the IPv6 wildcard so both ::1 and 127.0.0.1 work: Safari resolves
	// "localhost" to ::1 and, unlike curl, won't fall back to IPv4 — binding
	// 127.0.0.1 only makes it fail with "server unexpectedly dropped the
	// connection". Non-loopback callers are rejected in the handler above.
	console.log('plog editor  →  http://localhost:' + PORT + '/plog/write.html');
	console.log('plog         →  http://localhost:' + PORT + '/plog/');
	console.log('ctrl-c to stop');
});
