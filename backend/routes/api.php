<?php

use App\Http\Controllers\Api\PdfController;
use Illuminate\Support\Facades\Route;

Route::post('/pdf', PdfController::class)->name('pdf.create');
