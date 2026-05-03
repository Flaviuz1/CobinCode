#include <string>
#include <cstdio>
#include <cstring>

extern void init_lookup();
extern std::string encode_bits(const std::string& data);
extern std::string decode_bits(const std::string& data);