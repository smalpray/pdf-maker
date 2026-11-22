<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;

class PdfController extends Controller
{
    public function __invoke(Request $request)
    {
        $data = Validator::make($request->all(), [
            'mode' => ['required', 'in:html,url'],
            'html' => ['required_if:mode,html', 'nullable', 'string', 'max:500000'],
            'url' => ['required_if:mode,url', 'nullable', 'string', 'max:2048'],
        ])->validate();

        $html = $data['mode'] === 'url'
            ? $this->fetchPublicPage($data['url'])
            : $data['html'];

        if (trim($html) === '') {
            abort(422, 'The HTML document is empty.');
        }

        $pdf = Pdf::loadHTML($html)->setPaper('a4')->output();

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="document.pdf"',
            'Cache-Control' => 'no-store',
        ]);
    }

    private function fetchPublicPage(string $url): string
    {
        $parts = parse_url($url);
        $scheme = strtolower($parts['scheme'] ?? '');
        $host = strtolower(rtrim($parts['host'] ?? '', '.'));
        $port = $parts['port'] ?? ($scheme === 'https' ? 443 : 80);

        if (
            ! in_array($scheme, ['http', 'https'], true)
            || $host === ''
            || isset($parts['user'])
            || isset($parts['pass'])
            || ! in_array($port, [80, 443], true)
            || ($scheme === 'http' && $port !== 80)
            || ($scheme === 'https' && $port !== 443)
        ) {
            abort(422, 'Use a public HTTP or HTTPS URL on its standard port.');
        }

        $addresses = $this->resolvePublicAddresses($host);

        if ($addresses === []) {
            abort(422, 'The URL host must resolve only to public IP addresses.');
        }

        $ip = $addresses[0];
        $resolveHost = str_contains($host, ':') ? "[{$host}]" : $host;
        $resolveIp = str_contains($ip, ':') ? "[{$ip}]" : $ip;

        try {
            /** @var Response $response */
            $response = Http::timeout(15)
                ->withOptions([
                    'allow_redirects' => false,
                    'curl' => [
                        CURLOPT_RESOLVE => ["{$resolveHost}:{$port}:{$resolveIp}"],
                    ],
                ])
                ->get($url);
        } catch (ConnectionException) {
            abort(502, 'The remote page could not be reached.');
        }

        if ($response->redirect()) {
            abort(422, 'Redirecting URLs are not supported.');
        }

        if (! $response->successful()) {
            abort(502, 'The remote page returned an unsuccessful response.');
        }

        if (strlen($response->body()) > 500000) {
            abort(422, 'The remote page is too large to convert.');
        }

        return $response->body();
    }

    /**
     * Resolve and pin every address so requests cannot reach private networks.
     *
     * @return list<string>
     */
    private function resolvePublicAddresses(string $host): array
    {
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            $addresses = [$host];
        } else {
            $records = dns_get_record($host, DNS_A | DNS_AAAA);
            $addresses = [];

            foreach ($records as $record) {
                if (isset($record['ip'])) {
                    $addresses[] = $record['ip'];
                } elseif (isset($record['ipv6'])) {
                    $addresses[] = $record['ipv6'];
                }
            }
        }

        if ($addresses === []) {
            return [];
        }

        foreach (array_unique($addresses) as $address) {
            if (! filter_var(
                $address,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE,
            )) {
                return [];
            }
        }

        return array_values(array_unique($addresses));
    }
}
