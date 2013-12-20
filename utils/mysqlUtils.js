
function prefix(query, prefix) {
  return query.replace(/#__/g, prefix);
}

var mysqlUtils = module.exports = {
    query: function(connection, query, px, cb) {
      query = prefix(query, px);
      console.log('Calling mysql query: ' + query);
      connection.query(query, cb);
    }
}