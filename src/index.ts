import * as managers from './managers';

console.log('Code reload',Game.time);

if (!Memory.initialised) {
	managers.energyStorage.initialise();
  managers.creepSpawn.initialise();
  managers.resourceCollection.initialise();
  managers.construction.initialise();
  managers.expansion.initialise();
  Memory.initialised = true;
};

export const loop = () => {
  managers.resourceCollection.loop();
  managers.creepSpawn.loop();
  managers.construction.loop();
};