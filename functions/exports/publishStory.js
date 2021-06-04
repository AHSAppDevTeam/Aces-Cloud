
const { getDb, setDb, setDbLegacy, getPathLegacy, auth } = require('../utils/database')
const { diff, formattedDiff, someIn } = require('../utils/objects')
const { getRelatedStoryIDs } = require('../utils/related')



exports.publishStory = async ( change, { params: { storyID } } ) => {

	const before = change.before.val() || {}
	const after = change.after.val() || {}
	const changes = diff(before,after)

	if (changes.length === 0) return

	const db = Object.fromEntries(
		await Promise.all(['categories','snippets','schemas','notifIDs']
		.map(key=>Promise.all([key,getDb(key)])))
	)

	setMirrors({
		schemas: db.schemas,
		story: after,
		storyID,
		changes,
	})

	if (someIn(changes,'visible'))
		Promise.all(
			(after.relatedStoryIDs || [])
			.filter(id=>id in snippets)
			.map(id=>
				getRelatedStoryIDs(snippets[id],id)
				.then(storyIDs=>setDb(['storys',id,'relatedArticleIDs'],storyIDs))
			)
		)
	
	// set categories
	if (someIn(changes,'categoryID') && 'categoryID' in before)
		setCategoryStoryIDs({
			categories: db.categories,
			snippets: db.snippets,
			categoryID: before.categoryID,
			storyID,
			insert: false,
		})

	if (someIn(changes,'timestamp','categoryID') && 'categoryID' in after)
		setCategoryStoryIDs({
			categories: db.categories,
			snippets: db.snippets,
			categoryID: after.categoryID,
			storyID,
			insert: true,
		})

	// set featured category
	if (someIn(changes,'featured') && 'featured' in before)
		setCategoryStoryIDs({
			categories: db.categories,
			snippets: db.snippets,
			categoryID: 'Featured',
			storyID,
			insert: after.featured && after.visible,
		})

	// remove notification if unnotified
	if (someIn(changes,'notified') && before.notified)
		removeNotif({
			notifIDs: db.notifIDs,
			storyID,
		})

	// set thumbnails
	if (someIn(changes,'categoryID'))
		setCategoryThumbURLs({
			categories: db.categories,
			snippets: db.snippets,
			categoryID: before.categoryID,
		})
	
	if (someIn(changes,'featured','timestamp','thumbURLs','categoryID'))
		setCategoryThumbURLs({
			categories: db.categories,
			snippets: db.snippets,
			categoryID: after.categoryID,
		})
}

/**
 * Mirrors a story into objects which have less properties & are quicker to access
 * @param {Object} obj
 * @param {Object} obj.schemas
 * @param {Object} obj.story 
 * @param {string} obj.storyID 
 * @param {string[]} obj.changes
*/
async function setMirrors({schemas,story,storyID,changes}){
	const mirrors = ['article','snippet']
	if(story.notified) mirrors.push('notif')
	for(const type of mirrors){
		const schema = Object.keys(schemas[type])
		if(someIn(schema,changes)) continue
		const mirror = Object.fromEntries(
			Object.entries(story).filter(([key])=>schema.includes(key))
		)
		setDb( [type+'s',storyID], mirror )
	}
	setDbLegacy(
		await getPathLegacy(story.categoryID,storyID),
		{
			...Object.fromEntries(
				Object.entries(story)
				.filter(([key])=>key in schemas.legacy)
				.map(([key,value]) => [schemas.legacy[key],value])
			),
			...{ hasHTML: true }
		}
	)
}

/**
 * Generates thumbnails for a category
 * @param {Object} obj
 * @param {Object} obj.snippets
 * @param {Object} obj.categories
 * @param {string} obj.categoryID 
 */
async function setCategoryThumbURLs({categories,snippets,categoryID}){
	const thumbURLs = (categories[categoryID].articleIDs || [])
	.map( id => snippets[id] )
	.filter( snippet => 'thumbURLs' in snippet ) // select articles with images
	.sort( (a,b) => b.featured - a.featured ) // prioritize featured articles
	.slice(0, 4) // trim to first 4 articles
	.map( snippet => snippet.thumbURLs[0] ) // map to image array
	return setDb(['categories',categoryID,'thumbURLs'], thumbURLs )
}

/**
 * Adds or removes a story to a category's articleIDs collection
 * @param {Object} obj
 * @param {Object} obj.categories
 * @param {Object} obj.snippets
 * @param {string} obj.categoryID
 * @param {string} obj.storyID
 * @param {Boolean} obj.insert
 */
async function setCategoryStoryIDs({categories,snippets,categoryID,storyID,insert}){
	let storyIDs = categories[categoryID].articleIDs || []
	storyIDs = storyIDs.filter(x=>x!==storyID)
	if (insert) {
		const index = storyIDs.findIndex(id=>snippets[id].timestamp < snippets[storyID].timestamp)
		index < 0 ? storyIDs.push(storyID) : storyIDs.splice(index,0,storyID)
	} else {
		setDbLegacy(await getPathLegacy(categoryID,storyID),null)
	}
	return setDb(['categories',categoryID,'articleIDs'],storyIDs)
}

/**
 * Remove a story from the notification list
 * @param {Object} obj
 * @param {string} obj.storyID
 * @param {string} obj.notifIDs 
 */
async function removeNotif({storyID,notifIDs}){
	setDb('notifIDs',notifIDs.filter(x=>x!==storyID))
}
