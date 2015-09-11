/*!
 * Module dependencies
 */
var couchbase = require('couchbase');
var util = require('util');
var Connector = require('loopback-connector').Connector;
var debug = require('debug')('loopback:connector:couchbase3');

var Promise = require('bluebird');

function noop(err, res) {}

/**
 * Initialize the Couchbase connector for the given data source
 * @param {DataSource} dataSource The data source instance
 * @param {Function} [callback] The callback function
 */
exports.initialize = function initializeDataSource(dataSource, callback) {
  var settings = dataSource.settings;

  // Cluster.
  if (settings.cluster == null) {
    settings.cluster = {};
  }
  if (settings.cluster.url == null) {
    debug('Cluster URL settings missing; trying default');
    settings.cluster.url = 'couchbase://127.0.0.1';
  }
  if (settings.cluster.port == null) {
    debug('Cluster port settings missing; trying default');
    settings.cluster.port = '8091';
  }
  if (settings.cluster.options == null) {
    debug('Cluster connection settings missing; trying default');
    settings.cluster.options = {};
  }
  if (settings.cluster.connectionTimeout == null || settings.cluster.operationTimeout == null) {
    debug('Cluster timeout settings missing; trying default');
    settings.cluster.connectionTimeout = '20000';
    settings.cluster.operationTimeout = '25000';
  }

  // Bucket.
  if (settings.bucket == null) {
    settings.bucket = {};
  }
  if (settings.bucket.name == null) {
    debug('Bucket name settings missing; trying default');
    settings.bucket.name = 'default';
  }
  if (settings.bucket.password == null) {
    debug('Bucket password settings missing; using empty password');
    settings.bucket.password = '';
  }

  dataSource.connector = new Couchbase(settings, dataSource);

  // Though not mentioned, initialize() is expected to connect().
  // @see dataSource.setup()
  if (callback) {
    dataSource.connector.connect(callback);
  }
};

/**
 * The constructor for Couchbase connector
 * @param {Object} settings The settings object
 * @param {DataSource} dataSource The data source instance
 * @constructor
 */
function Couchbase(settings, dataSource) {
  Connector.call(this, 'couchbase', settings);

  debug('Settings: %j', settings);

  this.dataSource = dataSource;
}

util.inherits(Couchbase, Connector);

/**
 * Connect to Couchbase
 * @param {Function} [callback] The callback function
 *
 * @callback callback
 * @param {Error} err The error object
 */
Couchbase.prototype.connect = function(callback) {
  if (callback == null) {
    callback = noop;
  }
  var self = this;
  var settings = this.settings;
  // Handle with promise.
  var promise;
  var resolved = function(res) {
    return callback(null, res);
  };
  // The cached promise.
  promise = this._connection;
  if (promise != null) {
    promise.then(resolved, callback);
    return promise;
  }
  // Connect.
  promise = new Promise(function(resolve, reject) {
    self.cluster = new couchbase.Cluster(settings.cluster.url, settings.cluster.options);
    // Open bucket here.
    // @see http://developer.couchbase.com/documentation/server/4.0/sdks/node-2.0/performance-tuning.html
    self.bucket = self.cluster.openBucket(settings.bucket.name, settings.bucket.password, function(err) {
      if (err) {
        debug('connection is failed');
        return reject(err);
      }
      debug('connection is established');
      resolve(self.bucket);
    });
  });
  // Cache the promise.
  this._connection = promise;
  promise.then(resolved, callback);
  return promise;
};

/**
 * Disconnect from Couchbase
 */
Couchbase.prototype.disconnect = function(callback) {
  debug('disconnect');
  if (callback == null) {
    callback = noop;
  }
  // Handle with promise.
  var promise;
  var resolved = function(res) {
    return callback(null, res);
  };
  // The cached promise.
  promise = this._connection;
  if (promise == null) {
    return Promise.resolve(true).then(resolved, callback);
  }
  // Disconnect.
  promise = promise.then(function(bucket) {
    bucket.disconnect();
    return true;
  });
  // Cleanup.
  this._connection = null;
  this.bucket = null;
  this.cluster = null;
  return promise.then(resolved, callback);
};


/**
 * Create a new model instance
 */
Couchbase.prototype.create = function (model, data, callback) {
};

/**
 * Save a model instance
 */
Couchbase.prototype.save = function (model, data, callback) {
};

/**
 * Check if a model instance exists by id
 */
Couchbase.prototype.exists = function (model, id, callback) {
  var self = this;
  self.bucket.get(id, function(err, result) {
    if (err) {
      debug(err.message);
      // Code 13 is 'The key does not exist on the server'
      if(err.code && err.code == 13) {
        callback(null, false);
      }
    } else {
      debug(err.message);
      callback(null, true);
    }
  });
};

/**
 * Find a model instance by id
 */
Couchbase.prototype.find = function find(model, id, callback) {
};

/**
 * Update a model instance or create a new model instance if it doesn't exist
 */
Couchbase.prototype.updateOrCreate = function updateOrCreate(model, data, callback) {
};

/**
 * Delete a model instance by id
 */
Couchbase.prototype.destroy = function destroy(model, id, callback) {
};

/**
 * Query model instances by the filter
 */
Couchbase.prototype.all = function all(model, filter, callback) {
};

/**
 * Delete all model instances
 */
Couchbase.prototype.destroyAll = function destroyAll(model, callback) {
};

/**
 * Count the model instances by the where criteria
 */
Couchbase.prototype.count = function count(model, callback, where) {
};

/**
 * Update the attributes for a model instance by id
 */
Couchbase.prototype.updateAttributes = function updateAttrs(model, id, data, callback) {
};