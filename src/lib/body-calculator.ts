export default (availableEnergy: number,baseBody: BodyPartConstant[] = [],bodyModule: BodyPartConstant[] = [],allowPartialModules: boolean = false): BodyPartConstant[] | undefined => {
  const body = [...baseBody];
  let currentCost = body.map((BodyPart) => BODYPART_COST[BodyPart]).reduce((A,B) => A+B,0);
  if (currentCost > availableEnergy) return undefined;
  const ModuleCost = bodyModule.map((BodyPart) => BODYPART_COST[BodyPart]).reduce((A,B) => A+B,0);
  while (bodyModule.length > 0) {
    while (currentCost + ModuleCost <= availableEnergy) {
      body.push(...bodyModule);
      currentCost += ModuleCost;
    }
    if (allowPartialModules) {
      bodyModule = bodyModule.slice(0,-1);
    } else {
      break;
    }
  }
  return body;
};