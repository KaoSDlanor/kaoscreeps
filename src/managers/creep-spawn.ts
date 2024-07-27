import {v4 as uuidv4} from 'uuid';
import CONSTANTS from '../data/constants';
import bodyCalculator from '../lib/body-calculator';

export type CreepMemorySpawning = {
  type           : 'larva',
  spawnRequestId : number,
  eventualMemory : CreepMemory,
};

export type BaseSpawnRequest = {
	paused       : boolean,
  priority     : number,
  position     : { x : number, y : number, roomName : string },
  options      : SpawnOptions,
  count        : number,
  description? : string,
  body         : {
    base          : BodyPartConstant[],
    module        : BodyPartConstant[],
    allowPartial  : boolean,
    waitForEnergy : boolean,
  },
};

export type SpawnRequest = BaseSpawnRequest & {
  requestId  : number,

  body       : { minimumEnergy : number },

  spawning : number,
  creeps   : string[],
};

declare global {
  interface Memory {
    creepSpawn : {
      nextRequestId : number,
      queue   : {
        byCreepName : { [ creepName in string ] : SpawnRequest['requestId'] },
        byRequestId : { [ requestId in number ] : SpawnRequest              },
      },
    },
  }
}

export const initialise = () => {
  Memory.creepSpawn = { nextRequestId : 0, queue : { byCreepName : {}, byRequestId : {} } };
};

export const getSpawnRequest = (spawnRequestId: number) => Memory.creepSpawn.queue.byRequestId[spawnRequestId];

export const getCreeps = (spawnRequestId: number) => {
  const spawnRequest = getSpawnRequest(spawnRequestId);
  if (spawnRequest == null) return [];
  return spawnRequest.creeps.map((creepName) => Game.creeps[creepName]).filter((creep) => creep != null);
};

const addRequest = (spawnRequest: SpawnRequest) => {
  Memory.creepSpawn.queue.byRequestId[spawnRequest.requestId] = spawnRequest;
};

const removeRequest = (spawnRequest: SpawnRequest) => {
  for (const creepName of spawnRequest.creeps) {
    delete Memory.creepSpawn.queue.byCreepName[creepName];
  }
  delete Memory.creepSpawn.queue.byRequestId[spawnRequest.requestId];
};

const processRequest = (spawn: StructureSpawn,spawnRequest: SpawnRequest) => {
	if (spawnRequest.body.waitForEnergy && spawn.room.energyCapacityAvailable > spawn.room.energyAvailable) return ERR_NOT_ENOUGH_ENERGY;
  const body = bodyCalculator(spawn.room.energyAvailable,spawnRequest.body.base,spawnRequest.body.module,spawnRequest.body.allowPartial);
  if (body == null) return ERR_NOT_ENOUGH_ENERGY;
  const output = spawn.spawnCreep(body,`creepSpawn:${spawnRequest.requestId}:${spawnRequest.description}:${uuidv4()}`,{
    ...spawnRequest.options,
    memory : {
      data           : {
        type           : 'larva',
        spawnRequestId : spawnRequest.requestId,
        eventualMemory : spawnRequest.options.memory!,
      },
    },
  });
  if (output === OK) {
    spawnRequest.spawning++;
  } else {
    console.log(`Failed to spawn for request ${spawnRequest.requestId}. Response: ${output}`);
  }
  return output;
};

export const requestSpawn = (baseSpawnRequest: BaseSpawnRequest): number => {
  const spawnRequest: SpawnRequest = {
    ...baseSpawnRequest,
    requestId : Memory.creepSpawn.nextRequestId++,
    body : {
      ...baseSpawnRequest.body,
      minimumEnergy : baseSpawnRequest.body.base.reduce((acc,bodyPart) => acc + BODYPART_COST[bodyPart],0),
    },
    spawning : 0,
    creeps   : [],
  };

  addRequest(spawnRequest);

  return spawnRequest.requestId;
};

export const cancelSpawn = (spawnRequestId: number) => {
  const spawnRequest = getSpawnRequest(spawnRequestId);
  if (spawnRequest != null) removeRequest(spawnRequest);
}

export const cleanupCreep = (creepName: string) => {
	if (Memory.creepSpawn.queue.byCreepName[creepName] != null) {
		const spawnRequestId = Memory.creepSpawn.queue.byCreepName[creepName];
		const spawnRequest = getSpawnRequest(spawnRequestId);
		const index = spawnRequest.creeps.indexOf(creepName);
		if (index > -1) spawnRequest.creeps.splice(index,1);
		delete Memory.creepSpawn.queue.byCreepName[creepName];
	}
	delete Memory.creeps[creepName];
};

export const loop = () => {
	if ((Game.time % CONSTANTS.INTERVALS.SPAWN_INTERVAL) !== CONSTANTS.INTERVALS.SPAWN_OFFSET) return;

  for (const creepName of Object.keys(Memory.creeps)) {
    if (Game.creeps[creepName] == null) {
			cleanupCreep(creepName);
      continue;
    }
    if (Memory.creeps[creepName].data.type === 'larva') {
      const creepMemory = Memory.creeps[creepName].data;
      const spawnRequestId = creepMemory.spawnRequestId;
      const spawnRequest = getSpawnRequest(spawnRequestId);
      spawnRequest.creeps.push(creepName);
      spawnRequest.spawning--;
      Memory.creepSpawn.queue.byCreepName[creepName] = spawnRequestId;
      Memory.creeps[creepName] = creepMemory.eventualMemory;
    }
  }

  const openRequests = Object.values(Memory.creepSpawn.queue.byRequestId)
    .filter((spawnRequest) => (spawnRequest.spawning + spawnRequest.creeps.length) < spawnRequest.count)
    .sort((spawnRequestA,spawnRequestB) => spawnRequestB.priority - spawnRequestA.priority);

  for (const spawn of Object.values(Game.spawns)) {
    if (spawn.spawning != null) continue;
    if (openRequests.length === 0) {
      break;
    }

    // TODO : match closest
    const spawnRequest = openRequests[0];
    processRequest(spawn,spawnRequest);
    if ((spawnRequest.spawning + spawnRequest.creeps.length) >= spawnRequest.count) openRequests.shift();
  }
};