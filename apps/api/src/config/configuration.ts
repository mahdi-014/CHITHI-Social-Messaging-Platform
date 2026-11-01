export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://chithi:chithi_secret@localhost:5432/chithi_db?schema=public',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'chithi_super_secret_jwt_access_key_2026_dev',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'chithi_super_secret_jwt_refresh_key_2026_dev',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  storage: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'us-east-1',
    accessKey: process.env.S3_ACCESS_KEY || 'chithi_minio',
    secretKey: process.env.S3_SECRET_KEY || 'chithi_minio_secret',
    bucketName: process.env.S3_BUCKET_NAME || 'chithi-media',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  webrtc: {
    turnSecret: process.env.TURN_SECRET || 'chithi_turn_secret_key_2026_dev',
    turnUrls: (process.env.TURN_URLS || process.env.TURN_SERVER_URL)
      ? (process.env.TURN_URLS || process.env.TURN_SERVER_URL)!.split(',').map((u) => u.trim())
      : [
          'turn:localhost:3478?transport=udp',
          'turn:localhost:3478?transport=tcp',
        ],
    stunUrls: (process.env.STUN_URLS || process.env.STUN_SERVERS)
      ? (process.env.STUN_URLS || process.env.STUN_SERVERS)!.split(',').map((u) => u.trim())
      : [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
        ],
    turnTtlSeconds: parseInt(process.env.TURN_TTL_SECONDS || '86400', 10),
  },
});
