build:
	pnpm build

image:
	docker build -t ghcr.io/capotej/harness .

.PHONY: build image
