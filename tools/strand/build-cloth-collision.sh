#!/bin/sh
set -eu
# Run from repository root. Clang/LLD 19 was used for the checked-in kernel.
"${STRAND_CLANG:-clang-19}" --target=wasm32 -O3 -fno-math-errno -ffp-contract=off \
 -nostdlib -fuse-ld="${STRAND_WASM_LD:-lld}" \
 -Wl,--no-entry -Wl,--export-memory -Wl,--initial-memory=4194304 \
 -Wl,--max-memory=4194304 -Wl,-z,stack-size=65536 \
 "$(dirname "$0")/cloth-collision.c" -o "${STRAND_WASM_OUTPUT:-public/strand/wasm/cloth-collision.wasm}"
