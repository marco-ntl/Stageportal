//Code récupéré dans node_modules/@types/puppeteer/index.d.ts
//Le compileur ne veut pas reconnaître l'import, obligé de l'importer manuellement)))))))
export interface Cookie {
    /** The cookie name. */
    name: string;
    /** The cookie value. */
    value: string;
    /** The cookie domain. */
    domain?: string;
    /** The cookie path. */
    path?: string;
    /** The cookie Unix expiration time in seconds. */
    expires?: number;
    /** The cookie size */
    size?: number;
    /** The cookie http only flag. */
    httpOnly?: boolean;
    /** The session cookie flag. */
    session?: boolean;
    /** The cookie secure flag. */
    secure?: boolean;
    /** The cookie same site definition. */
    sameSite?: "Strict" | "Lax";
}
