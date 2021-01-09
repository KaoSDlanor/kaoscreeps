import {ShardManager} from '../managers/shard';

export default (Creep: Creep,ShardManager: ShardManager) => {
  const DroppedEnergy = Creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES,{ filter : (DroppedResource) => DroppedResource.resourceType === RESOURCE_ENERGY && (Creep.memory.ReservedObjects[DroppedResource.id] != null || !ShardManager.IsReserved(DroppedResource.id)) && DroppedResource.amount >= Creep.store.getFreeCapacity(RESOURCE_ENERGY) });
  if (DroppedEnergy == null) return;
  if (Creep.memory.ReservedObjects[DroppedEnergy.id] == null) {
    ShardManager.Reserve(DroppedEnergy.id);
    Creep.memory.ReservedObjects[DroppedEnergy.id] = Memory.ReservedObjects[DroppedEnergy.id];
  }
  const Result = Creep.pickup(DroppedEnergy);
  if (Result === ERR_NOT_IN_RANGE) {
    Creep.moveTo(DroppedEnergy,{ visualizePathStyle : {} });
  } else if (Result === OK) {
    ShardManager.Unreserve(DroppedEnergy.id);
    delete Creep.memory.ReservedObjects[DroppedEnergy.id];
  }
};