"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCookieUrlFromDomain = getCookieUrlFromDomain;
const tldts_1 = require("tldts");
function getCookieUrlFromDomain(domain) {
    const url = (0, tldts_1.parse)(domain);
    // PSL-safe override: if the registrable domain is on the Public Suffix List
    // (e.g. *.ngrok-free.app, *.trycloudflare.com), browsers reject Domain=.<psl>.
    // Fall back to a host-only cookie using the full hostname.
    if (url.isIp || !url.domain || url.publicSuffix === url.domain || (url.hostname && url.hostname.endsWith('.ngrok-free.app'))) {
        return url.hostname;
    }
    return '.' + url.domain;
}
//# sourceMappingURL=subdomain.management.js.map
