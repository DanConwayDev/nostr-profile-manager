dev:
    fd '.ts|.html|.css' | entr -r bash -c 'just build && python3 -m http.server -d dist/ -b 127.0.0.1 8080'

build:
    rm -rf dist
    ./node_modules/.bin/esbuild src/index.ts --bundle --minify --sourcemap=external --outfile=dist/index.js
    ./node_modules/.bin/sass src/style.scss dist/style.css --style compressed
    cp src/index.html dist/index.html
    cp -r src/img dist/img

deploy: lint build
    wrangler pages publish --project-name metadata-contacts-relays dist/

lint:
    eslint src/ --ext .js,.jsx,.ts,.tsx
