<?php
// core/Validator.php
declare(strict_types=1);

namespace App\core;

use PDO;

class Validator {
    private array $errors = [];
    private array $data = [];
    private ?PDO $db = null;
    
    /**
     * Set database connection for unique validation
     */
    public function setDatabase(?PDO $db): self {
        $this->db = $db;
        return $this;
    }
    
    /**
     * Validate data against rules
     */
    public function validate(array $data, array $rules, array $messages = []): bool {
        $this->errors = [];
        $this->data = $data;
        
        foreach ($rules as $field => $ruleSet) {
            $rulesArray = is_array($ruleSet) ? $ruleSet : explode('|', $ruleSet);
            $value = $this->getFieldValue($field);
            
            // Check if field is nullable
            $isNullable = in_array('nullable', $rulesArray);
            
            // Skip validation if field is nullable and empty
            if ($isNullable && $this->isEmpty($value)) {
                continue;
            }
            
            foreach ($rulesArray as $rule) {
                if ($rule === 'nullable') {
                    continue;
                }
                
                $this->applyRule($field, $value, $rule, $messages);
            }
        }
        
        return empty($this->errors);
    }
    
    /**
     * Get field value from data (supports dot notation)
     */
    private function getFieldValue(string $field): mixed {
        if (isset($this->data[$field])) {
            return $this->data[$field];
        }
        
        // Support dot notation (e.g., 'user.email')
        if (str_contains($field, '.')) {
            $keys = explode('.', $field);
            $value = $this->data;
            
            foreach ($keys as $key) {
                if (!isset($value[$key])) {
                    return null;
                }
                $value = $value[$key];
            }
            
            return $value;
        }
        
        return null;
    }
    
