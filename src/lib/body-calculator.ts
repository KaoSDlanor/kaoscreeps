export default (AvailableEnergy: number,BaseBody: BodyPartConstant[] = [],BodyModule: BodyPartConstant[] = [],AllowPartialModules: boolean = false): BodyPartConstant[] | undefined => {
  const Body = [...BaseBody];
  let CurrentCost = Body.map((BodyPart) => BODYPART_COST[BodyPart]).reduce((A,B) => A+B);
  if (CurrentCost > AvailableEnergy) return undefined;
  const ModuleCost = BodyModule.map((BodyPart) => BODYPART_COST[BodyPart]).reduce((A,B) => A+B);
  while (BodyModule.length > 0) {
    while (CurrentCost + ModuleCost <= AvailableEnergy) {
      Body.push(...BodyModule);
      CurrentCost += ModuleCost;
    }
    if (AllowPartialModules) {
      BodyModule.pop();
    } else {
      break;
    }
  }
  return Body;
};