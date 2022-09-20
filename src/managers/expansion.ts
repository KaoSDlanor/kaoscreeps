import * as construction       from './construction';
import * as energyStorage      from './energy-storage';
import * as resourceCollection from './resource-collection';

export const initialise = () => {
  for (const roomName of Object.keys(Game.rooms)) {
    initialiseRoom(roomName);
  }
};

export const initialiseRoom = (roomName: string) => {
  resourceCollection.initialiseRoom(roomName);
  construction.initialiseRoom(roomName);
  energyStorage.initialiseRoom(roomName);
};