<?php
declare(strict_types=1);

namespace App\core;

use App\core\Database;
use App\core\Auth;

class AuditLogger {

    /**
     * Log an audit trail entry
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
            // ✅ Always use STRING user_id from Auth
            if (!$userId) {
                $authUser = Auth::user();
                $userId = $authUser['user_id'] ?? null;
            }

            // ✅ Get user info safely
            $user = $userId ? self::getUserInfo($userId) : null;

            if (!$user) {
                $user = [
                    'name' => 'Client Application',
                    'type' => 'Client'
                ];
            }

            // ✅ Prepare audit data
            $data = [
                'user_id'     => $userId, // string or null
                'user_name'   => $user['name'], // ✅ FIXED
                'user_type'   => $user['type'],
                'action'      => strtoupper($action),
                'entity_type' => $entityType,
                'entity_id'   => $entityId,
                'entity_name' => $entityName,
                'description' => $description,
                'old_values'  => $oldValues ? json_encode($oldValues, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null,
                'new_values'  => $newValues ? json_encode($newValues, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null,
                'ip_address'  => self::getIpAddress(),
                'user_agent'  => isset($_SERVER['HTTP_USER_AGENT'])
                    ? substr($_SERVER['HTTP_USER_AGENT'], 0, 512)
                    : null,
                'created_at'  => date('Y-m-d H:i:s'),
            ];

            // ✅ Insert into DB
            $result = Database::insert('audit_trails', $data);

            // ✅ Debug if insert fails
            if (!$result) {
                error_log('Audit insert failed: ' . json_encode($data));
            }

            return (bool)$result;

        } catch (\Exception $e) {
            error_log('Audit logging error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Log CREATE
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
     * Log UPDATE
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
     * Log DELETE
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
     * Log LOGIN
     */
    public static function logLogin(int $userId, string $userName): bool {
        return self::log(
            'LOGIN',
            'users',
            $userId,
            $userName,
            'User logged in successfully',
            null,
            null,
            (string)$userId // ✅ FIXED
        );
    }

    /**
     * Log LOGOUT
     */
    public static function logLogout(int $userId, string $userName): bool {
        return self::log(
            'LOGOUT',
            'users',
            $userId,
            $userName,
            'User logged out',
            null,
            null,
            (string)$userId // ✅ FIXED
        );
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
            'id'   => $user['user_id'],
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
    public static function getUserActivity(string $userId, int $limit = 50): array {
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