import CONSTANTS from "../data/constants";
import { getTravelTime } from "../lib/movement";
import { lerp } from "../lib/util";
import { initialiseSource, uninitialiseSource } from "./source-harvester";

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
	sources: Id<Source>[];
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

	for (const sourceId of roomInfo.sources) {
		if (!activeSourceIds.includes(sourceId)) {
			uninitialiseSource(sourceId);
		}
	}

	for (const [index, sourceId] of activeSourceIds.entries()) {
		if (!(sourceId in roomInfo.sources)) {
			const priority = lerp(
				CONSTANTS.SPAWN_PRIORITY.RESOURCE_COLLECTION_MIN,
				CONSTANTS.SPAWN_PRIORITY.RESOURCE_COLLECTION_MAX,
				1 - index / activeSourceIds.length
			);
			initialiseSource(sourceId, priority);
		}
	}
};

export const initialiseRoom = (roomName: string) => {
	Memory.resourceCollection.rooms[roomName] = {
		roomName,
		sources: [],
	};
	updateRoom(roomName);
};

export const uninitialiseRoom = (roomName: string) => {
	const roomInfo = Memory.resourceCollection.rooms[roomName];
	for (const sourceId of Object.keys(roomInfo.sources) as Id<Source>[]) {
		uninitialiseSource(sourceId);
	}
	delete Memory.resourceCollection.rooms[roomInfo.roomName];
};

export const loop = () => {
	if (
		Game.time % CONSTANTS.INTERVALS.READ_ROOM_INTERVAL !==
		CONSTANTS.INTERVALS.READ_ROOM_OFFSET
	)
		return;
	for (const roomInfo of Object.values(Memory.resourceCollection.rooms)) {
		updateRoom(roomInfo.roomName);
	}
};
