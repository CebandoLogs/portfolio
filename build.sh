#!/usr/bin/env bash
# Compila el sitio en Cloudflare. Descarga una versión fija de Hugo y verifica
# su hash antes de usarla, para que el build no dependa de lo que traiga la imagen.
set -euo pipefail
HUGO_VERSION=0.169.0
HUGO_SHA256=c41672a0725d307758a132bc94a962e59760eb33f9ba08c991b81f9881d6fa7d
TMP=$(mktemp -d)
curl -sSfL -o "$TMP/hugo.tar.gz" "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz"
echo "${HUGO_SHA256}  $TMP/hugo.tar.gz" | sha256sum -c -
tar -xzf "$TMP/hugo.tar.gz" -C "$TMP" hugo
"$TMP/hugo" --gc --minify
