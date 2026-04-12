<?php
declare(strict_types=1);

namespace App\controllers;

use App\core\Auth;
use App\core\Validator;
use App\controllers\Controller;
use App\core\AuditLogger;
use App\core\Database;

class AuthController extends Controller {    
    public function register(): void {
        $input = $this->getJsonInput();
        
        // Rate limiting
        $ip = $_SERVER['REMOTE_ADDR'];
        if (!Auth::checkRateLimit("register:{$ip}", 5, 3600)) {
            $this->response(false, 'Too many registration attempts. Try again later after an hour.', [], 429);
        }
        
        // Validate input
        $validator = new Validator();
        if (!$validator->validate($input, [
            'user_id' => 'required|string|unique:users,user_id|min:3|max:32',
            'first_name' => 'required|min:1|max:32',
            'middle_name' => 'required|min:1|max:32',
            'last_name' => 'required|min:1|max:32',
            'password' => 'required|min:8|max:255',
            'user_type' => 'required|enum:Admin,Member,Staff',
            'email' => 'nullable|emai|unique:users,email|max:255',
            'phone' => 'nullable|string|max:32',
            'prefix' => 'nullable|string|max:16',
            'suffix' => 'nullable|string|max:16',
            'member_id' => 'nullable|exists:members,id',
        ])) {
            $this->response(false, $validator->getFirstError(), ['errors' => $validator->getErrors()], 422);
        }
        
        // Sanitize inputs
        $values = Validator::sanitizeArray($input);
        $user_id = $values['user_id'];
        $first_name = $values['first_name'] ?? null;
        $middle_name = $values['middle_name'] ?? null;
        $last_name = $values['last_name'] ?? null;
        $password = $values['password'];
        $user_type = $values['user_type'];
        $email = $values['email'] ?? null;
        $phone = $values['phone'] ?? null;
        $prefix = $values['prefix'] ?? null;
        $suffix = $values['suffix'] ?? null;
        $member_id = $values['member_id'] ?? null;
                
        // Create credential record
        $passwordHash = Auth::hashPassword($password);
        
        Database::insert('users', [
            'user_id' => $user_id,
            'first_name' => $first_name,
            'middle_name' => $middle_name,
            'last_name' => $last_name,
            'password' => $passwordHash,
            'user_type' => $user_type,
            'email' => $email,
            'phone' => $phone,
            'prefix' => $prefix,
            'suffix' => $suffix,
            'member_id' => $member_id,
        ]);

        $user = Database::fetch("SELECT * FROM users where user_id = ? LIMIT 1",[$user_id]);

        $this->response(true, 'The user has been successfully registered!', [
            'verification_required' => false,
            'user' => $user,
        ], 201);
    }
    
