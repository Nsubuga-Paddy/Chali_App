#!/bin/bash
set -e

# Activate virtual environment if it exists
if [ -d "venv" ]; then
  source venv/bin/activate
fi

# Start the Next.js application
exec npm start
