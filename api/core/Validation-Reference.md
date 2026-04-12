# Laravel-like Validator - Quick Reference

## Installation & Setup

```php
use App\core\Validator;

$validator = new Validator();

// For unique/exists rules, set database connection
$validator->setDatabase($pdo);
```

## Basic Usage

```php
$data = [
    'email' => 'user@example.com',
    'password' => 'secret123',
];

$rules = [
    'email' => 'required|email|unique:users',
    'password' => 'required|min:8|confirmed',
];

if ($validator->validate($data, $rules)) {
    // Validation passed
} else {
    $errors = $validator->getErrors();
}
```

## Validation Rules

### Required Fields
- `required` - Field must be present and not empty
- `nullable` - Field is optional (skip validation if empty)
- `required_if:field,value` - Required when another field has specific value
- `required_unless:field,value` - Required unless another field has specific value
- `required_with:field1,field2` - Required if any of the other fields are present
- `required_with_all:field1,field2` - Required if all of the other fields are present
- `required_without:field1,field2` - Required if any of the other fields are missing

### String Validation
- `min:number` - Minimum length
- `max:number` - Maximum length
- `between:min,max` - Length between min and max
- `size:number` - Exact length
- `alpha` - Only alphabetic characters
- `alpha_num` - Only alphanumeric characters
- `alpha_dash` - Letters, numbers, dashes, and underscores
- `string` - Must be a string

### Numeric Validation
- `numeric` - Must be numeric
- `integer` - Must be an integer
- `between:min,max` - Numeric value between min and max
- `min:number` - Minimum numeric value
- `max:number` - Maximum numeric value
- `size:number` - Exact numeric value

### Date Validation
- `date` - Must be a valid date
- `date_format:format` - Must match specific format (e.g., Y-m-d)
- `before:date` - Must be before specified date
- `after:date` - Must be after specified date

### Email & URL
- `email` - Valid email address
- `url` - Valid URL
- `ip` - Valid IP address

### Comparison
- `same:field` - Must match another field
- `different:field` - Must be different from another field
- `confirmed` - Must have matching field_confirmation field
- `greater:field` - Must be greater than another field (numeric)
- `greater_than:field` - Alias for greater
- `gt:field` - Short alias for greater
- `greater_than_or_equal:field` - Must be >= another field (numeric)
- `gte:field` - Short alias for greater_than_or_equal
- `less:field` - Must be less than another field (numeric)
- `less_than:field` - Alias for less
- `lt:field` - Short alias for less
- `less_than_or_equal:field` - Must be <= another field (numeric)
- `lte:field` - Short alias for less_than_or_equal

### Lists & Choices
- `in:value1,value2,value3` - Must be in list of values
- `not_in:value1,value2,value3` - Must not be in list of values
- `enum:value1,value2` - Alias for 'in'

### Database
- `unique:table,column,except_id,id_column` - Must be unique in database
- `exists:table,column` - Must exist in database

### File Upload
- `file` - Must be an uploaded file
- `image` - Must be an image (jpeg, png, gif, webp, svg)
- `mimes:ext1,ext2,...` - File must have specified extension
- `mimetypes:type1,type2,...` - File must have specified MIME type
- `file_size:size` - Maximum file size (e.g., 2MB, 5MB, 100MB)
- `max_file_size:size` - Maximum file size (alias)
- `min_file_size:size` - Minimum file size
- `dimensions:constraints` - Image dimension constraints
- `image_dimensions:constraints` - Image dimension constraints (alias)

#### Dimension Constraints
Use comma-separated constraints:
- `width=500` - Exact width in pixels
- `height=300` - Exact height in pixels
- `min_width=200` - Minimum width
- `max_width=2000` - Maximum width
- `min_height=200` - Minimum height
- `max_height=2000` - Maximum height
- `ratio=16/9` - Aspect ratio

Example: `dimensions:min_width=1200,min_height=400,max_width=1920,max_height=600`

#### Supported File Types
- **Images**: jpg, jpeg, png, gif, webp, svg, bmp
- **Documents**: pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv
- **Archives**: zip, rar
- **Audio**: mp3
- **Video**: mp4, avi, mov

