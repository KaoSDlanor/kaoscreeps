import ShardGenerator from './managers/shard';

if (Memory.CreepIDCounter == null) Memory.CreepIDCounter = 1;

const ShardManager = ShardGenerator(Game.shard);

console.log('Code Reload',Game.time);

if (Memory.ReservedObjects  == null) Memory.ReservedObjects  = {};
if (Memory.ReservedTimeouts == null) Memory.ReservedTimeouts = {};

export const loop = ShardManager.Loop();