import { getTravelTime } from 'lib/movement';
import {v4 as uuidv4}    from 'uuid';
import CONSTANTS         from '../data/constants';

export enum StorageType {
  structure,
  dropOff,
};

export type AnyStructureStorage = AnyOwnedStructure & {
  store : StoreDefinition;
};

export type StoreId<ST extends StorageType> = ST extends StorageType.structure ? Id<AnyStructureStorage>
                                            : ST extends StorageType.dropOff ? string
                                            : never;

export type StorageInfo<ST extends StorageType> = ST extends StorageType.structure ? {
  type  : StorageType.structure,
  store : StoreId<StorageType.structure>,
} : {
  type  : StorageType.dropOff,
  store : StoreId<StorageType.dropOff>,
};

export type RoomInfo = {
  roomName                         : string,
  spawnStorage                     : { [ storageId : string ] : StorageInfo<StorageType.structure> },
  generalStorage                   : { [ storageId : string ] : StorageInfo<StorageType>           },
  allowCollectionFromSpawnStorage  : boolean,
  minimumEnergyPartialSpawnDropoff : number,
};

export type StorageReservation<ST extends StorageType> = {
  reservationId : string,
  roomName      : string,
  amount        : number,
} & (
  ST extends StorageType.structure ? {
    type  : StorageType.structure,
    store : StoreId<StorageType.structure>,
  } : {
    type  : StorageType.dropOff,
    store : StoreId<StorageType.dropOff>,
  }
);

export type DropOffInfo = {
  dropOffId       : string,
  roomName        : string,
  x               : number,
  y               : number,
  deleteWhenEmpty : boolean,
};

declare global {
  interface Memory {
    energyStorage : {
      rooms        : { [ roomName      : string ] : RoomInfo    },
      dropOffs     : { [ dropOffId     : string ] : DropOffInfo },
      reservations : {
        byReservationId : { [ reservationId : string ] : StorageReservation<StorageType> },
        byStoreId       : { [ storeId : string ] : string[]                              },
      },
    },
  }
}

export const initialise = () => {
  Memory.energyStorage = {
    rooms        : {},
    dropOffs     : {},
    reservations : { byReservationId : {}, byStoreId : {} },
  };
};

const STRUCTURE_SPAWN_STORAGES: Set<StructureConstant> = new Set([STRUCTURE_SPAWN,STRUCTURE_EXTENSION]);
export const updateRoom = (roomName: string) => {
  const roomInfo = Memory.energyStorage.rooms[roomName];
  if (roomInfo == null) return;
  const room = Game.rooms[roomName];
  if (room == null) uninitialiseRoom(roomName);

  const spawnStorage   : RoomInfo['spawnStorage']   = {};
  const generalStorage : RoomInfo['generalStorage'] = {};
  for (const storageStructure of room.find<FIND_MY_STRUCTURES,AnyStructureStorage>(FIND_MY_STRUCTURES)) {
    if (STRUCTURE_SPAWN_STORAGES.has(storageStructure.structureType)) {
      roomInfo.spawnStorage[storageStructure.id] = { type : StorageType.structure, store : storageStructure.id };
    } else {
      roomInfo.generalStorage[storageStructure.id] = { type : StorageType.structure, store : storageStructure.id };
    }
  }
  for (const storageInfo of Object.values(roomInfo.generalStorage)) {
    if (storageInfo.type === StorageType.dropOff) {
      const dropOffInfo = Memory.energyStorage.dropOffs[storageInfo.store];
      if (dropOffInfo.deleteWhenEmpty && Memory.energyStorage.reservations.byStoreId[dropOffInfo.dropOffId] == null) {
        const hasEnergy = (RoomPosition(dropOffInfo.x,dropOffInfo.y,dropOffInfo.roomName).lookFor(RESOURCE_ENERGY)?.length ?? 0) === 0;
        if (!hasEnergy) continue;
      }
      generalStorage[storageInfo.store] = storageInfo;
    }
  }

  roomInfo.spawnStorage   = spawnStorage;
  roomInfo.generalStorage = generalStorage;
};

export const initialiseRoom = (roomName: string) => {
  Memory.energyStorage.rooms[roomName] = {
    roomName,
    spawnStorage                     : {},
    generalStorage                   : {},
    allowCollectionFromSpawnStorage  : false,
    minimumEnergyPartialSpawnDropoff : 50,
  };
  updateRoom(roomName);
};

