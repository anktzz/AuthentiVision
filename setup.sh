#!/usr/bin/env bash
# one-time setup: creates a venv, installs backend deps, builds the frontend
set -e

python3 -m venv venv
source venv/bin/activate

pip install --upgrade pip
pip install -r backend/requirements.txt

pip install --no-deps facenet-pytorch==2.6.0  # its setup.py pins conflict with our versions, see README

cd frontend
npm install
npm run build
cd ..

echo "Setup complete. Run: source venv/bin/activate && cd backend && uvicorn main:app --reload"
