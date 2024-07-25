const CONSTANTS = {
	/** how often to read persistent room data */
  lookupInterval : 10,
	/** how long to delay persistent room data reading to avoid high CPU usage in a single tick */
  lookupOffset   : 0,

	/** how often to spawn new creeps */
  spawnInterval  : 5,
	/** how long to delay spawning new creeps to avoid high CPU usage in a single tick */
  spawnOffset    : 1,

	/** base screeps room dimensions */
  roomSize : { x : 50, y : 50 },
} as const;

export default CONSTANTS;