const { getDb, setDb } = require('../utils/database')

exports.incrementView = async ({ query: { id } }, { send }) => {
	const path = [ 'storys', id, 'views' ]
	const view = await getDb( path ) + 1
	setDb( path, view )
	return send( view.toString() )
}