    public function login(): void {
        $input = $this->getJsonInput();
        
        // Rate limiting
        $ip = $_SERVER['REMOTE_ADDR'];
        if (!Auth::checkRateLimit("login:{$ip}", LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW)) {
            $this->response(false, 'Too many login attempts. Try again later.', [], 429);
        }
        
        // Validate
        $validator = new Validator();
        if (!$validator->validate($input, [
            'user_id' => 'required|exists:users,user_id',
            'password' => 'required|string|max:255',
        ])) {
            $this->response(false, $validator->getFirstError(), [], 422);
        }
        
        // $email = filter_var($input['email'], FILTER_VALIDATE_EMAIL);
        $user_id = Validator::sanitize($input['user_id']);
        
        // Fetch user
        $user = Database::fetch("SELECT * FROM users WHERE user_id = ?",[$user_id]);
        
        if (!$user || !Auth::verifyPassword($input['password'], $user['password'])) {
            $this->response(false, 'Invalid user ID or password', [], 401);
        }
        
        // Generate tokens
        $accessToken = Auth::generateToken($user['user_id']);
        $refreshToken = Auth::generateRefreshToken();
        
        // Store refresh token
        Database::insert('refresh_tokens', [
            'user_id' => $user['user_id'],
            'token' => hash('sha256', $refreshToken),
            'expires_at' => date('Y-m-d H:i:s', time() + REFRESH_TOKEN_EXPIRY),
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        $last_login = date('Y-m-d H:i:s');

        // Update last login
        Database::update(
            'users',
            ['last_login' => $last_login],
            'user_id = :user_id',
            ['user_id' => $user['user_id']]
        );

        if($user){
            AuditLogger::logLogin($user['id'],$user['user_id']);
        }

        // Fetch available years to populate filters
        $availableYears = [0 => ['year' => date('Y')]];

        // Add 'all' option at the beginning
        array_unshift($availableYears, ['year' => 'all']);
        
        $this->response(true, 'Login successful', [
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'token_type' => 'Bearer',
            'expires_in' => JWT_EXPIRY,
            'user_id' => $user['user_id'],
            'available_years' => array_column($availableYears, 'year'),
            'user' => [
                'id' => $user['id'],
                'user_id' => $user['user_id'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'user_type' => $user['user_type'],
                'last_login' => $last_login,
            ],
        ]);
    }
    
    public function resetPassword(): void {
        $input = $this->getJsonInput();
        
        $validator = new Validator();
        if (!$validator->validate($input, [
            'OldPassword' => 'required',
            'Password' => 'required|min:6',
            'PasswordConfirmation' => 'required|same:Password'
        ])) {
            $this->response(false, $validator->getFirstError(), [], 422);
        }
        
        $oldPassword = Validator::sanitize($input['OldPassword']);

        $user = Auth::user();
        
        if (!$user || !Auth::verifyPassword($oldPassword, $user['password'])) {
            $this->response(false, 'Invalid old password', [], 403);
        }
        
        $passwordHash = Auth::hashPassword($input['Password']);
        
        Database::update(
            'users',
            [
                'password' => $passwordHash,
            ],
            'user_id = :user_id',
            ['user_id' => $user['user_id']]
        );
        
        $this->response(true, 'Password has been reset successfully');
    }
    
    public function refresh(): void {
        $input = $this->getJsonInput();
        
        $validator = new Validator();
        if (!$validator->validate($input, ['refresh_token' => 'required'])) {
            $this->response(false, $validator->getFirstError(), [], 422);
        }
        
        $refreshToken = $input['refresh_token'];
        $tokenHash = hash('sha256', $refreshToken);
        
        // Fetch the refresh token
        $token = Database::fetch(
            "SELECT user_id, expires_at 
            FROM refresh_tokens 
            WHERE token = ? AND expires_at > NOW()",
            [$tokenHash]
        );
        
        if (!$token) {
            $this->response(false, 'Invalid or expired refresh token', [], 401);
        }
        
        // Generate new access token
        $accessToken = Auth::generateToken($token['user_id']);
        
        // Generate new refresh token (token rotation for security)
        $newRefreshToken = Auth::generateRefreshToken();
        $newTokenHash = hash('sha256', $newRefreshToken);
        
        // Delete old refresh token
        Database::query(
            "DELETE FROM refresh_tokens WHERE token = ?",
            [$tokenHash]
        );
        
        // Store new refresh token
        Database::insert('refresh_tokens', [
            'user_id' => $token['user_id'],
            'token' => $newTokenHash,
            'expires_at' => date('Y-m-d H:i:s', time() + REFRESH_TOKEN_EXPIRY),
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        $this->response(true, 'Token refreshed', [
            'access_token' => $accessToken,
            'refresh_token' => $newRefreshToken, // Return new refresh token
            'token_type' => 'Bearer',
            'expires_in' => JWT_EXPIRY
        ]);
    }
    
    public function logout(): void {
        $user_id = $GLOBALS['authenticated_user'] ?? null;
        
        if ($user_id) {

            $user = Auth::user();
            if($user){
                AuditLogger::logLogout($user['id'],$user['user_id']);
            }

            // Delete all refresh tokens for this user
            Database::query(
                "DELETE FROM refresh_tokens WHERE user_id = ?",
                [$user_id]
            );
        }
        
        $this->response(true, 'Logged out successfully');
    }

    public function clearRateLimitCache(): void {
        $files = glob(RATE_LIMIT_CACHE_PATH . '/*.json');
        $count = 0;
        foreach ($files as $file) {
            if (is_file($file)) {
                unlink($file);
                $count++;
            }
        }
        echo "Cache Deleted: ".$count;
    }

    public function clearExpiredTokensAndLoginAttempts(): void {
        Database::query("DELETE FROM refresh_tokens WHERE expires_at < NOW()");
        Database::query("DELETE FROM login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)");
        
        echo "Expired Tokens and Login Attempts cleared";
    }
}