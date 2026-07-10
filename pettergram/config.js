// Where the pettergram backend lives (pettergram-api.php in the pianopetter.com repo).
const PG_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
window.PETTERGRAM_API = PG_LOCAL
	? 'http://localhost:8001/pettergram-api.php'
	: 'https://pianopetter.com/pettergram-api.php';
// Base for uploaded pics/videos (they're served straight from the pianopetter web root).
window.PETTERGRAM_MEDIA = PG_LOCAL
	? 'http://localhost:8001'
	: 'https://pianopetter.com';
