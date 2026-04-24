self.addEventListener('push', function (event) {
  var data = { title: 'Energi Electric', body: '' }
  try {
    data = event.data.json()
  } catch (e) {
    data.body = event.data ? event.data.text() : 'New notification'
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/brand/icon-192.png',
      badge: '/brand/icon-192.png',
    })
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  event.waitUntil(
    clients.openWindow('/dashboard')
  )
})
