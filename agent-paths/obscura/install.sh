#!/usr/bin/env bash
set -euo pipefail

version=v0.2.6
case "$(uname -s):$(uname -m)" in
  Linux:x86_64)
    asset=obscura-x86_64-linux.tar.gz
    digest=eed986e478c5ec5439f531f2d7fb6b0e36a356f1df7a6c44a8e8fd4f2486bd76
    ;;
  Linux:aarch64|Linux:arm64)
    asset=obscura-aarch64-linux.tar.gz
    digest=e12aff8bbe40326386a471060083e9cec5255b67048996b84f649efef10cac39
    ;;
  Darwin:arm64)
    asset=obscura-aarch64-macos.tar.gz
    digest=19faa248ac762f466ddb822dbb03ed4f097312d10d1a4d5b2143e6040a9bebd0
    ;;
  Darwin:x86_64)
    asset=obscura-x86_64-macos.tar.gz
    digest=897f03df4e3d704f946c5e14c6a90a34e0d4e4ef898c4b3201771712962cd7fb
    ;;
  *) printf 'This installer supports Linux and macOS on x86_64 and ARM64.\n' >&2; exit 1 ;;
esac

destination="${1:?Usage: bash install.sh /path/to/bin}"
mkdir -p "$destination"
staging="$(mktemp -d "$destination/.obscura-install.XXXXXXXX")"
trap 'rm -rf -- "$staging"' EXIT

curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' \
  --connect-timeout 12 --max-time 90 --retry 2 \
  --output "$staging/$asset" \
  "https://github.com/h4ckf0r0day/obscura/releases/download/$version/$asset"
(
  cd "$staging"
  if command -v sha256sum >/dev/null; then
    printf '%s  %s\n' "$digest" "$asset" | sha256sum --check
  else
    printf '%s  %s\n' "$digest" "$asset" | shasum -a 256 -c
  fi
  tar -xzf "$asset" obscura obscura-worker
  ./obscura --version
)
mv -- "$staging/obscura-worker" "$destination/obscura-worker"
mv -- "$staging/obscura" "$destination/obscura"
