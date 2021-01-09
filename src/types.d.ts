interface Memory {
  CreepIDCounter   : number
  ReservedObjects  : { [ K in string ] : number   },
  ReservedTimeouts : { [ K in number ] : string[] },
}

interface SpawnMemory {
  ReservedObjects : { [ K in string ] : number },
  Creeps : {
    [ CreepName in string ] : any
  },
}

interface RoomMemory {
  ReservedObjects : { [ K in string ] : number },
}

interface CreepMemory {
  ReservedObjects : { [ K in string ] : number },
  Role            : 'Builder' | 'Collector' | 'Harvester' | 'Upgrader',
  Spawn           : string,
  Squad?          : string,

  Operation?      : number,
}