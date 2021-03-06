/**
 * Initialize all events for smartContracts
 * @module controllers/events
 * @requires utils/transformToFullName
 * @requires web3
 * @requires config
 */

const _ = require('lodash'),
  config = require('../config'),
  mongoose = require('mongoose');

/**
 * Initialize all events for smartContracts
 * @param  {array} contracts Instances of smartContracts
 * @return {Object}          {eventModels, signatures}
 */
module.exports = (contracts) => {

  return _.chain(contracts)
    .map(value => //fetch all events
      _.chain(value).get('abi')
        .filter({type: 'event'})
        .value()
    )
    .flatten()
    .groupBy('name')
    .map(ev => ({
      name: ev[0].name,
      inputs: _.chain(ev)
        .map(ev => ev.inputs)
        .flattenDeep()
        .uniqBy('name')
        .value()
    })
    )
    .transform((result, ev) => { //build mongo model, based on event definition from abi

      result[ev.name] = mongoose.model(ev.name, new mongoose.Schema(
        _.chain(ev.inputs)
          .transform((result, obj) => {
            result[obj.name] = {
              type: new RegExp(/uint/).test(obj.type) ?
                Number : mongoose.Schema.Types.Mixed
            };
          }, {})
          .merge({
            controlIndexHash: {type: String, unique: true, required: true},
            network: {type: String},
            created: {type: Date, required: true, default: Date.now, expires: config.smartContracts.events.ttl}
          })
          .value()
      ));
    }, {})
    .value();

};
