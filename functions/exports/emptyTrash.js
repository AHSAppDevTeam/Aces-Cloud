const { getDb, setDb } = require('../utils/database')

exports.emptyTrash = async () => {
	const now = Math.trunc(Date.now()/1000)
	const storys = await getDb('storys')
	const path = 'categories/Trash/articleIDs'
	const storyIDs = await getDb(path)
	if(storyIDs) setDb( path, storyIDs.filter( id =>
		now
		- (storys[id].editTimestamp || storys[id].timestamp)
		< 7*24*60*60
	) )
}
