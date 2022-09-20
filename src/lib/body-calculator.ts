export default (AvailableEnergy: number,BaseBody: BodyPartConstant[] = [],BodyModule: BodyPartConstant[] = [],AllowPartialModules: boolean = false): BodyPartConstant[] | undefined => {
  const Body = [...BaseBody];
  let CurrentCost = Body.map((BodyPart) => BODYPART_COST[BodyPart]).reduce((A,B) => A+B,0);
  if (CurrentCost > AvailableEnergy) return undefined;
  const ModuleCost = BodyModule.map((BodyPart) => BODYPART_COST[BodyPart]).reduce((A,B) => A+B,0);
  while (BodyModule.length > 0) {
    while (CurrentCost + ModuleCost <= AvailableEnergy) {
      Body.push(...BodyModule);
      CurrentCost += ModuleCost;
    }
    if (AllowPartialModules) {
      BodyModule = BodyModule.slice(0,-1);
    } else {
      break;
    }
  }
  return Body;
};