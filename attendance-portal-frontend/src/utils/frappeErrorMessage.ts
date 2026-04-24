/**
 * Strip basic HTML / entities Frappe often puts in validation messages.
 */
function stripSimpleHtml(s: string): string {
    return s
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim()
}

const GENERIC_AXIOS = /^Request failed with status code \d+$/i

/** Frappe concurrent-edit / optimistic-lock failure */
const DOCUMENT_MODIFIED_PATTERN = /Document has been modified after you have opened it/i

const DOCUMENT_MODIFIED_FRIENDLY =
    'This record was updated elsewhere (another tab or user). Refresh the page, then open Edit again and save.'

function humanizeKnownFrappeMessages(text: string): string {
    const t = text.trim()
    if (!t) return t
    if (DOCUMENT_MODIFIED_PATTERN.test(t)) {
        return DOCUMENT_MODIFIED_FRIENDLY
    }
    return t
}

function parseServerMessages(raw: string): string | null {
    try {
        const parsed = JSON.parse(raw) as unknown
        const rows = Array.isArray(parsed) ? parsed : []
        for (const row of rows) {
            let obj: Record<string, unknown> | null = null
            if (typeof row === 'string') {
                try {
                    obj = JSON.parse(row) as Record<string, unknown>
                } catch {
                    continue
                }
            } else if (row && typeof row === 'object') {
                obj = row as Record<string, unknown>
            }
            const inner = obj?.message
            if (typeof inner === 'string' && inner.trim()) {
                return stripSimpleHtml(inner.trim())
            }
        }
    } catch {
        /* ignore */
    }
    return null
}

/**
 * Human-readable message from Frappe / axios errors thrown by frappe-react-sdk.
 */
export function getFrappeErrorMessage(
    error: unknown,
    fallback = 'Something went wrong. Please try again.'
): string {
    if (error == null) return fallback
    if (typeof error === 'string') {
        const t = error.trim()
        if (!t) return fallback
        return humanizeKnownFrappeMessages(t)
    }

    const e = error as Record<string, unknown>

    const excType = e.exc_type
    if (
        excType === 'TimestampMismatchError' ||
        excType === 'frappe.exceptions.TimestampMismatchError'
    ) {
        return DOCUMENT_MODIFIED_FRIENDLY
    }

    const serverMessages = e._server_messages
    if (typeof serverMessages === 'string' && serverMessages.trim()) {
        const fromServer = parseServerMessages(serverMessages)
        if (fromServer) return humanizeKnownFrappeMessages(fromServer)
    }

    const msg = e.message
    if (typeof msg === 'string' && msg.trim()) {
        const m = msg.trim()
        if (!GENERIC_AXIOS.test(m) && m !== 'There was an error.') {
            return humanizeKnownFrappeMessages(stripSimpleHtml(m))
        }
    }

    const exc = e.exception
    if (typeof exc === 'string' && exc.trim()) {
        const lines = exc.split('\n').map(s => s.trim()).filter(Boolean)
        const first = lines.find(l => !l.startsWith('Traceback') && !l.startsWith('File '))
        if (first) return humanizeKnownFrappeMessages(stripSimpleHtml(first))
    }

    if (typeof msg === 'string' && msg.trim()) {
        return humanizeKnownFrappeMessages(stripSimpleHtml(msg.trim()))
    }

    return fallback
}
