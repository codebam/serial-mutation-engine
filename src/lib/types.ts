export const SUBTYPE_NONE = 0;
export const SUBTYPE_INT = 1;
export const SUBTYPE_LIST = 2;

export type SubType = typeof SUBTYPE_NONE | typeof SUBTYPE_INT | typeof SUBTYPE_LIST;

export interface Part {
    subType: SubType;
    index: number;
    value?: number;
    values?: number[];
}

export interface Block {
    token: number;
    value?: number;
    part?: Part;
}

export type Serial = Block[];