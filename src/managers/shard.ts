import Constants from '../data/constants';
import SpawnGenerator,{SpawnManager} from './spawn';

export type ShardManager = {
  Shard           : Shard
  Spawns          : { [ SpawnName in string ] : SpawnManager },

  IsReserved      : (Target: string)                  => boolean,
  Reserve         : (Target: string,Timeout?: number) => void,
  Unreserve       : (Target: string)                  => void,

  FindCreeps      : ()                      => void,
  InitialiseSpawn : (Spawn: StructureSpawn) => void,
  CleanupSpawn    : (SpawnName: string)     => void,
  Loop            : ()                      => void,
};

const ShardGenerator = (Shard: Shard) => {
  const ShardManager: ShardManager = {
    Shard,
    Spawns          : {},

    IsReserved : (Target: string) => Memory.ReservedObjects[Target] != null,
    Reserve : (Target: string,Timeout: number = 20) => {
      if (ShardManager.IsReserved(Target)) return false;
      const TimeoutID = Game.time + Timeout;
      console.log('Reserve',Target,TimeoutID);
      if (Memory.ReservedTimeouts[TimeoutID] == null) Memory.ReservedTimeouts[TimeoutID] = [];
      Memory.ReservedTimeouts[TimeoutID].push(Target);
      Memory.ReservedObjects[Target] = TimeoutID;
      return true;
    },
    Unreserve : (Target: string) => {
      if (!ShardManager.IsReserved(Target)) return false;
      const TimeoutID = Memory.ReservedObjects[Target];
      console.log('Unreserve',Target,TimeoutID);
      const Index = Memory.ReservedTimeouts[TimeoutID].indexOf(Target);
      if (Index > -1) Memory.ReservedTimeouts[TimeoutID].splice(Index,1);
      if (Memory.ReservedTimeouts[TimeoutID].length === 0) delete Memory.ReservedTimeouts[TimeoutID];
      delete Memory.ReservedObjects[Target];
      return true;
    },

    FindCreeps : () => {
      Object.keys(Game.creeps).forEach((CreepName) => {
        const Creep = Game.creeps[CreepName];
        const TargetSpawn = ShardManager.Spawns[Creep.memory.Spawn] ?? ShardManager.Spawns[Creep.room.find(FIND_MY_SPAWNS)[0]?.name ?? Object.keys(Game.spawns)[0]];
        if (TargetSpawn == null) return console.error(`[ ShardManager | ${ShardManager.Shard.name} ] Cannot find spawn for Creep "${Creep.name}"`)
        TargetSpawn.InitialiseCreep(Creep);
      });
    },

    InitialiseSpawn : (Spawn: StructureSpawn) => {
      if (Spawn.memory == null) Spawn.memory = <any>{};
      
      if (Spawn.memory.Creeps == null) {
        Spawn.memory.Creeps = Spawn.room.find(FIND_MY_CREEPS).reduce((Accumulator,Creep) => {
          Accumulator[Creep.name] = true;
          return Accumulator;
        },<SpawnMemory['Creeps']>{});
      }
      if (ShardManager.Spawns[Spawn.name] == null) ShardManager.Spawns[Spawn.name] = SpawnGenerator(Spawn,ShardManager);
    },

    CleanupSpawn : (SpawnName : string) => {
      delete ShardManager.Spawns[SpawnName];
      delete Memory.spawns[SpawnName];
    },

    Loop : () => {
      if (Memory.ReservedTimeouts[Game.time] != null) {
        Memory.ReservedTimeouts[Game.time].forEach((Target) => ShardManager.Unreserve(Target));
      }
      if (Game.time % Constants.LookupInterval === Constants.LookupOffset) ShardManager.FindCreeps();

      Object.keys(Memory.spawns).forEach((SpawnName) => {
        if (Game.spawns[SpawnName] == null) return ShardManager.CleanupSpawn(SpawnName);
        ShardManager.Spawns[SpawnName].Loop();
      });
    },
  };

  Object.keys(Game.spawns).forEach((SpawnName) => {
    if (!Game.spawns[SpawnName]?.my) return;
    ShardManager.InitialiseSpawn(Game.spawns[SpawnName]);
  });

  return ShardManager;
};

export default ShardGenerator;