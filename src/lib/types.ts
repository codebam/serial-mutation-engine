export const TOK_SEP1 = 0;
export const TOK_SEP2 = 1;
export const TOK_VARINT = 2;
export const TOK_VARBIT = 3;
export const TOK_PART = 4;
export const TOK_UNSUPPORTED_111 = 5;

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