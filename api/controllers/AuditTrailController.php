<?php
declare(strict_types=1);

namespace App\controllers;

use App\controllers\Controller;
use App\core\Database;
use Exception;

class AuditTrailController extends Controller {
    
    /**
     * GET: Fetch audit trails with filters and pagination
     */
    public function index(): void {
        $this->checkPermission(['Admin', 'Staff']);

        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        $search = $_GET['search'] ?? null;
        $action = $_GET['action'] ?? null;
        $entityType = $_GET['entity_type'] ?? null;
        $userId = $_GET['user_id'] ?? null;
        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;
        
        $offset = ($page - 1) * $limit;

        $baseQuery = "FROM audit_trails WHERE 1=1";
        $params = [];

        // Search filter (searches in user_name, entity_name, description)
        if ($search) {
            $baseQuery .= " AND (user_name LIKE ? OR entity_name LIKE ? OR description LIKE ?)";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }

        // Action filter
        if ($action && $action !== 'all') {
            $baseQuery .= " AND action = ?";
            $params[] = $action;
        }

        // Entity type filter
        if ($entityType && $entityType !== 'all') {
            $baseQuery .= " AND entity_type = ?";
            $params[] = $entityType;
        }

        // User filter
        if ($userId) {
            $baseQuery .= " AND user_id = ?";
            $params[] = $userId;
        }

        // Date range filter
        if ($startDate) {
            $baseQuery .= " AND DATE(created_at) >= ?";
            $params[] = $startDate;
        }
        if ($endDate) {
            $baseQuery .= " AND DATE(created_at) <= ?";
            $params[] = $endDate;
        }

        // Get total count
        $totalResult = Database::fetch("SELECT COUNT(*) as cnt " . $baseQuery, $params);
        $total = $totalResult['cnt'];

        // Get paginated data
        $query = "SELECT * " . $baseQuery . " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;
        $data = Database::fetchAll($query, $params);

        // Parse JSON fields
        foreach ($data as &$record) {
            if ($record['old_values']) {
                $record['old_values'] = json_decode($record['old_values'], true);
            }
            if ($record['new_values']) {
                $record['new_values'] = json_decode($record['new_values'], true);
            }
        }
        unset($record);

        $this->response(true, 'Audit trails retrieved successfully', [
            'audit_trails' => $data,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total' => $total,
                'total_pages' => (int)ceil($total / $limit)
            ]
        ]);
    }

    /**
     * GET: Get audit trail statistics
     */
    public function statistics(): void {
        $this->checkPermission(['Admin', 'Staff']);

        try {
            // Total actions
            $totalActions = Database::fetch("SELECT COUNT(*) as count FROM audit_trails");

            // Actions by type
            $actionsByType = Database::fetchAll("
                SELECT action, COUNT(*) as count 
                FROM audit_trails 
                GROUP BY action 
                ORDER BY count DESC
            ");

            // Top users by activity
            $topUsers = Database::fetchAll("
                SELECT user_name, user_type, COUNT(*) as count 
                FROM audit_trails 
                GROUP BY user_id, user_name, user_type 
                ORDER BY count DESC 
                LIMIT 10
            ");

            // Activity by entity type
            $activityByEntity = Database::fetchAll("
                SELECT entity_type, COUNT(*) as count 
                FROM audit_trails 
                GROUP BY entity_type 
                ORDER BY count DESC 
                LIMIT 10
            ");

            // Recent activity (last 7 days)
            $recentActivity = Database::fetchAll("
                SELECT DATE(created_at) as date, COUNT(*) as count 
                FROM audit_trails 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY DATE(created_at) 
                ORDER BY date ASC
            ");

            // Activity by hour (last 24 hours)
            $hourlyActivity = Database::fetchAll("
                SELECT HOUR(created_at) as hour, COUNT(*) as count 
                FROM audit_trails 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                GROUP BY HOUR(created_at) 
                ORDER BY hour ASC
            ");

            $this->response(true, 'Statistics retrieved successfully', [
                'total_actions' => $totalActions['count'] ?? 0,
                'actions_by_type' => $actionsByType,
                'top_users' => $topUsers,
                'activity_by_entity' => $activityByEntity,
                'recent_activity' => $recentActivity,
                'hourly_activity' => $hourlyActivity,
            ]);
        } catch (Exception $e) {
            error_log('Statistics retrieval error: ' . $e->getMessage());
            $this->response(false, 'Failed to retrieve statistics', [], 500);
        }
    }

    /**
     * GET: Get entity history
     */
    public function entityHistory(?string $entityType = null, ?string $entityId = null): void {
        $this->checkPermission(['Admin', 'Staff']);

        if (!$entityType || !$entityId) {
            $this->response(false, 'Entity type and ID are required', [], 400);
        }

        try {
            $history = Database::fetchAll("
                SELECT * FROM audit_trails 
                WHERE entity_type = ? AND entity_id = ? 
                ORDER BY created_at DESC 
                LIMIT 100
            ", [$entityType, $entityId]);

            // Parse JSON fields
            foreach ($history as &$record) {
                if ($record['old_values']) {
                    $record['old_values'] = json_decode($record['old_values'], true);
                }
                if ($record['new_values']) {
                    $record['new_values'] = json_decode($record['new_values'], true);
                }
            }
            unset($record);

            $this->response(true, 'Entity history retrieved successfully', [
                'history' => $history
            ]);
        } catch (Exception $e) {
            error_log('Entity history retrieval error: ' . $e->getMessage());
            $this->response(false, 'Failed to retrieve entity history', [], 500);
        }
    }

    /**
     * GET: Get user activity
     */
    public function userActivity(?string $userId = null): void {
        $this->checkPermission(['Admin', 'Staff']);

        if (!$userId) {
            $this->response(false, 'User ID is required', [], 400);
        }

        try {
            $activity = Database::fetchAll("
                SELECT * FROM audit_trails 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT 100
            ", [$userId]);

            // Parse JSON fields
            foreach ($activity as &$record) {
                if ($record['old_values']) {
                    $record['old_values'] = json_decode($record['old_values'], true);
                }
                if ($record['new_values']) {
                    $record['new_values'] = json_decode($record['new_values'], true);
                }
            }
            unset($record);

            $this->response(true, 'User activity retrieved successfully', [
                'activity' => $activity
            ]);
        } catch (Exception $e) {
            error_log('User activity retrieval error: ' . $e->getMessage());
            $this->response(false, 'Failed to retrieve user activity', [], 500);
        }
    }

    /**
     * GET: Get unique values for filters
     */
    public function filterOptions(): void {
        $this->checkPermission(['Admin', 'Staff']);

        try {
            // Get unique actions
            $actions = Database::fetchAll("
                SELECT DISTINCT action 
                FROM audit_trails 
                ORDER BY action
            ");

            // Get unique entity types
            $entityTypes = Database::fetchAll("
                SELECT DISTINCT entity_type 
                FROM audit_trails 
                ORDER BY entity_type
            ");

            // Get unique users
            $users = Database::fetchAll("
                SELECT DISTINCT user_id, user_name, user_type 
                FROM audit_trails 
                ORDER BY user_name
            ");

            $this->response(true, 'Filter options retrieved successfully', [
                'actions' => array_column($actions, 'action'),
                'entity_types' => array_column($entityTypes, 'entity_type'),
                'users' => $users,
            ]);
        } catch (Exception $e) {
            error_log('Filter options retrieval error: ' . $e->getMessage());
            $this->response(false, 'Failed to retrieve filter options', [], 500);
        }
    }

    /**
     * GET: Get a single audit trail by ID
     */
    public function show(?string $id = null): void {
        $this->checkPermission(['Admin', 'Staff']);

        if (!$id) {
            $this->response(false, 'Audit trail ID is required', [], 400);
        }

        try {
            $auditTrail = Database::fetch("
                SELECT * FROM audit_trails WHERE id = ?
            ", [$id]);

            if (!$auditTrail) {
                $this->response(false, 'Audit trail not found', [], 404);
            }

            // Parse JSON fields
            if ($auditTrail['old_values']) {
                $auditTrail['old_values'] = json_decode($auditTrail['old_values'], true);
            }
            if ($auditTrail['new_values']) {
                $auditTrail['new_values'] = json_decode($auditTrail['new_values'], true);
            }

            $this->response(true, 'Audit trail retrieved successfully', [
                'audit_trail' => $auditTrail
            ]);
        } catch (Exception $e) {
            error_log('Audit trail retrieval error: ' . $e->getMessage());
            $this->response(false, 'Failed to retrieve audit trail', [], 500);
        }
    }
}
