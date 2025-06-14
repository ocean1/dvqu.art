serve:
	@npm run serve

build:
	@npm run build

build-prod:
	@npm run build:prod

watch:
	@npm run watch

bundle:
	@npm run bundle

# Install dependencies
install:
	@npm install

# Production build with bundling and optimization
prod: build-prod
	@echo "Production build complete!"

# Clean build artifacts
clean:
	@rm -rf static/vendor/* node_modules package-lock.json