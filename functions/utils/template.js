const { getDb } = require('./database')

exports.templateFromSchema = async () => {
	const schema = await getDb('schemas/story')
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
