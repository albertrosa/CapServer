#!/bin/bash

echo "Cleaning up node_modules and package-lock.json..."
rm -rf node_modules
rm -f package-lock.json

echo "Cleaning npm cache..."
npm cache clean --force

echo "Installing dependencies..."
npm install

echo "Installation complete!"
