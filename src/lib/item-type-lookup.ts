export enum Kind {
  Unknown = 0,
  Jacobs,
  Tediore,
  Torgue,
  Maliwan,
  Daedalus,
  Vladof,
  Order,
  Ripper,
  COV,
  Hyperion,
  Atlas,
  // Item types
  Pistol,
  Shotgun,
  SMG,
  Sniper,
  AssaultRifle,
  HeavyWeapon,
  Grenade,
  Shield,
  Repkit,
  ClassMod,
  Enhancer,
  // Characters
  Vex,
  Amon,
  Rafa,
  Harlowe,
}

export function kindToString(k: Kind): string {
  switch (k) {
    case Kind.Jacobs:
      return "Jacobs";
    case Kind.Tediore:
      return "Tediore";
    case Kind.Torgue:
      return "Torgue";
    case Kind.Maliwan:
      return "Maliwan";
    case Kind.Daedalus:
      return "Daedalus";
    case Kind.Vladof:
      return "Vladof";
    case Kind.Order:
      return "Order";
    case Kind.Ripper:
      return "Ripper";
    case Kind.COV:
      return "COV";
    case Kind.Hyperion:
      return "Hyperion";
    case Kind.Atlas:
      return "Atlas";
    case Kind.Pistol:
      return "Pistol";
    case Kind.Shotgun:
      return "Shotgun";
    case Kind.SMG:
      return "SMG";
    case Kind.Sniper:
      return "Sniper";
    case Kind.AssaultRifle:
      return "Assault Rifle";
    case Kind.HeavyWeapon:
      return "Heavy Weapon";
    case Kind.Grenade:
      return "Grenade";
    case Kind.Shield:
      return "Shield";
    case Kind.Repkit:
      return "Repkit";
    case Kind.ClassMod:
      return "Class Mod";
    case Kind.Enhancer:
      return "Enhancer";
    case Kind.Vex:
      return "Vex";
    case Kind.Amon:
      return "Amon";
    case Kind.Rafa:
      return "Rafa";
    case Kind.Harlowe:
      return "Harlowe";
    default:
      return "Unknown";
  }
}


export type ItemTypeKey = {
  First: Kind;
  Second: Kind;
};

export const reverseIdMap: Record<number, ItemTypeKey> = {
  2: { First: Kind.Daedalus, Second: Kind.Pistol },
  3: { First: Kind.Jacobs, Second: Kind.Pistol },
  4: { First: Kind.Order, Second: Kind.Pistol },
  5: { First: Kind.Tediore, Second: Kind.Pistol },
  6: { First: Kind.Torgue, Second: Kind.Pistol },
  7: { First: Kind.Ripper, Second: Kind.Shotgun },
  8: { First: Kind.Daedalus, Second: Kind.Shotgun },
  9: { First: Kind.Jacobs, Second: Kind.Shotgun },
  10: { First: Kind.Maliwan, Second: Kind.Shotgun },
  11: { First: Kind.Tediore, Second: Kind.Shotgun },
  12: { First: Kind.Torgue, Second: Kind.Shotgun },
  13: { First: Kind.Daedalus, Second: Kind.AssaultRifle },
  14: { First: Kind.Tediore, Second: Kind.AssaultRifle },
  15: { First: Kind.Order, Second: Kind.AssaultRifle },
  16: { First: Kind.Vladof, Second: Kind.Sniper },
  17: { First: Kind.Torgue, Second: Kind.AssaultRifle },
  18: { First: Kind.Vladof, Second: Kind.AssaultRifle },
  19: { First: Kind.Ripper, Second: Kind.SMG },
  20: { First: Kind.Daedalus, Second: Kind.SMG },
  21: { First: Kind.Maliwan, Second: Kind.SMG },
  22: { First: Kind.Vladof, Second: Kind.SMG },
  23: { First: Kind.Ripper, Second: Kind.Sniper },
  24: { First: Kind.Jacobs, Second: Kind.Sniper },
  25: { First: Kind.Maliwan, Second: Kind.Sniper },
  26: { First: Kind.Order, Second: Kind.Sniper },
  27: { First: Kind.Jacobs, Second: Kind.AssaultRifle },
  254: { First: Kind.Vex, Second: Kind.ClassMod },
  255: { First: Kind.Amon, Second: Kind.ClassMod },
  256: { First: Kind.Rafa, Second: Kind.ClassMod },
  259: { First: Kind.Harlowe, Second: Kind.ClassMod },
  261: { First: Kind.Torgue, Second: Kind.Repkit },
  263: { First: Kind.Maliwan, Second: Kind.Grenade },
  264: { First: Kind.Hyperion, Second: Kind.Enhancer },
  267: { First: Kind.Jacobs, Second: Kind.Grenade },
  268: { First: Kind.Jacobs, Second: Kind.Enhancer },
  270: { First: Kind.Daedalus, Second: Kind.Grenade },
  271: { First: Kind.Maliwan, Second: Kind.Enhancer },
  272: { First: Kind.Order, Second: Kind.Grenade },
  275: { First: Kind.Ripper, Second: Kind.HeavyWeapon },
  274: { First: Kind.Ripper, Second: Kind.Repkit },
  277: { First: Kind.Daedalus, Second: Kind.Repkit },
  279: { First: Kind.Maliwan, Second: Kind.Shield }, // Shield Energy
  281: { First: Kind.Order, Second: Kind.Enhancer },
  282: { First: Kind.Vladof, Second: Kind.HeavyWeapon },
  283: { First: Kind.Vladof, Second: Kind.Shield }, // Shield Armor
  284: { First: Kind.Atlas, Second: Kind.Enhancer },
  285: { First: Kind.Order, Second: Kind.Repkit },
  286: { First: Kind.COV, Second: Kind.Enhancer },
  287: { First: Kind.Tediore, Second: Kind.Shield }, // Shield Armor
  289: { First: Kind.Maliwan, Second: Kind.HeavyWeapon },
  292: { First: Kind.Tediore, Second: Kind.Enhancer },
  293: { First: Kind.Order, Second: Kind.Shield }, // Shield Energy
  296: { First: Kind.Ripper, Second: Kind.Enhancer },
  299: { First: Kind.Daedalus, Second: Kind.Enhancer },
  300: { First: Kind.Ripper, Second: Kind.Shield }, // Shield Energy
  303: { First: Kind.Torgue, Second: Kind.Enhancer },
  306: { First: Kind.Jacobs, Second: Kind.Shield }, // Shield Armor
  310: { First: Kind.Vladof, Second: Kind.Enhancer },
  312: { First: Kind.Daedalus, Second: Kind.Shield }, // Shield Energy
  321: { First: Kind.Torgue, Second: Kind.Shield }, // Shield Armor
};

export function GetKindEnums(id: number): [Kind, Kind, boolean] {
  const result = reverseIdMap[id];
  if (result) {
    return [result.First, result.Second, true];
  }
  return [Kind.Unknown, Kind.Unknown, false];
}
