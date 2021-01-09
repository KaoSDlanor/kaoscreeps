import {SpawnManager} from '../spawn';

export type HarvesterManager = {
  Creep        : Creep,
  SpawnManager : SpawnManager,

  Loop : () => void,
};

export const HarvesterBody = (AvailableEnergy: number) => {
  const Body: BodyPartConstant[] = [
    MOVE,
  ];
  const RemainingEnergy = AvailableEnergy - Body.map((Part) => BODYPART_COST[Part]).reduce((A,B) => A+B);
  const WorkPartCount = Math.floor(RemainingEnergy / BODYPART_COST[WORK]);
  if (WorkPartCount < 1) return undefined;
  for (let Index = 0; Index < WorkPartCount; Index++) {
    Body.push(WORK);
  }
  return Body;
};

const HarvesterGenerator = (Creep: Creep,SpawnManager: SpawnManager) => {
  const HarvesterManager: HarvesterManager = {
    Creep,
    SpawnManager,

    Loop : () => {
      const Index = Object.keys(SpawnManager.CreepsByRole.Harvester).indexOf(HarvesterManager.Creep.name);
      const Source = HarvesterManager.SpawnManager.GetSources()[Index];
      if (Source == null) return;
      if (HarvesterManager.Creep.harvest(Source) === ERR_NOT_IN_RANGE) {
        HarvesterManager.Creep.moveTo(Source,{ visualizePathStyle : {} });
      }
    },
  };

  return HarvesterManager;
};

export default HarvesterGenerator;