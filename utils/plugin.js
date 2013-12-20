var async = require('async');

var plugin = module.exports = function() {
  var self = this;
  this.processReward = function() {
    async.waterfall([
      self.getRewardKey,
      self.getReward,
      self.getIgnorableUsers,
      self.getData,
      self.processData,
      self.reward      
    ], self.report);
  };

  this.report = function(err, results) {
    if(!err){
      console.log('Plugin ' + self.name + ' has completed successfully ' + JSON.stringify(results));
    } else {
      console.log('Plugin ' + self.name + ' failed with error ' + err);
    }
  }

  this.getRewardKey = function getRewardKey(cb) {
     cb('getRewardKey not implemented');
  };
  this.getReward = function getRewardKey(a, cb) {
     cb('getReward not implemented');
  };
  this.getIgnorableUsers = function getIgnorableUsers(a, cb) {
     cb('getIgnorableUsers not implemented');
  };
  this.getData = function getData(a, cb) {
     cb('getData not implemented');
  };
  this.processData = function processData(a, cb) {
     cb('processData not implemented');
  };
  this.reward = function reward(a, cb) {
     cb('reward not implemented');
  };
  return this;
}