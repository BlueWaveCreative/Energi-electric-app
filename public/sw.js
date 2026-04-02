self.addEventListener('push', function (event) {
  var data = { title: 'Blue Shores PM', body: '' }
  try {
    data = event.data.json()
  } catch (e) {
    data.body = event.data ? event.data.text() : 'New notification'
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    })
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  event.waitUntil(
    clients.openWindow('/dashboard')
  )
})
