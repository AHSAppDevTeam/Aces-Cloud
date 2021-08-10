const { setDb } = require('../utils/database')

const fetch = require('node-fetch')
const DOMParser = require('dom-parser')

const parser = new DOMParser()

exports.publishDashboard = async () => {
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
	return Promise.all(rows.slice(1).map(row=>{
		const school = row[0]
		return Promise.all(row.slice(1).map((cell,index)=> {
			const label = headers[index]
			setDb(['covid-dashboard',school,label,Math.trunc(Date.now()/1000)],parseInt(cell))
		}))
	}))
}
