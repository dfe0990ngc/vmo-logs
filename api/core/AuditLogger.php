<?php
declare(strict_types=1);

namespace App\core;

use App\core\Database;
use App\core\Auth;

/**
 * AuditLogger - Utility class for logging all system activities
 * 
 * Usage Examples:
 * 
 * 1. Log a CREATE action:
 *    AuditLogger::log('CREATE', 'members', $memberId, 'John Doe', 'Created new member', null, $newData);
 * 
 * 2. Log an UPDATE action:
 *    AuditLogger::log('UPDATE', 'members', $memberId, 'John Doe', 'Updated member details', $oldData, $newData);
 * 
 * 3. Log a DELETE action:
 *    AuditLogger::log('DELETE', 'members', $memberId, 'John Doe', 'Deleted member record', $deletedData);
 * 
 * 4. Log a LOGIN action:
 *    AuditLogger::log('LOGIN', 'users', $userId, $userName, 'User logged in successfully');
 * 
 * 5. Log an EXPORT action:
 *    AuditLogger::log('EXPORT', 'reports', null, 'Members Report', 'Exported members list to CSV');
 */
class AuditLogger {
    
    /**
     * Log an audit trail entry
     * 
     * @param string $action Action type (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, ACCESS, EXPORT, IMPORT, OTHER)
     * @param string $entityType Entity type (e.g., 'members', 'terms', 'ordinances')
     * @param int|null $entityId ID of the affected entity
     * @param string|null $entityName Name/identifier of the entity
     * @param string|null $description Human-readable description
     * @param array|null $oldValues Previous values (for UPDATE/DELETE)
     * @param array|null $newValues New values (for CREATE/UPDATE)
     * @param int|null $userId Override user ID (defaults to authenticated user)
     * @return bool Success status
     */
    public static function log(
        string $action,
        string $entityType,
        ?int $entityId = null,
        ?string $entityName = null,
        ?string $description = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $userId = null
    ): bool {
        try {
            // Get user information
            $userId = $userId ?? Auth::id();
            
            if (!$userId) {
                // If no authenticated user, skip logging (optional: log as system)
                $userId = "client";
                // return false;
            }
            
            $user = self::getUserInfo($userId.'');
            if (!$user) {
                // return false;
                $user['name'] = 'Client Application';
                $user['type'] = 'Client';
            }
            
            // Get client information
            $ipAddress = self::getIpAddress();
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
            
            // Prepare data for insertion
            $data = [
                'user_id' => $userId,
                'user_name' => $user['name'],
                'user_type' => $user['type'],
                'action' => strtoupper($action),
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'entity_name' => $entityName,
                'description' => $description,
                'old_values' => $oldValues ? json_encode($oldValues, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null,
                'new_values' => $newValues ? json_encode($newValues, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null,
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent ? substr($userAgent, 0, 512) : null,
                'created_at' => date('Y-m-d H:i:s'),
            ];
            
            // Insert into database
            Database::insert('audit_trails', $data);
            
            return true;
        } catch (\Exception $e) {
            // Log error but don't throw exception to avoid breaking main flow
            error_log('Audit logging error: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Log a CREATE action
     */
    public static function logCreate(
        string $entityType,
        int $entityId,
        string $entityName,
        array $data,
        ?string $description = null
    ): bool {
        $desc = $description ?? "Created new {$entityType} record";
        return self::log('CREATE', $entityType, $entityId, $entityName, $desc, null, $data);
    }
    
    /**
     * Log an UPDATE action
     */
    public static function logUpdate(
        string $entityType,
        int $entityId,
        string $entityName,
        array $oldData,
        array $newData,
        ?string $description = null
    ): bool {
        $desc = $description ?? "Updated {$entityType} record";
        return self::log('UPDATE', $entityType, $entityId, $entityName, $desc, $oldData, $newData);
    }
    
    /**
     * Log a DELETE action
     */
    public static function logDelete(
        string $entityType,
        int $entityId,
        string $entityName,
        array $data,
        ?string $description = null
    ): bool {
        $desc = $description ?? "Deleted {$entityType} record";
        return self::log('DELETE', $entityType, $entityId, $entityName, $desc, $data, null);
    }
    
    /**
     * Log a LOGIN action
     */
    public static function logLogin(int $userId, string $userName): bool {
        return self::log('LOGIN', 'users', $userId, $userName, 'User logged in successfully', null, null, $userName);
    }
    
    /**
     * Log a LOGOUT action
     */
    public static function logLogout(int $userId, string $userName): bool {
        return self::log('LOGOUT', 'users', $userId, $userName, 'User logged out', null, null, $userName);
    }
    
    /**
     * Log an ACCESS action
     */
    public static function logAccess(string $entityType, ?int $entityId = null, ?string $entityName = null): bool {
        $desc = "Accessed {$entityType}" . ($entityName ? " - {$entityName}" : '');
        return self::log('ACCESS', $entityType, $entityId, $entityName, $desc);
    }
    
    /**
     * Log an EXPORT action
     */
    public static function logExport(string $entityType, string $exportName, ?array $filters = null): bool {
        $desc = "Exported {$exportName}";
        return self::log('EXPORT', $entityType, null, $exportName, $desc, null, $filters);
    }
    
    /**
     * Log an IMPORT action
     */
    public static function logImport(string $entityType, string $importName, int $recordCount): bool {
        $desc = "Imported {$recordCount} records into {$entityType}";
        return self::log('IMPORT', $entityType, null, $importName, $desc, null, ['record_count' => $recordCount]);
    }
    
    /**
     * Get user information
     */
    private static function getUserInfo(string $userId): ?array {
        $user = Database::fetch(
            "SELECT user_id, CONCAT(first_name, ' ', last_name) as name, user_type 
             FROM users WHERE user_id = ?",
            [$userId]
        );
        
        return $user ? [
            'id' => $user['user_id'],
            'name' => $user['name'],
            'type' => $user['user_type']
        ] : null;
    }
    
    /**
     * Get client IP address
     */
    private static function getIpAddress(): ?string {
        $ipKeys = [
            'HTTP_CLIENT_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_FORWARDED',
            'HTTP_X_CLUSTER_CLIENT_IP',
            'HTTP_FORWARDED_FOR',
            'HTTP_FORWARDED',
            'REMOTE_ADDR'
        ];
        
        foreach ($ipKeys as $key) {
            if (!empty($_SERVER[$key])) {
                $ips = explode(',', $_SERVER[$key]);
                $ip = trim($ips[0]);
                
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? null;
    }
    
    /**
     * Get audit trail for specific entity
     */
    public static function getEntityHistory(string $entityType, int $entityId, int $limit = 50): array {
        return Database::fetchAll(
            "SELECT * FROM audit_trails 
             WHERE entity_type = ? AND entity_id = ? 
             ORDER BY created_at DESC 
             LIMIT ?",
            [$entityType, $entityId, $limit]
        );
    }
    
    /**
     * Get audit trail for specific user
     */
    public static function getUserActivity(int $userId, int $limit = 50): array {
        return Database::fetchAll(
            "SELECT * FROM audit_trails 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT ?",
            [$userId, $limit]
        );
    }
    
    /**
     * Get recent audit trails
     */
    public static function getRecent(int $limit = 50): array {
        return Database::fetchAll(
            "SELECT * FROM audit_trails 
             ORDER BY created_at DESC 
             LIMIT ?",
            [$limit]
        );
    }
}
