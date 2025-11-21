const CACHE = 'medireminder-v6';
const OFFLINE_PAGE = '/';

// Cache everything
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([
      '/', '/index.html', '/spl.jpg', '/ringtone.mp3'
    ]))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// Background alarm check every ~15-60 mins (best Chrome allows)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-alarms') {
    event.waitUntil(checkAndFireAlarms());
  }
});

async function checkAndFireAlarms() {
  const db = await openDB();
  const alarms = await getAllAlarms(db);
  const now = Date.now();

  for (const alarm of alarms) {
    if (alarm.active && Math.abs(alarm.time - now) < 5*60*1000) { // ±5 min
      self.registration.showNotification("Medicine Time!", {
        body: `${alarm.name} - ${alarm.dosage}`,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "alarm-" + alarm.id,
        renotify: true,
        requireInteraction: true,
        vibrate: [500, 200, 500, 200, 500],
        actions: [
          { action: "taken", title: "Taken" },
          { action: "snooze", title: "Snooze 5min" }
        ],
        data: { url: "/" }
      });
    }
  }
}

// Simple IndexedDB wrapper
function openDB() {
  return indexedDB.open('MediReminderDB', 1, upgrade => {
    upgrade.createObjectStore('alarms', { keyPath: 'id' });
  }).onsuccess = e => e.target.result;
}

function getAllAlarms(db) {
  return new Promise(resolve => {
    const tx = db.transaction('alarms');
    tx.objectStore('alarms').getAll().onsuccess = e => resolve(e.target.result);
  });
}