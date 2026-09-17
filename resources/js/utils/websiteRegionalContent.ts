import websiteRegionalContentMr from './websiteRegionalContent-mr.json';
import websiteRegionalContentHi from './websiteRegionalContent-hi.json';

export const regionalWebsiteDefaults: Record<'mr' | 'hi', Record<string, unknown>> = {
    mr: websiteRegionalContentMr as Record<string, unknown>,
    hi: websiteRegionalContentHi as Record<string, unknown>,
};