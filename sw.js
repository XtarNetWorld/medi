const CACHE = 'medireminder-v7';

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then(cache => 
        cache.addAll(['/', 'index.html', 'spl.jpg', 'icon-192.png', 'ringtone.mp3'])
    ));
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// Background Alarm Check (Runs ~every 15min)
self.addEventListener('periodicsync', (e) => {
    if (e.tag === 'check-alarms') {
        e.waitUntil(checkAlarms());
    }
});

async function checkAlarms() {
    const db = await openDB();
    const alarms = await getAlarms(db);
    const now = Date.now();
    alarms.forEach(alarm => {
        if (alarm.active && Math.abs(alarm.time - now) < 300000) { // ±5min
            self.registration.showNotification('⏰ Medicine Alarm!', {
                body: `${alarm.name}: Take ${alarm.dosage} NOW!`,
                icon: 'icon-192.png',
                badge: 'icon-192.png',
                vibrate: [1000, 500, 1000],
                requireInteraction: true, // Stays until dismissed
                actions: [{ action: 'TAKEN', title: 'Taken ✓' }, { action: 'SNOOZE', title: 'Snooze 10min' }],
                data: { url: '/', alarmId: alarm.id },
                tag: 'medicine-alarm' // Groups multiples
            });
            // Post message to open app
            self.clients.matchAll().then(clients => clients.forEach(c => c.postMessage({ action: 'alarm-trigger' })));
        }
    });
}

// IDB Helpers
function openDB() {
    return new Promise(resolve => {
        const req = indexedDB.open('MediReminderDB', 1);
        req.onupgradeneeded = e => e.target.result.createObjectStore('alarms', { keyPath: 'id' });
        req.onsuccess = e => resolve(e.target.result);
    });
}

function getAlarms(db) {
    return new Promise(resolve => {
        const tx = db.transaction('alarms', 'readonly');
        tx.objectStore('alarms').getAll().onsuccess = e => resolve(e.target.result);
    });
}
