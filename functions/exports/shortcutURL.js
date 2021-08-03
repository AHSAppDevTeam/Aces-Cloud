const { db } = require('../utils/database')

let shortcutURLs = {}
const ref = db.child('shortcutURLs')
ref.on( 'value', snapshot => {
	shortcutURLs = snapshot.val()
})

exports.redirectURL = async (req, res) => {

	const from = req.url.substring(1).toLowerCase()
	if ( from in shortcutURLs ) res.redirect(301, shortcutURLs[from])

	res.status(404).end()
}

exports.shortenURL = async (req, res) => {

	const from = req.body.a.toLowerCase().replace(/\W+/g,'_')
	const to = req.body.b

	if (
		from.length < 4 // not unique enough
		|| from.length > 512 // too much data
		|| to.length > 512 // too much data
	) res.status(400).send('400 Bad Request: Malformed inputs')

	if (
		from in shortcutURLs
	) res.status(400).send('400 Bad Request: Shortcut already occupied')
	
	ref.child(from).set(to)
	res.status(200).send('https://a.ahs.app/' + from)
}
