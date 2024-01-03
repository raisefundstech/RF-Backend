# If the directory, `dist`, doesn't exist, create `dist`
stat dist || mkdir dist
# Archive artifacts
# cd build
zip dist/Finder-backend.zip -r dist package.json config .platform node_modules .platform