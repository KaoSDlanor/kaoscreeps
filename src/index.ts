import * as managers from './managers';

if (!Memory.initialised) {
	managers.energyStorage.initialise();
  managers.creepSpawn.initialise();
	managers.sourceHarvester.initialise();
  managers.resourceCollection.initialise();
  managers.construction.initialise();
  managers.expansion.initialise();
  Memory.initialised = true;
};

export const loop = () => {
  managers.resourceCollection.loop();
	managers.sourceHarvester.loop();
  managers.creepSpawn.loop();
  managers.construction.loop();
};