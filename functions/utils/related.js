const levenshtein = require('js-levenshtein')

/**
 * Get ids of articles related to this title
 * @param {Object} obj
 * @param {Object} obj.snippets
 * @param {Object} obj.categories
 * @param {string} obj.title 
 * @param {string} obj.storyID 
 */
 exports.getRelatedStoryIDs = async ({snippets,categories,title,storyID}) =>
	Object.keys(snippets)
	.filter( id => ( id !== storyID ) && categories[snippets[id].categoryID]?.visible )
	.sort( (a, b) =>
		levenshtein( snippets[a].title + ' ', title + ' ' ) -
		levenshtein( snippets[b].title + ' ', title + ' ' )
	)
	.slice(0, 4)
