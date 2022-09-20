import CONSTANTS from '../data/constants';
import { requestSpawn, getSpawnRequest, getCreeps, cancelSpawn } from './creep-spawn';
import { getTravelTime } from '../lib/movement';

export type CreepMemoryHarvester = {
  type : 'harvester',
};

export enum CreepCollectorMode {
  Collect = 0,
  Deliver = 1,
}

export type CreepMemoryCollector = {
  type : 'collector',
  mode : CreepCollectorMode,
};

export type RoomInfo = {
  roomName                : string,
  sourceIds               : Id<Source>[],
  harvesterSpawnRequestId : number,
  collectorSpawnRequestId : number,
};

declare global {
  interface Memory {
    resourceCollection : {
      rooms : { [ roomName in string ] : RoomInfo },
    },
  }
}

export const initialise = () => {
  Memory.resourceCollection = { rooms : {} };
};

export const updateRoom = (roomName: string) => {
  const roomInfo = Memory.resourceCollection.rooms[roomName];
  if (roomInfo == null) return;
  const room = Game.rooms[roomName];
  if (room == null) uninitialiseRoom(roomName);

  const spawns = room.find(FIND_MY_SPAWNS);
  const getSourceTravelTime = (source: Source) => Math.min( ...spawns.map((spawn) => getTravelTime(source.pos,spawn.pos)) );
  roomInfo.sourceIds = room.find(FIND_SOURCES)
    .sort((sourceA,sourceB) => getSourceTravelTime(sourceA) - getSourceTravelTime(sourceB))
    .map((source) => source.id);
};

export const initialiseRoom = (roomName: string) => {
  Memory.resourceCollection.rooms[roomName] = {
    roomName,
    sourceIds : [],
    harvesterSpawnRequestId : requestSpawn({
      priority    : 0,
      position    : { x : CONSTANTS.roomSize.x / 2, y : CONSTANTS.roomSize.y / 2, roomName },
      options     : { memory : { data : { type : 'harvester' } } },
      count       : 0,
      description : 'Harvester',
      body        : { base : [MOVE,WORK], module : [WORK], allowPartial : true, waitForEnergy : false },
    }),
    collectorSpawnRequestId : requestSpawn({
      priority    : 0,
      position    : { x : CONSTANTS.roomSize.x / 2, y : CONSTANTS.roomSize.y / 2, roomName },
      options     : { memory : { data : { type : 'collector', mode : CreepCollectorMode.Collect } } },
      count       : 0,
      description : 'Collector',
      body        : { base : [MOVE,CARRY,CARRY], module : [CARRY,CARRY,MOVE], allowPartial : true, waitForEnergy : false },
    })
  };
  updateRoom(roomName);
};

export const uninitialiseRoom = (roomName: string) => {
  const roomInfo = Memory.resourceCollection.rooms[roomName];
  cancelSpawn(roomInfo.harvesterSpawnRequestId);
  cancelSpawn(roomInfo.collectorSpawnRequestId);
  delete Memory.resourceCollection.rooms[roomInfo.roomName];
};

export const loop = () => {
  for (const roomInfo of Object.values(Memory.resourceCollection.rooms)) {
    if ((Game.time % CONSTANTS.lookupInterval) === CONSTANTS.lookupOffset) updateRoom(roomInfo.roomName);

    const harvesters = getCreeps(roomInfo.harvesterSpawnRequestId);
    const collectors = getCreeps(roomInfo.collectorSpawnRequestId);

    for (const [index,sourceId] of roomInfo.sourceIds.entries()) {
      const harvester = harvesters[index];
      if (harvester == null) continue;
      const source = Game.getObjectById(sourceId);
      if (source == null) continue;
      if (harvester.harvest(source) === ERR_NOT_IN_RANGE) {
        harvester.moveTo(source,{ visualizePathStyle : {} });
      }
      const collector = collectors[index];
      if (collector == null) continue;


      const collectorMemory = <CreepMemoryCollector>collector.memory.data;

      // Set mode
      if (collectorMemory.mode === CreepCollectorMode.Collect && collector.store.getFreeCapacity(RESOURCE_ENERGY) <= 0) {
        collectorMemory.mode = CreepCollectorMode.Deliver;
      } else if (collectorMemory.mode === CreepCollectorMode.Deliver && collector.store[RESOURCE_ENERGY] <= 0) {
        collectorMemory.mode = CreepCollectorMode.Collect;
      }

      // execute
      if (collectorMemory.mode === CreepCollectorMode.Collect) {
        const [droppedEnergy] = harvester.pos.findInRange(FIND_DROPPED_RESOURCES,2,{ filter : (DroppedResource) => DroppedResource.resourceType === RESOURCE_ENERGY });
        if (droppedEnergy != null) {
          if (collector.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
            collector.moveTo(droppedEnergy,{ visualizePathStyle : {} });
          }
        } else {
          collector.moveTo(harvester);
        }
      } else {
        const spawn = collector.pos.findClosestByRange(FIND_MY_SPAWNS);
        if (spawn != null) {
          if (collector.transfer(spawn,RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            collector.moveTo(spawn,{ visualizePathStyle : {} });
          }
        } else {
          console.log(`COLLECTOR "${collector.name}" UNABLE TO FIND SPAWN`);
        }
      }
    }

    const harvesterSpawnRequest = getSpawnRequest(roomInfo.harvesterSpawnRequestId);
    harvesterSpawnRequest.count    = roomInfo.sourceIds.length;
    harvesterSpawnRequest.priority = 0.5 + (harvesterSpawnRequest.spawning + harvesterSpawnRequest.creeps.length) / harvesterSpawnRequest.count;

    const collectorSpawnRequest = getSpawnRequest(roomInfo.collectorSpawnRequestId);
    collectorSpawnRequest.count    = roomInfo.sourceIds.length;
    collectorSpawnRequest.priority = 0.6 + (collectorSpawnRequest.spawning + collectorSpawnRequest.creeps.length) / collectorSpawnRequest.count;
  }
};