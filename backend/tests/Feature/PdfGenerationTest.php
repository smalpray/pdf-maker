<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PdfGenerationTest extends TestCase
{
    public function test_html_can_be_converted_to_a_downloadable_pdf(): void
    {
        $response = $this->postJson('/api/pdf', [
            'mode' => 'html',
            'html' => '<h1>PDF test document</h1>',
        ]);

        $response->assertOk()
            ->assertHeader('content-type', 'application/pdf')
            ->assertHeader('content-disposition', 'attachment; filename="document.pdf"');

        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }

    public function test_local_urls_are_rejected(): void
    {
        $this->postJson('/api/pdf', [
            'mode' => 'url',
            'url' => 'http://localhost/',
        ])->assertUnprocessable();
    }

    public function test_public_urls_can_be_converted_to_a_pdf(): void
    {
        Http::fake([
            'https://8.8.8.8/*' => Http::response('<h1>Remote page</h1>', 200),
        ]);

        $response = $this->postJson('/api/pdf', [
            'mode' => 'url',
            'url' => 'https://8.8.8.8/',
        ]);

        $response->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }

    public function test_html_is_required_for_html_mode(): void
    {
        $this->postJson('/api/pdf', [
            'mode' => 'html',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('html');
    }
}
