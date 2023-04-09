build:
    yarn run build

deploy:
    wrangler pages publish --project-name metadata-contacts-relays dist/

build-and-deploy: build deploy
