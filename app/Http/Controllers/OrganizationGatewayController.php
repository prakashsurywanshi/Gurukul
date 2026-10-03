<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Services\ActiveOrgResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationGatewayController extends Controller
{
    public function __construct(
        private ActiveOrgResolver $orgResolver
    ) {}

    public function index(): Response
    {
        $organizations = Organization::query()
            ->where('status', 'active')
            // `type` is a MySQL enum, so a plain orderBy sorts by the enum's
            // declaration index. Order explicitly to match the canonical
            // grouping used by the SelectOrganization page.
            ->orderByRaw("FIELD(type, 'school', 'college', 'coaching', 'university')")
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'type', 'city', 'logo']);

        return Inertia::render('SelectOrganization', [
            'organizations' => $organizations,
        ]);
    }

    public function select(Request $request, Organization $organization): RedirectResponse
    {
        abort_unless($organization->status === 'active', 404);

        $this->orgResolver->setPublicOrganization((int) $organization->id);

        return redirect()->route('home');
    }
}