export const ensureRoom = (roomName: string) => {
  if (Memory.energyStorage.rooms[roomName] == null) initialiseRoom(roomName);
  return Memory.energyStorage.rooms[roomName];
};

export const uninitialiseRoom = (roomName: string) => {
  const roomInfo = Memory.energyStorage.rooms[roomName];
  if (roomInfo == null) return;
  for (const storageInfo of [...Object.values(roomInfo.spawnStorage),...Object.values(roomInfo.generalStorage)]) {
    for (const reservationId of (Memory.energyStorage.reservations.byStoreId[storageInfo.store] ?? [])) {
      delete Memory.energyStorage.reservations.byReservationId[reservationId];
    }
    if (storageInfo.type === StorageType.dropOff) {
      delete Memory.energyStorage.dropOffs[storageInfo.store];
    }
    delete Memory.energyStorage.reservations.byStoreId[storageInfo.store];
  }
  delete Memory.energyStorage.rooms[roomName];
};

export const getStorePosition = (storageInfo: StorageInfo<StorageType>): RoomPosition | undefined => {
  if (storageInfo.type === StorageType.structure) {
    return Game.getObjectById(storageInfo.store)?.pos;
  } else if (storageInfo.type === StorageType.dropOff) {
    const dropOffInfo = Memory.energyStorage.dropOffs[storageInfo.store];
    if (dropOffInfo == null) return undefined;
    return new RoomPosition(dropOffInfo.x,dropOffInfo.y,dropOffInfo.roomName);
  }
  return undefined;
};

export const getStoredAmount = (storageInfo: StorageInfo<StorageType>): number | undefined => {
  if (storageInfo.type === StorageType.structure) {
    return Game.getObjectById(storageInfo.store)?.store[RESOURCE_ENERGY];
  } else if (storageInfo.type === StorageType.dropOff) {
    const dropOffInfo = Memory.energyStorage.dropOffs[storageInfo.store];
    if (dropOffInfo == null) return undefined;
    const energyDeposits = new RoomPosition(dropOffInfo.x,dropOffInfo.y,dropOffInfo.roomName).lookFor(RESOURCE_ENERGY);
    return energyDeposits.reduce((accumulator,energyDeposit) => accumulator + energyDeposit.amount,0);
  }
  return undefined;
};

export const getPotentialStoredAmount = (storageInfo: StorageInfo<StorageType>): number | undefined => {
  const currentStoredAmount = getStoredAmount(storageInfo);
  if (currentStoredAmount == null) return undefined;
  const futureStoreChanges = (Memory.energyStorage.reservations.byStoreId[storageInfo.store] ?? []).reduce((accumulator,reservationId) => accumulator + (Memory.energyStorage.reservations.byReservationId[reservationId]?.amount ?? 0),0);
  return currentStoredAmount + futureStoreChanges;
};

export const getAvailableStorage = (storageInfo: StorageInfo<StorageType>): number | undefined => {
  if (storageInfo.type === StorageType.structure) {
    return Game.getObjectById(storageInfo.store)?.store.getFreeCapacity(RESOURCE_ENERGY);
  } else if (storageInfo.type === StorageType.dropOff) {
    return Infinity;
  }
  return undefined;
};

export const getPotentialAvailableStorage = (storageInfo: StorageInfo<StorageType>): number | undefined => {
  const currentAvailableStorage = getAvailableStorage(storageInfo);
  if (currentAvailableStorage == null) return undefined;
  const futureStoreChanges = (Memory.energyStorage.reservations.byStoreId[storageInfo.store] ?? []).reduce((accumulator,reservationId) => accumulator + (Memory.energyStorage.reservations.byReservationId[reservationId]?.amount ?? 0),0);
  return currentAvailableStorage - futureStoreChanges;
};

const computeDistanceMap = (pos: RoomPosition,storageInfoList: StorageInfo<StorageType>[]) => {
  const DistanceMap: { [ storeId : string ] : number } = {};
  for (const storageInfo of storageInfoList) {
    const storagePos = getStorePosition(storageInfo);
    if (storagePos != null && storagePos.roomName === pos.roomName) DistanceMap[storageInfo.store] = getTravelTime(pos,storagePos);
  }
  return DistanceMap;
};

