import type { State, AssetToken } from './types';
import { parse } from './parser';
import { serialToBytes } from './decode';
import { parsedToSerial } from './encoder';
import * as coreMutations from './mutations';

export interface StringMutation {
    (serial: string, state: State, selectedAsset?: AssetToken): string;
}

function wrapMutation(mutation: coreMutations.Mutation): StringMutation {
    return (serial: string, state: State, selectedAsset?: AssetToken): string => {
        const bytes = serialToBytes(serial);
        const parsedSerial = parse(bytes, 'fixed', state.bitSize);
        const newParsedSerial = mutation(parsedSerial, state, selectedAsset);
        return parsedToSerial(newParsedSerial);
    };
}

export const stackedPartMutationV1 = wrapMutation(coreMutations.stackedPartMutationV1);
export const stackedPartMutationV2 = wrapMutation(coreMutations.stackedPartMutationV2);
export const evolvingMutation = wrapMutation(coreMutations.evolvingMutation);
export const characterFlipMutation = wrapMutation(coreMutations.characterFlipMutation);
export const segmentReversalMutation = wrapMutation(coreMutations.segmentReversalMutation);
export const partManipulationMutation = wrapMutation(coreMutations.partManipulationMutation);
export const repositoryCrossoverMutation = wrapMutation(coreMutations.repositoryCrossoverMutation);
export const appendMutation = wrapMutation(coreMutations.appendMutation);
export const shuffleAssetsMutation = wrapMutation(coreMutations.shuffleAssetsMutation);
export const randomizeAssetsMutation = wrapMutation(coreMutations.randomizeAssetsMutation);
export const repeatHighValuePartMutation = wrapMutation(coreMutations.repeatHighValuePartMutation);
export const appendHighValuePartMutation = wrapMutation(coreMutations.appendHighValuePartMutation);
export const appendSelectedAssetMutation = wrapMutation(coreMutations.appendSelectedAssetMutation);
export const repeatSelectedAssetMutation = wrapMutation(coreMutations.repeatSelectedAssetMutation);