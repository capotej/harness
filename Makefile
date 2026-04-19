REGISTRY := ghcr.io/capotej/harness

build:
	pnpm build

image-base:
	docker build -t $(REGISTRY):latest .

image-opencode:
	docker build --build-arg BASE_IMAGE=$(REGISTRY):latest -t $(REGISTRY):opencode-latest -f Dockerfile.opencode .

image-hermes:
	docker build --build-arg BASE_IMAGE=$(REGISTRY):latest -t $(REGISTRY):hermes-latest -f Dockerfile.hermes .

image: image-base image-opencode image-hermes

.PHONY: build image image-base image-opencode image-hermes
