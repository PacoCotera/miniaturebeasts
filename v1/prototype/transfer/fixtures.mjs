// Opaque authored cargo: no game values, genetics, yields or resource taxonomy.
export const firstCargo = Object.freeze({
  samples: Object.freeze([Object.freeze({ id: 'SAMPLE_A', historyRef: 'TRIP_A' }), Object.freeze({ id: 'SAMPLE_B', historyRef: 'TRIP_A' })]),
  resources: Object.freeze([Object.freeze({ id: 'LOT_A', historyRef: 'TRIP_A', quantity: 3 })]),
});
export const secondCargo = Object.freeze({
  samples: Object.freeze([Object.freeze({ id: 'SAMPLE_C', historyRef: 'TRIP_B' })]),
  resources: Object.freeze([Object.freeze({ id: 'LOT_B', historyRef: 'TRIP_B', quantity: 2 })]),
});
