<?php

// Load .env only if present locally
if (file_exists(__DIR__ . '/.env')) {
    $dotenv = Dotenv\Dotenv::createUnsafeImmutable(__DIR__);
    $dotenv->safeLoad();
}

define('APP_NAME', getenv('APP_NAME') ?: 'Unknown');

// App
define('DEBUG_MODE', (getenv('APP_DEBUG') ?: 'false') === 'true');

// Database
define('DB_HOST', getenv('DB_HOST') ?: 'smartsb_db');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: '');
define('DB_USER', getenv('DB_USER') ?: '');
define('DB_PASS', getenv('DB_PASSWORD') ?: '');
define('DB_CHARSET', getenv('DB_CHARSET') ?: 'utf8mb4');
define('DB_SSL', filter_var(getenv('DB_SSL') ?: false, FILTER_VALIDATE_BOOLEAN));

// JWT
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'your-super-secret-key');
define('JWT_EXPIRY', (int) (getenv('JWT_EXPIRY') ?: 3600));
define('JWT_ALGORITHM', getenv('JWT_ALGORITHM') ?: 'HS256');
define('REFRESH_TOKEN_EXPIRY', (int) (getenv('REFRESH_TOKEN_EXPIRY') ?: 604800));

// Rate Limiting
define('RATE_LIMIT_REQUESTS', (int) (getenv('RATE_LIMIT_REQUESTS') ?: 100));
define('RATE_LIMIT_WINDOW', (int) (getenv('RATE_LIMIT_WINDOW') ?: 3600));
define('LOGIN_RATE_LIMIT', (int) (getenv('LOGIN_RATE_LIMIT') ?: 5));
define('LOGIN_RATE_WINDOW', (int) (getenv('LOGIN_RATE_WINDOW') ?: 900));

// Paths
define('RATE_LIMIT_CACHE_PATH', __DIR__ . '/storage/cache/ratelimit');
define('FILE_ID_SECRET', 'SMART-SB');
define('LOG_PATH', __DIR__ . '/storage/logs');
define('APP_ID', getenv('APP_ID') ?: '');

// Email
define('MAIL_MAILER', getenv('MAIL_MAILER') ?: 'smtp');
define('MAIL_HOST', getenv('MAIL_HOST') ?: '');
define('MAIL_PORT', getenv('MAIL_PORT') ?: '');
define('MAIL_USERNAME', getenv('MAIL_USERNAME') ?: '');
define('MAIL_PASSWORD', getenv('MAIL_PASSWORD') ?: '');
define('MAIL_ENCRYPTION', getenv('MAIL_ENCRYPTION') ?: '');
define('MAIL_FROM_ADDRESS', getenv('MAIL_FROM_ADDRESS') ?: '');
define('MAIL_FROM_NAME', getenv('MAIL_FROM_NAME') ?: '');
define('BREVO_API_KEY', getenv('BREVO_API_KEY') ?: '');

// R2
define('R2_ENDPOINT', getenv('R2_ENDPOINT') ?: '');
define('R2_ACCESS_KEY', getenv('R2_ACCESS_KEY') ?: '');
define('R2_SECRET_KEY', getenv('R2_SECRET_KEY') ?: '');
define('R2_BUCKET', getenv('R2_BUCKET') ?: '');
define('R2_PUBLIC_URL', getenv('R2_PUBLIC_URL') ?: '');

// Storage
define('STORAGE_DRIVER', getenv('STORAGE_DRIVER') ?: 'local');
define('STORAGE_ENDPOINT', getenv('STORAGE_ENDPOINT') ?: '');
define('STORAGE_PUBLIC_URL', getenv('STORAGE_PUBLIC_URL') ?: '');
define('STORAGE_ACCESS_KEY', getenv('STORAGE_ACCESS_KEY') ?: '');
define('STORAGE_SECRET_KEY', getenv('STORAGE_SECRET_KEY') ?: '');
define('STORAGE_BUCKET', getenv('STORAGE_BUCKET') ?: '');
define('STORAGE_REGION', getenv('STORAGE_REGION') ?: '');
define('STORAGE_USE_PATH_STYLE', filter_var(getenv('STORAGE_USE_PATH_STYLE') ?: false, FILTER_VALIDATE_BOOLEAN));

define('APP_URL', getenv('APP_URL') ?: '');