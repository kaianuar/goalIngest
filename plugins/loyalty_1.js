var config = require('config');
var plugin = require('../utils/plugin');
var mysql = require('mysql');
var mysqlUtils = require('../utils/mysqlUtils');
var moment = require('moment');
var lodash = require('lodash');



var loyaltyPlugin = function(name) {
  this.name = name;
  return this;
};

loyaltyPlugin.prototype = new plugin();

loyaltyPlugin.prototype.getRewardKey = function(cb) {
  cb(null, 'loyalty:1year');
}

loyaltyPlugin.prototype.getReward = function(key, cb) {
  this.connection = mysql.createConnection(config.connection);

  connection.connect(function(err) {
    if(err) {
      cb(err);
    } else {
      mysqlUtils.query(connection, "SELECT id FROM #__rewards WHERE `reward_key`='"+key+"' LIMIT 0,1", config.plugins.loyalty.prefix, function(err, rows) {
        if(!err){
          if(rows.length) {
            cb(null, rows[0].id);
          } else {
            cb('Reward not found');
          }
        } else {
          cb(err);
        }
      });
    }
  });
};

loyaltyPlugin.prototype.getIgnorableUsers = function(row, cb) {
  this.reward_id = row;
  // Pass through
  cb(null, null);
}

loyaltyPlugin.prototype.getData = function( a, cb ){ 
  console.log(a, cb);
  mysqlUtils.query(this.connection, 'SELECT users.uid FROM users LEFT JOIN #__user_rewards ON #__user_rewards.user_id=users.uid WHERE #__user_rewards.id IS NULL AND FROM_UNIXTIME(users.created)<DATE_SUB(NOW(), INTERVAL 1 YEAR)', config.plugins.loyalty.prefix, function(err, rows) {
    cb(err, rows);
  });
}

loyaltyPlugin.prototype.processData = function(rows, cb ) {
  var idsonly = lodash.pluck(rows, 'uid');
  cb(null, lodash.without(idsonly, 0));
}

loyaltyPlugin.prototype.reward = function(ids, cb) {
  if(ids.length) {

    var query = lodash.template('INSERT INTO #__user_rewards (user_id, reward_id, awarded, is_new) VALUES <%= inserts %>');
    var template = lodash.template('(<%= user %>,'+this.reward_id+',NOW(),1)');
    var inserts = lodash.map(ids, function(id){
      return template({
        user: id
      });
    }).join(',');

    query = query({
      inserts:inserts
    });
    mysqlUtils.query(this.connection, query, config.plugins.loyalty.prefix, cb);
  } else {
    cb(null, 'No reward awarded');
  }
}

module.exports = loyaltyPlugin;
