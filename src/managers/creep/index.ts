import BuilderGenerator,{BuilderBody} from './builder';
import CollectorGenerator,{CollectorBody} from './collector';
import HarvesterGenerator,{HarvesterBody} from './harvester';
import UpgraderGenerator,{UpgraderBody} from './upgrader';

const Roles = {
  Builder : {
    Generator : BuilderGenerator,
    Body      : BuilderBody,
  },
  Collector : {
    Generator : CollectorGenerator,
    Body      : CollectorBody,
  },
  Harvester : {
    Generator : HarvesterGenerator,
    Body      : HarvesterBody,
  },
  Upgrader : {
    Generator : UpgraderGenerator,
    Body      : UpgraderBody,
  },
} as const;

if (false) ((RoleObject: { [ Role in CreepMemory['Role'] ] : any }) => {})(Roles);

export default Roles;