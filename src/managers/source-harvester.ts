import CONSTANTS from "../data/constants";
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

export type SourceInfo = {
	roomName: string;
	sourceId: Id<Source>;
	harvesterSpawnRequestId: number;
	collectorSpawnRequestId: number;
};

declare global {
	interface Memory {
		sourceHarvester: {
			sources: { [sourceId in SourceInfo['sourceId']]: SourceInfo };
		};
	}
}

export const initialise = () => {
	Memory.sourceHarvester = { sources: {} };
};

export const uninitialiseSource = (sourceId: Id<Source>) => {
	const sourceInfo = Memory.sourceHarvester.sources[sourceId];
	if (sourceInfo == null) return;
	cancelSpawn(sourceInfo.harvesterSpawnRequestId);
	cancelSpawn(sourceInfo.collectorSpawnRequestId);
	delete Memory.sourceHarvester.sources[sourceId];
};

export const initialiseSource = (
	sourceId: Id<Source>,
	priority: number
) => {
	const source = Game.getObjectById(sourceId);
	if (source == null) return;

	if (Memory.sourceHarvester.sources[sourceId]) return;

	Memory.sourceHarvester.sources[sourceId] = {
		roomName: source.room.name,
		sourceId,
		harvesterSpawnRequestId: requestSpawn({
			paused: false,
			priority,
			position: {
				x: CONSTANTS.ROOM_SIZE.X / 2,
				y: CONSTANTS.ROOM_SIZE.Y / 2,
				roomName: source.room.name,
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
				waitForEnergy: false,
			},
		}),
		collectorSpawnRequestId: requestSpawn({
			paused: false,
			priority,
			position: {
				x: CONSTANTS.ROOM_SIZE.X / 2,
				y: CONSTANTS.ROOM_SIZE.Y / 2,
				roomName: source.room.name,
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
				waitForEnergy: false,
			},
		}),
	};
};

export const runSource = (sourceId: Id<Source>) => {
	const sourceInfo = Memory.sourceHarvester.sources[sourceId];
	if (sourceInfo == null) return;

	const source = Game.getObjectById(sourceId);
	if (source == null) return;

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
};

export const loop = () => {
	for (const sourceInfo of Object.values(Memory.sourceHarvester.sources)) {
		runSource(sourceInfo.sourceId);
	}
};
