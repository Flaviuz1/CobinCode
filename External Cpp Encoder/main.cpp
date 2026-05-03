#include "base64.hpp"
#include "miniz.hpp" 

std::string rawdata;

void init_string(const char* path) {
	FILE *f = fopen(path, "rb");

	if (!f) {
		printf("file not found\n");
		exit(1);
	}

	fseek(f, 0, SEEK_END);
	long size = ftell(f);
	rewind(f);

	rawdata.resize(size);

	fread(&rawdata[0], 1, size, f);

	fclose(f);
}

std::string compress(const std::string &data) {
    mz_ulong source_len = data.size();
    mz_ulong dest_len = mz_compressBound(source_len);

    std::string compressed(sizeof(uint64_t) + dest_len, '\0');

    mz_compress2((unsigned char*)compressed.data() + sizeof(uint64_t), &dest_len, (const unsigned char*)data.data(), source_len, MZ_BEST_COMPRESSION);

    uint64_t original_size = source_len;
    memcpy(compressed.data(), &original_size, sizeof(uint64_t));

    compressed.resize(sizeof(uint64_t) + dest_len);
    return compressed;
}

std::string decompress(const std::string &data) {
	uint64_t original_size;
    memcpy(&original_size, data.data(), sizeof(uint64_t));

    std::string decompressed(original_size, '\0');
    mz_ulong dest_len = original_size;

    mz_uncompress(
        (unsigned char*)decompressed.data(),
        &dest_len,
        (const unsigned char*)data.data() + sizeof(uint64_t),
        data.size() - sizeof(uint64_t)
    );

    return decompressed;
}

int main(int argc, char *argv[]) {
    if (argc < 3) {
        printf("usage: ./main <file> <encode|decode>\n");
        return 1;
    }

    init_string(argv[1]);
    init_lookup();

    std::string op = argv[2];
    std::string output;

    if (op == "encode") {
        output = encode_bits(compress(rawdata));
    } else if (op == "decode") {
        output = decompress(decode_bits(rawdata));
    }

    fwrite(output.data(), 1, output.size(), stdout);

    return 0;
}