    /**
     * Check if value is empty
     */
    private function isEmpty(mixed $value): bool {
        if ($value === null) {
            return true;
        }
        
        if (is_string($value) && trim($value) === '') {
            return true;
        }
        
        if (is_array($value) && empty($value)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Apply validation rule
     */
    private function applyRule(string $field, mixed $value, string $rule, array $messages): void {
        // Parse rule and parameters
        $ruleName = $rule;
        $parameters = [];
        
        if (str_contains($rule, ':')) {
            [$ruleName, $params] = explode(':', $rule, 2);
            $parameters = str_contains($params, ',') ? explode(',', $params) : [$params];
        }
        
        // Get custom message if provided
        $messageKey = "{$field}.{$ruleName}";
        $customMessage = $messages[$messageKey] ?? $messages[$ruleName] ?? null;
        
        // Apply the rule
        $method = 'validate' . str_replace('_', '', ucwords($ruleName, '_'));
        
        if (method_exists($this, $method)) {
            $this->$method($field, $value, $parameters, $customMessage);
        } else {
            // Handle unknown rules gracefully
            $this->addError($field, "Unknown validation rule: {$ruleName}");
        }
    }
    
    /**
     * Validation Rules
     */
    
    protected function validateRequired(string $field, mixed $value, array $parameters, ?string $message): void {
        if ($this->isEmpty($value)) {
            $this->addError($field, $message ?? "The {$field} field is required.");
        }
    }
    
    protected function validateRequiredIf(string $field, mixed $value, array $parameters, ?string $message): void {
        if (count($parameters) < 2) {
            return;
        }
        
        $otherField = $parameters[0];
        $otherValue = $parameters[1];
        $actualOtherValue = $this->getFieldValue($otherField);
        
        // Check if condition matches
        if ($actualOtherValue == $otherValue && $this->isEmpty($value)) {
            $this->addError($field, $message ?? "The {$field} field is required when {$otherField} is {$otherValue}.");
        }
    }
    
    protected function validateRequiredUnless(string $field, mixed $value, array $parameters, ?string $message): void {
        if (count($parameters) < 2) {
            return;
        }
        
        $otherField = $parameters[0];
        $otherValue = $parameters[1];
        $actualOtherValue = $this->getFieldValue($otherField);
        
        if ($actualOtherValue != $otherValue && $this->isEmpty($value)) {
            $this->addError($field, $message ?? "The {$field} field is required unless {$otherField} is {$otherValue}.");
        }
    }
    
    protected function validateRequiredWith(string $field, mixed $value, array $parameters, ?string $message): void {
        foreach ($parameters as $otherField) {
            if (!$this->isEmpty($this->getFieldValue($otherField)) && $this->isEmpty($value)) {
                $fields = implode(', ', $parameters);
                $this->addError($field, $message ?? "The {$field} field is required when {$fields} is present.");
                return;
            }
        }
    }
    
    protected function validateRequiredWithAll(string $field, mixed $value, array $parameters, ?string $message): void {
        $allPresent = true;
        foreach ($parameters as $otherField) {
            if ($this->isEmpty($this->getFieldValue($otherField))) {
                $allPresent = false;
                break;
            }
        }
        
        if ($allPresent && $this->isEmpty($value)) {
            $fields = implode(', ', $parameters);
            $this->addError($field, $message ?? "The {$field} field is required when {$fields} are present.");
        }
    }
    
    protected function validateRequiredWithout(string $field, mixed $value, array $parameters, ?string $message): void {
        foreach ($parameters as $otherField) {
            if ($this->isEmpty($this->getFieldValue($otherField)) && $this->isEmpty($value)) {
                $fields = implode(', ', $parameters);
                $this->addError($field, $message ?? "The {$field} field is required when {$fields} is not present.");
                return;
            }
        }
    }
    
    protected function validateEmail(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isEmpty($value) && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->addError($field, $message ?? "The {$field} must be a valid email address.");
        }
    }
    
    protected function validateMin(string $field, mixed $value, array $parameters, ?string $message): void {
        if (empty($parameters)) {
            return;
        }
        
        $min = (int) $parameters[0];
        $size = $this->getSize($value);
        
        if ($size < $min) {
            $this->addError($field, $message ?? "The {$field} must be at least {$min} characters.");
        }
    }
    
    protected function validateMax(string $field, mixed $value, array $parameters, ?string $message): void {
        if (empty($parameters)) {
            return;
        }
        
        $max = (int) $parameters[0];
        $size = $this->getSize($value);
        
        if ($size > $max) {
            $this->addError($field, $message ?? "The {$field} must not exceed {$max} characters.");
        }
    }
    
    protected function validateBetween(string $field, mixed $value, array $parameters, ?string $message): void {
        if (count($parameters) < 2) {
            return;
        }
        
        $min = $parameters[0];
        $max = $parameters[1];
        $size = $this->getSize($value);
        
        if ($size < $min || $size > $max) {
            $this->addError($field, $message ?? "The {$field} must be between {$min} and {$max}.");
        }
    }
    
    protected function validateSize(string $field, mixed $value, array $parameters, ?string $message): void {
        if (empty($parameters)) {
            return;
        }
        
        $size = (int) $parameters[0];
        $actualSize = $this->getSize($value);
        
        if ($actualSize != $size) {
            $this->addError($field, $message ?? "The {$field} must be {$size}.");
        }
    }
    
    protected function validateNumeric(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isEmpty($value) && !is_numeric($value)) {
            $this->addError($field, $message ?? "The {$field} must be a number.");
        }
    }
    
