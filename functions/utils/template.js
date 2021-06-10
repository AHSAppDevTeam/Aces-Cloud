const { getDb } = require('./database')

exports.templateFromSchema = async source => {
	const schema = await getDb('schemas/'+source)
	const template = {}
	for (const key in schema)
		template[key] = {
			'Array<String>': [],
			'String': '',
			'Boolean': false,
			'Int': 0,
		}[schema[key]]
	return template
}
