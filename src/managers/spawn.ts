import {ShardManager} from './shard';

import Constants from '../data/constants';

import CreepRoles from './creep';

export type SpawnManager = {
  ID           : number
  Spawn        : StructureSpawn,
  ShardManager : ShardManager,
  CreepsByRole : {
    [ K in CreepMemory['Role'] ] : {
      [ CreepName in string ]: ReturnType<typeof CreepRoles[K]['Generator']>
    }
  },

  _Sources        : Source[] | undefined
  GetSources      : ()                  => Source[]

  InitialiseCreep : (Creep: Creep)      => void,
  CleanupCreep    : (CreepName: string) => void,

  CheckSpawn      : ()                  => void,
  Loop            : ()                  => void,
};


let ManagerCount = 0;
const SpawnGenerator = (Spawn: StructureSpawn,ShardManager: ShardManager) => {
  const SpawnManager: SpawnManager = {
    ID : ManagerCount++,
    Spawn,
    ShardManager,
    CreepsByRole : {
      Builder   : {},
      Collector : {},
      Harvester : {},
      Upgrader  : {},
    },
    
    _Sources   : undefined,
    GetSources : () => SpawnManager._Sources || (SpawnManager._Sources = SpawnManager.Spawn.room.find(FIND_SOURCES)),

    InitialiseCreep : (Creep: Creep) => {
      if (SpawnManager.Spawn.memory.Creeps[Creep.name] == null) SpawnManager.Spawn.memory.Creeps[Creep.name] = true;
      if (SpawnManager.CreepsByRole[Creep.memory.Role][Creep.name] == null) {
        if (Creep.memory.Role in CreepRoles) {
          SpawnManager.CreepsByRole[Creep.memory.Role][Creep.name] = CreepRoles[Creep.memory.Role].Generator(Creep,SpawnManager);
        } else {
          console.log(`[ SpawnManager | ${SpawnManager.Spawn.name}] Invalid Role: "${Creep.memory.Role}"`);
        }
      }
      Creep.memory.Spawn = SpawnManager.Spawn.name;
    },

    CleanupCreep : (CreepName: string,Role = Memory.creeps[CreepName].Role) => {
      delete SpawnManager.CreepsByRole[Role][CreepName];
      delete SpawnManager.Spawn.memory.Creeps[CreepName];
      if (Game.creeps[CreepName] == null) delete Memory.creeps[CreepName];
    },

    CheckSpawn : () => {
      if (SpawnManager.Spawn.spawning) return;

      const SourceCount = SpawnManager.GetSources().length;
      const SpawnAmounts: { [ Role in CreepMemory['Role'] ] : number } = {
        Collector : SourceCount,
        Builder   : 2,
        Harvester : SourceCount,
        Upgrader  : 1,
      } as const;

      console.log(`Target Counts: \n${JSON.stringify(SpawnAmounts,null,2)}`);

      const SpawnPriority: { [ Role in CreepMemory['Role'] ]? : number } = (Object.keys(SpawnAmounts) as (keyof typeof SpawnAmounts)[]).reduce((Accumulator,Role) => {
        const Priority = (SpawnAmounts[Role] + 1) / (Object.keys(SpawnManager.CreepsByRole[Role]).length + 1);
        if (Priority > 1) Accumulator[Role] = Priority;
        return Accumulator;
      },<any>{});

      const DefaultPriority: (keyof typeof SpawnAmounts)[] = ['Harvester','Collector','Upgrader','Builder'];

      console.log(`Priorities: \n${JSON.stringify(SpawnPriority,null,2)}`);

      const TargetRole = (Object.keys(SpawnPriority) as (keyof typeof SpawnPriority)[]).sort((A,B) => SpawnPriority[B]! - SpawnPriority[A]! || DefaultPriority.indexOf(A) - DefaultPriority.indexOf(B)).shift();
      if (TargetRole == null) return;

      const CreepBody = CreepRoles[TargetRole].Body(SpawnManager.Spawn.store[RESOURCE_ENERGY]);
      if (CreepBody == null) return;

      const Result = SpawnManager.Spawn.spawnCreep(CreepBody,`${TargetRole}:${Memory.CreepIDCounter}`,{ memory : { Role : TargetRole, Spawn : SpawnManager.Spawn.name, ReservedObjects : {} } });
      if (Result === OK) {
        Memory.CreepIDCounter += 1;
      }
    },

    Loop : () => {
      Object.keys(SpawnManager.Spawn.memory.Creeps).forEach((CreepName) => {
        const Creep = Game.creeps[CreepName];
        if (Creep == null || Creep.memory.Spawn !== SpawnManager.Spawn.name) return SpawnManager.CleanupCreep(CreepName);
        if (SpawnManager.CreepsByRole[Creep.memory.Role][Creep.name] == null) SpawnManager.InitialiseCreep(Creep);

        SpawnManager.CreepsByRole[Creep.memory.Role][Creep.name].Loop();
      });

      // Game.time % Constants.SpawnInterval === SpawnManager.ID % Constants.SpawnInterval
      const DoSpawn = ((Object.keys(SpawnManager.CreepsByRole.Harvester).length <= 0 || Object.keys(SpawnManager.CreepsByRole.Harvester).length <= 0) && SpawnManager.Spawn.store[RESOURCE_ENERGY] >= 0)
                   || SpawnManager.Spawn.store.getFreeCapacity(RESOURCE_ENERGY) <= 0
      if (DoSpawn) SpawnManager.CheckSpawn();
    },
  };

  return SpawnManager;
};

export default SpawnGenerator;