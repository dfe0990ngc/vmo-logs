<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use PDO;
use Exception;

class CommunicationController
{
    private $db;
    private $table = 'communications';

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Get all communications with pagination, filtering, and search
     * GET /api/communications
     */
    public function index()
    {
        try {
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 10;
            $offset = ($page - 1) * $limit;

            $whereClause = [];
            $params = [];

            // Search by title or reference
            if (!empty($_GET['search'])) {
                $search = '%' . $_GET['search'] . '%';
                $whereClause[] = "(title LIKE ? OR reference_no LIKE ?)";
                $params[] = $search;
                $params[] = $search;
            }

            // Filter by communication type
            if (!empty($_GET['type'])) {
                $whereClause[] = "communication_type = ?";
                $params[] = $_GET['type'];
            }

            // Filter by status
            if (!empty($_GET['status'])) {
                $whereClause[] = "status = ?";
                $params[] = $_GET['status'];
            }

            // Filter by date range
            if (!empty($_GET['date_from'])) {
                $whereClause[] = "DATE(date_received) >= ?";
                $params[] = $_GET['date_from'];
            }

            if (!empty($_GET['date_to'])) {
                $whereClause[] = "DATE(date_received) <= ?";
                $params[] = $_GET['date_to'];
            }

            $where = !empty($whereClause) ? "WHERE " . implode(" AND ", $whereClause) : "";

            // Get total count
            $countQuery = "SELECT COUNT(*) as total FROM {$this->table} $where";
            $countStmt = $this->db->prepare($countQuery);
            $countStmt->execute($params);
            $countResult = $countStmt->fetch(PDO::FETCH_ASSOC);
            $total = $countResult['total'] ?? 0;

            // Get paginated data
            $query = "SELECT * FROM {$this->table} $where ORDER BY date_received DESC, id DESC LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $communications = $stmt->fetchAll(PDO::FETCH_ASSOC);

            http_response_code(200);
            return json_encode([
                'success' => true,
                'data' => $communications,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => ceil($total / $limit)
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            return json_encode([
                'success' => false,
                'message' => 'Failed to retrieve communications',
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Get communications for public AJAX (no auth required)
     * GET /api/ajax-communications
     */
    public function indexJSON()
    {
        try {
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 10;
            $offset = ($page - 1) * $limit;

            $whereClause = [];
            $params = [];

            if (!empty($_GET['search'])) {
                $search = '%' . $_GET['search'] . '%';
                $whereClause[] = "(title LIKE ? OR reference_no LIKE ?)";
                $params[] = $search;
                $params[] = $search;
            }

            if (!empty($_GET['type'])) {
                $whereClause[] = "communication_type = ?";
                $params[] = $_GET['type'];
            }

            if (!empty($_GET['status'])) {
                $whereClause[] = "status = ?";
                $params[] = $_GET['status'];
            }

            $where = !empty($whereClause) ? "WHERE " . implode(" AND ", $whereClause) : "";

            $countQuery = "SELECT COUNT(*) as total FROM {$this->table} $where";
            $countStmt = $this->db->prepare($countQuery);
            $countStmt->execute($params);
            $countResult = $countStmt->fetch(PDO::FETCH_ASSOC);
            $total = $countResult['total'] ?? 0;

            $query = "SELECT id, title, communication_type, status, reference_no, date_received, file_name FROM {$this->table} $where ORDER BY date_received DESC LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $communications = $stmt->fetchAll(PDO::FETCH_ASSOC);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $communications,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => ceil($total / $limit)
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to retrieve communications'
            ]);
        }
    }

    /**
     * Get single communication by ID
     * GET /api/communications/{id}
     */
    public function show($id)
    {
        try {
            $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE id = ?");
            $stmt->execute([$id]);
            $communication = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$communication) {
                http_response_code(404);
                return json_encode([
                    'success' => false,
                    'message' => 'Communication not found'
                ]);
            }

            http_response_code(200);
            return json_encode([
                'success' => true,
                'data' => $communication
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            return json_encode([
                'success' => false,
                'message' => 'Failed to retrieve communication'
            ]);
        }
    }

    /**
     * Create new communication
     * POST /api/communications
     */
    public function create()
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
            $userName = $_SERVER['HTTP_X_USER_NAME'] ?? 'Unknown';

            if (!$data || !isset($data['title'])) {
                http_response_code(400);
                return json_encode([
                    'success' => false,
                    'message' => 'Title is required'
                ]);
            }

            $fileSize = 0;
            $fileName = null;
            $filePath = null;

            // Handle file upload
            if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
                $fileName = $_FILES['file']['name'];
                $fileSize = $_FILES['file']['size'];
                $tmpPath = $_FILES['file']['tmp_name'];

                // Create storage directory if needed
                $storageDir = __DIR__ . '/../../storage/uploads/communications';
                if (!is_dir($storageDir)) {
                    mkdir($storageDir, 0755, true);
                }

                $uniqueName = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $fileName);
                $filePath = '/vmo-logs/storage/uploads/communications/' . $uniqueName;
                $uploadPath = __DIR__ . '/../../' . $filePath;

                if (!move_uploaded_file($tmpPath, $uploadPath)) {
                    throw new Exception('Failed to upload file');
                }
            }

            $stmt = $this->db->prepare("
                INSERT INTO {$this->table} (
                    title, communication_type, status, reference_no, 
                    date_received, date_logged, file_name, file_path, 
                    file_size, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");

            $status = $data['status'] ?? 'RECEIVED';
            
            $stmt->execute([
                $data['title'],
                $data['communication_type'] ?? 'OTHER',
                $status,
                $data['reference_no'] ?? null,
                $data['date_received'] ?? date('Y-m-d'),
                date('Y-m-d H:i:s'),
                $fileName,
                $filePath,
                $fileSize,
                $userId
            ]);

            $commId = $this->db->lastInsertId();

            // Log audit trail
            $this->logAuditTrail($userId, $userName, 'CREATE', 'COMMUNICATION', $commId, 
                $data['title'], null, $data);

            http_response_code(201);
            return json_encode([
                'success' => true,
                'message' => 'Communication created successfully',
                'data' => ['id' => $commId]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            return json_encode([
                'success' => false,
                'message' => 'Failed to create communication',
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Update communication
     * POST /api/communications/{id}
     */
    public function update($id)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
            $userName = $_SERVER['HTTP_X_USER_NAME'] ?? 'Unknown';

            // Get old values for audit
            $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE id = ?");
            $stmt->execute([$id]);
            $oldData = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$oldData) {
                http_response_code(404);
                return json_encode([
                    'success' => false,
                    'message' => 'Communication not found'
                ]);
            }

            $updates = [];
            $params = [];
            $fileName = $oldData['file_name'];
            $filePath = $oldData['file_path'];
            $fileSize = $oldData['file_size'];

            // Handle file upload
            if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
                // Delete old file
                if ($filePath && file_exists(__DIR__ . '/../../' . $filePath)) {
                    unlink(__DIR__ . '/../../' . $filePath);
                }

                $fileName = $_FILES['file']['name'];
                $fileSize = $_FILES['file']['size'];
                $tmpPath = $_FILES['file']['tmp_name'];

                $storageDir = __DIR__ . '/../../storage/uploads/communications';
                if (!is_dir($storageDir)) {
                    mkdir($storageDir, 0755, true);
                }

                $uniqueName = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $fileName);
                $filePath = '/vmo-logs/storage/uploads/communications/' . $uniqueName;
                $uploadPath = __DIR__ . '/../../' . $filePath;

                if (!move_uploaded_file($tmpPath, $uploadPath)) {
                    throw new Exception('Failed to upload file');
                }

                $updates[] = "file_name = ?";
                $updates[] = "file_path = ?";
                $updates[] = "file_size = ?";
                $params[] = $fileName;
                $params[] = $filePath;
                $params[] = $fileSize;
            }

            // Update text fields
            $fieldsToUpdate = ['title', 'communication_type', 'status', 'reference_no', 'date_received'];
            foreach ($fieldsToUpdate as $field) {
                if (isset($data[$field])) {
                    $updates[] = "$field = ?";
                    $params[] = $data[$field];
                }
            }

            if (empty($updates)) {
                http_response_code(400);
                return json_encode([
                    'success' => false,
                    'message' => 'No fields to update'
                ]);
            }

            $updates[] = "updated_at = NOW()";
            $params[] = $id;

            $updateQuery = "UPDATE {$this->table} SET " . implode(', ', $updates) . " WHERE id = ?";
            $stmt = $this->db->prepare($updateQuery);
            $stmt->execute($params);

            // Log audit trail
            $newData = array_merge($oldData, $data ?? []);
            $this->logAuditTrail($userId, $userName, 'UPDATE', 'COMMUNICATION', $id, 
                $data['title'] ?? $oldData['title'], $oldData, $newData);

            http_response_code(200);
            return json_encode([
                'success' => true,
                'message' => 'Communication updated successfully'
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            return json_encode([
                'success' => false,
                'message' => 'Failed to update communication',
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Delete communication
     * DELETE /api/communications/{id}
     */
    public function delete($id)
    {
        try {
            $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
            $userName = $_SERVER['HTTP_X_USER_NAME'] ?? 'Unknown';

            // Get communication before deletion
            $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE id = ?");
            $stmt->execute([$id]);
            $communication = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$communication) {
                http_response_code(404);
                return json_encode([
                    'success' => false,
                    'message' => 'Communication not found'
                ]);
            }

            // Delete file if exists
            if ($communication['file_path'] && file_exists(__DIR__ . '/../../' . $communication['file_path'])) {
                unlink(__DIR__ . '/../../' . $communication['file_path']);
            }

            // Delete from database
            $stmt = $this->db->prepare("DELETE FROM {$this->table} WHERE id = ?");
            $stmt->execute([$id]);

            // Log audit trail
            $this->logAuditTrail($userId, $userName, 'DELETE', 'COMMUNICATION', $id, 
                $communication['title'], $communication, null);

            http_response_code(200);
            return json_encode([
                'success' => true,
                'message' => 'Communication deleted successfully'
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            return json_encode([
                'success' => false,
                'message' => 'Failed to delete communication',
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Public download endpoint for files (no auth required)
     * GET /api/communications/{id}/public-download
     */
    public function publicDownload($id)
    {
        try {
            $stmt = $this->db->prepare("SELECT file_path, file_name FROM {$this->table} WHERE id = ?");
            $stmt->execute([$id]);
            $communication = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$communication || !$communication['file_path']) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'File not found'
                ]);
                return;
            }

            $filePath = __DIR__ . '/../../' . $communication['file_path'];

            if (!file_exists($filePath)) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'File not found on server'
                ]);
                return;
            }

            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . basename($communication['file_name']) . '"');
            header('Content-Length: ' . filesize($filePath));
            header('Cache-Control: no-cache, no-store, must-revalidate');
            readfile($filePath);
            exit;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to download file'
            ]);
        }
    }

    /**
     * Get filter options for dropdowns
     * GET /api/communications/filter-options
     */
    public function filterOptions()
    {
        try {
            $types = $this->db->query("SELECT DISTINCT communication_type FROM {$this->table} ORDER BY communication_type")->fetchAll(PDO::FETCH_COLUMN);
            $statuses = $this->db->query("SELECT DISTINCT status FROM {$this->table} ORDER BY status")->fetchAll(PDO::FETCH_COLUMN);

            http_response_code(200);
            return json_encode([
                'success' => true,
                'data' => [
                    'types' => !empty($types) ? $types : ['MTOP', 'TRAVEL_ORDER', 'SB_RESOLUTION', 'SB_ORDINANCE', 'APPLICATION_LEAVE', 'MEMO', 'NOTICE_HEARING', 'INVITATION', 'ENDORSEMENT', 'DSSC', 'MADAC', 'DOE', 'SOLICITATION', 'TENT_REQUEST', 'OTHER'],
                    'statuses' => !empty($statuses) ? $statuses : ['RECEIVED', 'RELEASED', 'COMPLETED', 'PULLED_OUT']
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            return json_encode([
                'success' => false,
                'message' => 'Failed to retrieve filter options'
            ]);
        }
    }

    /**
     * Log audit trail
     */
    private function logAuditTrail($userId, $userName, $action, $entityType, $entityId, $entityName, $oldValues, $newValues)
    {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO audit_trails (
                    user_id, user_name, user_type, action, entity_type, 
                    entity_id, entity_name, old_values, new_values, 
                    ip_address, user_agent, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");

            $stmt->execute([
                $userId,
                $userName,
                'Staff',
                $action,
                $entityType,
                $entityId,
                $entityName,
                json_encode($oldValues),
                json_encode($newValues),
                $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
                $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
            ]);
        } catch (Exception $e) {
            error_log('Audit trail logging failed: ' . $e->getMessage());
        }
    }
}