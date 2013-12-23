var config = require('config');
var plugin = require('../utils/plugin');
var mysql = require('mysql');
var mysqlUtils = require('../utils/mysqlUtils');
var moment = require('moment');
var lodash = require('lodash');



var latenighterweekly = function(name) {
  this.name = name;
  return this;
};

latenighterweekly.prototype = new plugin();

latenighterweekly.prototype.getRewardKey = function(cb) {
  var now = moment().zone(config.timezone);
  var thisWeek = now.format('YYYY:w');
  cb(null, 'latenight:'+thisWeek);
}

function createName(mom) {
  var format = 'YYYY-MMM-DD';
  return 'Late night reward from ' + moment(mom).startOf('week').format(format) + ' to ' + moment(mom).endOf('week').format(format); 
}

latenighterweekly.prototype.getReward = function(key, cb) {
  this.connection = mysql.createConnection(config.connection);

  connection.connect(function(err) {
    if(err) {
      cb(err);
    } else {
      mysqlUtils.query(connection, "SELECT id FROM #__rewards WHERE reward_key='" + key+ "'", config.plugins.latenighterweekly.prefix, function(err, rows) {
        if(!err){
          if(rows.length) {
            cb(null, rows[0].id);
          } else {
            var now = moment().zone(config.timezone);
            var insertQuery = lodash.template( "INSERT INTO #__rewards (`name`, `description`, `repeat`, `created_date`, `group`, `reward_key`) VALUES ('<%= name %>', '<%= description %>', 1, NOW(), NULL, '<%= key %>')" );
            insertQuery = insertQuery({
              name: createName(now),
              description: 'It s nice that you come late at night!! Woohooo',
              key: key
            });
            mysqlUtils.query(connection, insertQuery, config.plugins.latenighterweekly.prefix, function(err, row) {
              cb(err, row.insertId);
            });
          }
        } else {
          cb(err);
        }
      });
    }
  });
};

latenighterweekly.prototype.getIgnorableUsers = function(row, cb) {
  this.reward_id = row;
  // Pass through
  cb(null, null);
}

latenighterweekly.prototype.getData = function( a, cb ){ 
  var now = moment().zone(config.timezone);
  var startOfWeek = moment(now).startOf('week').toISOString();
  var endOfWeek = moment(now).endOf('week').toISOString();
  var query = "SELECT GROUP_CONCAT( EnterDate ) AS dates , COUNT( UserId ) AS co, UserId FROM  `creadhoc_userpresenceinclub` WHERE EnterDate BETWEEN  '"+startOfWeek+"' AND '" +endOfWeek+ "' GROUP BY UserId HAVING co >3";
  // Careful, query callback passes more than just rows as arguments (so don't simply put cb as callback)
  mysqlUtils.query(this.connection, query, '', function(err, rows){
    cb(err, rows);
  });
}

latenighterweekly.prototype.processData = function(rows, cb) {

  var ids = [];
  lodash.each(rows, function(row) {
    // Split at separator
    var dates = row.dates.split(',');
    var times = lodash.reduce(dates, function(result, date) {
      date = moment(date);
      var referenceMoment = moment(date).hour(22).minutes(0).seconds(0);
      return (referenceMoment.isBefore(date) ? result+1 : result);
    },0 );
    ids.push({
      uid: row.UserId,
      times: times 
    });
  });
  cb(null, ids);
}

latenighterweekly.prototype.reward = function(users, cb) {
  if(users.length) {
    var query = lodash.template('INSERT INTO #__user_rewards (user_id, reward_id, awarded, is_new, progress) VALUES <%= inserts %> ON DUPLICATE KEY UPDATE progress=VALUES(progress), awarded = NOW()');
    var template = lodash.template('(<%= user %>,'+this.reward_id+',<%= awarded %>,1, <%= progress %>)');
    var inserts = lodash.map(users, function(user){
      if(user.times >=3) {
        return template({
          user: user.uid,
          awarded: 'NOW()',
          progress: 'NULL'
        });
      } else {
        return template({
          user: user.uid,
          awarded: 'NULL',
          progress: "'" + user.times + " times'"
        });
      }
    }).join(',');

    query = query({
      inserts:inserts
    });
    mysqlUtils.query(this.connection, query, config.plugins.latenighterweekly.prefix, cb);
  } else {
    cb(null, 'No reward awarded');
  }
}

module.exports = latenighterweekly;
