// app/controllers/vehicle.js

const
  _                   = require('../lib/lodashExt')
  , ReqUtils          = require('../lib/reqUtils')
;

/**
 * @example
 * let vehicleController = new VehicleController(dbconn, models, logger)
 */
class VehicleController {
  /**
   * @param {DBConn} dbconn - Database connection object.
   * @param {!Object} models - The object containing all the models.
   * @param {Logger} log - The output logger.
   */
  constructor(dbconn, models, cache, log) {
    this.log = log;
    this.model = new models.Vehicle(dbconn, log).model;
  }

  read(req, res, next) {
    let reqUtils = new ReqUtils(req);

    if (!reqUtils.hasResponse()) {
      // Get the vehicle ID from the params or form body
      // Or the dealerID from the authenticated request
      let vehicleID = req.params.vehicleID ||  req.body.vehicleID || req.headers.vehicleid || req.query.vehicleID;
      let dealerID = req.body.dealerID || req.headers.dealerid || req.query.dealerID || req.dealerID;

      // Check Required parameters
      let reqParams = reqUtils.hasRequiredParams({ vehicleID: vehicleID, dealerID: dealerID });
      if (reqParams.length > 0) {
        // We have missing parameters, report the error
        reqUtils.setError(400003);
        // Return an error below
        next(`Required parameters [${reqParams}] are missing from this request.`);
        return;
      }
      // TODO: Add parameter validation and SQL Injection checking where needed
      try {
        this.model.findById(vehicleID)
        .then((vehicle) => {
          if (!vehicle) {
            reqUtils.setError(400002);
            next(`The 'vehicleID': '${vehicleID}' does not exist.`);
          } else {
            // Check that the dealerID passed matches the dealerID of the vehicle
            // Return an 'unauthorized' error if it doesn't match
            if (vehicle.dealerID == dealerID) {
              vehicle.images = JSON.parse(vehicle.images);
              reqUtils.setData(vehicle);
              next()
            } else {
              reqUtils.setError(400001);
              // Return an error below
              next('The \'dealerID\' passed is invalid for this vehicle.');
            }
          }
        })
        .catch((err) => {
          reqUtils.setError(500001);
          next(err);
        });
      } catch (err) {
        reqUtils.setError(500001);
        next(err);
      }
    } else {
      next();
    }
  }

  list(req, res, next) {
    let reqUtils = new ReqUtils(req);

    if (!reqUtils.hasResponse()) {      // Get the dealer ID from the params or form body
      // Or the dealerID from the authenticated request
      let page = req.params.page || req.body.page || req.headers.page || req.query.page;
      let limit = req.params.limit || req.body.limit || req.headers.limit || req.query.limit;
      let dealerID = req.body.dealerID || req.headers.dealerid || req.query.dealerID || req.dealerID;
      let offset;

      // Set Defaults
      page = Number((page < 1) ? 1 : (page || 1));        // Default to the first page and remove values under 1
      limit = Number((limit < 1) ? 1 : (limit || 100));   // Default to a limit of 100 rows
      offset = limit * (page - 1);                        // Calculate the offset

      // Check Required parameters
      let reqParams = reqUtils.hasRequiredParams({ dealerID: dealerID });
      if (reqParams.length > 0) {
        // We have missing parameters, report the error
        reqUtils.setError(400003);
        // Return an error below
        next(`Required parameters [${reqParams}] are missing from this request.`);
        return;
      }
      // TODO: Add parameter validation and SQL Injection checking where needed
      let options = {
        where: {
          dealerID: dealerID
        },
        order: [['listingDate','DESC']],  // This MUST be a nested array
        offset: 0,
        limit: limit
      }
      if (page > 1) options.offset = offset;
      try {
        this.model.findAll(options)
        .then((vehicles) => {
          if (!vehicles) {
            reqUtils.setData({});
            req.count = 0;
          }
          else {
            reqUtils.setData(_.forEach(vehicles, (value) => {
              value.images = JSON.parse(value.images);
            }));
            req.count = vehicles.length;
          }
          next();
        })
        .catch((err) => {
          reqUtils.setError(500001);
          next(err);
        });
      } catch(err) {
        reqUtils.setError(500001);
        next(err);
      }
    } else {
      next();
    }
  }
}

module.exports = VehicleController;
