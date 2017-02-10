"use strict";

var Schema = require("../../models/base/schema.js");
var Promise = require("bluebird");
var Async = require("async");
var _ = require("lodash");
var Knexfile = require("../knexfile.js")
var Knex = require("knex")(Knexfile);
var config = {database: {knex: Knex}}
var dbConfig;

var createTable = function (tableName) {
  dbConfig = dbConfig || config.database;

  return dbConfig.knex.schema.createTable(tableName, function (table) {
    var column;
    var columnKeys = _.keys(Schema[tableName]);

    columnKeys.forEach(function (key) {

      if (Schema[tableName][key].type === "text" && Schema[tableName][key].hasOwnProperty("fieldtype")) {
        column = table[Schema[tableName][key].type](key, Schema[tableName][key].fieldtype);
      } else if (Schema[tableName][key].type === "string" && Schema[tableName][key].hasOwnProperty("maxlength")) {
        column = table[Schema[tableName][key].type](key, Schema[tableName][key].maxlength);
      } else {
        column = table[Schema[tableName][key].type](key);
      }

      if (Schema[tableName][key].hasOwnProperty("index") && Schema[tableName][key].index === true) {
        column.index()
      }

      if (Schema[tableName][key].hasOwnProperty("nullable") && Schema[tableName][key].nullable === true) {
        column.nullable();
      } else {
        column.notNullable();
      }

      if (Schema[tableName][key].hasOwnProperty("primary") && Schema[tableName][key].primary === true) {
        column.primary();
      }

      if (Schema[tableName][key].hasOwnProperty("unique") && Schema[tableName][key].unique === true) {
        column.unique();
      }

      if (Schema[tableName][key].hasOwnProperty("unsigned") && Schema[tableName][key].unsigned === true) {
        column.unsigned();
      }

      if (Schema[tableName][key].hasOwnProperty("references")) {
        column.references(Schema[tableName][key].references);
      }

      if (Schema[tableName][key].hasOwnProperty("defaultTo")) {
        if (Schema[tableName][key].defaultTo === 'now'){
          column.defaultTo(Knex.raw('now()'));
        }else{
          column.defaultTo(Schema[tableName][key].defaultTo);
        }
      }
    });
  });
};

var doesTableExist = function (tableName) {
  dbConfig = dbConfig || config.database;
  return dbConfig.knex.schema.hasTable(tableName);
};

var initDb = function () {
  var calls = [];
  var tableNames = _.keys(Schema);

  tableNames.forEach(function (tableName) {

    var f = function (callback) {
      doesTableExist(tableName)
      .then(function (exists) {
        if (!exists) {
          console.log("Creating database table " + tableName + "...");

          return createTable(tableName)
          .then(function (result) {
            console.log("---> Created database table " + tableName);
            return Promise.resolve(callback(null, result));
          })
          .catch(function (err) {
            console.log("Error creating " + tableName + " table " + err);
            return Promise.resolve(callback(err, null));
          });

        } else {
          console.log(tableName + " existed in database");
          return Promise.resolve(callback(null, exists));
        }
      })
      .catch(function (error) {
        console.log("Error creating " + tableName + " table " + error);
        return Promise.resolve(callback(error, null))
      });
    };

    calls.push(f);
  });

  Async.series(calls, function (err, result) {
    if (!err) {
      console.log("Finished initialising database table");
    } else {
      console.log("Error initialising database table: " + err);
    }
  });
};

exports.initialisation = initDb;
