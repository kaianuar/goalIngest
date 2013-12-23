var config = require('config');
var plugin = require('../utils/plugin');
var mysql = require('mysql');
var mysqlUtils = require('../utils/mysqlUtils');
var moment = require('moment');
var moment = require('moment-range');
var lodash = require('lodash');



var easygoingweekly = function(name) {
  this.name = name;
  return this;
};

easygoingweekly.prototype = new plugin();

easygoingweekly.prototype.getRewardKey = function(cb) {
  var now = moment().zone(config.timezone);
  var thisMonth = now.format('YYYY:MM');
  cb(null, 'easygoing:'+thisMonth);
}

function createName(mom) {
  var format = 'YYYY-MMM-DD';
  return 'Easy going reward from ' + moment(mom).startOf('month').format(format) + ' to ' + moment(mom).endOf('month').format(format); 
}

easygoingweekly.prototype.getReward = function(key, cb) {
  this.connection = mysql.createConnection(config.connection);

  connection.connect(function(err) {
    if(err) {
      cb(err);
    } else {
      mysqlUtils.query(connection, "SELECT id FROM #__rewards WHERE reward_key='" + key+ "'", config.plugins.easygoingweekly.prefix, function(err, rows) {
        if(!err){
          if(rows.length) {
            cb(null, rows[0].id);
          } else {
            var now = moment().zone(config.timezone);
            var insertQuery = lodash.template( "INSERT INTO #__rewards (`name`, `description`, `repeat`, `created_date`, `group`, `reward_key`) VALUES ('<%= name %>', '<%= description %>', 1, NOW(), NULL, '<%= key %>')" );
            insertQuery = insertQuery({
              name: createName(now),
              description: 'It s nice that you have come to the gym every week this month!',
              key: key
            });
            mysqlUtils.query(connection, insertQuery, config.plugins.easygoingweekly.prefix, function(err, row) {
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

easygoingweekly.prototype.getIgnorableUsers = function(row, cb) {
  this.reward_id = row;
  // Pass through
  cb(null, null);
}

easygoingweekly.prototype.getData = function( a, cb ){ 
  var now = moment().zone(config.timezone);
  var startOfMonth = moment(now).startOf('month').toISOString();
  var endOfMonth = moment(now).endOf('month').toISOString();
  var query = "SELECT GROUP_CONCAT( EnterDate ) AS dates , COUNT( UserId ) AS co, UserId FROM  `creadhoc_userpresenceinclub` WHERE EnterDate BETWEEN  '"+startOfMonth+"' AND '" +endOfMonth+ "' GROUP BY UserId HAVING co >=1";
  // Careful, query callback passes more than just rows as arguments (so don't simply put cb as callback)
  mysqlUtils.query(this.connection, query, '', function(err, rows){
    cb(err, rows);
  });
}

easygoingweekly.prototype.processData = function(rows, cb) {
  var now = moment().zone(config.timezone);
  var startDate = moment(now).startOf('month').toISOString();
  var endOfMonth = moment(now).endOf('month').toISOString();    
  var endDate;
  var weeks = [];

  for (var i = 1; i <= 4; i++) {
    endDate = moment(startDate).add('days', 7).toISOString();

    if(i === 4){
      endDate = endOfMonth;
    }
    range = moment().range(startDate, endDate);
    weeks.push({
        range : range
    });
    startDate = endDate;

  };

  var ids = [];

  lodash.each(rows, function(row) {
    // Split at separator

    var weekAttendance = {};
    var weekNo = 1;
    var inWeek;    

    var dates = row.dates.split(',');
    lodash.each(weeks, function(week){
      lodash.each(dates, function(date){
        inWeek =  moment(date).within(week.range);
        if(inWeek){
          // console.log("Date is within week... breaking off");
          return false;
        }  
        // console.log("Checking Next Date");
      });
      if(inWeek){
        weekAttendance[weekNo] = true;
      }else{
        weekAttendance[weekNo] = false;        
      }    
      // console.log("Checking next week");  
      weekNo+=1;
    });

    // console.log("Checking next row");
    console.log(row.UserId, weekAttendance);

    var times = lodash.reduce(weekAttendance, function(result, attend, weekNo) {
      console.log(weekNo, attend);
      if(attend === true){
        result+=1;
      }else{
        result;
      }
      return result;
    }, 0);

    console.log(times);


    ids.push({
      uid: row.UserId,
      times: times 
    });
  });
  cb(null, ids);
}

easygoingweekly.prototype.reward = function(users, cb) {
  if(users.length) {
    var query = lodash.template('INSERT INTO #__user_rewards (user_id, reward_id, awarded, is_new, progress) VALUES <%= inserts %> ON DUPLICATE KEY UPDATE progress=VALUES(progress), awarded = NOW()');
    var template = lodash.template('(<%= user %>,'+this.reward_id+',<%= awarded %>,1, <%= progress %>)');
    var inserts = lodash.map(users, function(user){
      if(user.times >=4) {
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
    mysqlUtils.query(this.connection, query, config.plugins.easygoingweekly.prefix, cb);
  } else {
    cb(null, 'No reward awarded');
  }
}

module.exports = easygoingweekly;
