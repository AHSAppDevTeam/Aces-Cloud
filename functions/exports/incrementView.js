const { getDb, setDb } = require('../utils/database')

exports.incrementView = async ({ id }) => {
	if( !id || id.length > 64 || id.includes('/') ) return false
	const snippet = await getDb( ['snippets',id] )
	if( !snippet ) return false
	const views = ( snippet.views || 0 ) + 1
	setDb( ['storys',id,'views'], views )
	return { views }
}
