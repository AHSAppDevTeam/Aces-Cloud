const admin = require('firebase-admin')

const app = admin.initializeApp({
	databaseURL: 'https://ahs-app.firebaseio.com'
},'main')

const db = admin.database(app).ref()

const appLegacy = admin.initializeApp({
	databaseURL: 'https://arcadia-high-mobile.firebaseio.com'
},'legacy')

const dbLegacy = admin.database(appLegacy).ref()

const path = paths => Array.isArray(paths) ? paths.join('/') : paths

exports.auth = admin.auth(app)
exports.getDb = paths => db.child(path(paths)).get().then(snapshot=>snapshot.val())
exports.setDb = (paths,val) => db.child(path(paths)).set(val)
exports.setDbLegacy = (paths,val) => dbLegacy.child(path(paths)).set(val)

/**
 * Get the path of a story in a legacy database
 * @param {string} categoryID 
 * @returns {Promise<string>}
 */
exports.getPathLegacy = async (categoryID,storyID) => [
	Object.entries(await exports.getDb('locations')).find(
		([,{categoryIDs}]) => categoryIDs.includes(categoryID)
	)[0],
	categoryID,
	storyID,
]
