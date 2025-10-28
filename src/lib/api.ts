/**
 * @module api
 * @description This module provides a set of functions for working with serials, including encoding, decoding, and manipulation.
 */

export { serialToCustomFormat, customFormatToSerial } from './custom_parser.ts';
export { parseSerial, parseBytes } from './parser.ts';
export { encodeSerial, writeVarint, writeVarbit } from './encoder.ts';
export { toCustomFormat } from './formatter.ts';
export {
	getInitialState,
	appendRandomAsset,
	injectRepeatingPart,
	scrambleAndAppendFromRepo,
	injectRepeatingPartFull,
	injectRandomAsset,
	reverseRandomSegments,
	injectHighValuePart,
	crossoverWithRepository,
	shuffleAssets,
	randomizeAssets,
	repeatHighValuePart,
	appendHighValuePart,
	appendSelectedAssetMutation,
	repeatSelectedAssetMutation,
	mergeSerial,
	mergeSerials
} from './mutations.ts';
export * from './types.ts';