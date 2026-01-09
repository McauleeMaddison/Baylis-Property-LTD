SHELL := /bin/bash

.PHONY: up down migrate start stop logs

up:
	docker-compose up -d --build

down:
	docker-compose down

migrate:
	@echo "Running migrations"
	node server/migrate.js migrations/0001_init.sql

start:
	@echo "Start server locally (no docker)"
	cd server && npm run dev

stop:
	@echo "Stop server processes (kills on port 5000)"
	-kill $(shell lsof -t -i :5000)

logs:
	docker-compose logs -f
