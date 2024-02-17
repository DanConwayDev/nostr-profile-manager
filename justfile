build:
    rm -rf dist
    esbuild src/index.ts --bundle --minify --sourcemap=external --outfile=dist/index.js
    ./node_modules/.bin/sass src/style.scss dist/style.css --style compressed
    cp src/index.html dist/index.html
    cp -r src/img dist/img

deploy:
    wrangler pages publish --project-name metadata-contacts-relays dist/

lint:
    eslint src/ --ext .js,.jsx,.ts,.tsx

build-and-deploy: build deploy

serve:
    fd '.ts|.html|.css' | entr -r bash -c 'just build && python -m http.server -d dist/ 8080'
