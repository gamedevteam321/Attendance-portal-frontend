/**
 * Helpers for attendance_portal.api.get_geo_fencing_hierarchy (Farm → optional child_farms → clusters → fields).
 */

export type FieldItem = { name: string; area_name: string }

export type Cluster = { name: string; area_name: string; fields: FieldItem[] }

export type Farm = {
    name: string
    area_name: string
    clusters: Cluster[]
    child_farms?: Farm[]
}

export function findFarmInTree(farms: Farm[], name: string): Farm | undefined {
    for (const f of farms) {
        if (f.name === name) return f
        const nested = f.child_farms?.length ? findFarmInTree(f.child_farms, name) : undefined
        if (nested) return nested
    }
    return undefined
}

/** Every farm row for checkboxes / counts (parent then descendants). */
export function flattenFarmsDepthFirst(farms: Farm[]): Farm[] {
    return farms.flatMap(f => [
        f,
        ...(f.child_farms?.length ? flattenFarmsDepthFirst(f.child_farms) : []),
    ])
}

/** Farm + its clusters, walking nested farms (for Cluster tab sections). */
export function farmsWithClustersFlat(farms: Farm[]): { farm: Farm; clusters: Cluster[] }[] {
    const out: { farm: Farm; clusters: Cluster[] }[] = []
    const walk = (fs: Farm[]) => {
        for (const f of fs) {
            out.push({ farm: f, clusters: f.clusters ?? [] })
            if (f.child_farms?.length) walk(f.child_farms)
        }
    }
    walk(farms)
    return out
}

export function countGeoByLevelInTree(selected: string[], farms: Farm[]) {
    const set = new Set(selected)
    let farmCount = 0
    let clusterCount = 0
    let fieldCount = 0
    const walk = (fs: Farm[]) => {
        for (const farm of fs) {
            if (set.has(farm.name)) farmCount++
            for (const cl of farm.clusters ?? []) {
                if (set.has(cl.name)) clusterCount++
                for (const fi of cl.fields ?? []) {
                    if (set.has(fi.name)) fieldCount++
                }
            }
            if (farm.child_farms?.length) walk(farm.child_farms)
        }
    }
    walk(farms)
    return { farmCount, clusterCount, fieldCount }
}

/** Dropdown labels: nested farms show as "Parent › Child". */
export function farmDropdownOptions(farms: Farm[], parentPath = ''): { value: string; label: string }[] {
    const out: { value: string; label: string }[] = []
    for (const f of farms) {
        const base = f.area_name || f.name
        const label = parentPath ? `${parentPath} › ${base}` : base
        out.push({ value: f.name, label })
        if (f.child_farms?.length) out.push(...farmDropdownOptions(f.child_farms, base))
    }
    return out
}

export function toggleGeoId(ids: string[], id: string, on: boolean): string[] {
    if (on) return [...new Set([...ids, id])]
    return ids.filter(x => x !== id)
}
