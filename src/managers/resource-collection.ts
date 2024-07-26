import CONSTANTS from "../data/constants";
import { getTravelTime } from "../lib/movement";
import { lerp } from "../lib/util";
import { requestSpawn, getCreeps, cancelSpawn } from "./creep-spawn";

export type CreepMemoryHarvester = {
	type: "harvester";
};

export enum CreepCollectorMode {
	Collect = 0,
	Deliver = 1,
}

export type CreepMemoryCollector = {
	type: "collector";
	mode: CreepCollectorMode;
};

export type RoomInfo = {
	roomName: string;
	sources: {
		[sourceId: Id<Source>]: {
			sourceId: Id<Source>;
			harvesterSpawnRequestId: number;
			collectorSpawnRequestId: number;
		};
	};
};

declare global {
	interface Memory {
		resourceCollection: {
			rooms: { [roomName in string]: RoomInfo };
		};
	}
}

export const initialise = () => {
	Memory.resourceCollection = { rooms: {} };
};

export const uninitialiseSource = (roomName: string, sourceId: Id<Source>) => {
	const roomInfo = Memory.resourceCollection.rooms[roomName];
	if (roomInfo == null) return;
	const sourceInfo = roomInfo.sources[sourceId];
	if (sourceInfo == null) return;
	cancelSpawn(sourceInfo.harvesterSpawnRequestId);
	cancelSpawn(sourceInfo.collectorSpawnRequestId);
	delete roomInfo.sources[sourceId];
};

export const initialiseSource = (
	roomName: string,
	sourceId: Id<Source>,
	priority: number
) => {
	const roomInfo = Memory.resourceCollection.rooms[roomName];
	if (roomInfo == null) return;
	roomInfo.sources[sourceId] = {
		sourceId,
		harvesterSpawnRequestId: requestSpawn({
			paused: false,
			priority,
			position: {
				x: CONSTANTS.ROOM_SIZE.X / 2,
				y: CONSTANTS.ROOM_SIZE.Y / 2,
				roomName,
			},
			options: {
				memory: { data: { type: "harvester" } satisfies CreepMemoryHarvester },
			},
			count: 1,
			description: "Harvester",
			body: {
				base: [MOVE, WORK],
				module: [WORK],
				allowPartial: true,
				waitForEnergy: Object.keys(roomInfo.sources).length > 0,
			},
		}),
		collectorSpawnRequestId: requestSpawn({
			paused: false,
			priority,
			position: {
				x: CONSTANTS.ROOM_SIZE.X / 2,
				y: CONSTANTS.ROOM_SIZE.Y / 2,
				roomName,
			},
			options: {
				memory: {
					data: {
						type: "collector",
						mode: CreepCollectorMode.Collect,
					} satisfies CreepMemoryCollector,
				},
			},
			count: 1,
			description: "Collector",
			body: {
				base: [MOVE, CARRY, CARRY],
				module: [CARRY, CARRY, MOVE],
				allowPartial: true,
				waitForEnergy: Object.keys(roomInfo.sources).length > 0,
			},
		}),
	};
};

export const updateRoom = (roomName: string) => {
	const roomInfo = Memory.resourceCollection.rooms[roomName];
	if (roomInfo == null) return;
	const room = Game.rooms[roomName];
	if (room == null) uninitialiseRoom(roomName);

	const spawns = room.find(FIND_MY_SPAWNS);
	const getSourceTravelTime = (source: Source) =>
		Math.min(...spawns.map((spawn) => getTravelTime(source.pos, spawn.pos)));
	const activeSourceIds = room
		.find(FIND_SOURCES)
		.map((source) => ({ source, travelTime: getSourceTravelTime(source) }))
		.sort((a, b) => a.travelTime - b.travelTime)
		.map(({ source }) => source.id);

	for (const sourceId of Object.keys(roomInfo.sources) as Id<Source>[]) {
		if (!activeSourceIds.includes(sourceId)) {
			uninitialiseSource(roomName, sourceId);
		}
	}

	for (const [index, sourceId] of activeSourceIds.entries()) {
		if (!(sourceId in roomInfo.sources)) {
			const priority = lerp(
				CONSTANTS.SPAWN_PRIORITY.RESOURCE_COLLECTION_MIN,
				CONSTANTS.SPAWN_PRIORITY.RESOURCE_COLLECTION_MAX,
				1 - index / activeSourceIds.length
			);
			initialiseSource(roomName, sourceId, priority);
		}
	}
};

export const initialiseRoom = (roomName: string) => {
	Memory.resourceCollection.rooms[roomName] = {
		roomName,
		sources: {},
	};
	updateRoom(roomName);
};

export const uninitialiseRoom = (roomName: string) => {
	const roomInfo = Memory.resourceCollection.rooms[roomName];
	for (const sourceId of Object.keys(roomInfo.sources) as Id<Source>[]) {
		uninitialiseSource(roomName, sourceId);
	}
	delete Memory.resourceCollection.rooms[roomInfo.roomName];
};

export const update = () => {
	if (
		Game.time % CONSTANTS.INTERVALS.READ_ROOM_INTERVAL !==
		CONSTANTS.INTERVALS.READ_ROOM_OFFSET
	)
		return;
	for (const roomInfo of Object.values(Memory.resourceCollection.rooms)) {
		updateRoom(roomInfo.roomName);
	}
};

export const loop = () => {
	update();
	for (const roomInfo of Object.values(Memory.resourceCollection.rooms)) {
		for (const sourceInfo of Object.values(roomInfo.sources)) {
			const source = Game.getObjectById(sourceInfo.sourceId);
			if (source == null) continue;

			const harvesters = getCreeps(sourceInfo.harvesterSpawnRequestId);
			const collectors = getCreeps(sourceInfo.collectorSpawnRequestId);

			for (const harvester of harvesters) {
				if (harvester.harvest(source) === ERR_NOT_IN_RANGE) {
					harvester.moveTo(source, { visualizePathStyle: {} });
				}
			}

			for (const [index, collector] of collectors.entries()) {
				const collectorMemory = <CreepMemoryCollector>collector.memory.data;

				// Set mode
				if (
					collectorMemory.mode === CreepCollectorMode.Collect &&
					collector.store.getFreeCapacity(RESOURCE_ENERGY) <= 0
				) {
					collectorMemory.mode = CreepCollectorMode.Deliver;
				} else if (
					collectorMemory.mode === CreepCollectorMode.Deliver &&
					collector.store[RESOURCE_ENERGY] <= 0
				) {
					collectorMemory.mode = CreepCollectorMode.Collect;
				}

				// execute
				if (collectorMemory.mode === CreepCollectorMode.Collect) {
					const harvester = harvesters[index];
					if (harvester == null) continue;
					const [droppedEnergy] = harvester.pos.findInRange(
						FIND_DROPPED_RESOURCES,
						2,
						{
							filter: (DroppedResource) =>
								DroppedResource.resourceType === RESOURCE_ENERGY,
						}
					);
					if (droppedEnergy != null) {
						if (collector.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
							collector.moveTo(droppedEnergy, { visualizePathStyle: {} });
						}
					} else {
						collector.moveTo(harvester);
					}
				} else {
					const spawn = collector.pos.findClosestByRange(FIND_MY_SPAWNS);
					if (spawn != null) {
						if (
							collector.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE
						) {
							collector.moveTo(spawn, { visualizePathStyle: {} });
						}
					} else {
						console.log(`COLLECTOR "${collector.name}" UNABLE TO FIND SPAWN`);
					}
				}
			}
		}
	}
};
