import {SpawnManager} from '../spawn';

import CollectEnergy from '../../lib/collect-energy';

export type UpgraderManager = {
  Creep        : Creep,
  SpawnManager : SpawnManager,

  CalculateMode : () => void,
  Collect       : () => void,
  Updgrade      : () => void,
  Loop          : () => void,
};

export const UpgraderBody = (AvailableEnergy: number) => {
  const Body: BodyPartConstant[] = [MOVE];
  const RemainingEnergy = AvailableEnergy - Body.map((Part) => BODYPART_COST[Part]).reduce((A,B) => A+B);
  const ModuleSize = BODYPART_COST[WORK] + BODYPART_COST[CARRY];
  if (RemainingEnergy < ModuleSize) return undefined
  for (let Index = 0; Index < AvailableEnergy / ModuleSize; Index++) {
    Body.push(WORK,CARRY);
  }
  return Body;
};

const UpgraderGenerator = (Creep: Creep,SpawnManager: SpawnManager) => {
  const UpgraderManager: UpgraderManager = {
    Creep,
    SpawnManager,

    CalculateMode : () => {
      if (UpgraderManager.Creep.memory.Operation == null) UpgraderManager.Creep.memory.Operation = 0;
      if (UpgraderManager.Creep.memory.Operation === 0 && UpgraderManager.Creep.store.getFreeCapacity(RESOURCE_ENERGY) <= 0) {
        UpgraderManager.Creep.memory.Operation = 1;
      } else if (UpgraderManager.Creep.memory.Operation === 1 && UpgraderManager.Creep.store[RESOURCE_ENERGY] <= 0) {
        UpgraderManager.Creep.memory.Operation = 0;
      }
    },

    Collect : () => CollectEnergy(UpgraderManager.Creep,UpgraderManager.SpawnManager.ShardManager),

    Updgrade : () => {
      const Controller = UpgraderManager.SpawnManager.Spawn.room.controller;
      if (Controller == null) {
        console.log(`[ UpgraderManager | ${UpgraderManager.Creep.name} ] ☹ No Controller ☹`);
        return;
      }
      const Result = UpgraderManager.Creep.upgradeController(Controller);
      if (Result === ERR_NOT_IN_RANGE) {
        UpgraderManager.Creep.moveTo(Controller,{ visualizePathStyle : {} });
      } else if (Result !== OK) {
        console.log(`[ UpgraderManager | ${UpgraderManager.Creep.name} ] Unable to upgrade controller: ${Result}`);
      }
    },

    Loop : () => {
      UpgraderManager.CalculateMode();
      if (UpgraderManager.Creep.memory.Operation === 0) {
        UpgraderManager.Collect();
      } else if (UpgraderManager.Creep.memory.Operation === 1) {
        UpgraderManager.Updgrade();
      }
    },
  };

  return UpgraderManager;
};

export default UpgraderGenerator;