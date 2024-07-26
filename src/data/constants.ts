const CONSTANTS = {
	/** values which determine how often / when a process should run */
	INTERVALS: {
		/** how often to read persistent room data */
		READ_ROOM_INTERVAL : 10,
		/** how long to delay persistent room data reading to avoid high CPU usage in a single tick */
		READ_ROOM_OFFSET   : 0,

		/** how often to spawn new creeps */
		SPAWN_INTERVAL  : 5,
		/** how long to delay spawning new creeps to avoid high CPU usage in a single tick */
		SPAWN_OFFSET    : 1,
	},

	SPAWN_PRIORITY: {
		RESOURCE_COLLECTION_MAX: 1000,
		RESOURCE_COLLECTION_MIN: 900,

		CONSTRUCTION: 500,
	},

	/** base screeps room dimensions */
  ROOM_SIZE : { X : 50, Y : 50 },
} as const;

export default CONSTANTS;