    protected function validateInteger(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isEmpty($value) && !filter_var($value, FILTER_VALIDATE_INT)) {
            $this->addError($field, $message ?? "The {$field} must be an integer.");
        }
    }
    
    protected function validateAlpha(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isEmpty($value) && !ctype_alpha(str_replace(' ', '', (string)$value))) {
            $this->addError($field, $message ?? "The {$field} must contain only letters.");
        }
    }
    
    protected function validateAlphaNum(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isEmpty($value) && !ctype_alnum(str_replace([' ', '-', '_'], '', (string)$value))) {
            $this->addError($field, $message ?? "The {$field} must contain only letters and numbers.");
        }
    }
    
    protected function validateAlphaDash(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isEmpty($value) && !preg_match('/^[a-zA-Z0-9_-]+$/', (string)$value)) {
            $this->addError($field, $message ?? "The {$field} must contain only letters, numbers, dashes, and underscores.");
        }
    }
    
    protected function validateDate(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isEmpty($value) && !strtotime((string)$value)) {
            $this->addError($field, $message ?? "The {$field} must be a valid date.");
        }
    }
    
    protected function validateDateFormat(string $field, mixed $value, array $parameters, ?string $message): void {
        if (empty($parameters) || $this->isEmpty($value)) {
            return;
        }
        
        $format = $parameters[0];
        $date = \DateTime::createFromFormat($format, (string)$value);
        
        if (!$date || $date->format($format) !== $value) {
            $this->addError($field, $message ?? "The {$field} must match the format {$format}.");
        }
    }
    
    protected function validateBefore(string $field, mixed $value, array $parameters, ?string $message): void {
        if (empty($parameters) || $this->isEmpty($value)) {
            return;
        }
        
        $beforeDate = strtotime($parameters[0]);
        $valueDate = strtotime((string)$value);
        
        if (!$valueDate || !$beforeDate || $valueDate >= $beforeDate) {
            $this->addError($field, $message ?? "The {$field} must be a date before {$parameters[0]}.");
        }
    }
    
    protected function validateAfter(string $field, mixed $value, array $parameters, ?string $message): void {
        if (empty($parameters) || $this->isEmpty($value)) {
            return;
        }
        
        $afterDate = strtotime($parameters[0]);
        $valueDate = strtotime((string)$value);
        
        if (!$valueDate || !$afterDate || $valueDate <= $afterDate) {
            $this->addError($field, $message ?? "The {$field} must be a date after {$parameters[0]}.");
        }
    }
    
    protected function validateSame(string $field, mixed $value, array $parameters, ?string $message): void {
        if (empty($parameters)) {
            return;
        }
        
        $otherField = $parameters[0];
        $otherValue = $this->getFieldValue($otherField);
        
        if ($value !== $otherValue) {
            $this->addError($field, $message ?? "The {$field} must match {$otherField}.");
        }
    }
    
    protected function validateDifferent(string $field, mixed $value, array $parameters, ?string $message): void {
        if (empty($parameters)) {
            return;
        }
        
        $otherField = $parameters[0];
        $otherValue = $this->getFieldValue($otherField);
        
        if ($value === $otherValue) {
            $this->addError($field, $message ?? "The {$field} must be different from {$otherField}.");
        }
    }
    
    protected function validateGreater(string $field, mixed $value, array $parameters, ?string $message): void {
        if (empty($parameters) || $this->isEmpty($value)) {
            return;
        }
        
        $otherField = $parameters[0];
        $otherValue = $this->getFieldValue($otherField);
        
        if ($otherValue === null) {
            return;
        }
        
        // Convert to numeric for comparison
        $numValue = is_numeric($value) ? (float)$value : null;
        $numOther = is_numeric($otherValue) ? (float)$otherValue : null;
        
        if ($numValue === null || $numOther === null) {
            $this->addError($field, $message ?? "The {$field} and {$otherField} must be numeric for comparison.");
            return;
        }
        
        if ($numValue <= $numOther) {
            $this->addError($field, $message ?? "The {$field} must be greater than {$otherField}.");
        }
    }
    
    protected function validateGreaterThan(string $field, mixed $value, array $parameters, ?string $message): void {
        // Alias for greater
        $this->validateGreater($field, $value, $parameters, $message);
    }
    
    protected function validateGt(string $field, mixed $value, array $parameters, ?string $message): void {
        // Short alias for greater
        $this->validateGreater($field, $value, $parameters, $message);
    }
    
    protected function validateGreaterThanOrEqual(string $field, mixed $value, array $parameters, ?string $message): void {
        if (empty($parameters) || $this->isEmpty($value)) {
            return;
        }
        
        $otherField = $parameters[0];
        $otherValue = $this->getFieldValue($otherField);
        
        if ($otherValue === null) {
            return;
        }
        
        $numValue = is_numeric($value) ? (float)$value : null;
        $numOther = is_numeric($otherValue) ? (float)$otherValue : null;
        
        if ($numValue === null || $numOther === null) {
            $this->addError($field, $message ?? "The {$field} and {$otherField} must be numeric for comparison.");
            return;
        }
        
        if ($numValue < $numOther) {
            $this->addError($field, $message ?? "The {$field} must be greater than or equal to {$otherField}.");
        }
    }
    
    protected function validateGte(string $field, mixed $value, array $parameters, ?string $message): void {
        // Short alias for greater_than_or_equal
        $this->validateGreaterThanOrEqual($field, $value, $parameters, $message);
    }
    
    protected function validateLess(string $field, mixed $value, array $parameters, ?string $message): void {
        if (empty($parameters) || $this->isEmpty($value)) {
            return;
        }
        
        $otherField = $parameters[0];
        $otherValue = $this->getFieldValue($otherField);
        
        if ($otherValue === null) {
            return;
        }
        
        $numValue = is_numeric($value) ? (float)$value : null;
        $numOther = is_numeric($otherValue) ? (float)$otherValue : null;
        
        if ($numValue === null || $numOther === null) {
            $this->addError($field, $message ?? "The {$field} and {$otherField} must be numeric for comparison.");
            return;
        }
        
        if ($numValue >= $numOther) {
            $this->addError($field, $message ?? "The {$field} must be less than {$otherField}.");
        }
    }
    
    protected function validateLessThan(string $field, mixed $value, array $parameters, ?string $message): void {
        // Alias for less
        $this->validateLess($field, $value, $parameters, $message);
    }
    
    protected function validateLt(string $field, mixed $value, array $parameters, ?string $message): void {
        // Short alias for less
        $this->validateLess($field, $value, $parameters, $message);
    }
    
    protected function validateLessThanOrEqual(string $field, mixed $value, array $parameters, ?string $message): void {
        if (empty($parameters) || $this->isEmpty($value)) {
            return;
        }
        
        $otherField = $parameters[0];
        $otherValue = $this->getFieldValue($otherField);
        
        if ($otherValue === null) {
            return;
        }
        
        $numValue = is_numeric($value) ? (float)$value : null;
        $numOther = is_numeric($otherValue) ? (float)$otherValue : null;
        
        if ($numValue === null || $numOther === null) {
            $this->addError($field, $message ?? "The {$field} and {$otherField} must be numeric for comparison.");
            return;
        }
        
        if ($numValue > $numOther) {
            $this->addError($field, $message ?? "The {$field} must be less than or equal to {$otherField}.");
        }
    }
    
    protected function validateLte(string $field, mixed $value, array $parameters, ?string $message): void {
        // Short alias for less_than_or_equal
        $this->validateLessThanOrEqual($field, $value, $parameters, $message);
    }
    
    protected function validateIn(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isEmpty($value) && !in_array($value, $parameters, true)) {
            $allowed = implode(', ', $parameters);
            $this->addError($field, $message ?? "The selected {$field} is invalid. Must be one of: {$allowed}");
        }
    }
    
    protected function validateNotIn(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isEmpty($value) && in_array($value, $parameters, true)) {
            $this->addError($field, $message ?? "The selected {$field} is invalid.");
        }
    }
    
    protected function validateEnum(string $field, mixed $value, array $parameters, ?string $message): void {
        // Alias for 'in' rule
        $this->validateIn($field, $value, $parameters, $message);
    }
    
    protected function validateUrl(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isEmpty($value) && !filter_var($value, FILTER_VALIDATE_URL)) {
            $this->addError($field, $message ?? "The {$field} must be a valid URL.");
        }
    }
    
    protected function validateIp(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isEmpty($value) && !filter_var($value, FILTER_VALIDATE_IP)) {
            $this->addError($field, $message ?? "The {$field} must be a valid IP address.");
        }
    }
    
    protected function validateJson(string $field, mixed $value, array $parameters, ?string $message): void {
        if ($this->isEmpty($value)) {
            return;
        }
        
        json_decode((string)$value);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->addError($field, $message ?? "The {$field} must be a valid JSON string.");
        }
    }
    
    protected function validateBoolean(string $field, mixed $value, array $parameters, ?string $message): void {
        $acceptable = [true, false, 0, 1, '0', '1'];
        
        if (!in_array($value, $acceptable, true)) {
            $this->addError($field, $message ?? "The {$field} must be true or false.");
        }
    }
    
    protected function validateArray(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!is_array($value)) {
            $this->addError($field, $message ?? "The {$field} must be an array.");
        }
    }
    
    protected function validateString(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!is_string($value)) {
            $this->addError($field, $message ?? "The {$field} must be a string.");
        }
    }
    
    protected function validateRegex(string $field, mixed $value, array $parameters, ?string $message): void {
        if (empty($parameters) || $this->isEmpty($value)) {
            return;
        }
        
        $pattern = $parameters[0];
        
        if (!preg_match($pattern, (string)$value)) {
            $this->addError($field, $message ?? "The {$field} format is invalid.");
        }
    }
    
    protected function validateConfirmed(string $field, mixed $value, array $parameters, ?string $message): void {
        $confirmField = $field . '_confirmation';
        $confirmValue = $this->getFieldValue($confirmField);
        
        if ($value !== $confirmValue) {
            $this->addError($field, $message ?? "The {$field} confirmation does not match.");
        }
    }
    
    protected function validateAccepted(string $field, mixed $value, array $parameters, ?string $message): void {
        $acceptable = ['yes', 'on', '1', 1, true, 'true'];
        
        if (!in_array($value, $acceptable, true)) {
            $this->addError($field, $message ?? "The {$field} must be accepted.");
        }
    }
    
    protected function validateUnique(string $field, mixed $value, array $parameters, ?string $message): void {
        if ($this->isEmpty($value) || !$this->db) {
            return;
        }
        
        // Parameters: table, column (optional), except_id (optional), id_column (optional)
        if (empty($parameters)) {
            $this->addError($field, "Unique rule requires table parameter.");
            return;
        }
        
        $table = $parameters[0];
        $column = $parameters[1] ?? $field;
        $exceptId = $parameters[2] ?? null;
        $idColumn = $parameters[3] ?? 'id';
        
        try {
            $query = "SELECT COUNT(*) FROM {$table} WHERE {$column} = ?";
            $params = [$value];
            
            if ($exceptId !== null) {
                $query .= " AND {$idColumn} != ?";
                $params[] = $exceptId;
            }
            
            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $count = $stmt->fetchColumn();
            
            if ($count > 0) {
                $this->addError($field, $message ?? "The {$field} has already been taken.");
            }
        } catch (\PDOException $e) {
            $this->addError($field, "Database error during unique validation.");
        }
    }
    
    protected function validateExists(string $field, mixed $value, array $parameters, ?string $message): void {
        if ($this->isEmpty($value) || !$this->db) {
            return;
        }
        
        // Parameters: table, column (optional)
        if (empty($parameters)) {
            $this->addError($field, "Exists rule requires table parameter.");
            return;
        }
        
        $table = $parameters[0];
        $column = $parameters[1] ?? $field;
        
        try {
            $query = "SELECT COUNT(*) FROM {$table} WHERE {$column} = ?";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$value]);
            $count = $stmt->fetchColumn();
            
            if ($count === 0) {
                $this->addError($field, $message ?? "The selected {$field} is invalid.");
            }
        } catch (\PDOException $e) {
            $this->addError($field, "Database error during exists validation.");
        }
    }
    
    /**
     * File Upload Validation Rules
     */
    
    protected function validateFile(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isUploadedFile($value)) {
            $this->addError($field, $message ?? "The {$field} must be a file.");
        }
    }
    
    protected function validateImage(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isUploadedFile($value)) {
            $this->addError($field, $message ?? "The {$field} must be an image.");
            return;
        }
        
        $allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        
        if (!in_array($value['type'], $allowedMimes)) {
            $this->addError($field, $message ?? "The {$field} must be an image (jpeg, png, gif, webp, svg).");
            return;
        }
        
        // Additional check using getimagesize for better validation
        if ($value['type'] !== 'image/svg+xml') {
            $imageInfo = @getimagesize($value['tmp_name']);
            if ($imageInfo === false) {
                $this->addError($field, $message ?? "The {$field} must be a valid image file.");
            }
        }
    }
    
    protected function validateMimes(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isUploadedFile($value)) {
            $this->addError($field, $message ?? "The {$field} must be a file.");
            return;
        }
        
        if (empty($parameters)) {
            return;
        }
        
        $allowedMimes = [];
        foreach ($parameters as $ext) {
            $allowedMimes = array_merge($allowedMimes, $this->getMimeTypes($ext));
        }
        
        if (!in_array($value['type'], $allowedMimes)) {
            $extensions = implode(', ', $parameters);
            $this->addError($field, $message ?? "The {$field} must be a file of type: {$extensions}.");
        }
    }
    
    protected function validateMimetypes(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isUploadedFile($value)) {
            $this->addError($field, $message ?? "The {$field} must be a file.");
            return;
        }
        
        if (empty($parameters)) {
            return;
        }
        
        if (!in_array($value['type'], $parameters)) {
            $types = implode(', ', $parameters);
            $this->addError($field, $message ?? "The {$field} must be a file of type: {$types}.");
        }
    }
    
    protected function validateFileSize(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isUploadedFile($value)) {
            return;
        }
        
        if (empty($parameters)) {
            return;
        }
        
        $maxSize = $this->parseFileSize($parameters[0]);
        $fileSize = $value['size'];
        
        if ($fileSize > $maxSize) {
            $readable = $this->formatBytes($maxSize);
            $this->addError($field, $message ?? "The {$field} must not be larger than {$readable}.");
        }
    }
    
    protected function validateMaxFileSize(string $field, mixed $value, array $parameters, ?string $message): void {
        // Alias for file_size
        $this->validateFileSize($field, $value, $parameters, $message);
    }
    
    protected function validateMinFileSize(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isUploadedFile($value)) {
            return;
        }
        
        if (empty($parameters)) {
            return;
        }
        
        $minSize = $this->parseFileSize($parameters[0]);
        $fileSize = $value['size'];
        
        if ($fileSize < $minSize) {
            $readable = $this->formatBytes($minSize);
            $this->addError($field, $message ?? "The {$field} must be at least {$readable}.");
        }
    }
    
    protected function validateDimensions(string $field, mixed $value, array $parameters, ?string $message): void {
        if (!$this->isUploadedFile($value)) {
            return;
        }
        
        $imageInfo = @getimagesize($value['tmp_name']);
        if ($imageInfo === false) {
            $this->addError($field, $message ?? "The {$field} must be an image.");
            return;
        }
        
        [$width, $height] = $imageInfo;
        
        // Parse dimension constraints
        $constraints = [];
        foreach ($parameters as $constraint) {
            if (str_contains($constraint, '=')) {
                [$key, $val] = explode('=', $constraint);
                $constraints[$key] = (int)$val;
            }
        }
        
        $errors = [];
        
        if (isset($constraints['width']) && $width != $constraints['width']) {
            $errors[] = "width must be {$constraints['width']}px";
        }
        
        if (isset($constraints['height']) && $height != $constraints['height']) {
            $errors[] = "height must be {$constraints['height']}px";
        }
        
        if (isset($constraints['min_width']) && $width < $constraints['min_width']) {
            $errors[] = "minimum width is {$constraints['min_width']}px";
        }
        
        if (isset($constraints['min_height']) && $height < $constraints['min_height']) {
            $errors[] = "minimum height is {$constraints['min_height']}px";
        }
        
        if (isset($constraints['max_width']) && $width > $constraints['max_width']) {
            $errors[] = "maximum width is {$constraints['max_width']}px";
        }
        
        if (isset($constraints['max_height']) && $height > $constraints['max_height']) {
            $errors[] = "maximum height is {$constraints['max_height']}px";
        }
        
        if (isset($constraints['ratio'])) {
            $ratio = $constraints['ratio'];
            if (str_contains($ratio, '/')) {
                [$ratioWidth, $ratioHeight] = explode('/', $ratio);
                $expectedRatio = $ratioWidth / $ratioHeight;
                $actualRatio = $width / $height;
                
                if (abs($expectedRatio - $actualRatio) > 0.01) {
                    $errors[] = "aspect ratio must be {$ratio}";
                }
            }
        }
        
        if (!empty($errors)) {
            $errorMessage = "The {$field} has invalid dimensions (" . implode(', ', $errors) . ").";
            $this->addError($field, $message ?? $errorMessage);
        }
    }
    
    protected function validateImageDimensions(string $field, mixed $value, array $parameters, ?string $message): void {
        // Alias for dimensions
        $this->validateDimensions($field, $value, $parameters, $message);
    }
    
    /**
     * File Upload Helper Methods
     */
    
    private function isUploadedFile(mixed $value): bool {
        if (!is_array($value)) {
            return false;
        }
        
        $requiredKeys = ['name', 'type', 'tmp_name', 'error', 'size'];
        foreach ($requiredKeys as $key) {
            if (!isset($value[$key])) {
                return false;
            }
        }
        
        // Check if file was uploaded without errors
        if ($value['error'] !== UPLOAD_ERR_OK) {
            return false;
        }
        
        // Verify it's an actual uploaded file
        if (!is_uploaded_file($value['tmp_name'])) {
            return false;
        }
        
        return true;
    }
    
    private function getMimeTypes(string $extension): array {
        $mimeMap = [
            'jpg' => ['image/jpeg', 'image/jpg'],
            'jpeg' => ['image/jpeg', 'image/jpg'],
            'png' => ['image/png'],
            'gif' => ['image/gif'],
            'webp' => ['image/webp'],
            'svg' => ['image/svg+xml'],
            'bmp' => ['image/bmp', 'image/x-ms-bmp'],
            'pdf' => ['application/pdf'],
            'doc' => ['application/msword'],
            'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            'xls' => ['application/vnd.ms-excel'],
            'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            'ppt' => ['application/vnd.ms-powerpoint'],
            'pptx' => ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
            'txt' => ['text/plain'],
            'csv' => ['text/csv', 'text/plain'],
            'zip' => ['application/zip', 'application/x-zip-compressed'],
            'rar' => ['application/x-rar-compressed'],
            'mp3' => ['audio/mpeg'],
            'mp4' => ['video/mp4'],
            'avi' => ['video/x-msvideo'],
            'mov' => ['video/quicktime'],
        ];
        
        return $mimeMap[strtolower($extension)] ?? ['application/octet-stream'];
    }
    
    private function parseFileSize(string $size): int {
        $size = trim($size);
        $unit = strtolower(substr($size, -2));
        $value = (int)$size;
        
        switch ($unit) {
            case 'kb':
                return $value * 1024;
            case 'mb':
                return $value * 1024 * 1024;
            case 'gb':
                return $value * 1024 * 1024 * 1024;
            default:
                return $value;
        }
    }
    
    private function formatBytes(int $bytes, int $precision = 2): string {
        $units = ['B', 'KB', 'MB', 'GB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, $precision) . ' ' . $units[$i];
    }
    
    /**
     * Helper Methods
     */
    
    private function getSize(mixed $value): int|float {
        // 🔥 STRINGS FIRST
        if (is_string($value)) {
            return mb_strlen($value, 'UTF-8');
        }

        if (is_numeric($value)) {
            return (float) $value;
        }

        if (is_array($value)) {
            return count($value);
        }

        return 0;
    }
    
    private function addError(string $field, string $message): void {
        if (!isset($this->errors[$field])) {
            $this->errors[$field] = [];
        }
        
        $this->errors[$field][] = $message;
    }
    
    /**
     * Get validation errors
     */
    public function getErrors(): array {
        return $this->errors;
    }
    
    /**
     * Get errors for a specific field
     */
    public function getFieldErrors(string $field): array {
        return $this->errors[$field] ?? [];
    }
    
    /**
     * Get first error message
     */
    public function getFirstError(?string $field = null): ?string {
        if ($field !== null) {
            return $this->errors[$field][0] ?? null;
        }
        
        if (empty($this->errors)) {
            return null;
        }
        
        $firstField = array_key_first($this->errors);
        return $this->errors[$firstField][0] ?? null;
    }
    
    /**
     * Check if validation failed
     */
    public function fails(): bool {
        return !empty($this->errors);
    }
    
    /**
     * Check if validation passed
     */
    public function passes(): bool {
        return empty($this->errors);
    }
    
    /**
     * Get all error messages as flat array
     */
    public function getAllMessages(): array {
        $messages = [];
        
        foreach ($this->errors as $fieldErrors) {
            foreach ($fieldErrors as $error) {
                $messages[] = $error;
            }
        }
        
        return $messages;
    }
    
    /**
     * Sanitize input
     */
    public static function sanitize(string $input): string {
        return strip_tags(trim($input));
    }
    
    /**
     * Sanitize array of inputs
     */
    public static function sanitizeArray(array $inputs): array {
        $sanitized = [];
        
        foreach ($inputs as $key => $value) {
            if (is_array($value)) {
                $sanitized[$key] = self::sanitizeArray($value);
            } elseif (is_string($value)) {
                $sanitized[$key] = self::sanitize($value);
            } else {
                $sanitized[$key] = $value;
            }
        }
        
        return $sanitized;
    }
}