var lodash = require('lodash');
var config = require('config');

lodash.each(config.plugins, function(item, k) {
  var plugin = require('./plugins/'+k);
  var thisPlugin = new plugin(k);
  if(item.period !== -1) {
    if(item.period){
      setInterval(thisPlugin.processReward, item.period * 1000);
    } else {
      thisPlugin.processReward();
    }
  } else {
    console.log('Skipping ' + k);
  }
});


