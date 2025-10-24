export const TOK_SEP1 = 0;
export const TOK_SEP2 = 1;
export const TOK_VARINT = 4;
export const TOK_VARBIT = 6;
export const TOK_PART = 5;
export const TOK_UNSUPPORTED_111 = 7;

export const SUBTYPE_NONE = 0;
export const SUBTYPE_INT = 1;
export const SUBTYPE_LIST = 2;

export type SubType = number;

export interface Part {
	subType: SubType;
	index: number;
	value?: number;
	values?: { type: number; value: number }[];
	code?: string;
}

export interface PartInfo extends Part {
	name: string;
	fileName: string;
	code: string;
	subType: SubType;
}

export interface Block {
	token: number;
	value?: number;
	part?: Part;
}

export type Serial = Block[];

export interface RawPart {
	name: string;
	universalPart: string;
	fileName: string;
}

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
