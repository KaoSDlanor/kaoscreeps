import CONSTANTS from './data/constants';
import * as managers from './managers';

console.log('Code Reload',Game.time);

if (!Memory.initialised) {
  managers.creepSpawn.initialise();
  managers.resourceCollection.initialise();
  managers.construction.initialise();
  managers.expansion.initialise();
  Memory.initialised = true;
};

export const loop = () => {

  Game.getObjectById("")
  managers.resourceCollection.loop();
  if ((Game.time % CONSTANTS.spawnInterval) === CONSTANTS.spawnOffset) managers.creepSpawn.loop();
  managers.construction.loop();
};