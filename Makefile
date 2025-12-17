build-front-end:
	docker build -t transcendence-frontend -f frontend/Dockerfile frontend/.
	docker run -p 3000:3000 transcendence-frontend

build-back-end:
	docker build -t transcendence-backend -f backend/api/transcendence-api-gateway/Dockerfile backend/api/transcendence-api-gateway/.
	docker run -p 4000:4000 transcendence-backend