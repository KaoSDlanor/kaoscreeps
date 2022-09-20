import type { CreepMemoryConstructor } from 'managers/construction';
import type { CreepMemorySpawning } from './managers/creep-spawn';
import type { CreepMemoryHarvester, CreepMemoryCollector } from './managers/resource-collection';

declare global {
  interface Memory {
    initialised : true,
  }

  interface CreepMemory {
    data : CreepMemoryConstructor | CreepMemorySpawning | CreepMemoryHarvester | CreepMemoryCollector,
  }
}