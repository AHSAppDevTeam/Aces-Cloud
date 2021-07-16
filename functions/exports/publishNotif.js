const { discord } = require('../utils/discord')
const { getDb, setDb } = require('../utils/database')
const fetch = require('node-fetch')

exports.publishNotif = async () => {

	const now = Math.trunc(Date.now()/1000)

	const sentNotifIDs = await getDb('notifIDs') || []
	const allNotifObjects = await getDb('notifs') || {}
	const allNotifs = Object.entries(allNotifObjects)

	const notifIsNotArchived = ([id, notif]) =>
		notif.categoryID !== 'Archive'

	const notifIsRecent = ([id, notif]) =>
		!sentNotifIDs.includes(id)
		&& notif.notifTimestamp <= now 
		&& notif.notifTimestamp >= now - 60*60*24

	const notif = id => ([id, allNotifObjects[id]])
	const notifID = ([id, notif]) => id

	const readyNotifs = allNotifs.filter(notifIsNotArchived).filter(notifIsRecent)
	const readyNotifIDs = readyNotifs.map(notifID)

	console.log(`saw ${readyNotifIDs.length} notifs ready to be sent`)

	readyNotifs.forEach( ([id, notif]) => {
		setDb( ['notifs',id,'notifTimestamp'], now )
		pushNotif(id, notif)
		discord({
			author: '',
			id,
			title: '🔔 ' + notif.title,
			description: notif.blurb
		})
		console.log(`sent <${id}>: ${notif.title}`)
	})

	setDb( 
		'notifIDs', 
		sentNotifIDs
		.map(notif)
		.filter(notifIsNotArchived)
		.map(notifID)
		.concat(readyNotifIDs)
	)
}

/**
 * Pushes a notification to Firebase Cloud notifications' REST API
 * @param {string} id 
 * @param {Object} notif 
 */
async function pushNotif(id, notif) {
	const auth = await getDb('secrets/messaging')
	let payloads = [{
		notification: {
			title: notif.title,
			body: notif.blurb
		},
		data: { articleID: id },
		to: '/topics/' + notif.categoryID
	}]

	const legacyTopicID = {
		General_Info: 'general',
		District: 'district',
		ASB: 'asb',
		Academics: 'bulletin',
		Athletics: 'bulletin',
		Clubs: 'bulletin',
		Colleges: 'bulletin',
		Reference: 'bulletin',
	}[notif.categoryID] || 'testing'
	payloads.push({ ...payloads[0], ...{ to: '/topics/' + legacyTopicID } })

	for(const payload of payloads) await fetch('https://fcm.googleapis.com/fcm/send', {
		method: 'POST',
		headers: {
			'Authorization': auth,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload)
	})
}