export const createReservation = <ST extends StorageType>(roomName: string,amount: number,storageType: ST,storeId: StoreId<ST>): string => {
  const storageReservation = <StorageReservation<ST>>{
    reservationId : uuidv4(),
    roomName,
    amount,
    type          : storageType,
    store         : storeId,
  };

  Memory.energyStorage.reservations.byReservationId[storageReservation.reservationId] = <StorageReservation<StorageType>>storageReservation;
  if (Memory.energyStorage.reservations.byStoreId[storageReservation.store] == null) Memory.energyStorage.reservations.byStoreId[storageReservation.store] = [];
  Memory.energyStorage.reservations.byStoreId[storageReservation.store].push(storageReservation.reservationId);

  return storageReservation.reservationId;
};

export const removeReservation = (reservationId: string) => {
  const storageReservation = Memory.energyStorage.reservations.byReservationId[reservationId];
  if (storageReservation == null) return;
  const index = Memory.energyStorage.reservations.byStoreId[storageReservation.store].indexOf(reservationId);
  if (index > -1) Memory.energyStorage.reservations.byStoreId[storageReservation.store].splice(index,1);
  delete Memory.energyStorage.reservations.byReservationId[reservationId];
};

export const updateReservation = (reservationId: string,amountAdded: number) => {
  const storageReservation = Memory.energyStorage.reservations.byReservationId[reservationId];
  if (storageReservation == null) throw new Error('Unable to update missing reservation');
  storageReservation.amount -= amountAdded;
  if (storageReservation.amount === 0) removeReservation(reservationId);
};

export const reserveDropOff = (pos: RoomPosition,amount: number): string | undefined => {
  const roomInfo = ensureRoom(pos.roomName);

  let eligibleStores: StorageInfo<StorageType>[] = Object.values(roomInfo.spawnStorage).filter((storageInfo) => (getPotentialAvailableStorage(storageInfo) ?? 0) >= Math.min(amount,roomInfo.minimumEnergyPartialSpawnDropoff));
  if (eligibleStores.length === 0) eligibleStores = Object.values(roomInfo.generalStorage).filter((storageInfo) => (getPotentialAvailableStorage(storageInfo) ?? 0) >= amount);
  if (eligibleStores.length === 0) return;

  const DistanceMap = computeDistanceMap(pos,eligibleStores);
  let selectedStore = eligibleStores.shift()!;
  for (const eligibleStore of eligibleStores) {
    if (DistanceMap[eligibleStore.store] != null && DistanceMap[eligibleStore.store] < DistanceMap[selectedStore.store]) selectedStore = eligibleStore;
  }

  return createReservation(pos.roomName,Math.min(amount,getPotentialAvailableStorage(selectedStore)!),selectedStore.type,selectedStore.store);
};

export const reserveCollection = (pos: RoomPosition, amount: number): string | undefined => {
  const roomInfo = ensureRoom(pos.roomName);

  let eligibleStores: StorageInfo<StorageType>[] = Object.values(roomInfo.generalStorage).filter((storageInfo) => (getPotentialStoredAmount(storageInfo) ?? 0) >= amount);
  if (roomInfo.allowCollectionFromSpawnStorage) eligibleStores.push(...Object.values(roomInfo.spawnStorage).filter((storageInfo) => (getPotentialStoredAmount(storageInfo) ?? 0) >= amount));
  if (eligibleStores.length === 0) return;

  const DistanceMap = computeDistanceMap(pos,eligibleStores);
  let selectedStore = eligibleStores.shift()!;
  for (const eligibleStore of eligibleStores) {
    if (DistanceMap[eligibleStore.store] != null && DistanceMap[eligibleStore.store] < DistanceMap[selectedStore.store]) selectedStore = eligibleStore;
  }

  return createReservation(pos.roomName,amount,selectedStore.type,selectedStore.store);
};

export const loop = () => {
  for (const roomInfo of Object.values(Memory.energyStorage.rooms)) {
    const room = Game.rooms[roomInfo.roomName];
    if (room == null) {
      uninitialiseRoom(roomInfo.roomName);
      continue;
    }
    if ((Game.time % CONSTANTS.lookupInterval) === CONSTANTS.lookupOffset) updateRoom(roomInfo.roomName);
  }
};