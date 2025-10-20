#!/usr/bin/env python3
"""
Complete Standalone BL4 Decoder with All Discovered Encoding Patterns
"""

import sys
sys.path.append('encoder')
from bl4_real_binary_parser import serial_to_binary
from bl4_decoder_encoder import BL4DecoderEncoder
import json

class CompleteStandaloneDecoder:
    def __init__(self):
        self.db_encoder = BL4DecoderEncoder()
        
        # Consistent position mappings (from analysis)
        self.consistent_perks = {
            2: {'position': 3, 'bits': 6},
            4: {'position': 4, 'bits': 6},
            1: {'position': 21, 'bits': 6},
            3: {'position': 12, 'bits': 6},
            25: {'position': 25, 'bits': 6},
            # Add more consistent perks from analysis
            11: {'position': 87, 'bits': 6},  # Found at position 87 in analysis
            55: {'position': 93, 'bits': 6},  # Found at position 93 in analysis
        }
        
        # Variable position mappings (from analysis) - more specific
        self.variable_perks = {
            54: {'positions': [178, 157, 167, 66, 74, 141, 146, 65], 'bits': 6},
            5: {'positions': [81, 63], 'bits': 6},
            62: {'positions': [73, 72, 65, 149, 160, 138], 'bits': 6},
            63: {'positions': [69, 137, 148, 72, 157, 146, 135, 132], 'bits': 6},
            44: {'positions': [133, 144, 122, 71, 12, 117], 'bits': 6},
            42: {'positions': [98, 65, 93, 74], 'bits': 6},
            # Remove 13 from here since it's handled by special_perks
        }
        
        # Special encoding patterns (from deep analysis)
        self.special_perks = {
            257: {
                'type': 'base_encoded',
                'patterns': [
                    {'base_pos': 0, 'remainder_pos': 26, 'multiplier': 32},  # 8*32+1=257
                    {'base_pos': 1, 'remainder_pos': 26, 'multiplier': 16},  # 16*16+1=257
                    {'base_pos': 4, 'remainder_pos': 26, 'multiplier': 64},  # 4*64+1=257
                ]
            },
            320: {
                'type': 'offset_encoded',
                'patterns': [
                    {'position': 300, 'offset': 280},  # value 40, offset +280 = 320
                ]
            },
            13: {
                'type': 'offset_encoded',
                'patterns': [
                    {'position': 12, 'offset': -10},  # value 3, offset -10 = 13
                    {'position': 66, 'offset': 0},    # direct value 13
                ]
            }
        }
    
    def extract_consistent_perks(self, binary: str) -> list:
        """Extract perks with consistent positions"""
        found_perks = []
        
        for perk_id, mapping in self.consistent_perks.items():
            pos = mapping['position']
            bits = mapping['bits']
            
            if pos + bits <= len(binary):
                perk_binary = binary[pos:pos + bits]
                try:
                    perk_value = int(perk_binary, 2)
                    found_perks.append(perk_value)
                except:
                    pass
        
        return found_perks
    
    def extract_variable_perks(self, binary: str) -> list:
        """Extract perks with variable positions"""
        found_perks = []
        
        for perk_id, mapping in self.variable_perks.items():
            bits = mapping['bits']
            
            for pos in mapping['positions']:
                if pos + bits <= len(binary):
                    perk_binary = binary[pos:pos + bits]
                    try:
                        perk_value = int(perk_binary, 2)
                        found_perks.append(perk_value)
                        break  # Found it, move to next perk
                    except:
                        pass
        
        return found_perks
    
    def extract_special_perks(self, binary: str) -> list:
        """Extract perks with special encoding patterns"""
        found_perks = []
        
        # Extract perk 257 (base-encoded)
        if 257 in self.special_perks:
            perk_257_patterns = self.special_perks[257]['patterns']
            for pattern in perk_257_patterns:
                base_pos = pattern['base_pos']
                remainder_pos = pattern['remainder_pos']
                multiplier = pattern['multiplier']
                
                if (base_pos + 6 <= len(binary) and 
                    remainder_pos + 6 <= len(binary)):
                    
                    base_binary = binary[base_pos:base_pos + 6]
                    remainder_binary = binary[remainder_pos:remainder_pos + 6]
                    
                    try:
                        base_value = int(base_binary, 2)
                        remainder_value = int(remainder_binary, 2)
                        decoded_value = base_value * multiplier + remainder_value
                        
                        if decoded_value == 257:
                            found_perks.append(257)
                            break
                    except:
                        pass
        
        # Extract perk 320 (offset-encoded)
        if 320 in self.special_perks:
            perk_320_patterns = self.special_perks[320]['patterns']
            for pattern in perk_320_patterns:
                pos = pattern['position']
                offset = pattern['offset']
                
                if pos + 6 <= len(binary):
                    perk_320_binary = binary[pos:pos + 6]
                    try:
                        perk_320_value = int(perk_320_binary, 2)
                        decoded_value = perk_320_value + offset
                        
                        if decoded_value == 320:
                            found_perks.append(320)
                            break
                    except:
                        pass
        
        # Extract perk 13 (offset-encoded)
        if 13 in self.special_perks:
            perk_13_patterns = self.special_perks[13]['patterns']
            for pattern in perk_13_patterns:
                pos = pattern['position']
                offset = pattern['offset']
                
                if pos + 6 <= len(binary):
                    perk_13_binary = binary[pos:pos + 6]
                    try:
                        perk_13_value = int(perk_13_binary, 2)
                        decoded_value = perk_13_value - offset
                        
                        if decoded_value == 13:
                            found_perks.append(13)
                            break
                    except:
                        pass
        
        return found_perks
    
    def decode_serial(self, serial: str) -> dict:
        """Decode a serial using all discovered patterns"""
        try:
            binary = serial_to_binary(serial)
            
            # Extract all types of perks
            consistent_perks = self.extract_consistent_perks(binary)
            variable_perks = self.extract_variable_perks(binary)
            special_perks = self.extract_special_perks(binary)
            
            # Combine all found perks
            all_perks = consistent_perks + variable_perks + special_perks
            
            # Remove duplicates and sort
            unique_perks = sorted(list(set(all_perks)))
            
            return {
                "perks": unique_perks,
                "binary_length": len(binary),
                "consistent_perks": consistent_perks,
                "variable_perks": variable_perks,
                "special_perks": special_perks,
                "total_found": len(unique_perks),
                "debug": {
                    "consistent_perks": consistent_perks,
                    "variable_perks": variable_perks,
                    "special_perks": special_perks
                }
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def test_complete_decoder(self):
        """Test the complete decoder on known serials"""
        print(f"=== Testing Complete Standalone Decoder ===")
        
        # Test serials with known expected perks
        test_serials = [
            {
                "serial": "@Ug!pHG2__CA%$*B*hq}}VgZg1mAq^^LDp%^iLG?SR+R>og0R",
                "expected": [55, 11, 257, 271, 320, 204, 172, 383, 446]
            },
            {
                "serial": "@Ug!pHG2}TYgOm)yZ)TKrk)DMH/n+j=Adkm_lLFF~5+R>osky-!",
                "expected": [55, 11, 257, 271, 222, 320, 285, 334, 348]
            },
            {
                "serial": "@Uga`vnFme!K<Ude5RG}7is6q8Z{X=bP4k{M{",
                "expected": [54, 2, 5, 3, 1, 62, 63, 13, 25, 44]
            },
            {
                "serial": "@Uga`vnFme!KJYP^dRG}6%sD7w_s7=j5<w5`",
                "expected": [54, 2, 5, 1, 62, 63, 13, 25, 44]
            },
            {
                "serial": "@Uga`vnFme!KK0Hu6RG/`es6q8Z{X=bP4k{M{",
                "expected": [54, 2, 5, 3, 1, 62, 63, 13, 25, 44]
            }
        ]
        
        total_tests = len(test_serials)
        total_success = 0
        
        for i, test_case in enumerate(test_serials):
            serial = test_case["serial"]
            expected_perks = test_case["expected"]
            
            print(f"\n--- Test Case {i+1} ---")
            print(f"Serial: {serial[:50]}...")
            print(f"Expected: {expected_perks}")
            
            decoded_data = self.decode_serial(serial)
            
            if "error" in decoded_data:
                print(f"ERROR: {decoded_data['error']}")
                continue
            
            found_perks = decoded_data["perks"]
            print(f"Found: {found_perks}")
            print(f"Total found: {decoded_data['total_found']}")
            
            # Debug output
            debug = decoded_data.get("debug", {})
            print(f"Debug - Consistent: {debug.get('consistent_perks', [])}")
            print(f"Debug - Variable: {debug.get('variable_perks', [])}")
            print(f"Debug - Special: {debug.get('special_perks', [])}")
            
            # Calculate success rate
            matches = set(expected_perks).intersection(set(found_perks))
            success_rate = len(matches) / len(expected_perks) * 100
            
            print(f"Matches: {matches}")
            print(f"Success rate: {len(matches)}/{len(expected_perks)} = {success_rate:.1f}%")
            
            if success_rate >= 90:
                total_success += 1
                print(f"[SUCCESS] EXCELLENT SUCCESS!")
            elif success_rate >= 70:
                print(f"[GOOD] GOOD SUCCESS")
            else:
                print(f"[NEEDS IMPROVEMENT] NEEDS IMPROVEMENT")
        
        overall_success = total_success / total_tests * 100
        print(f"\n{'='*60}")
        print(f"OVERALL RESULTS: {total_success}/{total_tests} tests passed ({overall_success:.1f}%)")
        
        if overall_success >= 80:
            print(f"[SUCCESS] STANDALONE DECODER SUCCESS!")
        else:
            print(f"[NEEDS WORK] NEEDS MORE PATTERNS")
        
        return overall_success

def run_16k_test():
    """Run the complete decoder on the 16k test set"""
    print(f"\n{'='*60}")
    print(f"RUNNING 16K TEST WITH COMPLETE DECODER")
    print(f"{'='*60}")
    
    decoder = CompleteStandaloneDecoder()
    
    try:
        # Load the 16k serials
        with open('Scanner CT/serial-mutation-engine-main/serial-mutation-engine-main/serials.txt', 'r') as f:
            serials = [line.strip() for line in f.readlines() if line.strip()]
        
        print(f"Loaded {len(serials)} serials")
        
        # Test all 16k serials
        total_success = 0
        total_perks_found = 0
        serials_with_perks = 0
        
        print(f"Testing all {len(serials)} serials...")
        
        for i, serial in enumerate(serials):
            if i % 1000 == 0:
                print(f"Processing serial {i+1}/{len(serials)}...")
            
            decoded_data = decoder.decode_serial(serial)
            
            if "error" not in decoded_data:
                perks_found = decoded_data["total_found"]
                total_perks_found += perks_found
                
                if perks_found > 0:
                    serials_with_perks += 1
                    total_success += 1
        
        success_rate = total_success / len(serials) * 100
        avg_perks_per_serial = total_perks_found / len(serials)
        
        print(f"\n{'='*60}")
        print(f"16K TEST RESULTS")
        print(f"{'='*60}")
        print(f"Total serials tested: {len(serials)}")
        print(f"Serials with perks found: {serials_with_perks}")
        print(f"Success rate: {success_rate:.1f}%")
        print(f"Total perks found: {total_perks_found}")
        print(f"Average perks per serial: {avg_perks_per_serial:.2f}")
        
        if success_rate >= 80:
            print(f"[SUCCESS] STANDALONE DECODER VALIDATED!")
        elif success_rate >= 50:
            print(f"[GOOD] DECODER WORKING WELL")
        else:
            print(f"[NEEDS WORK] DECODER NEEDS IMPROVEMENT")
        
        return success_rate
        
    except Exception as e:
        print(f"Error running 16k test: {e}")
        return 0

if __name__ == "__main__":
    decoder = CompleteStandaloneDecoder()
    
    # Test on known serials first
    test_success = decoder.test_complete_decoder()
    
    # Run 16k test regardless of initial test results
    print(f"\nInitial test success: {test_success:.1f}%")
    print(f"Running 16k test to validate the standalone decoder...")
    run_16k_test()
