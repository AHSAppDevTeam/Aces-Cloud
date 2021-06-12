const { getDb, setDb } = require('../utils/database')

exports.incrementView = async ({ id }) => {
	const path = [ 'storys', id, 'views' ]
	const views = await getDb( path ) + 1
	setDb( path, views )
	return { views }
}
