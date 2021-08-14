const { setDb } = require('../utils/database')

const fetch = require('node-fetch')
const DOMParser = require('dom-parser')

const parser = new DOMParser()

exports.publishCases = async () => {
	const rows = await fetch('https://www.ausd.net/apps/pages/ArcadiaUnifiedCOVID19Dashboard')
	.then(res=>res.text())
	.then(text=>parser.parseFromString(text))
	.then(html=>html
		.getElementsByTagName('table')[0]
		.getElementsByTagName('tr')
		.map(row=>row
			.getElementsByTagName('td')
			.map(cell=>cell.textContent.toLowerCase().replace(/[^\w\.]+/g,'-').replace(/(^-)|(-$)/g,''))
		)
	)
	
	const headers = rows[0].slice(1)
	return Promise.all(
		rows.slice(1)
		.map(row => row.slice(1)
			.map( (cell,index) => [cell,row[0] + '-' + headers[index].split('-').pop()] )
			.filter( ([cell,label]) => label.endsWith('-students') || label.endsWith('-staff') )
			.map( ([cell,label]) => setDb(['covid-cases',label,Math.trunc(Date.now()/1000)],parseInt(cell)) )
		).flat()
	)
}
