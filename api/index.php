<?php
declare(strict_types=1);

// Set CORS headers first to ensure even error responses are accessible by the frontend.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Access-Control-Max-Age: 86400'); // Optional: Cache preflight requests for 24 hours

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
// --- CORS Configuration END ---

require_once __DIR__ . '/vendor/autoload.php';

try {
    require_once __DIR__ . '/config.php';
} catch (Dotenv\Exception\InvalidPathException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Configuration error: The .env file is missing or could not be read. Please ensure it exists in the project root.'
    ]);
    exit;
}

use App\core\Router;
use App\controllers\AuditTrailController;
use App\middleware\AuthMiddleware;
use App\controllers\AuthController;
use App\controllers\UserController;
use App\controllers\SettingsController;
use App\controllers\DashboardController;
use App\controllers\CommunicationController;

$router = new Router();

// Set the base path prefix - all routes will now be prefixed with this
$router->setBasePath('/vmo-logs');

// Maintenance
$router->get('/api/clear-rate-limit-cache', [AuthController::class, 'clearRateLimitCache']);
$router->get('/api/clear-expired-tokens', [AuthController::class, 'clearExpiredTokensAndLoginAttempts']);

// Public routes
$router->post('/api/auth/login', [AuthController::class, 'login']);

// Protected routes (require authentication)
$router->post('/api/auth/register', [AuthController::class, 'register'],[AuthMiddleware::class]);
$router->post('/api/auth/change-password', [AuthController::class, 'resetPassword'],[AuthMiddleware::class]);
$router->post('/api/auth/logout', [AuthController::class, 'logout'], [AuthMiddleware::class]);
$router->post('/api/auth/refresh', [AuthController::class, 'refresh']);

// Dashboard
$router->get('/api/dashboard', [DashboardController::class,'index'],[AuthMiddleware::class]);

// Users routes (require authentication)
$router->get('/api/users', [UserController::class, 'index'], [AuthMiddleware::class]);
$router->get('/api/me', [UserController::class, 'getMe'], [AuthMiddleware::class]);
$router->post('/api/users', [UserController::class, 'create'], [AuthMiddleware::class]);
$router->put('/api/users/{id}', [UserController::class, 'update'], [AuthMiddleware::class]);
$router->delete('/api/users/{id}', [UserController::class, 'delete'], [AuthMiddleware::class]);

$router->get('/api/my-profile', [UserController::class, 'getProfile'], [AuthMiddleware::class]);
$router->put('/api/my-profile', [UserController::class, 'updateProfile'], [AuthMiddleware::class]);

// communication routes (require authentication)
// NOTE: Specific routes must come BEFORE generic routes with parameters
$router->get('/api/ajax-communications', [CommunicationController::class, 'indexJSON']);
$router->get('/api/communications/filter-options', [CommunicationController::class, 'filterOptions']);
$router->get('/api/communications', [CommunicationController::class, 'index'], [AuthMiddleware::class]);
// Dynamic routes with {id} parameter - these must come after specific routes
$router->get('/api/communications/{id}/public-download', [CommunicationController::class, 'publicDownload']);
$router->get('/api/communications/{id}', [CommunicationController::class, 'show'], [AuthMiddleware::class]);
$router->post('/api/communications/{id}', [CommunicationController::class, 'update'], [AuthMiddleware::class]);
$router->delete('/api/communications/{id}', [CommunicationController::class, 'delete'], [AuthMiddleware::class]);
$router->post('/api/communications', [CommunicationController::class, 'create'], [AuthMiddleware::class]);

// Audit Trail
// NOTE: Specific routes must come BEFORE generic routes with parameters
$router->get('/api/audit-trails', [AuditTrailController::class,'index'],[AuthMiddleware::class]);
$router->get('/api/audit-trails/statistics', [AuditTrailController::class,'statistics'],[AuthMiddleware::class]);
$router->get('/api/audit-trails/filter-options', [AuditTrailController::class,'filterOptions'],[AuthMiddleware::class]);
// Dynamic routes with {id} parameter - these must come after specific routes
$router->get('/api/audit-trails/entity/{entityType}/{entityId}', [AuditTrailController::class,'entityHistory'],[AuthMiddleware::class]);
$router->get('/api/audit-trails/user/{userId}', [AuditTrailController::class,'userActivity'],[AuthMiddleware::class]);
$router->get('/api/audit-trails/{id}', [AuditTrailController::class,'show'],[AuthMiddleware::class]);

// Settings routes (require authentication)
$router->get('/api/settings/export-backup', [SettingsController::class, 'exportBackup'], [AuthMiddleware::class]);
$router->post('/api/settings/restore-backup', [SettingsController::class, 'restoreBackup'], [AuthMiddleware::class]);
$router->post('/api/settings/clear-caches', [SettingsController::class, 'clearCaches'], [AuthMiddleware::class]);
$router->post('/api/settings/clear-logs', [SettingsController::class, 'clearLogs'], [AuthMiddleware::class]);
$router->post('/api/settings/archive-logs', [SettingsController::class, 'archiveLogs'], [AuthMiddleware::class]);

// Welcome screen
$router->get('/api/view-communications', [DashboardController::class, 'welcomeStats']);
try {
    $router->dispatch();
} catch (Throwable $e) {
    // Always log errors regardless of debug mode
    error_log('=== APPLICATION ERROR ===');
    error_log('Message: ' . $e->getMessage());
    error_log('File: ' . $e->getFile());
    error_log('Line: ' . $e->getLine());
    error_log('Trace: ' . $e->getTraceAsString());
    error_log('========================');
    
    http_response_code(500);
    
    $errorResponse = [
        'success' => false,
        'message' => 'Internal server error'
    ];
    
    if (DEBUG_MODE) {
        $errorResponse['error'] = [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => explode("\n", $e->getTraceAsString())
        ];
    } else {
        $errorResponse['error'] = 'An unexpected error occurred.';
    }
    
    echo json_encode($errorResponse);
}