const { discord } = require('../utils/discord')
const { getDb, setDb, auth } = require('../utils/database')
const { diff, formattedDiff, someIn } = require('../utils/objects')
const { getRelatedStoryIDs } = require('../utils/related')

const fetch = require('node-fetch')
const { getAverageColor } = require('fast-average-color-node')
const sanitizeHTML = require('sanitize-html')
const marked = require('marked')

exports.reviseStory = async ( change, { params: { storyID }, authType, auth: authInfo } ) => {

	const before = change.before.val() || {}
	const after = change.after.val() || {}
	const changes = diff(before,after)
	const story = {...await getDb(['storys',storyID]), ...after}

	if (changes.length === 0) return
	story.editTimestamp = Math.floor(Date.now()/1000)

	const db = Object.fromEntries(
		await Promise.all(['categories','snippets','schemas','notifIDs']
		.map(key=>Promise.all([key,getDb(key)])))
	)

	if (someIn(changes,'markdown'))
		story.body = sanitizeHTML( marked(after.markdown), {
			allowedTags: [
				"address", "article", "aside", "footer", "header", "h1", "h2", "h3", "h4",
				"h5", "h6", "hgroup", "main", "nav", "section", "blockquote", "dd", "div",
				"dl", "dt", "figcaption", "figure", "hr", "li", "main", "ol", "p", "pre",
				"ul", "a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data", "dfn",
				"em", "i", "kbd", "mark", "q", "rb", "rp", "rt", "rtc", "ruby", "s", "samp",
				"small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr", "caption",
				"col", "colgroup", "table", "tbody", "td", "tfoot", "th", "thead", "tr"
			  ],
			  disallowedTagsMode: 'discard',
			  allowedAttributes: {
				a: [ 'href', 'name', 'target', 'title' ],
				td: [ 'width' ],
			  },
		})

	if (someIn(changes,'timestamp'))
		story.date = new Date(after.timestamp*1000)
		.toLocaleDateString('en-US', {
			timeZone: 'America/Los_Angeles',
			weekday: 'long',
			month: 'long',
			day: 'numeric',
		})

	if (someIn(changes,'categoryID'))
		story.visible = db.categories[after.categoryID]?.visible

	if (someIn(changes,'thumbURLs') && after.thumbURLs)
		story.color = await fetch(after.thumbURLs[0])
		.then(response=>response.blob())
		.then(blob=>blob.arrayBuffer())
		.then(array=>Buffer.from(array))
		.then(buffer=>getAverageColor(buffer))
		.then(color=>color.hex)

	// find similar storys
	if (someIn(changes,'title') && 'title' in after)
		story.relatedArticleIDs = await getRelatedStoryIDs({
			categories: db.categories,
			snippets: db.snippets,
			story: after,
			storyID,
		})
	
	setDb(['storys',storyID],story)

	// log to discord
	const user = authType === 'ADMIN'
	? 'Aces Cloud'
	: authType === 'USER'
	? await auth.getUser(authInfo.uid).then(user=>user.email||'')
	: 'Anonymous'
	
	discord({
		author: user,
		id: storyID, 
		title: '✏️ ' + after.title, 
		description: formattedDiff(before,after),
	})
}
