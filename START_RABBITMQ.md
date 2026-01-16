# RabbitMQ Quick Start Commands

## Option 1: เริ่ม RabbitMQ ด้วย Docker (แนะนำ)

```bash
# เริ่ม RabbitMQ
docker run -d --name linklian-rabbitmq ^
  --hostname rabbitmq-server ^
  -p 5672:5672 ^
  -p 15672:15672 ^
  -e RABBITMQ_DEFAULT_USER=linklian ^
  -e RABBITMQ_DEFAULT_PASS=linklian123 ^
  rabbitmq:3-management

# ตรวจสอบสถานะ
docker ps

# หยุด RabbitMQ
docker stop linklian-rabbitmq

# ลบ container
docker rm linklian-rabbitmq
```

## Option 2: ใช้ Docker Compose

```bash
# เริ่มทั้งหมด (RabbitMQ + API)
docker-compose up -d

# เริ่มเฉพาะ RabbitMQ
docker-compose up -d rabbitmq

# หยุด
docker-compose down
```

## Option 3: รันแบบไม่มี RabbitMQ (Development Mode)

```bash
# Set environment variable
set RABBITMQ_OPTIONAL=true

# รัน server
go run ./cmd/

# หรือสร้าง .env file
echo RABBITMQ_OPTIONAL=true > .env
```

## การเข้าถึง

- **RabbitMQ Management UI**: http://localhost:15672
  - Username: `linklian`
  - Password: `linklian123`
- **API Server**: http://localhost:7070
- **WebSocket**: ws://localhost:7070/ws
- **Health Check**: http://localhost:7070/health

## การทดสอบ

1. เริ่ม RabbitMQ (เลือก option ใดก็ได้ข้างบน)
2. รัน Go server: `go run ./cmd/`
3. เปิด `examples/client.html` ในเบราว์เซอร์
4. ทดสอบการส่งข้อความ