import {SpawnManager} from '../spawn';

import BodyCalculator from '../../lib/body-calculator';
import CollectEnergy from '../../lib/collect-energy';

export type BuilderManager = {
  Creep        : Creep,
  SpawnManager : SpawnManager,

  CalculateMode : () => void,
  Collect       : () => void,
  Build         : () => void,
  Loop          : () => void,
};

export const BuilderBody = (AvailableEnergy: number) => BodyCalculator(AvailableEnergy,[MOVE,WORK,CARRY],[WORK,CARRY],true);

const BuilderGenerator = (Creep: Creep,SpawnManager: SpawnManager) => {
  const BuilderManager: BuilderManager = {
    Creep,
    SpawnManager,

    CalculateMode : () => {
      if (BuilderManager.Creep.memory.Operation == null) BuilderManager.Creep.memory.Operation = 0;
      if (BuilderManager.Creep.memory.Operation === 0 && BuilderManager.Creep.store.getFreeCapacity(RESOURCE_ENERGY) <= 0) {
        BuilderManager.Creep.memory.Operation = 1;
      } else if (BuilderManager.Creep.memory.Operation === 1 && BuilderManager.Creep.store[RESOURCE_ENERGY] <= 0) {
        BuilderManager.Creep.memory.Operation = 0;
      }
    },

    Collect : () => CollectEnergy(BuilderManager.Creep,BuilderManager.SpawnManager.ShardManager),

    Build : () => {
      const Constructables = Game.spawns[BuilderManager.Creep.memory.Spawn].room.find(FIND_MY_CONSTRUCTION_SITES);
      if (Constructables == null) {
        BuilderManager.Creep.say("☹ No Constructables ☹");
        return;
      }
      if (BuilderManager.Creep.build(Constructables[0]) === ERR_NOT_IN_RANGE) {
        BuilderManager.Creep.moveTo(Constructables[0],{ visualizePathStyle : {} });
      }
    },

    Loop : () => {
      BuilderManager.CalculateMode();
      if (BuilderManager.Creep.memory.Operation === 0) {
        BuilderManager.Collect();
      } else if (BuilderManager.Creep.memory.Operation === 1) {
        BuilderManager.Build();
      }
    },
  };

  return BuilderManager;
};

export default BuilderGenerator;