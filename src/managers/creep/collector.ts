import {SpawnManager} from '../spawn';

import CollectEnergy from '../../lib/collect-energy';

export type CollectorManager = {
  Creep        : Creep,
  SpawnManager : SpawnManager,

  CalculateMode : () => void,
  Collect       : () => void,
  Deliver       : () => void,
  Loop          : () => void,
};

export const CollectorBody = (AvailableEnergy: number) => {
  const Body: BodyPartConstant[] = [];
  const ModuleSize = BODYPART_COST[MOVE] + BODYPART_COST[CARRY];
  if (AvailableEnergy < ModuleSize) return undefined
  for (let Index = 0; Index < AvailableEnergy / ModuleSize; Index++) {
    Body.push(MOVE,CARRY);
  }
  return Body;
};

const CollectorGenerator = (Creep: Creep,SpawnManager: SpawnManager) => {
  const CollectorManager: CollectorManager = {
    Creep,
    SpawnManager,

    CalculateMode : () => {
      if (CollectorManager.Creep.memory.Operation == null) CollectorManager.Creep.memory.Operation = 0;
      if (CollectorManager.Creep.memory.Operation === 0 && CollectorManager.Creep.store.getFreeCapacity(RESOURCE_ENERGY) <= 0) {
        CollectorManager.Creep.memory.Operation = 1;
      } else if (CollectorManager.Creep.memory.Operation === 1 && CollectorManager.Creep.store[RESOURCE_ENERGY] <= 0) {
        CollectorManager.Creep.memory.Operation = 0;
      }
    },

    Collect : () => CollectEnergy(CollectorManager.Creep,CollectorManager.SpawnManager.ShardManager),

    Deliver : () => {
      const Spawn = Game.spawns[CollectorManager.Creep.memory.Spawn];
      if (CollectorManager.Creep.transfer(Spawn,RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        CollectorManager.Creep.moveTo(Spawn,{ visualizePathStyle : {} });
      }
    },

    Loop : () => {
      CollectorManager.CalculateMode();
      if (CollectorManager.Creep.memory.Operation === 0) {
        CollectorManager.Collect();
      } else if (CollectorManager.Creep.memory.Operation === 1) {
        CollectorManager.Deliver();
      }
    },
  };

  return CollectorManager;
};

export default CollectorGenerator;