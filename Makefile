.PHONY: help bump-patch bump-minor bump-major tag-release docker-build docker-save

# Default target
help:
	@echo "Available targets:"
	@echo "  bump-patch    - Bump patch version (x.x.X) and install dependencies"
	@echo "  bump-minor    - Bump minor version (x.X.x) and install dependencies"
	@echo "  bump-major    - Bump major version (X.x.x) and install dependencies"
	@echo "  tag-release   - Create and push a signed git tag for the current version"
	@echo "  docker-build  - Build the production Docker image locally"
	@echo "  docker-save   - Build and save the image to status-page.tar.gz"

# Bump patch version (0.0.1 -> 0.0.2)
bump-patch:
	@echo "Bumping patch version..."
	npm version patch --no-git-tag-version
	@echo "New version: $$(node -p "require('./package.json').version")"
	pnpm install

# Bump minor version (0.1.0 -> 0.2.0)
bump-minor:
	@echo "Bumping minor version..."
	npm version minor --no-git-tag-version
	@echo "New version: $$(node -p "require('./package.json').version")"
	pnpm install

# Bump major version (1.0.0 -> 2.0.0)
bump-major:
	@echo "Bumping major version..."
	npm version major --no-git-tag-version
	@echo "New version: $$(node -p "require('./package.json').version")"
	pnpm install

# Create and push a signed git tag for the current version
tag-release:
	@VERSION=$$(node -p "require('./package.json').version") && \
	echo "Creating signed tag for version $$VERSION..." && \
	git tag -s "$$VERSION" -m "Release $$VERSION" && \
	git push origin --follow-tags && \
	echo "Signed tag $$VERSION created and pushed"

# Build the production image locally
docker-build:
	@VERSION=$$(node -p "require('./package.json').version") && \
	docker build \
		--build-arg APP_VERSION=$$VERSION \
		--build-arg BUILD_TIME=$$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
		--build-arg GIT_COMMIT=$$(git rev-parse HEAD 2>/dev/null || echo unknown) \
		-t status-page:$$VERSION -t status-page:latest .

# Build and export the image as a gzip-compressed tarball
docker-save: docker-build
	@VERSION=$$(node -p "require('./package.json').version") && \
	echo "Saving status-page:$$VERSION -> status-page.tar.gz..." && \
	docker save status-page:$$VERSION | gzip > status-page.tar.gz && \
	echo "Wrote status-page.tar.gz ($$(du -h status-page.tar.gz | cut -f1))"
