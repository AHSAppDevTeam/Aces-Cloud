const { discord } = require('../utils/discord')
const { getDb, setDb } = require('../utils/database')
const { id } = require('../utils/id')
const { templateFromSchema } = require('../utils/template')

const fetch = require('node-fetch')
const DOMParser = require('dom-parser')
const Turndown = require('turndown')
const { imgbb } = require('../utils/imgbb')

const parser = new DOMParser()
const turned = new Turndown()
turned.remove('img')
const parse_xml = str => parser.parseFromString(str)
const html_to_md = html => turned.turndown(html)

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
 
exports.publishFeed = async () => {
	
	const feeds = await getDb('feeds')
	const template = await templateFromSchema('input')

	for (const key in feeds) {

		const feed = feeds[key]

		const items = await fetch(feed.url)
			// Get plaintext XML
			.then(response => response.text())
			// Remove CDATA blocks
			.then(text => text.replace(/(\<\!\[CDATA\[|\]\]\>)/g,''))
			// Sanitize colons in tag names
			.then(text => text.replace(/(\<\/?\w+)\:(\w+.*?\>)/g,'$1X$2'))
			// Parse XML
			.then(parse_xml)
			// Get the individual entries
			.then(xml => xml.getElementsByTagName(feed.item))

		for (const item of items.slice(0,12)) {
			// temporary measure to stop categoryID write collisions
			await sleep(500)

			let story = { }

			// fill from schema
			for(const key in feed.schema) {
				const value = item.getElementsByTagName(feed.schema[key])[0]?.innerHTML
				story[key] = value || ''
			}

			// base ID from title
			const storyID = id(...story.title.match(
					new RegExp(`.{${~~(story.title.length/3)}}`,'g')
			))

			// fill with template and older versions of the story
			story = {
				...template,
				...await getDb(['inputs',storyID]) || {},
				...story,
				categoryID: key,
				timestamp: Math.trunc(Date.parse(story.date)/1000),
				markdown: html_to_md(story.body)+'\n\n'+feed.footer,
			}

			// find image tags from the story
			story.imageURLs = story.body.match(/(?<=\<img src\=['"]).*?(?=['"].*?\>)/g) || []
			
			// org-specific fixes
			switch(key){
				case 'APN':
					story = {
						...story,
						videoIDs: [story.videoID],
						imageURLs: [`https://img.youtube.com/vi/${story.videoID}/maxresdefault.jpg`],
						title: story.title.split(': ')[1] || '',
					}
					break
				case 'KiA':
					story = {
						...story,
						title: story.title.split(/#\d+\s/)[1] || '',
						imageURLs: [item.getElementsByTagName('itunesXimage')[0]?.getAttribute('href')],
					}
			}
			
			// upload external images to imgBB
			const sets = await Promise.all(story.imageURLs.map(imgbb))
			story.imageURLs = sets.map(x=>x.imageURL)
			story.thumbURLs = sets.map(x=>x.thumbURL)

			// remove temp props
			story = Object.fromEntries(
				Object.entries(story)
				.filter( ([key,value]) => 
					( key in template ) &&
					( Array.isArray(value) ? ( value.length > 0 ) : ( value !== undefined ) )
				)
			)

			// publish
			setDb(['inputs',storyID],story)
		}
	}
}