### Type Validation
- `boolean` - Must be boolean (true/false, 0/1, '0'/'1')
- `array` - Must be an array
- `json` - Must be valid JSON

### Other
- `regex:pattern` - Must match regex pattern
- `accepted` - Must be 'yes', 'on', '1', or true

## Custom Error Messages

```php
$messages = [
    'email.required' => 'Please provide your email address.',
    'email.email' => 'Please provide a valid email.',
    'password.min' => 'Password must be at least 8 characters.',
];

$validator->validate($data, $rules, $messages);
```

## Getting Errors

```php
// Get all errors
$allErrors = $validator->getErrors();
// Returns: ['field' => ['error1', 'error2']]

// Get errors for specific field
$emailErrors = $validator->getFieldErrors('email');

// Get first error overall
$firstError = $validator->getFirstError();

// Get first error for specific field
$firstEmailError = $validator->getFirstError('email');

// Get all error messages as flat array
$messages = $validator->getAllMessages();

// Check if validation failed
if ($validator->fails()) {
    // Handle errors
}

// Check if validation passed
if ($validator->passes()) {
    // Process data
}
```

## Examples

### User Registration

```php
$data = [
    'username' => 'johndoe',
    'email' => 'john@example.com',
    'password' => 'secret123',
    'password_confirmation' => 'secret123',
    'age' => 25,
    'terms' => true,
];

$rules = [
    'username' => 'required|alpha_dash|min:3|max:20|unique:users',
    'email' => 'required|email|unique:users',
    'password' => 'required|min:8|confirmed',
    'age' => 'required|integer|min:18',
    'terms' => 'accepted',
];

$validator = new Validator();
$validator->setDatabase($pdo);

if ($validator->validate($data, $rules)) {
    // Register user
} else {
    // Show errors
    foreach ($validator->getAllMessages() as $error) {
        echo "- $error\n";
    }
}
```

### Conditional Validation

```php
$data = [
    'payment_method' => 'credit_card',
    'card_number' => '4111111111111111',
    'paypal_email' => null,
];

$rules = [
    'payment_method' => 'required|in:credit_card,paypal',
    'card_number' => 'required_if:payment_method,credit_card|numeric|size:16',
    'paypal_email' => 'required_if:payment_method,paypal|email',
];
```

### Update with Unique Exception

```php
$userId = 5;
$data = [
    'email' => 'newemail@example.com',
    'username' => 'newusername',
];

$rules = [
    'email' => "required|email|unique:users,email,{$userId},id",
    'username' => "required|unique:users,username,{$userId},id",
];

// This will allow the current user's email/username
```

### Optional Fields

```php
$data = [
    'name' => 'John Doe',
    'bio' => null, // Optional
    'website' => '', // Optional
];

$rules = [
    'name' => 'required|string|max:100',
    'bio' => 'nullable|string|max:500',
    'website' => 'nullable|url',
];

// Bio and website will not be validated if empty
```

### File Upload Validation

```php
// Avatar upload
$rules = [
    'avatar' => 'required|image|mimes:jpg,jpeg,png|file_size:2MB|dimensions:min_width=200,min_height=200',
];

// Document upload
$rules = [
    'resume' => 'required|file|mimes:pdf,doc,docx|file_size:5MB',
];

// Cover photo with aspect ratio
$rules = [
    'cover' => 'nullable|image|file_size:5MB|dimensions:ratio=16/9',
];

// Multiple constraints
$rules = [
    'banner' => 'required|image|file_size:5MB|dimensions:min_width=1200,max_width=1920,min_height=400,max_height=600',
];
```

### Complete Profile Form with Files

```php
$data = [
    'name' => 'John Doe',
    'email' => 'john@example.com',
    'avatar' => $_FILES['avatar'] ?? null,
    'resume' => $_FILES['resume'] ?? null,
];

$rules = [
    'name' => 'required|string|min:3|max:100',
    'email' => 'required|email|unique:users',
    'avatar' => 'nullable|image|mimes:jpg,jpeg,png|file_size:2MB|dimensions:min_width=150,min_height=150',
    'resume' => 'nullable|file|mimes:pdf,doc,docx|file_size:5MB',
];

$validator = new Validator();
$validator->setDatabase($pdo);

if ($validator->validate($data, $rules)) {
    // Handle uploads
    if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] === UPLOAD_ERR_OK) {
        $uploadPath = 'uploads/avatars/' . uniqid() . '_' . $_FILES['avatar']['name'];
        move_uploaded_file($_FILES['avatar']['tmp_name'], $uploadPath);
    }
}
```

