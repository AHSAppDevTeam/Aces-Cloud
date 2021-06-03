const { dbGet, dbSet } = require('../utils/database')

exports.emptyTrash = async () => {
	const now = Math.trunc(Date.now()/1000)
	const storys = await dbGet('storys')
	const path = 'categories/Trash/articleIDs'
	const storyIDs = await dbGet(path)
	if(storyIDs) dbSet( path, storyIDs.filter( id =>
		now
		- (storys[id].editTimestamp || storys[id].timestamp)
		< 7*24*60*60
	) )
}
