<?php
declare(strict_types=1);

namespace App\core;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

class Mailer {

    private PHPMailer $mailer;

    public function __construct() {
        $this->mailer = new PHPMailer(true);
        $this->configure();
    }

    /**
     * Configure SMTP from constants defined in config.php
     */
    private function configure(): void {
        $this->mailer->isSMTP();
        $this->mailer->Host       = MAIL_HOST;
        $this->mailer->SMTPAuth   = true;
        $this->mailer->Username   = MAIL_USERNAME;
        $this->mailer->Password   = MAIL_PASSWORD;
        $this->mailer->SMTPSecure = strtolower(MAIL_ENCRYPTION) === 'ssl'
                                        ? PHPMailer::ENCRYPTION_SMTPS
                                        : PHPMailer::ENCRYPTION_STARTTLS;
        $this->mailer->Port       = (int) MAIL_PORT;
        $this->mailer->CharSet    = 'UTF-8';
        $this->mailer->Timeout    = 30;
        $this->mailer->isHTML(true);

        // Uncomment to debug SMTP issues on server:
        // $this->mailer->SMTPDebug = SMTP::DEBUG_SERVER;
    }

    /**
     * Set sender. Defaults to MAIL_FROM_* from config.php
     */
    public function from(string $address = '', string $name = ''): static {
        $this->mailer->setFrom(
            $address ?: MAIL_FROM_ADDRESS,
            $name    ?: MAIL_FROM_NAME
        );
        return $this;
    }

    /**
     * Add a recipient.
     */
    public function to(string $address, string $name = ''): static {
        $this->mailer->addAddress($address, $name);
        return $this;
    }

    /**
     * Set subject.
     */
    public function subject(string $subject): static {
        $this->mailer->Subject = $subject;
        return $this;
    }

    /**
     * Set HTML body from a PHP template file.
     *
     * @param string $templatePath  Absolute path to .php template
     * @param array  $variables     Key => value pairs injected into the template
     */
    public function view(string $templatePath, array $variables = []): static {
        extract($variables);

        $mailer = $this->mailer;
        ob_start();
        include $templatePath;
        $html = ob_get_clean();

        $this->mailer->Body    = $html;
        $this->mailer->AltBody = strip_tags(
            preg_replace(['/<br\s*\/?>/i', '/<\/p>/i'], "\n", $html)
        );

        return $this;
    }

    /**
     * Attach a file (e.g. PDF).
     *
     * @param string $filePath   Absolute path to the file
     * @param string $filename   Optional display name for the attachment
     */
    public function attach(string $filePath, string $filename = ''): static {
        if (file_exists($filePath)) {
            $this->mailer->addAttachment(
                $filePath,
                $filename ?: basename($filePath)
            );
        }
        return $this;
    }

    /**
     * Send the email.
     *
     * @throws Exception
     */
    public function send(): bool {
        if (empty($this->mailer->From) || $this->mailer->From === 'root@localhost') {
            $this->from();
        }

        return $this->mailer->send();
    }

    /**
     * Get PHPMailer error info after a failed send().
     */
    public function getError(): string {
        return $this->mailer->ErrorInfo;
    }
}
// ```

// Since `config.php` already handles the `getenv()` fallbacks, the Mailer just reads the constants directly — much cleaner. Just make sure your Render env vars are set correctly:
// ```
// MAIL_HOST=smtp-relay.brevo.com
// MAIL_PORT=587
// MAIL_ENCRYPTION=tls
// MAIL_USERNAME=your_brevo_login@email.com
// MAIL_PASSWORD=your_brevo_smtp_key
// MAIL_FROM_ADDRESS=your_verified_sender@email.com
// MAIL_FROM_NAME=SMART-SB