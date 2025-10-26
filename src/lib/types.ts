export const TOK_SEP1 = 0;
export const TOK_SEP2 = 1;
export const TOK_VARINT = 4;
export const TOK_VARBIT = 6;
export const TOK_PART = 5;
export const TOK_STRING = 7;

export const SUBTYPE_NONE = 0;
export const SUBTYPE_INT = 1;
export const SUBTYPE_LIST = 2;

export type SubType = number;

/**
 * @typedef {object} Part
 * @property {SubType} subType
 * @property {number} index
 * @property {number} [value]
 * @property {{ type: number; value: number }[]} [values]
 * @property {string} [code]
 */
export interface Part {
	subType: SubType;
	index: number;
	value?: number;
	values?: { type: number; value: number }[];
	code?: string;
}

/**
 * @typedef {object} PartInfo
 * @property {string} name
 * @property {string} fileName
 * @property {string} code
 * @property {SubType} subType
 * @property {number} index
 * @property {number} [value]
 * @property {{ type: number; value: number }[]} [values]
 */
export interface PartInfo extends Part {
	name: string;
	fileName: string;
	code: string;
	subType: SubType;
}

/**
 * @typedef {object} Block
 * @property {number} token
 * @property {number} [value]
 * @property {string} [valueStr]
 * @property {Part} [part]
 */
export interface Block {
	token: number;
	value?: number;
	valueStr?: string;
	part?: Part;
}

/**
 * @typedef {Block[]} Serial
 */
export type Serial = Block[];

/**
 * @typedef {object} RawPart
 * @property {string} name
 * @property {string} universalPart
 * @property {string} fileName
 */
export interface RawPart {
	name: string;
	universalPart: string;
	fileName: string;
}

/**
 * @typedef {object} Counts
 * @property {number} appendRandomAsset
 * @property {number} injectRepeatingPart
 * @property {number} injectRepeatingPartFull
 * @property {number} scrambleAndAppendFromRepo
 * @property {number} injectRandomAsset
 * @property {number} reverseRandomSegments
 * @property {number} injectHighValuePart
 * @property {number} crossoverWithRepository
 * @property {number} shuffleAssets
 * @property {number} randomizeAssets
 * @property {number} repeatHighValuePart
 * @property {number} appendHighValuePart
 * @property {number} [appendMutation]
 * @property {number} [stackedPartMutationV1]
 * @property {number} [stackedPartMutationV2]
 * @property {number} [evolvingMutation]
 * @property {number} [characterFlipMutation]
 * @property {number} [segmentReversalMutation]
 * @property {number} [partManipulationMutation]
 * @property {number} [repositoryCrossoverMutation]
 * @property {number} [shuffleAssetsMutation]
 * @property {number} [randomizeAssetsMutation]
 * @property {number} [repeatHighValuePartMutation]
 * @property {number} [appendHighValuePartMutation]
 */
export interface Counts {
	appendRandomAsset: number;
	injectRepeatingPart: number;
	injectRepeatingPartFull: number;
	scrambleAndAppendFromRepo: number;
	injectRandomAsset: number;
	reverseRandomSegments: number;
	injectHighValuePart: number;
	crossoverWithRepository: number;
	shuffleAssets: number;
	randomizeAssets: number;
	repeatHighValuePart: number;
	appendHighValuePart: number;
	// Additional properties from worker.spec.ts
	appendMutation?: number;
	stackedPartMutationV1?: number;
	stackedPartMutationV2?: number;
	evolvingMutation?: number;
	characterFlipMutation?: number;
	segmentReversalMutation?: number;
	partManipulationMutation?: number;
	repositoryCrossoverMutation?: number;
	shuffleAssetsMutation?: number;
	randomizeAssetsMutation?: number;
	repeatHighValuePartMutation?: number;
	appendHighValuePartMutation?: number;
}

/**
 * @typedef {object} Rules
 * @property {number} targetOffset
 * @property {number} minChunk
 * @property {number} maxChunk
 * @property {number} minPart
 * @property {number} maxPart
 * @property {number} legendaryChance
 * @property {number} difficultyIncrement
 * @property {number} [mutableStart]
 * @property {number} [mutableEnd]
 * @property {number} [targetChunk]
 */
export interface Rules {
	targetOffset: number;
	minChunk: number;
	maxChunk: number;
	minPart: number;
	maxPart: number;
	legendaryChance: number;
	difficultyIncrement: number;
	// Additional properties from worker.spec.ts
	mutableStart?: number;
	mutableEnd?: number;
	targetChunk?: number;
}

/**
 * @typedef {object} Difficulties
 * @property {number} appendRandomAsset
 * @property {number} injectRepeatingPart
 * @property {number} injectRepeatingPartFull
 * @property {number} scrambleAndAppendFromRepo
 * @property {number} injectRandomAsset
 * @property {number} reverseRandomSegments
 * @property {number} injectHighValuePart
 * @property {number} crossoverWithRepository
 * @property {number} shuffleAssets
 * @property {number} randomizeAssets
 * @property {number} repeatHighValuePart
 * @property {number} appendHighValuePart
 */
export interface Difficulties {
	appendRandomAsset: number;
	injectRepeatingPart: number;
	injectRepeatingPartFull: number;
	scrambleAndAppendFromRepo: number;
	injectRandomAsset: number;
	reverseRandomSegments: number;
	injectHighValuePart: number;
	crossoverWithRepository: number;
	shuffleAssets: number;
	randomizeAssets: number;
	repeatHighValuePart: number;
	appendHighValuePart: number;
}

/**
 * @typedef {object} State
 * @property {string} repository
 * @property {string} seed
 * @property {Counts} counts
 * @property {Rules} rules
 * @property {Difficulties} difficulties
 * @property {boolean} generateStats
 * @property {boolean} debugMode
 * @property {number} [selectedAsset]
 * @property {string} [baseYaml]
 */
export interface State {
	repository: string;
	seed: string;
	counts: Counts;
	rules: Rules;
	difficulties: Difficulties;
	generateStats: boolean;
	debugMode: boolean;
	selectedAsset?: number;
	baseYaml?: string;
}

export const classModIdToName: { [key: number]: string } = {
	254: 'classmod_dark_siren', // Vex
	255: 'classmod_paladin', // Amon
	256: 'classmod_exo_soldier', // Rafa
	259: 'classmod_gravitar' // Harlowe
};
