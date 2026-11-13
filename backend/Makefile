.PHONY: tidy build run api worker scheduler docker-up amd64 docker-build

tidy:
	go mod tidy

build:
	mkdir -p bin
	go build -o bin/school-api ./cmd/api
	go build -o bin/worker ./cmd/worker
	go build -o bin/scheduler ./cmd/scheduler

run: build
	PORT=$${PORT:-18080} ./bin/school-api

api:
	PORT=$${PORT:-18080} go run ./cmd/api

worker:
	go run ./cmd/worker

scheduler:
	go run ./cmd/scheduler

docker-up:
	docker compose up --build

docker-build:
	docker build --platform linux/amd64 -t little-royals-school-api:local -f Dockerfile .

amd64:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/school-api-linux-amd64 ./cmd/api
