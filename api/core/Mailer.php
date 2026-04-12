<?php
declare(strict_types=1);

namespace App\core;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use PHPMailer\PHPMailer\PHPMailer;
// use GuzzleHttp\Exception\RequestException;

class Mailer {

    private string $subject    = '';
    private string $htmlBody   = '';
    private string $altBody    = '';
    private array  $recipients = [];
    private array  $attachments = [];
    private string $fromEmail  = '';
    private string $fromName   = '';

    // Keep PHPMailer only for inline image embedding in templates
    private PHPMailer $phpmailer;

    public function __construct() {
        $this->phpmailer = new PHPMailer(true);
        $this->phpmailer->isHTML(true);
        $this->fromEmail = MAIL_FROM_ADDRESS;
        $this->fromName  = MAIL_FROM_NAME;
    }

    /**
     * Set sender.
     */
    public function from(string $address = '', string $name = ''): static {
        $this->fromEmail = $address ?: MAIL_FROM_ADDRESS;
        $this->fromName  = $name    ?: MAIL_FROM_NAME;
        return $this;
    }

    /**
     * Add a recipient.
     */
    public function to(string $address, string $name = ''): static {
        $this->recipients[] = [
            'email' => $address,
            'name'  => $name,
        ];
        return $this;
    }

    /**
     * Set subject.
     */
    public function subject(string $subject): static {
        $this->subject = $subject;
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

        $mailer = $this->phpmailer;
        ob_start();
        include $templatePath;
        $html = ob_get_clean();

        $this->htmlBody = $html;
        $this->altBody  = strip_tags(
            preg_replace(['/<br\s*\/?>/i', '/<\/p>/i'], "\n", $html)
        );

        return $this;
    }

    /**
     * Attach a file — encodes to base64 for Brevo API.
     *
     * @param string $filePath   Absolute path to the file
     * @param string $filename   Optional display name for the attachment
     */
    public function attach(string $filePath, string $filename = ''): static {
        if (file_exists($filePath)) {
            $this->attachments[] = [
                'name'    => $filename ?: basename($filePath),
                'content' => base64_encode(file_get_contents($filePath)),
            ];
        }
        return $this;
    }

    /**
     * Send the email via Brevo HTTP API.
     *
     * @throws \Exception
     */
    public function send(): bool {
        if (empty($this->recipients)) {
            throw new \Exception('No recipients specified.');
        }

        $apiKey = defined('BREVO_API_KEY') ? BREVO_API_KEY : (getenv('BREVO_API_KEY') ?: '');

        if (empty($apiKey)) {
            throw new \Exception('Brevo API key is not configured.');
        }

        $payload = [
            'sender' => [
                'email' => $this->fromEmail,
                'name'  => $this->fromName,
            ],
            'to'          => $this->recipients,
            'subject'     => $this->subject,
            'htmlContent' => $this->htmlBody,
            'textContent' => $this->altBody,
        ];

        // Attach files if any
        if (!empty($this->attachments)) {
            $payload['attachment'] = $this->attachments;
        }

        try {
            $client   = new Client(['timeout' => 30]);
            $response = $client->post('https://api.brevo.com/v3/smtp/email', [
                'headers' => [
                    'api-key'      => $apiKey,
                    'Content-Type' => 'application/json',
                    'Accept'       => 'application/json',
                ],
                'json' => $payload,
            ]);

            return $response->getStatusCode() === 201;

        } catch (RequestException $e) {
            $errorBody = $e->hasResponse()
                ? (string) $e->getResponse()->getBody()
                : $e->getMessage();
            throw new \Exception('Brevo API error: ' . $errorBody);
        }
    }

    /**
     * Not applicable for API sending — kept for compatibility.
     */
    public function getError(): string {
        return '';
    }
}