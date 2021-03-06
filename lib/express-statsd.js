var assert = require('assert');
var extend = require('obj-extend');
var Lynx = require('lynx');

module.exports = function expressStatsdInit (options) {
  // Function called on response finish that sends stats to statsd
  function sendStats(req, res, client, startTime, options) {
    var key = req[options.requestKey];
    key = key ? key + '.' : '';

    // Status Code
    var statusCode = res.statusCode || 'unknown_status';
    client.increment(key + 'status_code.' + statusCode);

    // Response Time
    var duration = new Date().getTime() - startTime;
    client.timing(key + 'response_time', duration);
  }

  options = extend({
    requestKey: 'statsdKey',
    host: '127.0.0.1',
    port: 8125,
    sendStats: sendStats
  }, options);

  assert(options.requestKey, 'express-statsd expects a requestKey');

  var client = options.client || new Lynx(options.host, options.port, options);

  return function expressStatsd (req, res, next) {
    var startTime = new Date().getTime();

    function send () {
      options.sendStats(req, res, client, startTime, options);
      cleanup();
    }

    // Function to clean up the listeners we've added
    function cleanup() {
      res.removeListener('finish', send);
      res.removeListener('error', cleanup);
      res.removeListener('close', cleanup);
    }

    // Add response listeners
    res.once('finish', send);
    res.once('error', cleanup);
    res.once('close', cleanup);

    if (next) {
      next();
    }
  };
};
