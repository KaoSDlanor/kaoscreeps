import CONSTANTS from '../data/constants';
import { requestSpawn, getSpawnRequest, getCreeps, cancelSpawn } from './creep-spawn';

export enum CreepConstructorMode {
  Collect = 0,
  Deliver = 1,
}

export type CreepMemoryConstructor = {
  type : 'constructor',
  mode : CreepConstructorMode,
};

export type RoomInfo = {
  roomName                  : string,
  constructorSpawnRequestId : number,
};

declare global {
  interface Memory {
    construction : {
      rooms : { [ roomName in string ] : RoomInfo },
    },
  }
}

export const initialise = () => {
  Memory.construction = { rooms : {} };
};

export const initialiseRoom = (roomName: string) => {
  Memory.construction.rooms[roomName] = {
    roomName,
    constructorSpawnRequestId : requestSpawn({
			paused      : false,
      priority    : CONSTANTS.SPAWN_PRIORITY.CONSTRUCTION,
      position    : { x : Math.round(CONSTANTS.ROOM_SIZE.X / 2), y : Math.round(CONSTANTS.ROOM_SIZE.Y / 2), roomName },
      options     : { memory : { data : { type : 'constructor', mode : CreepConstructorMode.Collect } } },
      count       : 1,
      description : 'Constructor',
      body        : { base : [MOVE,CARRY,WORK], module : [MOVE,CARRY,WORK], allowPartial : true, waitForEnergy : true },
    }),
  };
};

export const uninitialiseRoom = (roomName: string) => {
  const roomInfo = Memory.construction.rooms[roomName];
  cancelSpawn(roomInfo.constructorSpawnRequestId);
  delete Memory.construction.rooms[roomName];
};

export const loop = () => {
  for (const roomInfo of Object.values(Memory.construction.rooms)) {
    const room = Game.rooms[roomInfo.roomName];
    if (room == null) {
      uninitialiseRoom(roomInfo.roomName);
      continue;
    }

    const constructors = getCreeps(roomInfo.constructorSpawnRequestId);

    for (const constructor of constructors) {
      const constructorMemory = <CreepMemoryConstructor>constructor.memory.data;
      if (constructorMemory.mode === CreepConstructorMode.Collect && constructor.store.getFreeCapacity(RESOURCE_ENERGY) <= 0) {
        constructorMemory.mode = CreepConstructorMode.Deliver;
      } else if (constructorMemory.mode === CreepConstructorMode.Deliver && constructor.store[RESOURCE_ENERGY] <= 0) {
        constructorMemory.mode = CreepConstructorMode.Collect;
      }

      if (constructorMemory.mode === CreepConstructorMode.Collect) {
        const spawn = constructor.pos.findClosestByRange(FIND_MY_SPAWNS);
        if (spawn != null) {
          if (constructor.withdraw(spawn,RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            constructor.moveTo(spawn,{ visualizePathStyle : {} });
          }
        }
      }
    }

    if (constructors.length > 0 && room.controller != null) {
      const constructor = constructors.shift()!;
      const constructorMemory = <CreepMemoryConstructor>constructor.memory.data;

      if (constructorMemory.mode === CreepConstructorMode.Deliver) {
        if (constructor.upgradeController(room.controller) == ERR_NOT_IN_RANGE) {
          constructor.moveTo(room.controller,{ visualizePathStyle : {} });
        }
      }
    }

    const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES).sort((constructionSiteA,constructionSiteB) => {
      return constructionSiteA.id > constructionSiteB.id ? 1
           : constructionSiteB.id > constructionSiteA.id ? -1
           : 0;
    });
    for (const constructionSite of constructionSites) {
      if (constructors.length === 0) break;
      const constructor = constructors.shift()!;
      const constructorMemory = <CreepMemoryConstructor>constructor.memory.data;

      if (constructorMemory.mode === CreepConstructorMode.Deliver) {
        if (constructor.build(constructionSite) === ERR_NOT_IN_RANGE) {
          constructor.moveTo(constructionSite,{ visualizePathStyle : {} });
        }
      }
    }

    const spawnRequest = getSpawnRequest(roomInfo.constructorSpawnRequestId);
    spawnRequest.count = 2 + Math.ceil(constructionSites.length / 5);
  }
};