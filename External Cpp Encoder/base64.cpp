#include "base64.hpp" 

const std::string elookup = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
unsigned char dlookup[256];

void init_lookup() {
    memset(dlookup, 255, sizeof(dlookup));
    for (int i = 0; i < 64; i++)
        dlookup[(unsigned char)elookup[i]] = i;
}

std::string encode_bits(const std::string& data) {
	std::string encoded = "";
	int val = 0;
	int valb = -6;
	for (char byte : data) {
		val = (val << 8) | (unsigned char)byte;
		valb += 8;

		while (valb >= 0) {
			int index = (val >> valb) & 0x3F;
			encoded += elookup[index];
			valb -= 6;
		}
	}
	if (valb > -6) {
		encoded += elookup[(val << 8) >> (valb + 8) & 0x3F];
	}
	return encoded;
}

std::string decode_bits(const std::string& data) {
	std::string decoded = "";
	int val = 0;
	int valb = 0;
	for (char group : data) {
		val = (val << 6) | (unsigned char)dlookup[group];
		valb += 6;

		while (valb >= 8) {
			decoded += char((val >> (valb - 8)) & 0xFF);
			valb -= 8;
		}
	}
	return decoded;
}