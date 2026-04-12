<?php
declare(strict_types=1);

namespace App\controllers;

use App\controllers\Controller;
use App\core\Auth;
use App\core\Database;
use App\core\Validator;
use Exception;

class UserController extends Controller {

    /**
     * GET: /api/users
     * Retrieves a paginated list of users.
     */
    public function index(): void {
        $this->checkPermission(['Admin']);

        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        $search = $_GET['search'] ?? null;
        $offset = ($page - 1) * $limit;

        $baseQuery = "FROM users WHERE id != 1";
        $params = [];

        if ($search) {
            $search = Validator::sanitize($search);
            $baseQuery .= " AND (first_name LIKE ? OR last_name LIKE ? OR user_id LIKE ? OR email LIKE ?)";
            $searchTerm = "%{$search}%";
            $params = [$searchTerm, $searchTerm, $searchTerm, $searchTerm];
        }

        // Get total count
        $totalResult = Database::fetch("SELECT COUNT(*) as cnt " . $baseQuery, $params);
        $total = $totalResult['cnt'] ?? 0;

        // Get paginated data
        $query = "SELECT * " . $baseQuery . " ORDER BY last_name ASC, first_name ASC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;
        $users = Database::fetchAll($query, $params);

        $this->response(true, 'Users retrieved successfully', [
            'users' => $users,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total' => (int)$total,
                'total_pages' => (int)ceil((int)$total / $limit)
            ]
        ]);
    }

    public function getMe(){

        $user = Auth::user();
        if(!$user){
            $this->response(false, 'Un-authenticated', [], 401);
        }

        $this->response(true, 'Success', [
            'user' => [
                'id' => $user['id'],
                'user_id' => $user['user_id'],
                'first_name' => $user['first_name'],
                'middle_name' => $user['middle_name'],
                'last_name' => $user['last_name'],
                'prefix' => $user['prefix'],
                'suffix' => $user['suffix'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'user_type' => $user['user_type'],
                'avatar' => $user['avatar'],
                'member_id' => $user['member_id'],
                'last_login' => $user['last_login'],
                'created_at' => $user['created_at'],
                'updated_at' => $user['updated_at'],
            ]
        ], 200);
    }

    /**
     * GET: /api/users/{id}
     * Retrieves a single user.
     */
    public function show(?string $id = null): void {
        $this->checkPermission(['Admin']);

        if (!$id) {
            $this->response(false, 'User ID is required', [], 400);
        }

        $id = Validator::sanitize($id);
        $user = $this->getUser($id);

        if (!$user) {
            $this->response(false, 'User not found', [], 404);
        }

        $this->response(true, 'User retrieved successfully', ['user' => $user]);
    }

    /**
     * GET: /api/my-profile
     * Retrieves the profile of the currently authenticated user.
     */
    public function getProfile(): void {
        $this->checkPermission(['Admin', 'Member', 'Staff','Tracker','Uploader']);

        $authUserID = $this->getAuthenticatedUser();
        if (!$authUserID) {
            $this->response(false, 'Authentication required to access profile', [], 401);
        }

        $authUser = Database::fetch("SELECT * FROM users WHERE user_id = ?",[$authUserID]);

        $user = $this->getUser($authUser['id'].'');

        if (!$user) {
            $this->response(false, 'profile not found', [], 404);
        }

        $this->response(true, 'Profile retrieved successfully', ['user' => $user]);
    }

    /**
     * GET: /web/my-profile-photo
     * Retrieves the profile photo of a user.
     */
    public function getProfilePhoto($id): void {

        $id = Validator::sanitize($id);
        $user = $this->getUser($id.'');

        if (!$user) {
            $this->response(false, 'Profile photo not found', [], 404);
        }

        $this->response(true, 'Profile retrieved successfully', ['user' => $user]);
    }

    /**
     * PUT: /api/my-profile
     * Updates the profile of the currently authenticated user.
     */
    public function updateProfile(): void {
        $this->checkPermission(['Admin', 'Member', 'Staff','Tracker','Uploader']);

        $data = $this->getJsonInput();
        $authUserID = $this->getAuthenticatedUser();
        
        // Sanitize input
        $data = Validator::sanitizeArray($data);

        // Validation rules
        $rules = [
            'first_name' => 'required|string|min:2|max:16|alpha',
            'middle_name' => 'nullable|string|max:16|alpha',
            'last_name' => 'required|string|min:2|max:16|alpha',
            'prefix' => 'nullable|string|max:12',
            'suffix' => 'nullable|string|max:12',
            'email' => 'nullable|email|max:64',
            'phone' => 'nullable|string|max:32',
        ];

        $messages = [
            'first_name.required' => 'First name is required',
            'first_name.alpha' => 'First name must contain only letters',
            'first_name.min' => 'First name must be at least 2 characters',
            'first_name.max' => 'First name must not exceed 16 characters',
            'last_name.required' => 'Last name is required',
            'last_name.alpha' => 'Last name must contain only letters',
            'last_name.min' => 'Last name must be at least 2 characters',
            'last_name.max' => 'Last name must not exceed 16 characters',
            'email.email' => 'Please provide a valid email address',
        ];

        $validator = new Validator();
        $validator->setDatabase(Database::getInstance());

        if (!$validator->validate($data, $rules, $messages)) {
            $this->response(false, 'Validation failed', [
                'errors' => $validator->getErrors()
            ], 422);
        }

        // Check if email is being changed and already exists
        if (isset($data['email'])) {
            $emailExists = Database::fetch(
                "SELECT email FROM users WHERE email = ? AND user_id != ?", 
                [$data['email'], $authUserID]
            );
            if ($emailExists) {
                $this->response(false, 'Email already exists', [], 409);
            }
        }
        
        // Build update data
        $updateData = [];
        $allowedFields = ['first_name', 'middle_name', 'last_name', 'prefix', 'suffix', 'email', 'phone'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        $user = Database::fetch("SELECT * FROM users WHERE user_id = ?",[$authUserID]);

        if (empty($updateData)) {
            $this->response(true, 'No changes made to profile', ['user' => $user]);
        }

        $updateData['updated_at'] = date('Y-m-d H:i:s');
        
        try {
            Database::update('users', $updateData, 'user_id = :user_id', ['user_id' => $authUserID]);

            $user = $this->getUser($user['id'].'');
            
            $this->response(true, 'Profile updated successfully', ['user' => $user], 200);
        } catch (Exception $e) {
            error_log('Profile update error: ' . $e->getMessage());
            $this->response(false, 'Failed to update profile', [], 500);
        }
    }

    /**
     * POST: /api/users
     * Creates a new user.
     */
    public function create(): void {
        $this->checkPermission(['Admin']);
        
        $data = $this->getJsonInput();
        
        // Sanitize input
        $data = Validator::sanitizeArray($data);

        $data['member_id'] = empty($data['member_id']) || (int)$data['member_id'] === 0 ? null : $data['member_id'];

        // Validation rules
        $rules = [
            'user_id' => 'required|string|min:3|max:32|alpha_dash|unique:users,user_id',
            'first_name' => 'required|string|min:2|max:16|alpha',
            'middle_name' => 'nullable|string|max:16|alpha',
            'last_name' => 'required|string|min:2|max:16|alpha',
            'prefix' => 'nullable|string|max:12',
            'suffix' => 'nullable|string|max:12',
            'email' => 'nullable|email|max:64|unique:users,email',
            'phone' => 'nullable|string|max:32',
            'password' => 'required|string|min:8|max:255',
            'user_type' => 'required|in:Admin,Member,Staff,Tracker,Uploader',
            'member_id' => 'nullable|integer|exists:members,id',
        ];

        $messages = [
            'user_id.required' => 'Username is required',
            'user_id.unique' => 'Username already exists',
            'user_id.alpha_dash' => 'Username can only contain letters, numbers, dashes and underscores',
            'user_id.min' => 'Username must be at least 3 characters',
            'first_name.required' => 'First name is required',
            'first_name.alpha' => 'First name must contain only letters',
            'last_name.required' => 'Last name is required',
            'last_name.alpha' => 'Last name must contain only letters',
            'email.email' => 'Please provide a valid email address',
            'email.unique' => 'Email already exists',
            'password.required' => 'Password is required',
            'password.min' => 'Password must be at least 8 characters',
            'user_type.required' => 'User type is required',
            'user_type.in' => 'User type must be Admin, Member, or Staff',
            'member_id.exists' => 'Selected member does not exist',
        ];

        $validator = new Validator();
        $validator->setDatabase(Database::getInstance());

        if (!$validator->validate($data, $rules, $messages)) {
            $this->response(false, $validator->getFirstError(), [
                'errors' => $validator->getErrors()
            ], 422);
        }
        
        try {
            $insertData = [
                'user_id' => $data['user_id'],
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'],
                'prefix' => $data['prefix'] ?? null,
                'suffix' => $data['suffix'] ?? null,
                'email' => !empty($data['email']) ? $data['email'] : null,
                'phone' => $data['phone'] ?? null,
                'password' => Auth::hashPassword($data['password']),
                'user_type' => $data['user_type'],
                'member_id' => $data['member_id'] ?? null,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];

            $id = Database::insert('users', $insertData);

            $user = $this->getUser($id.'');
            
            $this->response(true, 'User created successfully', ['user' => $user], 201);
        } catch (Exception $e) {
            error_log('User creation error: ' . $e->getMessage());
            $this->response(false, 'Failed to create user', [], 500);
        }
    }
    
    /**
     * PUT: /api/users/{id}
     * Updates an existing user.
     */
    public function update(?string $id = null): void {
        $this->checkPermission(['Admin']);
        
        if (!$id) {
            $this->response(false, 'User ID is required', [], 400);
        }

        $id = Validator::sanitize($id);
        
        $data = $this->getJsonInput();
        
        // Sanitize input
        $data = Validator::sanitizeArray($data);
        $data['member_id'] = empty($data['member_id']) || (int)$data['member_id'] === 0 ? null : $data['member_id'];

        $existing = Database::fetch("SELECT * FROM users WHERE id = ?", [$id]);
        if (!$existing) {
            $this->response(false, 'User not found', [], 404);
        }

        // Validation rules (all optional for updates)
        $rules = [
            'first_name' => 'nullable|string|min:2|max:16|alpha',
            'middle_name' => 'nullable|string|max:16|alpha',
            'last_name' => 'nullable|string|min:2|max:16|alpha',
            'prefix' => 'nullable|string|max:12',
            'suffix' => 'nullable|string|max:12',
            'email' => "nullable|email|max:64|unique:users,email,{$existing['id']},id",
            'phone' => 'nullable|string|max:32',
            'password' => 'nullable|string|min:8|max:255',
            'user_type' => 'nullable|in:Admin,Member,Staff,Tracker,Uploader',
            'member_id' => 'nullable|integer|exists:members,id',
        ];

        $messages = [
            'first_name.alpha' => 'First name must contain only letters',
            'first_name.min' => 'First name must be at least 2 characters',
            'last_name.alpha' => 'Last name must contain only letters',
            'last_name.min' => 'Last name must be at least 2 characters',
            'email.email' => 'Please provide a valid email address',
            'email.unique' => 'Email already exists',
            'password.min' => 'Password must be at least 8 characters',
            'user_type.in' => 'User type must be Admin, Member, or Staff',
            'member_id.exists' => 'Selected member does not exist',
        ];

        $validator = new Validator();
        $validator->setDatabase(Database::getInstance());

        if (!$validator->validate($data, $rules, $messages)) {
            $this->response(false, 'Validation failed', [
                'errors' => $validator->getErrors()
            ], 422);
        }
        
        // Build update data
        $updateData = [];
        $allowedFields = ['first_name', 'middle_name', 'last_name', 'prefix', 'suffix', 'email', 'phone', 'user_type', 'member_id'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field]) && $data[$field] !== $existing[$field]) {
                $updateData[$field] = $data[$field];
            }
        }

        // Handle password update
        if (!empty($data['password'])) {
            $updateData['password'] = Auth::hashPassword($data['password']);
        }
        
        if (empty($updateData)) {
            $this->response(true, 'No changes made to user', ['user' => $existing]);
        }
            
        $updateData['email'] = !empty($data['email']) ? $data['email'] : null;
        $updateData['updated_at'] = date('Y-m-d H:i:s');
        
        try {
            Database::update('users', $updateData, 'id = :id', ['id' => $id]);
            
            $user = $this->getUser($id.'');

            $this->response(true, 'User updated successfully', ['user' => $user]);
        } catch (Exception $e) {
            error_log('User update error: ' . $e->getMessage());
            $this->response(false, 'Failed to update user', [], 500);
        }
    }
    
    /**
     * DELETE: /api/users/{id}
     * Deletes a user.
     */
    public function delete(?string $id = null): void {
        $this->checkPermission(['Admin']);
        
        if (!$id) {
            $this->response(false, 'User ID is required', [], 400);
        }

        $id = Validator::sanitize($id);

        // Prevent deletion of system admin (id = 1)
        $user = Database::fetch("SELECT id FROM users WHERE id = ?", [$id]);
        if ($user && $user['id'] == 1) {
            $this->response(false, 'Cannot delete system administrator account', [], 403);
        }

        // Prevent user from deleting themselves
        $authUserID = $this->getAuthenticatedUser();
        if ($id === $authUserID) {
            $this->response(false, 'You cannot delete your own account', [], 403);
        }
        
        try {
            $stmt = Database::query("DELETE FROM users WHERE id = ?", [$id]);
            $rowCount = $stmt->rowCount();
            
            if ($rowCount > 0) {
                $this->response(true, 'User deleted successfully');
            } else {
                $this->response(false, 'User not found', [], 404);
            }
        } catch (Exception $e) {
            // Check for foreign key constraint violation
            if ($e->getCode() == '23000') {
                 $this->response(false, 'Cannot delete user. They are associated with other records.', [], 409);
            }
            error_log('User deletion error: ' . $e->getMessage());
            $this->response(false, 'Failed to delete user', [], 500);
        }
    }

    /**
     * Fetches detailed user information.
     */
    private function getUser(string $id): ?array {
        $userRec = Database::fetch("
            SELECT 
                u.*
            FROM users u
            WHERE u.id = ?
        ", [$id]);

        return $userRec ?: null;
    }
}