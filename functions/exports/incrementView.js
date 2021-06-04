const { getDb, setDb } = require('../utils/database')

exports.incrementView = async ({ id: storyID }) => {
  const path = [ 'storys', storyID, 'views' ]
  setDb( path, Number( await getDb(path) + 1 ) )
}

