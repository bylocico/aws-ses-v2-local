#!/bin/sh
set -e

exec aws-ses-v2-local --host "${HOST:-0.0.0.0}" --port "${PORT:-8005}" "$@"