### Date Validation

```php
$data = [
    'birth_date' => '1990-01-15',
    'appointment' => '2024-12-25',
];

$rules = [
    'birth_date' => 'required|date|before:today',
    'appointment' => 'required|date|after:today',
];
```

### Field Comparison (Year Ranges, Price Ranges, etc.)

```php
// Year range validation
$data = [
    'starting_year' => 2020,
    'ending_year' => 2024,
];

$rules = [
    'starting_year' => 'required|numeric|min:1900',
    'ending_year' => 'required|numeric|greater:starting_year',
];

// Price range validation
$data = [
    'min_price' => 50,
    'max_price' => 500,
];

$rules = [
    'min_price' => 'required|numeric|min:0',
    'max_price' => 'required|numeric|greater:min_price',
];

// Age requirement
$data = [
    'minimum_age' => 18,
    'user_age' => 25,
];

$rules = [
    'user_age' => 'required|integer|gte:minimum_age',
];

// Budget validation
$data = [
    'budget' => 1000,
    'spending' => 850,
];

$rules = [
    'spending' => 'required|numeric|lte:budget',
];
```

## Sanitization

```php
// Sanitize single string
$clean = Validator::sanitize('<script>alert("xss")</script>Hello');
// Output: Hello

// Sanitize array (recursively)
$dirtyData = [
    'name' => '<b>John</b>',
    'comment' => '<script>evil()</script>',
];
$cleanData = Validator::sanitizeArray($dirtyData);
```

## Tips

1. **Always use nullable for optional fields** - This prevents validation errors on empty optional fields

2. **Database connection required for unique/exists** - Set PDO connection before using these rules

3. **Unique validation on updates** - Pass the record ID to exclude it from uniqueness check

4. **Custom messages** - Use dot notation: `field.rule` or just `rule` for all fields

5. **Dot notation for nested arrays** - Use `user.email` to validate nested data

6. **Password confirmation** - Field name must be `password_confirmation` when using `confirmed` rule

7. **Multiple rules** - Separate with pipe `|` or use array format

8. **File uploads** - Always validate `$_FILES` array, not `$_POST`
   ```php
   $validator->validate($_FILES, $rules); // Correct
   ```

9. **Image dimensions** - Use appropriate constraints for your use case:
   - Profile pictures: `min_width=200,min_height=200`
   - Banners: `ratio=16/9` or `min_width=1200`
   - Thumbnails: `width=150,height=150`

10. **File size limits** - Remember PHP's `upload_max_filesize` and `post_max_size` in php.ini

11. **Accepted file types** - Use `mimes` for extensions or `mimetypes` for exact MIME types

12. **Multiple file uploads** - Validate each file in a loop:
    ```php
    foreach ($_FILES['gallery']['tmp_name'] as $key => $tmp_name) {
        $file = [
            'name' => $_FILES['gallery']['name'][$key],
            'type' => $_FILES['gallery']['type'][$key],
            'tmp_name' => $tmp_name,
            'error' => $_FILES['gallery']['error'][$key],
            'size' => $_FILES['gallery']['size'][$key],
        ];
        $validator->validate(['image' => $file], ['image' => 'image|file_size:5MB']);
    }
    ```

## Array Format for Rules

```php
// String format
$rules = ['email' => 'required|email|max:255'];

// Array format (identical functionality)
$rules = ['email' => ['required', 'email', 'max:255']];
```

## Validation Rule Priority

When using `nullable`:
1. If field is nullable and empty, all other rules are skipped
2. If field has a value, all other rules apply

Example:
```php
'bio' => 'nullable|string|min:10|max:500'
// Empty bio: ✓ Valid (nullable)
// Bio with 5 chars: ✗ Invalid (min:10)
// Bio with 50 chars: ✓ Valid
```